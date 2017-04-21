import { Type } from "sinap-types";
import { Plugin, Model, Program, PluginTypes, RawPluginTypes, fromRaw, PluginInfo } from ".";


const stringType = new Type.Primitive("string");

export class ExamplePlugin implements Plugin {
    types: PluginTypes;

    constructor(readonly pluginInfo: PluginInfo, graphMembers: [string, Type.Type][], nodeTypes?: Type.CustomObject[], edgeTypes?: Type.CustomObject[]) {
        const types: RawPluginTypes = {
            state: new Type.CustomObject("State", null, new Map([['hello', stringType]])),
            rawNodes: nodeTypes || [new Type.CustomObject("Node", null, new Map())],
            rawEdges: edgeTypes || [new Type.CustomObject("Edge", null, new Map())],
            rawGraph: new Type.CustomObject("Graph", null, new Map(graphMembers)),
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

    async makeProgram(model: Model): Promise<Program> {
        return {
            plugin: this,
            model: model,
            validate: () => null,
            run: () => { return Promise.resolve({ steps: [] }); }
        };
    }
}