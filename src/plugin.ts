import { Program } from "./program";
import { InterpreterInfo } from "./plugin-loader";
import { Type, Value } from "sinap-types";
import { Model } from "./model";

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


export interface Plugin {
    readonly pluginInfo: InterpreterInfo;

    readonly stateType: Type.CustomObject;
    readonly nodesType: Type.Union;
    readonly edgesType: Type.Union;
    readonly graphType: Type.Intersection;
    readonly argumentTypes: Type.Type[];
    readonly resultType: Type.Type;

    validateEdge(src: Value.Intersection, dst?: Value.Intersection, like?: Value.Intersection): boolean;
    makeProgram(model: Model): Program;
}
