/// <reference path="../typings/globals/mocha/index.d.ts" />
import { loadPluginDir, CoreModel, Plugin, Program, CoreValue, isObjectType } from "../src/";
import { LocalFileService } from "./files-mock";
import * as assert from "assert";
import * as vm from "vm";

describe("plugin stub", () => {
    let plugin: Plugin;
    before((done) => {
        const fs = new LocalFileService();
        fs.directoryByName(fs.joinPath("test", "interpreters", "stub"))
            .then((directory) => loadPluginDir(directory, fs))
            .then((newPlugin) => {
                plugin = newPlugin;
                done();
            });
    });
    it("no dianostic errors", () => {
        assert.deepEqual({ global: [], syntactic: [], semantic: [] }, plugin.results.diagnostics);
    });
    it("runs do it", () => {
        const script = new vm.Script(plugin.results.js as string);
        const sandbox: any = { global: {} };
        const context = vm.createContext(sandbox);
        script.runInContext(context);
        new vm.Script("value = global.plugin.doIt()").runInContext(context);
        assert.equal("Did it", sandbox.value);
    });

    function setupTest(model: CoreModel, sandbox: any = {}) {
        const script = new vm.Script(plugin.results.js as string);

        const serialGraph = JSON.stringify(model.serialize());

        const context = vm.createContext(sandbox);
        script.runInContext(context);
        return [context as any, serialGraph];
    }

    it("gets cyclic structure", () => {
        const model = new CoreModel(plugin, {
            format: "sinap-file-format",
            kind: "TODO: implement this",
            version: "0.0.6",
            elements: [
                {
                    kind: "Node",
                    type: "Node",
                    data: {
                        a: 123,
                        b: { kind: "sinap-pointer", index: 1 }
                    },
                },
                {
                    kind: "Node",
                    type: "Node",
                    data: {
                        a: 456,
                        b: { kind: "sinap-pointer", index: 0 }
                    },
                },
            ]
        });

        const [context, serialGraph] = setupTest(model);
        new vm.Script("graph = global['plugin-stub'].deserialize(" + serialGraph + ")").runInContext(context);
        assert.equal(123, context.graph.nodes[0].b.b.b.b.a);
    });

    it("does source and destination", () => {
        const model = new CoreModel(plugin, {
            format: "sinap-file-format",
            kind: "TODO: implement this",
            version: "0.0.6",
            elements: [
                {
                    kind: "Node",
                    type: "Node",
                    data: {
                        a: 123,
                        b: { kind: "sinap-pointer", index: 1 }
                    },
                },
                {
                    kind: "Node",
                    type: "Node",
                    data: {
                        a: 456,
                        b: { kind: "sinap-pointer", index: 0 }
                    },
                },
                {
                    kind: "Edge",
                    type: "Edge",
                    data: {
                        source: { kind: "sinap-pointer", index: 0 },
                        destination: { kind: "sinap-pointer", index: 1 }
                    },
                },
            ]
        });

        const [context, serialGraph] = setupTest(model);
        new vm.Script("graph = global['plugin-stub'].deserialize(" + serialGraph + ")").runInContext(context);
        assert.equal(123, context.graph.edges[0].source.a);
        assert.equal(456, context.graph.edges[0].destination.a);
    });

    it("does parents and children", () => {
        const model = new CoreModel(plugin, {
            format: "sinap-file-format",
            kind: "TODO: implement this",
            version: "0.0.6",
            elements: [
                {
                    kind: "Node",
                    type: "Node",
                    data: {
                        a: 123,
                        b: { kind: "sinap-pointer", index: 1 }
                    },
                },
                {
                    kind: "Node",
                    type: "Node",
                    data: {
                        a: 456,
                        b: { kind: "sinap-pointer", index: 0 }
                    },
                },
                {
                    kind: "Edge",
                    type: "Edge",
                    data: {
                        source: { kind: "sinap-pointer", index: 0 },
                        destination: { kind: "sinap-pointer", index: 1 }
                    },
                },
            ]
        });

        const [context, serialGraph] = setupTest(model);
        new vm.Script("graph = global['plugin-stub'].deserialize(" + serialGraph + ")").runInContext(context);
        assert.equal(456, context.graph.nodes[0].children[0].destination.a);
        assert.equal(123, context.graph.nodes[1].parents[0].source.a);
    });


    it("does states", () => {
        const model = new CoreModel(plugin, {
            format: "sinap-file-format",
            kind: "TODO: implement this",
            version: "0.0.6",
            elements: [
                {
                    kind: "Node",
                    type: "Node",
                    data: {
                        a: 123,
                        b: { kind: "sinap-pointer", index: 1 }
                    },
                },
                {
                    kind: "Node",
                    type: "Node",
                    data: {
                        a: 456,
                        b: { kind: "sinap-pointer", index: 0 }
                    },
                },
                {
                    kind: "Edge",
                    type: "Edge",
                    data: {
                        source: { kind: "sinap-pointer", index: 0 },
                        destination: { kind: "sinap-pointer", index: 1 }
                    },
                },
            ]
        });

        const [context, serialGraph] = setupTest(model, { global: { "plugin-stub": { "Program": null } } });

        const pluginProg = new context.global["plugin-stub"].Program(JSON.parse(serialGraph));
        const prog = new Program(pluginProg, plugin);
        const numberType = plugin.typeEnvironment.getNumberType();

        assert.equal(1, prog.run([new CoreValue(numberType, 456)]).states.length, "only one state");
        assert.equal(123, prog.run([new CoreValue(numberType, 456)]).result.value, "correct value");
    });

    it("fails on bad graph", () => {
        const script = new vm.Script(plugin.results.js as string);
        const context = vm.createContext({ global: { "plugin-stub": { "Program": null } } });
        script.runInContext(context);
        const pluginProg = new (context as any).global["plugin-stub"].Program({ elements: [] });
        const prog = new Program(pluginProg, plugin);
        const numberType = plugin.typeEnvironment.getStringType();

        assert.throws(() => prog.run([new CoreValue(numberType, 456)]));
    });

    it("has sinap types", () => {
        const color = plugin.typeEnvironment.lookupSinapType("Color")!;
        const drawableNode = plugin.typeEnvironment.lookupSinapType("DrawableNode");
        if (!isObjectType(drawableNode)) {
            throw new Error("drawable node isn't object type");
        }
        const borderColor = drawableNode.members.get("borderColor")!;

        assert.equal(true, borderColor.isAssignableTo(color));
    });
});