import { Type, Value } from "sinap-types";
import { Plugin } from "./plugin";
import { ireduce } from "sinap-types/lib/util";


export function pluginTypes(plugin: Plugin): { toType: (a: string) => Type.Type, toName: (t: Type.Type) => string } {
    const initialTypes: Type.Type[] = [
        plugin.types.state,
        plugin.types.nodes,
        plugin.types.edges,
        plugin.types.graph,
        plugin.types.result,
        ...plugin.types.arguments,
    ];

    const seen = new Set<Type.Type>();
    const names = new Map<string, Type.Type[]>();

    function traverse(type: Type.Type) {
        if (seen.has(type)) {
            return;
        }
        seen.add(type);
        let bucket = names.get(type.name);
        if (!bucket) {
            bucket = [];
            names.set(type.name, bucket);
        }
        bucket.push(type);

        if (type instanceof Type.CustomObject) {
            for (const t2 of type.members.values()) {
                traverse(t2);
            }
        } else if (type instanceof Type.Record) {
            for (const t2 of type.members.values()) {
                traverse(t2);
            }
        } else if (type instanceof Value.SetType) {
            traverse(type.typeParameter);
        } else if (type instanceof Value.ArrayType) {
            traverse(type.typeParameter);
        } else if (type instanceof Value.TupleType) {
            type.typeParameters.map(traverse);
        } else if (type instanceof Value.MapType) {
            traverse(type.keyType);
            traverse(type.valueType);
        } else if (type instanceof Type.Union) {
            for (const t2 of type.types) {
                traverse(t2);
            }
        } else if (type instanceof Type.Intersection) {
            for (const t2 of type.types) {
                traverse(t2);
            }
        } else if ((type instanceof Type.Literal) || (type instanceof Type.Primitive)) {
        } else {
            throw new Error("unknown type encountered");
        }
    }

    for (const t of initialTypes) {
        traverse(t);
    }

    const toName = new Map<Type.Type, string>();

    for (const [prefix, bucket] of names) {
        for (let i = 0; i < bucket.length; i++) {
            const toSet = [bucket[i]];
            for (let j = bucket.length; j > i; j--) {
                if (bucket[i].equals(bucket[j])) {
                    toSet.push(bucket[j]);
                    bucket.splice(j, 1);
                }
            }
            let name = prefix;
            if (bucket.length !== 1) {
                name = `(${prefix})[${i}]`;
            }
            for (const el of toSet) {
                toName.set(el, name);
            }
        }
    }

    const toType = new Map<string, Type.Type>();

    for (const [type, name] of toName) {
        toType.set(name, type);
    }

    return {
        toName: (t) => {
            const name = toName.get(t);
            if (!name) {
                const potentialTypes = names.get(t.name);
                if (potentialTypes) {
                    for (const pt of potentialTypes) {
                        if (t.equals(pt)) {
                            return toName.get(pt)!;
                        }
                    }
                }
                throw new Error("type not on record");
            }
            return name;
        }, toType: (n) => {
            const type = toType.get(n);
            if (!type) {
                throw new Error("unknown type given");
            }
            return type;
        }
    };
}

export class ElementType extends Type.Intersection {
    constructor(readonly pluginType: Type.CustomObject, readonly drawableType: Type.CustomObject) {
        super([pluginType, drawableType]);
    }
}

export class ElementUnion extends Type.Union {
    constructor(readonly types: Set<ElementType>) {
        super(types);
    }
}

export class ElementValue extends Value.CustomObject {
    constructor(readonly type: ElementType, environment: Value.Environment) {
        super(type, environment);
    }
}

export class Model {
    environment = new Value.Environment();
    constructor(readonly plugin: Plugin) {
        this.graph = new ElementValue(this.plugin.types.graph, this.environment);
        this.environment.add(this.graph);
    }

    readonly nodes = new Set<ElementValue>();
    readonly edges = new Set<ElementValue>();
    readonly graph: ElementValue;

    *values() {
        yield this.graph;
        yield* this.nodes;
        yield* this.edges;
    }

