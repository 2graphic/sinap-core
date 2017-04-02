import { Directory } from "./files";
import { Program } from ".";
import { Type, Value } from "sinap-types";

const stringType = new Type.Primitive("string");
const booleanType = new Type.Primitive("boolean");

const drawableNodeType = new Type.CustomObject("DrawableNode", null, new Map<string, Type.Type>([
    ["label", stringType],
]));

const drawableEdgeType = new Type.CustomObject("DrawableEdge", null, new Map<string, Type.Type>([
    ["label", stringType],
    ["source", drawableNodeType],
    ["destination", drawableNodeType],
]));

drawableNodeType.members.set("parents", new Value.ArrayType(drawableEdgeType));
drawableNodeType.members.set("children", new Value.ArrayType(drawableEdgeType));

const drawableGraphType = new Type.CustomObject("DrawableGraph", null, new Map<string, Type.Type>([
    ["nodes", new Value.ArrayType(drawableNodeType)],
    ["edges", new Value.ArrayType(drawableEdgeType)],
]));



const nodeType = new Type.CustomObject("DFANode", null, new Map<string, Type.Type>([
    ["label", stringType],
    ["isAcceptState", booleanType],
    ["isStartState", booleanType],
    ["children", "placeholder" as any],
]), undefined, new Map([
    ["isAcceptState", "Accept State"],
    ["isStartState", "Start State"],
]));

const edgeType = new Type.CustomObject("DFAEdge", null, new Map<string, Type.Type>([
    ["label", stringType],
    ["destination", nodeType],
]));

nodeType.members.set("children", new Value.ArrayType(edgeType));

const stateType = new Type.CustomObject("State", null, new Map<string, Type.Type>([
    ["currentNode", nodeType],
    ["inputLeft", stringType],
]));

const graphType = new Type.CustomObject("DFAGraph", null, new Map<string, Type.Type>([
    ["nodes", new Value.ArrayType(nodeType)],
    ["edges", new Value.ArrayType(edgeType)],
]));

const nodesTypes = [nodeType];
const edgesTypes = [edgeType];

export interface Plugin {
    stateType: Type.CustomObject;
    nodesType: Type.Union;
    edgesType: Type.Union;
    graphType: Type.Intersection;
    argumentTypes: Type.Type[];
    resultType: Type.Type;

    makeProgram(model: Model): Program;
}

export class DFAPlugin implements Plugin {
    stateType = stateType;
    nodesType = new Type.Union(nodesTypes.map(t => Type.intersectTypes([t, drawableNodeType], [])));
    edgesType = new Type.Union(edgesTypes.map(t => Type.intersectTypes([t, drawableEdgeType], [])));
    graphType = new Type.Intersection([graphType, drawableGraphType]);
    argumentTypes = [new Type.Primitive("string")];
    resultType = new Type.Primitive("boolean");

    constructor(readonly pluginKind: string[], readonly description: string, readonly directory: Directory) {
    }

    makeProgram(model: Model): Program {
        return new Program(model, this);
    }
}

export class Model {
    environment = new Value.Environment();
    constructor(readonly plugin: Plugin) {
        this.graph = new Value.Intersection(this.plugin.graphType, this.environment);
    }

    readonly nodes = new Set<Value.Intersection>();
    readonly edges = new Set<Value.Intersection>();
    readonly graph: Value.Intersection;

    *values() {
        yield this.graph;
        yield* this.nodes;
        yield* this.edges;
    }

    makeNode(type?: Type.Intersection) {
        if (!type) {
            type = this.plugin.nodesType.types.values().next().value as Type.Intersection;
        }
        if (!Type.isSubtype(type, this.plugin.nodesType)) {
            throw new Error("type must be a kind of node");
        }
        const value = new Value.Intersection(type, this.environment);
        this.environment.add(value);
        this.nodes.add(value);
        return value;
    }

    makeEdge(type: Type.Intersection | undefined, from: Value.Intersection, to: Value.Intersection) {
        if (!type) {
            type = this.plugin.edgesType.types.values().next().value as Type.Intersection;
        }
        if (!Type.isSubtype(type, this.plugin.edgesType)) {
            throw new Error("type must be a kind of edge");
        }
        const value = new Value.Intersection(type, this.environment);
        this.environment.add(value);
        value.set("source", from);
        value.set("destination", to);
        this.edges.add(value);
        return value;
    }

    delete(value: Value.Intersection) {
        if (Type.isSubtype(value.type, this.plugin.nodesType)) {
            this.nodes.delete(value);
            this.collect();
        } else if (Type.isSubtype(value.type, this.plugin.edgesType)) {
            this.edges.delete(value);
            this.collect();
        }
        throw new Error("can't delete value, not a node or edge");
    }

    collect() {
        this.environment.garbageCollect(this.values());
    }
}