import { Program } from "./program";
import { InterpreterInfo } from "./plugin-loader";
import { Type, Value } from "sinap-types";
import { Model, ElementType, ElementValue, ElementUnion } from "./model";
import { imap } from "sinap-types/lib/util";

export interface PluginTypes {
    state: Type.CustomObject;
    nodes: ElementUnion;
    edges: ElementUnion;
    graph: ElementType;
    rawNodes: Type.CustomObject[];
    rawEdges: Type.CustomObject[];
    rawGraph: Type.CustomObject;
    arguments: Type.Type[];
    result: Type.Type;
}

export interface RawPluginTypes {
    state: Type.CustomObject;
    rawNodes: Type.CustomObject[];
    rawEdges: Type.CustomObject[];
    rawGraph: Type.CustomObject;
    arguments: Type.Type[];
    result: Type.Type;
}

export interface Plugin {
    pluginInfo: InterpreterInfo;
    readonly types: Readonly<PluginTypes>;

    validateEdge(src: ElementValue, dst?: ElementValue, like?: ElementValue): boolean;
    makeProgram(model: Model): Program;
}

const stringType = new Type.Primitive("string");
const numberType = new Type.Primitive("number");
const colorType = new Type.Primitive("color");
const booleanType = new Type.Primitive("boolean");
const fileType = new Type.Primitive("file");
const pointType = new Type.Record("Point", new Map([["x", numberType], ["y", numberType]]));
const styleType = new Type.Union([new Type.Literal("solid"), new Type.Literal("dotted"), new Type.Literal("dashed")]);

export const drawableNodeType = new Type.CustomObject("DrawableNode", null, new Map<string, Type.Type>([
    ["label", stringType],
    ["color", colorType],
    ["position", pointType],
    ["shape", new Type.Union([new Type.Literal("circle"), new Type.Literal("square"), new Type.Literal("ellipse"), new Type.Literal("rectangle"), new Type.Literal("image")])],
    ["image", fileType],
    ["anchorPoints", new Value.ArrayType(pointType)],
    ["borderColor", colorType],
    ["borderStyle", styleType],
    ["borderWidth", numberType],
]));

export const drawableEdgeType = new Type.CustomObject("DrawableEdge", null, new Map<string, Type.Type>([
    ["label", stringType],
    ["color", colorType],
    ["lineStyle", styleType],
    ["lineWidth", numberType],
    ["showSourceArrow", booleanType],
    ["showDestinationArrow", booleanType],
]));

export const drawableGraphType = new Type.CustomObject("DrawableGraph", null, new Map<string, Type.Type>([
]));

export function fromRaw(types: RawPluginTypes): types is PluginTypes {
    const p = types as PluginTypes;
    const nodesUnion = new Type.Union(p.rawNodes);
    const edgesUnion = new Type.Union(p.rawEdges);
    const edgeArray = new Value.ArrayType(edgesUnion);
    const nodesArray = new Value.ArrayType(nodesUnion);

    for (const node of p.rawNodes) {
        if (!node.members.has("parents")) {
            node.members.set("parents", edgeArray);
        }
        if (!node.members.has("children")) {
            node.members.set("children", edgeArray);
        }
        (node as any).visibility.set("parents", false);
        (node as any).visibility.set("children", false);
    }
    p.nodes = new ElementUnion(new Set(imap(t => new ElementType(t, drawableNodeType), p.rawNodes)));

    for (const edge of p.rawEdges) {
        if (!edge.members.has("source")) {
            edge.members.set("source", nodesUnion);
        }
        if (!edge.members.has("destination")) {
            edge.members.set("destination", nodesUnion);
        }
        (edge as any).visibility.set("source", false);
        (edge as any).visibility.set("destination", false);
    }

    p.edges = new ElementUnion(new Set(imap(t => new ElementType(t, drawableEdgeType), p.rawEdges)));
    (edgeArray as any).typeParameter = p.edges;

    if (!p.rawGraph.members.has("nodes")) {
        p.rawGraph.members.set("nodes", nodesArray);
    }
    if (!p.rawGraph.members.has("edges")) {
        p.rawGraph.members.set("edges", edgeArray);
    }
    (p.rawGraph as any).visibility.set("nodes", false);
    (p.rawGraph as any).visibility.set("edges", false);
    p.graph = new ElementType(p.rawGraph, drawableGraphType);

    return true;
}