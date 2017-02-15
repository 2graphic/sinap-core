/// <reference path="../typings/globals/mocha/index.d.ts" />
import { loadPlugin, CoreModel } from "../src/";
import * as assert from "assert";
import * as vm from "vm";

describe("plugin stub", () => {
    const plugin = loadPlugin("test/stub-test-definitions.ts");
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

    function setupTest(model: CoreModel) {
        const script = new vm.Script(plugin.results.js as string);

        const serialGraph = JSON.stringify(model.serialize());

        const sandbox: any = { console: console, global: {} };
        const context = vm.createContext(sandbox);
        script.runInContext(context);
        return [sandbox, context, serialGraph];
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

        const [sandbox, context, serialGraph] = setupTest(model);
        new vm.Script("graph = global['plugin-stub'].deserialize(" + serialGraph + ")").runInContext(context);
        assert.equal(123, sandbox.graph.nodes[0].b.b.b.b.a);
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

        const [sandbox, context, serialGraph] = setupTest(model);
        new vm.Script("graph = global['plugin-stub'].deserialize(" + serialGraph + ")").runInContext(context);
        assert.equal(123, sandbox.graph.edges[0].source.a);
        assert.equal(456, sandbox.graph.edges[0].destination.a);
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

        const [sandbox, context, serialGraph] = setupTest(model);
        new vm.Script("graph = global['plugin-stub'].deserialize(" + serialGraph + ")").runInContext(context);
        assert.equal(456, sandbox.graph.nodes[0].children[0].destination.a);
        assert.equal(123, sandbox.graph.nodes[1].parents[0].source.a);
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

        const [sandbox, context, serialGraph] = setupTest(model);
        new vm.Script("graph = global['plugin-stub'].deserialize(" + serialGraph + ")").runInContext(context);
        new vm.Script("results = global['plugin-stub'].run(graph, 456)").runInContext(context);
        assert.equal(1, sandbox.results.states.length, "only one state");
        assert.equal(123, sandbox.results.result, "correct value");
    });
});