    makeNode(type?: ElementType) {
        if (!type) {
            type = this.plugin.types.nodes.types.values().next().value as ElementType;
        }
        if (!ireduce((a, t2) => a || Type.isSubtype(type!, t2), false, this.plugin.types.nodes.types)) {
            throw new Error("type must be a kind of node");
        }
        const value = new ElementValue(type, this.environment);
        this.environment.add(value);
        value.initialize();
        this.nodes.add(value);
        return value;
    }

    makeEdge(type: ElementType | undefined, from: ElementValue, to: ElementValue) {
        if (!type) {
            type = this.plugin.types.edges.types.values().next().value as ElementType;
        }
        if (!ireduce((a, t2) => a || Type.isSubtype(type!, t2), false, this.plugin.types.edges.types)) {
            throw new Error("type must be a kind of edge");
        }
        const value = new ElementValue(type, this.environment);
        this.environment.add(value);
        value.initialize();
        const sourceUnion = new Value.Union(type.members.get("source") as Type.Union, this.environment);
        sourceUnion.value = from;
        const destUnion = new Value.Union(type.members.get("destination") as Type.Union, this.environment);
        destUnion.value = to;
        value.set("source", sourceUnion);
        value.set("destination", destUnion);
        this.edges.add(value);
        return value;
    }

    delete(value: ElementValue) {
        if (ireduce((a, t2) => a || Type.isSubtype(value.type, t2), false, this.plugin.types.nodes.types)) {
            this.nodes.delete(value);
            this.collect();
        } else if (ireduce((a, t2) => a || Type.isSubtype(value.type, t2), false, this.plugin.types.edges.types)) {
            this.edges.delete(value);
            this.collect();
        } else {
            throw new Error("can't delete value, not a node or edge");
        }
    }

    collect() {
        this.environment.garbageCollect(this.values());
    }

    private makeSerial(v: Value.Value, convert: (t: Type.Type) => string) {
        return {
            type: convert(v.type),
            rep: v.serialRepresentation,
        };
    }

    private loadSerial(uuid: string, v: { type: string, rep: any }, convert: (a: string) => Type.Type) {
        return this.environment.fromSerial(convert(v.type), v.rep, uuid);
    }

    serialize(supressUnknownTypes = false) {
        this.collect();

        const { toName: toNameReal } = pluginTypes(this.plugin);

        const toName = supressUnknownTypes ? (n: Type.Type) => {
            try {
                return toNameReal(n);
            } catch (err) {
                return "unknown type";
            }
        } : toNameReal;

        const otherValues = new Set(this.environment.values.values());

        for (const v of this.values()) {
            otherValues.delete(v);
        }

        const nodes: { [uuid: string]: any } = {};
        for (const node of this.nodes) {
            nodes[node.uuid] = this.makeSerial(node, toName);
        }
        const edges: { [uuid: string]: any } = {};
        for (const edge of this.edges) {
            edges[edge.uuid] = this.makeSerial(edge, toName);
        }
        const others: { [uuid: string]: any } = {};
        for (const other of otherValues) {
            others[other.uuid] = this.makeSerial(other, toName);
        }

        return {
            graph: { [this.graph.uuid]: this.makeSerial(this.graph, toName) },
            nodes: nodes,
            edges: edges,
            others: others,
        };
    }

    static fromSerial(jso: any, plugin: Plugin): Model {
        const ret = new Model(plugin);

        const { toType } = pluginTypes(plugin);

        for (const uuid in jso.graph) {
            (ret as any).graph = ret.loadSerial(uuid, jso.graph[uuid], toType);
        }

        for (const uuid in jso.nodes) {
            ret.nodes.add(ret.loadSerial(uuid, jso.nodes[uuid], toType) as ElementValue);
        }

        for (const uuid in jso.edges) {
            ret.edges.add(ret.loadSerial(uuid, jso.edges[uuid], toType) as ElementValue);
        }

        for (const uuid in jso.others) {
            ret.loadSerial(uuid, jso.others[uuid], toType);
        }

        return ret;
    }
}