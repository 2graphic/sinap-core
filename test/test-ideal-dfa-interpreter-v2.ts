/// <reference path="../typings/globals/mocha/index.d.ts" />
import { loadPlugin, CoreModel } from "../src/";
import * as assert from "assert";
import * as vm from "vm";

describe("test ideal v2", () => {
    const plugin = loadPlugin("test/ideal-dfa-interpreter-v2.ts");
    it("no dianostic errors", () => {
        assert.deepEqual({ global: [], syntactic: [], semantic: [] }, plugin.results.diagnostics);
    });

    function setupTest(model: CoreModel) {
        const script = new vm.Script(plugin.results.js as string);

        const serialGraph = JSON.stringify(model.serialize());

        const sandbox: any = { console: console, global: {} };
        const context = vm.createContext(sandbox);
        script.runInContext(context);
        return [sandbox, context, serialGraph];
    }

    it("computes divisibility", () => {
        const model = new CoreModel(plugin, {
            format: "sinap-file-format",
            kind: "TODO: implement this",
            version: "0.0.6",
            elements: [
                {
                    kind: "Graph",
                    type: "DFAGraph",
                    data: {
                        startState: { kind: "sinap-pointer", index: 1 },
                    }
                },
                {
                    kind: "Node",
                    type: "DFANode",
                    data: {
                        isAcceptState: true,
                        label: "q0",
                    },
                },
                {
                    kind: "Node",
                    type: "DFANode",
                    data: {
                        isAcceptState: false,
                        label: "q1",
                    },
                },
                {
                    kind: "Node",
                    type: "DFANode",
                    data: {
                        isAcceptState: false,
                        label: "q2",
                    },
                },
                {
                    kind: "Edge",
                    type: "DFAEdge",
                    data: {
                        label: "0",
                        source: { kind: "sinap-pointer", index: 1 },
                        destination: { kind: "sinap-pointer", index: 1 }
                    },
                },
                {
                    kind: "Edge",
                    type: "DFAEdge",
                    data: {
                        label: "1",
                        source: { kind: "sinap-pointer", index: 1 },
                        destination: { kind: "sinap-pointer", index: 2 }
                    },
                },
                {
                    kind: "Edge",
                    type: "DFAEdge",
                    data: {
                        label: "1",
                        source: { kind: "sinap-pointer", index: 2 },
                        destination: { kind: "sinap-pointer", index: 1 }
                    },
                },
                {
                    kind: "Edge",
                    type: "DFAEdge",
                    data: {
                        label: "0",
                        source: { kind: "sinap-pointer", index: 2 },
                        destination: { kind: "sinap-pointer", index: 3 }
                    },
                },
                {
                    kind: "Edge",
                    type: "DFAEdge",
                    data: {
                        label: "0",
                        source: { kind: "sinap-pointer", index: 3 },
                        destination: { kind: "sinap-pointer", index: 2 }
                    },
                },
                {
                    kind: "Edge",
                    type: "DFAEdge",
                    data: {
                        label: "1",
                        source: { kind: "sinap-pointer", index: 3 },
                        destination: { kind: "sinap-pointer", index: 3 }
                    },
                },
            ]
        });

        const [sandbox, context, serialGraph] = setupTest(model);
        new vm.Script("graph = global['plugin-stub'].deserialize(" + serialGraph + ")").runInContext(context);
        new vm.Script("results = global['plugin-stub'].run(graph, '11')").runInContext(context);
        assert.equal(3, sandbox.results.states.length, "correct number of states");
        assert.equal(true, sandbox.results.result, "correct value");
        new vm.Script("results = global['plugin-stub'].run(graph, '')").runInContext(context);
        assert.equal(1, sandbox.results.states.length, "correct number of states");
        assert.equal(true, sandbox.results.result, "correct value");
        new vm.Script("results = global['plugin-stub'].run(graph, '101')").runInContext(context);
        assert.equal(4, sandbox.results.states.length, "correct number of states");
        assert.equal(false, sandbox.results.result, "correct value");
        new vm.Script("results = global['plugin-stub'].run(graph, '1000')").runInContext(context);
        assert.equal(5, sandbox.results.states.length, "correct number of states");
        assert.equal(false, sandbox.results.result, "correct value");
        new vm.Script("results = global['plugin-stub'].run(graph, '1001')").runInContext(context);
        assert.equal(5, sandbox.results.states.length, "correct number of states");
        assert.equal(true, sandbox.results.result, "correct value");
        new vm.Script("results = global['plugin-stub'].run(graph, '01')").runInContext(context);
        assert.equal(3, sandbox.results.states.length, "correct number of states");
        assert.equal(false, sandbox.results.result, "correct value");
        new vm.Script("results = global['plugin-stub'].run(graph, '011')").runInContext(context);
        assert.equal(4, sandbox.results.states.length, "correct number of states");
        assert.equal(true, sandbox.results.result, "correct value");
    });
});