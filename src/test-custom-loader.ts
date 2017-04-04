import { Type } from "sinap-types";
import { ElementType, Plugin, drawableNodeType, ElementUnion, drawableEdgeType, drawableGraphType, InterpreterInfo, Model, Program } from ".";


const stringType = new Type.Primitive("string");

export class ExamplePlugin implements Plugin {
    stateType = new Type.CustomObject("State", null, new Map([['hello', stringType]]));
    nodesType = new ElementUnion(new Set([new ElementType(new Type.CustomObject("Node", null, new Map()), drawableNodeType)]));
    edgesType = new ElementUnion(new Set([new ElementType(new Type.CustomObject("Edge", null, new Map()), drawableEdgeType)]));
    graphType = new ElementType(new Type.CustomObject("Graph", null, new Map([['hello', stringType]])), drawableGraphType);
    argumentTypes = [stringType];
    resultType = stringType;

    constructor(readonly pluginInfo: InterpreterInfo) {

    }

    validateEdge(): boolean {
        return true;
    }

    makeProgram(model: Model): Program {
        return {
            plugin: this,
            model: model,
            environment: model.environment,
            validate: () => null,
            run: () => { return { steps: [] }; }
        };
    }
}