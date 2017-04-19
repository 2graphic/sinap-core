import { Type, Value } from "sinap-types";
import { Plugin } from "./plugin";
import { ireduce } from "sinap-types/lib/util";
import { TypeSerializer } from "./serial-types";

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
    private typeSerializer = new TypeSerializer();
    constructor(readonly plugin: Plugin) {
        this.graph = new ElementValue(this.plugin.types.graph, this.environment);
        this.graph.initialize();
        this.environment.add(this.graph);

        this.typeSerializer.addType(plugin.types.state);
        this.typeSerializer.addType(plugin.types.nodes);
        this.typeSerializer.addType(plugin.types.edges);
        this.typeSerializer.addType(plugin.types.graph);
        this.typeSerializer.addType(plugin.types.result);
        plugin.types.arguments.map(t => this.typeSerializer.addType(t));
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

    private makeSerial(v: Value.Value) {
        return {
            type: this.typeSerializer.addType(v.type),
            rep: v.serialRepresentation,
        };
    }

    private loadSerial(uuid: string, v: { type: any, rep: any }) {
        return this.environment.fromSerial(this.typeSerializer.getType(v.type), v.rep, uuid);
    }

    serialize() {
        this.collect();

        const otherValues = new Set(this.environment.values.values());

        for (const v of this.values()) {
            otherValues.delete(v);
        }

        const nodes: { [uuid: string]: any } = {};
        for (const node of this.nodes) {
            nodes[node.uuid] = this.makeSerial(node);
        }
        const edges: { [uuid: string]: any } = {};
        for (const edge of this.edges) {
            edges[edge.uuid] = this.makeSerial(edge);
        }
        const others: { [uuid: string]: any } = {};
        for (const other of otherValues) {
            others[other.uuid] = this.makeSerial(other);
        }

        return {
            graph: { [this.graph.uuid]: this.makeSerial(this.graph) },
            nodes: nodes,
            edges: edges,
            others: others,
        };
    }

    static fromSerial(jso: any, plugin: Plugin): Model {
        const ret = new Model(plugin);

        for (const uuid in jso.graph) {
            (ret as any).graph = ret.loadSerial(uuid, jso.graph[uuid]);
        }

        for (const uuid in jso.nodes) {
            ret.nodes.add(ret.loadSerial(uuid, jso.nodes[uuid]) as ElementValue);
        }

        for (const uuid in jso.edges) {
            ret.edges.add(ret.loadSerial(uuid, jso.edges[uuid]) as ElementValue);
        }

        for (const uuid in jso.others) {
            ret.loadSerial(uuid, jso.others[uuid]);
        }

        return ret;
    }
}