import { Type, Value } from "sinap-types";
import { Plugin } from "./plugin";


export function pluginTypes(plugin: Plugin): { toType: Map<string, Type.Type>, toName: Map<Type.Type, string> } {
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

    return { toName: toName, toType: toType };
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

export class ElementValue extends Value.Intersection {
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
        if (!Type.isSubtype(type, this.plugin.types.nodes)) {
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
        if (!Type.isSubtype(type, this.plugin.types.edges)) {
            throw new Error("type must be a kind of edge");
        }
        const value = new ElementValue(type, this.environment);
        this.environment.add(value);
        value.initialize();
        value.set("source", from);
        value.set("destination", to);
        this.edges.add(value);
        return value;
    }

    delete(value: ElementValue) {
        if (Type.isSubtype(value.type, this.plugin.types.nodes)) {
            this.nodes.delete(value);
            this.collect();
        } else if (Type.isSubtype(value.type, this.plugin.types.edges)) {
            this.edges.delete(value);
            this.collect();
        } else {
            throw new Error("can't delete value, not a node or edge");
        }
    }

    collect() {
        this.environment.garbageCollect(this.values());
    }

    serialize() {
        this.collect();
        const otherValues = new Set(this.environment.values.values());
        for (const v of this.values()) {
            otherValues.delete(v);
        }
        otherValues.delete(this.graph.get("nodes"));
        otherValues.delete(this.graph.get("edges"));

        const nodes: { [uuid: string]: any } = {};
        for (const node of this.nodes) {
            nodes[node.uuid] = node.serialRepresentation;
        }
        const edges: { [uuid: string]: any } = {};
        for (const edge of this.edges) {
            edges[edge.uuid] = edge.serialRepresentation;
        }
        const others: { [uuid: string]: any } = {};
        for (const other of otherValues) {
            others[other.uuid] = other.serialRepresentation;
        }

        return {
            graph: { [this.graph.uuid]: this.graph.serialRepresentation },
            nodes: nodes,
            edges: edges,
            others: others,
        };
    }
}