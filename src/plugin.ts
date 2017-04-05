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
    ["shape", new Type.Union([new Type.Literal("circle"), new Type.Literal("square"), new Type.Literal("image")])],
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

function typesToUnion(types: Type.CustomObject[], drawable: Type.CustomObject, func?: (t: Type.CustomObject) => void) {
    return new ElementUnion(new Set(imap(t => {
        if (func) {
            func(t);
        }
        return new ElementType(t, drawable);
    }, types)));
};

export function fromRaw(types: RawPluginTypes): types is PluginTypes {
    const p = types as PluginTypes;
    p.nodes = typesToUnion(p.rawNodes, drawableNodeType);
    p.edges = typesToUnion(p.rawEdges, drawableEdgeType, (edge) => {
        if (!edge.members.has("source")) {
            edge.members.set("source", p.nodes);
        }
        if (!edge.members.has("destination")) {
            edge.members.set("destination", p.nodes);
        }
        (edge as any).visibility.set("source", false);
        (edge as any).visibility.set("destination", false);
    });
    if (!p.rawGraph.members.has("nodes")) {
        p.rawGraph.members.set("nodes", p.nodes);
    }
    if (!p.rawGraph.members.has("edges")) {
        p.rawGraph.members.set("edges", p.edges);
    }
    (p.rawGraph as any).visibility.set("nodes", false);
    (p.rawGraph as any).visibility.set("edges", false);
    p.graph = new ElementType(p.rawGraph, drawableGraphType);

    return true;
}