import { Program } from "./program";
import { InterpreterInfo } from "./plugin-loader";
import { Type } from "sinap-types";
import { Model, ElementType, ElementValue, ElementUnion } from "./model";

export interface Plugin {
    readonly pluginInfo: InterpreterInfo;

    readonly stateType: Type.CustomObject;
    readonly nodesType: ElementUnion;
    readonly edgesType: ElementUnion;
    readonly graphType: ElementType;
    readonly argumentTypes: Type.Type[];
    readonly resultType: Type.Type;

    validateEdge(src: ElementValue, dst?: ElementValue, like?: ElementValue): boolean;
    makeProgram(model: Model): Program;
}
