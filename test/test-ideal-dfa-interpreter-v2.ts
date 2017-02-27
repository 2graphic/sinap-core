/// <reference path="../typings/globals/mocha/index.d.ts" />
import { loadPluginDir, CoreModel, CoreElementKind, Plugin, Program, makeValue } from "../src/";
import { LocalFileService } from "./files-mock";
import * as assert from "assert";
import * as vm from "vm";

describe("test ideal v2", () => {
    let plugin: Plugin;

    before(function(done) {
        const fileService = new LocalFileService();
        fileService.directoryByName("test/interpreters/ideal-dfa-interpreter-v2").then((directory) => {
            return loadPluginDir(directory, fileService);
        })
            .then((locPlug) => {
                plugin = locPlug;
                done();
            });
    });
    it("no dianostic errors", () => {
        assert.deepEqual({ global: [], syntactic: [], semantic: [] }, plugin.results.diagnostics);
    });

    function setupTest(model: CoreModel) {
        const script = new vm.Script(plugin.results.js as string);

        const serialGraph = JSON.stringify(model.serialize());

        const sandbox: any = { console: console, global: {} };
        const context = vm.createContext(sandbox);
        script.runInContext(context);
        return [context as any, serialGraph];
    }

    it("does nice names", () => {
        assert.equal("Accept State", plugin.typeEnvironment.getElementType(CoreElementKind.Node, "DFANode").prettyNames.get("isAcceptState"));
        assert.equal("Symbol", plugin.typeEnvironment.getElementType(CoreElementKind.Edge, "DFAEdge").prettyNames.get("label"));
        assert.equal("Children", plugin.typeEnvironment.getElementType(CoreElementKind.Node, "DFANode").prettyNames.get("children"));
    });

    it("computes divisibility", () => {
        const model = new CoreModel(plugin, {
            format: "sinap-file-format",
            kind: ["Formal Languages", "DFA"],
            version: "0.0.7",
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

        const [context, serialGraph] = setupTest(model);
        const plugProg = new context.global["plugin-stub"].Program(JSON.parse(serialGraph));
        const prog = new Program(plugProg, plugin);

        let results;
        results = prog.run([makeValue("11", plugin.typeEnvironment)]);
        assert.equal(3, results.states.length, "correct number of states");
        assert.equal(true, results.result.value, "correct value");
        results = prog.run([makeValue("", plugin.typeEnvironment)]);
        assert.equal(1, results.states.length, "correct number of states");
        assert.equal(true, results.result.value, "correct value");
        results = prog.run([makeValue("101", plugin.typeEnvironment)]);
        assert.equal(4, results.states.length, "correct number of states");
        assert.equal(false, results.result.value, "correct value");
        results = prog.run([makeValue("1000", plugin.typeEnvironment)]);
        assert.equal(5, results.states.length, "correct number of states");
        assert.equal(false, results.result.value, "correct value");
        results = prog.run([makeValue("1001", plugin.typeEnvironment)]);
        assert.equal(5, results.states.length, "correct number of states");
        assert.equal(true, results.result.value, "correct value");
        results = prog.run([makeValue("01", plugin.typeEnvironment)]);
        assert.equal(3, results.states.length, "correct number of states");
        assert.equal(false, results.result.value, "correct value");
        results = prog.run([makeValue("011", plugin.typeEnvironment)]);
        assert.equal(4, results.states.length, "correct number of states");
        assert.equal(true, results.result.value, "correct value");

        for (let x = 0; x < 10000; x++) {
            assert.equal(x % 3 === 0, prog.run([makeValue(x.toString(2), plugin.typeEnvironment)]).result.value);
        }

    });

    it("computes divisibility (many prog instances)", () => {
        const model = new CoreModel(plugin, {
            format: "sinap-file-format",
            kind: ["Formal Languages", "DFA"],
            version: "0.0.7",
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

        const [context, serialGraph] = setupTest(model);

        for (let x = 0; x < 1000; x++) {
            const plugProg = new context.global["plugin-stub"].Program(JSON.parse(serialGraph));
            const prog = new Program(plugProg, plugin);
            assert.equal(x % 3 === 0, prog.run([makeValue(x.toString(2), plugin.typeEnvironment)]).result.value);
        }

    });
});