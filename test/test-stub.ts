/// <reference path="../typings/globals/mocha/index.d.ts" />
/// <reference path="../typings/modules/chai/index.d.ts" />

import { loadPluginDir, CoreModel, Plugin, Program, makeValue, isObjectType, PluginTypeEnvironment } from "../src/";
import { LocalFileService } from "./files-mock";
import * as vm from "vm";
import { expect } from "chai";

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
        expect(plugin.results.diagnostics)
            .to.deep.equal({ global: [], syntactic: [], semantic: [] });
    });
    it("runs do it", () => {
        const script = new vm.Script(plugin.results.js as string);
        const sandbox: any = { global: {} };
        const context = vm.createContext(sandbox);
        script.runInContext(context);
        new vm.Script("value = global.plugin.doIt()").runInContext(context);
        expect(sandbox.value).to.equal("Did it");
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
            kind: ["test"],
            version: "0.0.8",
            elements: [
                {
                    kind: "Node",
                    type: "Node",
                    uuid: "1",
                    data: {
                        a: 123,
                        b: { kind: "sinap-pointer", uuid: "1" }
                    },
                },
                {
                    kind: "Node",
                    type: "Node",
                    uuid: "2",
                    data: {
                        a: 456,
                        b: { kind: "sinap-pointer", uuid: "0" }
                    },
                },
            ]
        });

        const [context, serialGraph] = setupTest(model);
        new vm.Script("graph = global['plugin-stub'].deserialize(" + serialGraph + ")").runInContext(context);
        expect(context.graph.nodes[0].b.b.b.b.a).to.equal(123);
    });

    it("does source and destination", () => {
        const model = new CoreModel(plugin, {
            format: "sinap-file-format",
            kind: ["test"],
            version: "0.0.8",
            elements: [
                {
                    kind: "Node",
                    type: "Node",
                    uuid: "0",
                    data: {
                        a: 123,
                        b: { kind: "sinap-pointer", uuid: "1" }
                    },
                },
                {
                    kind: "Node",
                    type: "Node",
                    uuid: "1",
                    data: {
                        a: 456,
                        b: { kind: "sinap-pointer", uuid: "0" }
                    },
                },
                {
                    kind: "Edge",
                    type: "Edge",
                    uuid: "2",
                    data: {
                        source: { kind: "sinap-pointer", uuid: "0" },
                        destination: { kind: "sinap-pointer", uuid: "1" }
                    },
                },
            ]
        });

        const [context, serialGraph] = setupTest(model);
        new vm.Script("graph = global['plugin-stub'].deserialize(" + serialGraph + ")").runInContext(context);
        expect(context.graph.edges[0].source.a).to.equal(123);
        expect(context.graph.edges[0].destination.a).to.equal(456);
    });

    it("does parents and children", () => {
        const model = new CoreModel(plugin, {
            format: "sinap-file-format",
            kind: ["test"],
            version: "0.0.8",
            elements: [
                {
                    kind: "Node",
                    type: "Node",
                    uuid: "0",
                    data: {
                        a: 123,
                        b: { kind: "sinap-pointer", uuid: "1" }
                    },
                },
                {
                    kind: "Node",
                    type: "Node",
                    uuid: "1",
                    data: {
                        a: 456,
                        b: { kind: "sinap-pointer", uuid: "0" }
                    },
                },
                {
                    kind: "Edge",
                    type: "Edge",
                    uuid: "2",
                    data: {
                        source: { kind: "sinap-pointer", uuid: "0" },
                        destination: { kind: "sinap-pointer", uuid: "1" }
                    },
                },
            ]
        });

        const [context, serialGraph] = setupTest(model);
        new vm.Script("graph = global['plugin-stub'].deserialize(" + serialGraph + ")").runInContext(context);
        expect(context.graph.nodes[0].children[0].destination.a).to.equal(456);
        expect(context.graph.nodes[1].parents[0].source.a).to.equal(123);
    });


    it("does states", () => {
        const model = new CoreModel(plugin, {
            format: "sinap-file-format",
            kind: ["test"],
            version: "0.0.8",
            elements: [
                {
                    kind: "Node",
                    type: "Node",
                    uuid: "0",
                    data: {
                        a: 123,
                        b: { kind: "sinap-pointer", uuid: "1" }
                    },
                },
                {
                    kind: "Node",
                    type: "Node",
                    uuid: "1",
                    data: {
                        a: 456,
                        b: { kind: "sinap-pointer", uuid: "0" }
                    },
                },
                {
                    kind: "Edge",
                    type: "Edge",
                    uuid: "2",
                    data: {
                        source: { kind: "sinap-pointer", uuid: "0" },
                        destination: { kind: "sinap-pointer", uuid: "1" }
                    },
                },
            ]
        });

        const [context, serialGraph] = setupTest(model, { global: { "plugin-stub": { "Program": null } } });

        const pluginProg = new context.global["plugin-stub"].Program(JSON.parse(serialGraph));
        const prog = new Program(pluginProg, plugin);
        const numberType = plugin.typeEnvironment.getNumberType();

        expect((prog.run([makeValue<PluginTypeEnvironment>(numberType, 456, false)]).states.length))
            .to.equal(1, "only one state");
        expect((prog.run([makeValue<PluginTypeEnvironment>(numberType.env, 456, false)]).result as any).data)
            .to.equal(123, "correct value");
    });

    it("fails on bad graph", () => {
        const script = new vm.Script(plugin.results.js as string);
        const context = vm.createContext({ global: { "plugin-stub": { "Program": null } } });
        script.runInContext(context);
        const pluginProg = new (context as any).global["plugin-stub"].Program({ elements: [] });
        const prog = new Program(pluginProg, plugin);
        const numberType = plugin.typeEnvironment.getStringType();
        const errorType = plugin.typeEnvironment.lookupGlobalType("Error");

        expect(prog.run([makeValue<PluginTypeEnvironment>(numberType.env, 456, false)]).result.type)
            .to.equal(errorType);
        expect((prog.run([makeValue<PluginTypeEnvironment>(numberType.env, 456, false)]) as any).result.get("message").data)
            .to.equal("Cannot read property 'parents' of undefined");
    });

    it("has sinap types", () => {
        const color = plugin.typeEnvironment.lookupSinapType("Color")!;
        const drawableNode = plugin.typeEnvironment.lookupSinapType("DrawableNode");
        if (!isObjectType(drawableNode)) {
            throw new Error("drawable node isn't object type");
        }
        const borderColor = drawableNode.members.get("borderColor")!;

        expect(borderColor.isAssignableTo(color))
            .to.be.true;
    });
});