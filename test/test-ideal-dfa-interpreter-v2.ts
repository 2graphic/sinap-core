/// <reference path="../typings/globals/mocha/index.d.ts" />
/// <reference path="../typings/modules/chai/index.d.ts" />

import { loadPluginDir, CoreModel, CoreElementKind, Plugin, Program } from "../src/";
import { LocalFileService } from "./files-mock";
import * as assert from "assert";
import * as vm from "vm";
import { runProg } from "./test-interpreters";


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

    function setupTest() {
        const script = new vm.Script(plugin.results.js as string);

        const sandbox: any = { console: console, global: {} };
        const context = vm.createContext(sandbox);
        script.runInContext(context);
        return context as any;
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
            version: "0.0.8",
            elements: [
                {
                    kind: "Graph",
                    type: "DFAGraph",
                    uuid: "0",
                    data: {
                        startState: { kind: "sinap-pointer", uuid: "1" },
                    }
                },
                {
                    kind: "Node",
                    type: "DFANode",
                    uuid: "1",
                    data: {
                        isAcceptState: true,
                        label: "q0",
                    },
                },
                {
                    kind: "Node",
                    type: "DFANode",
                    uuid: "2",
                    data: {
                        isAcceptState: false,
                        label: "q1",
                    },
                },
                {
                    kind: "Node",
                    type: "DFANode",
                    uuid: "3",
                    data: {
                        isAcceptState: false,
                        label: "q2",
                    },
                },
                {
                    kind: "Edge",
                    type: "DFAEdge",
                    uuid: "4",
                    data: {
                        label: "0",
                        source: { kind: "sinap-pointer", uuid: "1" },
                        destination: { kind: "sinap-pointer", uuid: "1" }
                    },
                },
                {
                    kind: "Edge",
                    type: "DFAEdge",
                    uuid: "5",
                    data: {
                        label: "1",
                        source: { kind: "sinap-pointer", uuid: "1" },
                        destination: { kind: "sinap-pointer", uuid: "2" }
                    },
                },
                {
                    kind: "Edge",
                    type: "DFAEdge",
                    uuid: "6",
                    data: {
                        label: "1",
                        source: { kind: "sinap-pointer", uuid: "2" },
                        destination: { kind: "sinap-pointer", uuid: "1" }
                    },
                },
                {
                    kind: "Edge",
                    type: "DFAEdge",
                    uuid: "7",
                    data: {
                        label: "0",
                        source: { kind: "sinap-pointer", uuid: "2" },
                        destination: { kind: "sinap-pointer", uuid: "3" }
                    },
                },
                {
                    kind: "Edge",
                    type: "DFAEdge",
                    uuid: "8",
                    data: {
                        label: "0",
                        source: { kind: "sinap-pointer", uuid: "3" },
                        destination: { kind: "sinap-pointer", uuid: "2" }
                    },
                },
                {
                    kind: "Edge",
                    type: "DFAEdge",
                    uuid: "9",
                    data: {
                        label: "1",
                        source: { kind: "sinap-pointer", uuid: "3" },
                        destination: { kind: "sinap-pointer", uuid: "3" }
                    },
                },
            ]
        });

        const context = setupTest();
        const prog = new Program(model, context.global["plugin-stub"].Program);

        for (let x = 0; x < 100; x++) {
            const input = x.toString(2);
            runProg(prog, input, input.length + 1, x % 3 === 0, plugin);
        }

    });

    it("computes divisibility (many prog instances)", () => {
        const model = new CoreModel(plugin, {
            format: "sinap-file-format",
            kind: ["Formal Languages", "DFA"],
            version: "0.0.8",
            elements: [
                {
                    kind: "Graph",
                    type: "DFAGraph",
                    uuid: "0",
                    data: {
                        startState: { kind: "sinap-pointer", uuid: "1" },
                    }
                },
                {
                    kind: "Node",
                    type: "DFANode",
                    uuid: "1",
                    data: {
                        isAcceptState: true,
                        label: "q0",
                    },
                },
                {
                    kind: "Node",
                    type: "DFANode",
                    uuid: "2",
                    data: {
                        isAcceptState: false,
                        label: "q1",
                    },
                },
                {
                    kind: "Node",
                    type: "DFANode",
                    uuid: "3",
                    data: {
                        isAcceptState: false,
                        label: "q2",
                    },
                },
                {
                    kind: "Edge",
                    type: "DFAEdge",
                    uuid: "4",
                    data: {
                        label: "0",
                        source: { kind: "sinap-pointer", uuid: "1" },
                        destination: { kind: "sinap-pointer", uuid: "1" }
                    },
                },
                {
                    kind: "Edge",
                    type: "DFAEdge",
                    uuid: "5",
                    data: {
                        label: "1",
                        source: { kind: "sinap-pointer", uuid: "1" },
                        destination: { kind: "sinap-pointer", uuid: "2" }
                    },
                },
                {
                    kind: "Edge",
                    type: "DFAEdge",
                    uuid: "6",
                    data: {
                        label: "1",
                        source: { kind: "sinap-pointer", uuid: "2" },
                        destination: { kind: "sinap-pointer", uuid: "1" }
                    },
                },
                {
                    kind: "Edge",
                    type: "DFAEdge",
                    uuid: "7",
                    data: {
                        label: "0",
                        source: { kind: "sinap-pointer", uuid: "2" },
                        destination: { kind: "sinap-pointer", uuid: "3" }
                    },
                },
                {
                    kind: "Edge",
                    type: "DFAEdge",
                    uuid: "8",
                    data: {
                        label: "0",
                        source: { kind: "sinap-pointer", uuid: "3" },
                        destination: { kind: "sinap-pointer", uuid: "2" }
                    },
                },
                {
                    kind: "Edge",
                    type: "DFAEdge",
                    uuid: "9",
                    data: {
                        label: "1",
                        source: { kind: "sinap-pointer", uuid: "3" },
                        destination: { kind: "sinap-pointer", uuid: "3" }
                    },
                },
            ]
        });

        const context = setupTest();

        for (let x = 0; x < 100; x++) {
            const prog = new Program(model, context.global["plugin-stub"].Program);
            const input = x.toString(2);
            runProg(prog, input, input.length + 1, x % 3 === 0, plugin);
        }

    });
});