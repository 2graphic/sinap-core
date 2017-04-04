import { Type, Value } from "sinap-types";
import { Plugin } from "./plugin";

const stringType = new Type.Primitive("string");

export const drawableNodeType = new Type.CustomObject("DrawableNode", null, new Map<string, Type.Type>([
    ["label", stringType],
]));

export const drawableEdgeType = new Type.CustomObject("DrawableEdge", null, new Map<string, Type.Type>([
    ["label", stringType],
    ["source", drawableNodeType],
    ["destination", drawableNodeType],
]));

drawableNodeType.members.set("parents", new Value.ArrayType(drawableEdgeType));
drawableNodeType.members.set("children", new Value.ArrayType(drawableEdgeType));

export const drawableGraphType = new Type.CustomObject("DrawableGraph", null, new Map<string, Type.Type>([
    ["nodes", new Value.ArrayType(drawableNodeType)],
    ["edges", new Value.ArrayType(drawableEdgeType)],
]));

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

export class Element extends Value.Intersection {
    constructor(readonly type: ElementType, environment: Value.Environment) {
        super(type, environment);
    }
}

export class Model {
    environment = new Value.Environment();
    constructor(readonly plugin: Plugin) {
        this.graph = new Element(this.plugin.graphType, this.environment);
        this.environment.add(this.graph);
    }

    readonly nodes = new Set<Element>();
    readonly edges = new Set<Element>();
    readonly graph: Element;

    *values() {
        yield this.graph;
        yield* this.nodes;
        yield* this.edges;
    }

    makeNode(type?: ElementType) {
        if (!type) {
            type = this.plugin.nodesType.types.values().next().value as ElementType;
        }
        if (!Type.isSubtype(type, this.plugin.nodesType)) {
            throw new Error("type must be a kind of node");
        }
        const value = new Element(type, this.environment);
        this.environment.add(value);
        value.initialize();
        this.nodes.add(value);
        return value;
    }

    makeEdge(type: ElementType | undefined, from: Element, to: Element) {
        if (!type) {
            type = this.plugin.edgesType.types.values().next().value as ElementType;
        }
        if (!Type.isSubtype(type, this.plugin.edgesType)) {
            throw new Error("type must be a kind of edge");
        }
        const value = new Element(type, this.environment);
        this.environment.add(value);
        value.initialize();
        value.set("source", from);
        value.set("destination", to);
        this.edges.add(value);
        return value;
    }

    delete(value: Element) {
        if (Type.isSubtype(value.type, this.plugin.nodesType)) {
            this.nodes.delete(value);
            this.collect();
        } else if (Type.isSubtype(value.type, this.plugin.edgesType)) {
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