import { Program } from "./program";
import { PluginInfo } from "./plugin-loader";
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

export function validateEdge(plugin: Plugin, src?: ElementValue, dst?: ElementValue, like?: ElementValue) {
    const srcT = src ? src.type.pluginType : undefined;
    const dstT = dst ? dst.type.pluginType : undefined;
    const edgeT = like ? like.type.pluginType : undefined;
    const edgeSource = edgeT ? edgeT.members.get("source") : undefined;
    const edgeDest = edgeT ? edgeT.members.get("destination") : undefined;
    const srcChildren = srcT ? srcT.members.get("children") as Value.ArrayType : undefined;
    const destParents = dstT ? dstT.members.get("parents") as Value.ArrayType : undefined;

    if (srcChildren && edgeT) {
        if (!Type.isSubtype(edgeT, srcChildren.typeParameter)) {
            return false;
        }
    }

    if (destParents && edgeT) {
        if (!Type.isSubtype(edgeT, destParents.typeParameter)) {
            return false;
        }
    }

    if (edgeSource && srcT) {
        if (!Type.isSubtype(srcT, edgeSource)) {
            return false;
        }
    }

    if (edgeDest && dstT) {
        if (!Type.isSubtype(dstT, edgeDest)) {
            return false;
        }
    }


    if (plugin.validateEdge) {
        return plugin.validateEdge(src, dst, like);
    }
    return true;
}



export interface Plugin {
    pluginInfo: PluginInfo;
    readonly types: Readonly<PluginTypes>;

    validateEdge?(src?: ElementValue, dst?: ElementValue, like?: ElementValue): boolean;
    makeProgram(model: Model): Program;
}

const stringType = new Type.Primitive("string");
const numberType = new Type.Primitive("number");
const colorType = new Type.Primitive("color");
const booleanType = new Type.Primitive("boolean");
const pointType = new Type.Record("Point", new Map([["x", numberType], ["y", numberType]]));
const styleType = new Type.Union([new Type.Literal("solid"), new Type.Literal("dotted"), new Type.Literal("dashed")]);

export const drawableNodeType = new Type.CustomObject("DrawableNode", null, new Map<string, Type.Type>([
    ["label", stringType],
    ["color", colorType],
    ["position", pointType],
    ["shape", new Type.Union([new Type.Literal("circle"), new Type.Literal("square"), new Type.Literal("ellipse"), new Type.Literal("rectangle"), new Type.Literal("image")])],
    ["image", stringType],
    ["anchorPoints", new Value.ArrayType(pointType)],
    ["borderColor", colorType],
    ["borderStyle", styleType],
    ["borderWidth", numberType],
]));

export const drawableEdgeType = new Type.CustomObject("DrawableEdge", null, new Map<string, Type.Type>([
    ["label", stringType],
    ["color", colorType],
    ["lineStyle", styleType],
    ["lineWidth", new Type.Union([new Type.Literal(1), new Type.Literal(3), new Type.Literal(5), numberType])],
    ["showSourceArrow", booleanType],
    ["showDestinationArrow", booleanType],
]));

export const drawableGraphType = new Type.CustomObject("DrawableGraph", null, new Map<string, Type.Type>([
]));

export function fromRaw(types: RawPluginTypes): types is PluginTypes {
    const p = types as PluginTypes;
    const nodesUnion = new Type.Union(p.rawNodes);
    const edgesUnion = new Type.Union(p.rawEdges);
    const edgesArray = new Value.ArrayType(edgesUnion);
    const nodesArray = new Value.ArrayType(nodesUnion);

    function unionOrDefault(t: Type.Type | undefined, def: Type.Union) {
        if (!t) {
            return def;
        } else if (t instanceof Type.Union) {
            return t;
        } else {
            return new Type.Union([t]);
        }
    }

    function arrayUnionOrDefault(t: Type.Type | undefined, def: Value.ArrayType, kind: string) {
        if (!t) {
            return def;
        } else if (!(t instanceof Value.ArrayType)) {
            throw new Error(`${kind} must be an array`);
        } else {
            return new Value.ArrayType(unionOrDefault(t.typeParameter, edgesUnion));
        }
    }

    for (const node of p.rawNodes) {
        node.members.set("parents", arrayUnionOrDefault(node.members.get("parents"), edgesArray, "parents"));
        node.members.set("children", arrayUnionOrDefault(node.members.get("children"), edgesArray, "children"));
        node._visibility.set("parents", false);
        node._visibility.set("children", false);
    }
    p.nodes = new ElementUnion(new Set(imap(t => new ElementType(t, drawableNodeType), p.rawNodes)));

    for (const edge of p.rawEdges) {
        edge.members.set("source", unionOrDefault(edge.members.get("source"), nodesUnion));
        edge.members.set("destination", unionOrDefault(edge.members.get("destination"), nodesUnion));
        edge._visibility.set("source", false);
        edge._visibility.set("destination", false);
    }

    p.edges = new ElementUnion(new Set(imap(t => new ElementType(t, drawableEdgeType), p.rawEdges)));
    (edgesArray as any).typeParameter = p.edges;

    p.rawGraph.members.set("nodes", arrayUnionOrDefault(p.rawGraph.members.get("nodes"), nodesArray, "nodes"));
    p.rawGraph.members.set("edges", arrayUnionOrDefault(p.rawGraph.members.get("edges"), edgesArray, "edges"));

    if (!Type.isSubtype(nodesArray, p.rawGraph.members.get("nodes")!)) {
        throw new Error("Graph nodes field must allow all node kinds");
    }

    if (!Type.isSubtype(edgesArray, p.rawGraph.members.get("edges")!)) {
        throw new Error("Graph edges field must allow all edge kinds");
    }

    p.rawGraph._visibility.set("nodes", false);
    p.rawGraph._visibility.set("edges", false);
    p.graph = new ElementType(p.rawGraph, drawableGraphType);

    return true;
}