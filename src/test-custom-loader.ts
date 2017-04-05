import { Type } from "sinap-types";
import { Plugin, InterpreterInfo, Model, Program, PluginTypes, RawPluginTypes, fromRaw } from ".";


const stringType = new Type.Primitive("string");

export class ExamplePlugin implements Plugin {
    types: PluginTypes;

    constructor(readonly pluginInfo: InterpreterInfo) {
        const types: RawPluginTypes = {
            state: new Type.CustomObject("State", null, new Map([['hello', stringType]])),
            rawNodes: [new Type.CustomObject("Node", null, new Map())],
            rawEdges: [new Type.CustomObject("Edge", null, new Map())],
            rawGraph: new Type.CustomObject("Graph", null, new Map([['hello', stringType]])),
            arguments: [stringType],
            result: stringType,
        };
        if (fromRaw(types)) {
            this.types = types;
        }
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