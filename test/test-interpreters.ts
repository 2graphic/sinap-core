/// <reference path="../typings/globals/mocha/index.d.ts" />
/// <reference path="../typings/modules/chai/index.d.ts" />

import { expect } from "chai";
import {
    loadPluginDir,
    CoreModel,
    Plugin,
    makeValue,
    Program,
    CorePrimitiveValue,
    CoreUnionValue,
    CoreObjectValue,
    CoreElementKind,
    CoreValue,
    CoreIntersectionValue,
    PluginTypeEnvironment,
} from "../src/";
import * as assert from "assert";
import * as vm from "vm";
import * as path from "path";

export function runProg(prog: Program, input: string, states: number, resultE: boolean, plugin: Plugin) {
    const results = prog.run([makeValue(plugin.typeEnvironment, input, false)]);
    assert.equal(states, results.states.length, "correct number of states");
    if (results.result instanceof CoreUnionValue && results.result.value instanceof CorePrimitiveValue) {
        assert.equal(resultE, results.result.value.data, "correct value");
    } else {
        throw new Error("result should be a primitive value");
    }
}

export function checkError(prog: Program, input: string, errorMessage: string, plugin: Plugin) {
    const result = prog.run([makeValue(plugin.typeEnvironment, input, false)]);
    assert.equal(plugin.typeEnvironment.lookupGlobalType("Error"), result.result.type);
    let passed = false;
    if (result.result instanceof CoreObjectValue) {
        const msg = result.result.get("message");
        if (msg instanceof CorePrimitiveValue) {
            assert.equal(errorMessage, msg.data);
            passed = true;
        }
    }
    assert.equal(true, passed, "Not a CoreValue and Primitive");
}

describe("various interpreters", () => {
    function setupTest(plugin: Plugin, model: CoreModel) {
        const script = new vm.Script(plugin.results.js as string);

        const serialGraph = JSON.stringify(model.serialize());

        const sandbox: any = { console: console, global: {} };
        const context = vm.createContext(sandbox);
        script.runInContext(context);
        return [context as any, serialGraph];
    }

    function loadTestPlugin(name: string): Promise<Plugin> {
        return loadPluginDir(path.join("interpreters", name));
    }

    describe("dfa", () => {
        let dfa: Plugin;
        before((done) => {
            loadTestPlugin("dfa").then((dfaPlugin) => {
                dfa = dfaPlugin;
                done();
            });
        });
        it("computes divisibility", () => {
            const model = new CoreModel(dfa, {
                format: "sinap-file-format",
                kind: ["Formal Languages", "DFA"],
                version: "0.0.8",
                elements: [
                    {
                        kind: "Graph",
                        type: "DFAGraph",
                        uuid: "0",
                        data: {
                        }
                    },
                    {
                        kind: "Node",
                        type: "DFANode",
                        uuid: "1",
                        data: {
                            isStartState: true,
                            isAcceptState: true,
                            label: "q0",
                        },
                    },
                    {
                        kind: "Node",
                        type: "DFANode",
                        uuid: "2",
                        data: {
                            isStartState: false,
                            isAcceptState: false,
                            label: "q1",
                        },
                    },
                    {
                        kind: "Node",
                        type: "DFANode",
                        uuid: "3",
                        data: {
                            isStartState: false,
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

            const [context, serialGraph] = setupTest(dfa, model);
            const pluginProg = new context.global["plugin-stub"].Program(JSON.parse(serialGraph));
            const prog = new Program(pluginProg, dfa);

            const results = prog.run([makeValue(dfa.typeEnvironment, "1101", false)]);
            // TODO: this will need to check for states better
            expect(results.states.map((s) => (s as any).values.active)).to.deep.equal(["1", "2", "1", "1", "2"]);

            for (let x = 0; x < 100; x++) {
                const input = x.toString(2);
                runProg(prog, input, input.length + 1, x % 3 === 0, dfa);
            }

        });
        it("checks for 1 start states", () => {
            const model = new CoreModel(dfa, {
                format: "sinap-file-format",
                kind: ["Formal Languages", "DFA"],
                version: "0.0.8",
                elements: [
                    {
                        kind: "Graph",
                        type: "DFAGraph",
                        uuid: "0",
                        data: {
                        }
                    },
                    {
                        kind: "Node",
                        type: "DFANode",
                        uuid: "1",
                        data: {
                            isStartState: true,
                            isAcceptState: true,
                            label: "q0",
                        },
                    },
                    {
                        kind: "Node",
                        type: "DFANode",
                        uuid: "2",
                        data: {
                            isStartState: true,
                            isAcceptState: false,
                            label: "q1",
                        },
                    },
                    {
                        kind: "Node",
                        type: "DFANode",
                        uuid: "3",
                        data: {
                            isStartState: false,
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

            const [context, serialGraph] = setupTest(dfa, model);
            const dfaProg = new context.global["plugin-stub"].Program(JSON.parse(serialGraph));
            const prog = new Program(dfaProg, dfa);

            checkError(prog, "11", "Only one start state allowed", dfa);
        });
        it("checks for 0 start states", () => {
            const model = new CoreModel(dfa, {
                format: "sinap-file-format",
                kind: ["Formal Languages", "DFA"],
                version: "0.0.8",
                elements: [
                    {
                        kind: "Graph",
                        type: "DFAGraph",
                        uuid: "0",
                        data: {
                        }
                    },
                    {
                        kind: "Node",
                        type: "DFANode",
                        uuid: "1",
                        data: {
                            isStartState: false,
                            isAcceptState: true,
                            label: "q0",
                        },
                    },
                    {
                        kind: "Node",
                        type: "DFANode",
                        uuid: "2",
                        data: {
                            isStartState: false,
                            isAcceptState: false,
                            label: "q1",
                        },
                    },
                    {
                        kind: "Node",
                        type: "DFANode",
                        uuid: "3",
                        data: {
                            isStartState: false,
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

            const [context, serialGraph] = setupTest(dfa, model);
            const pluginProg = new context.global["plugin-stub"].Program(JSON.parse(serialGraph));
            const prog = new Program(pluginProg, dfa);

            checkError(prog, "11", "Must have one start state", dfa);
        });
        it("checks for empty transitions", () => {
            const model = new CoreModel(dfa, {
                format: "sinap-file-format",
                kind: ["Formal Languages", "DFA"],
                version: "0.0.8",
                elements: [
                    {
                        kind: "Graph",
                        type: "DFAGraph",
                        uuid: "0",
                        data: {
                        }
                    },
                    {
                        kind: "Node",
                        type: "DFANode",
                        uuid: "1",
                        data: {
                            isStartState: true,
                            isAcceptState: true,
                            label: "q0",
                        },
                    },
                    {
                        kind: "Node",
                        type: "DFANode",
                        uuid: "2",
                        data: {
                            isStartState: false,
                            isAcceptState: false,
                            label: "q1",
                        },
                    },
                    {
                        kind: "Node",
                        type: "DFANode",
                        uuid: "3",
                        data: {
                            isStartState: false,
                            isAcceptState: false,
                            label: "q2",
                        },
                    },
                    {
                        kind: "Edge",
                        type: "DFAEdge",
                        uuid: "4",
                        data: {
                            label: "",
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

            const [context, serialGraph] = setupTest(dfa, model);
            const pluginProg = new context.global["plugin-stub"].Program(JSON.parse(serialGraph));
            const prog = new Program(pluginProg, dfa);

            checkError(prog, "11", "Lambda transition from q0 to q0 is not allowed", dfa);
        });
        it("checks for two character transitions", () => {
            const model = new CoreModel(dfa, {
                format: "sinap-file-format",
                kind: ["Formal Languages", "DFA"],
                version: "0.0.8",
                elements: [
                    {
                        kind: "Graph",
                        type: "DFAGraph",
                        uuid: "0",
                        data: {
                        }
                    },
                    {
                        kind: "Node",
                        type: "DFANode",
                        uuid: "1",
                        data: {
                            isStartState: true,
                            isAcceptState: true,
                            label: "q0",
                        },
                    },
                    {
                        kind: "Node",
                        type: "DFANode",
                        uuid: "2",
                        data: {
                            isStartState: false,
                            isAcceptState: false,
                            label: "q1",
                        },
                    },
                    {
                        kind: "Node",
                        type: "DFANode",
                        uuid: "3",
                        data: {
                            isStartState: false,
                            isAcceptState: false,
                            label: "q2",
                        },
                    },
                    {
                        kind: "Edge",
                        type: "DFAEdge",
                        uuid: "4",
                        data: {
                            label: "23",
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

            const [context, serialGraph] = setupTest(dfa, model);
            const pluginProg = new context.global["plugin-stub"].Program(JSON.parse(serialGraph));
            const prog = new Program(pluginProg, dfa);

            checkError(prog, "11", "Edge 23 must be one symbol", dfa);
        });
    });
    describe("nfa", () => {
        let nfa: Plugin;
        before((done) => {
            loadTestPlugin("nfa").then((nfaPlugin) => {
                nfa = nfaPlugin;
                done();
            });
        });
        it("computes divisibility", () => {
            const model = new CoreModel(nfa, {
                format: "sinap-file-format",
                kind: ["Formal Languages", "NFA"],
                version: "0.0.8",
                elements: [
                    {
                        kind: "Graph",
                        type: "NFAGraph",
                        uuid: "0",
                        data: {
                        }
                    },
                    {
                        kind: "Node",
                        type: "NFANode",
                        uuid: "1",
                        data: {
                            isStartState: true,
                            isAcceptState: true,
                            label: "q0",
                        },
                    },
                    {
                        kind: "Node",
                        type: "NFANode",
                        uuid: "2",
                        data: {
                            isStartState: false,
                            isAcceptState: false,
                            label: "q1",
                        },
                    },
                    {
                        kind: "Node",
                        type: "NFANode",
                        uuid: "3",
                        data: {
                            isStartState: false,
                            isAcceptState: false,
                            label: "q2",
                        },
                    },
                    {
                        kind: "Edge",
                        type: "NFAEdge",
                        uuid: "4",
                        data: {
                            label: "0",
                            source: { kind: "sinap-pointer", uuid: "1" },
                            destination: { kind: "sinap-pointer", uuid: "1" }
                        },
                    },
                    {
                        kind: "Edge",
                        type: "NFAEdge",
                        uuid: "5",
                        data: {
                            label: "1",
                            source: { kind: "sinap-pointer", uuid: "1" },
                            destination: { kind: "sinap-pointer", uuid: "2" }
                        },
                    },
                    {
                        kind: "Edge",
                        type: "NFAEdge",
                        uuid: "6",
                        data: {
                            label: "1",
                            source: { kind: "sinap-pointer", uuid: "2" },
                            destination: { kind: "sinap-pointer", uuid: "1" }
                        },
                    },
                    {
                        kind: "Edge",
                        type: "NFAEdge",
                        uuid: "7",
                        data: {
                            label: "0",
                            source: { kind: "sinap-pointer", uuid: "2" },
                            destination: { kind: "sinap-pointer", uuid: "3" }
                        },
                    },
                    {
                        kind: "Edge",
                        type: "NFAEdge",
                        uuid: "8",
                        data: {
                            label: "0",
                            source: { kind: "sinap-pointer", uuid: "3" },
                            destination: { kind: "sinap-pointer", uuid: "2" }
                        },
                    },
                    {
                        kind: "Edge",
                        type: "NFAEdge",
                        uuid: "9",
                        data: {
                            label: "1",
                            source: { kind: "sinap-pointer", uuid: "3" },
                            destination: { kind: "sinap-pointer", uuid: "3" }
                        },
                    },
                ]
            });

            const [context, serialGraph] = setupTest(nfa, model);
            const pluginProg = new context.global["plugin-stub"].Program(JSON.parse(serialGraph));
            const prog = new Program(pluginProg, nfa);

            expect(prog.runArguments.map(t => t.map(t2 => t2.name))).to.deep.equal([["string"]]);

            for (let x = 0; x < 100; x++) {
                const input = x.toString(2);
                runProg(prog, input, input.length + 1, x % 3 === 0, nfa);
            }
        });
        it("checks for 1 start states", () => {
            const model = new CoreModel(nfa, {
                format: "sinap-file-format",
                kind: ["Formal Languages", "NFA"],
                version: "0.0.8",
                elements: [
                    {
                        kind: "Graph",
                        type: "NFAGraph",
                        uuid: "0",
                        data: {
                        }
                    },
                    {
                        kind: "Node",
                        type: "NFANode",
                        uuid: "1",
                        data: {
                            isStartState: true,
                            isAcceptState: true,
                            label: "q0",
                        },
                    },
                    {
                        kind: "Node",
                        type: "NFANode",
                        uuid: "2",
                        data: {
                            isStartState: true,
                            isAcceptState: false,
                            label: "q1",
                        },
                    },
                    {
                        kind: "Node",
                        type: "NFANode",
                        uuid: "3",
                        data: {
                            isStartState: false,
                            isAcceptState: false,
                            label: "q2",
                        },
                    },
                    {
                        kind: "Edge",
                        type: "NFAEdge",
                        uuid: "4",
                        data: {
                            label: "0",
                            source: { kind: "sinap-pointer", uuid: "1" },
                            destination: { kind: "sinap-pointer", uuid: "1" }
                        },
                    },
                    {
                        kind: "Edge",
                        type: "NFAEdge",
                        uuid: "5",
                        data: {
                            label: "1",
                            source: { kind: "sinap-pointer", uuid: "1" },
                            destination: { kind: "sinap-pointer", uuid: "2" }
                        },
                    },
                    {
                        kind: "Edge",
                        type: "NFAEdge",
                        uuid: "6",
                        data: {
                            label: "1",
                            source: { kind: "sinap-pointer", uuid: "2" },
                            destination: { kind: "sinap-pointer", uuid: "1" }
                        },
                    },
                    {
                        kind: "Edge",
                        type: "NFAEdge",
                        uuid: "7",
                        data: {
                            label: "0",
                            source: { kind: "sinap-pointer", uuid: "2" },
                            destination: { kind: "sinap-pointer", uuid: "3" }
                        },
                    },
                    {
                        kind: "Edge",
                        type: "NFAEdge",
                        uuid: "8",
                        data: {
                            label: "0",
                            source: { kind: "sinap-pointer", uuid: "3" },
                            destination: { kind: "sinap-pointer", uuid: "2" }
                        },
                    },
                    {
                        kind: "Edge",
                        type: "NFAEdge",
                        uuid: "9",
                        data: {
                            label: "1",
                            source: { kind: "sinap-pointer", uuid: "3" },
                            destination: { kind: "sinap-pointer", uuid: "3" }
                        },
                    },
                ]
            });

            const [context, serialGraph] = setupTest(nfa, model);
            const pluginProg = new context.global["plugin-stub"].Program(JSON.parse(serialGraph));
            const prog = new Program(pluginProg, nfa);

            checkError(prog, "11", "Only one start state allowed", nfa);
        });
        it("checks for 0 start states", () => {
            const model = new CoreModel(nfa, {
                format: "sinap-file-format",
                kind: ["Formal Languages", "NFA"],
                version: "0.0.8",
                elements: [
                    {
                        kind: "Graph",
                        type: "NFAGraph",
                        uuid: "0",
                        data: {
                        }
                    },
                    {
                        kind: "Node",
                        type: "NFANode",
                        uuid: "1",
                        data: {
                            isStartState: false,
                            isAcceptState: true,
                            label: "q0",
                        },
                    },
                    {
                        kind: "Node",
                        type: "NFANode",
                        uuid: "2",
                        data: {
                            isStartState: false,
                            isAcceptState: false,
                            label: "q1",
                        },
                    },
                    {
                        kind: "Node",
                        type: "NFANode",
                        uuid: "3",
                        data: {
                            isStartState: false,
                            isAcceptState: false,
                            label: "q2",
                        },
                    },
                    {
                        kind: "Edge",
                        type: "NFAEdge",
                        uuid: "4",
                        data: {
                            label: "0",
                            source: { kind: "sinap-pointer", uuid: "1" },
                            destination: { kind: "sinap-pointer", uuid: "1" }
                        },
                    },
                    {
                        kind: "Edge",
                        type: "NFAEdge",
                        uuid: "5",
                        data: {
                            label: "1",
                            source: { kind: "sinap-pointer", uuid: "1" },
                            destination: { kind: "sinap-pointer", uuid: "2" }
                        },
                    },
                    {
                        kind: "Edge",
                        type: "NFAEdge",
                        uuid: "6",
                        data: {
                            label: "1",
                            source: { kind: "sinap-pointer", uuid: "2" },
                            destination: { kind: "sinap-pointer", uuid: "1" }
                        },
                    },
                    {
                        kind: "Edge",
                        type: "NFAEdge",
                        uuid: "7",
                        data: {
                            label: "0",
                            source: { kind: "sinap-pointer", uuid: "2" },
                            destination: { kind: "sinap-pointer", uuid: "3" }
                        },
                    },
                    {
                        kind: "Edge",
                        type: "NFAEdge",
                        uuid: "8",
                        data: {
                            label: "0",
                            source: { kind: "sinap-pointer", uuid: "3" },
                            destination: { kind: "sinap-pointer", uuid: "2" }
                        },
                    },
                    {
                        kind: "Edge",
                        type: "NFAEdge",
                        uuid: "9",
                        data: {
                            label: "1",
                            source: { kind: "sinap-pointer", uuid: "3" },
                            destination: { kind: "sinap-pointer", uuid: "3" }
                        },
                    },
                ]
            });

            const [context, serialGraph] = setupTest(nfa, model);
            const pluginProg = new context.global["plugin-stub"].Program(JSON.parse(serialGraph));
            const prog = new Program(pluginProg, nfa);

            checkError(prog, "11", "Must have one start state", nfa);
        });
        it("allows empty transitions", () => {
            const model = new CoreModel(nfa, {
                format: "sinap-file-format",
                kind: ["Formal Languages", "NFA"],
                version: "0.0.8",
                elements: [
                    {
                        kind: "Graph",
                        type: "NFAGraph",
                        uuid: "0",
                        data: {
                        }
                    },
                    {
                        kind: "Node",
                        type: "NFANode",
                        uuid: "1",
                        data: {
                            isStartState: true,
                            isAcceptState: true,
                            label: "q0",
                        },
                    },
                    {
                        kind: "Node",
                        type: "NFANode",
                        uuid: "2",
                        data: {
                            isStartState: false,
                            isAcceptState: false,
                            label: "q1",
                        },
                    },
                    {
                        kind: "Node",
                        type: "NFANode",
                        uuid: "3",
                        data: {
                            isStartState: false,
                            isAcceptState: false,
                            label: "q2",
                        },
                    },
                    {
                        kind: "Edge",
                        type: "NFAEdge",
                        uuid: "4",
                        data: {
                            label: "",
                            source: { kind: "sinap-pointer", uuid: "1" },
                            destination: { kind: "sinap-pointer", uuid: "1" }
                        },
                    },
                    {
                        kind: "Edge",
                        type: "NFAEdge",
                        uuid: "5",
                        data: {
                            label: "1",
                            source: { kind: "sinap-pointer", uuid: "1" },
                            destination: { kind: "sinap-pointer", uuid: "2" }
                        },
                    },
                    {
                        kind: "Edge",
                        type: "NFAEdge",
                        uuid: "6",
                        data: {
                            label: "1",
                            source: { kind: "sinap-pointer", uuid: "2" },
                            destination: { kind: "sinap-pointer", uuid: "1" }
                        },
                    },
                    {
                        kind: "Edge",
                        type: "NFAEdge",
                        uuid: "7",
                        data: {
                            label: "0",
                            source: { kind: "sinap-pointer", uuid: "2" },
                            destination: { kind: "sinap-pointer", uuid: "3" }
                        },
                    },
                    {
                        kind: "Edge",
                        type: "NFAEdge",
                        uuid: "8",
                        data: {
                            label: "0",
                            source: { kind: "sinap-pointer", uuid: "3" },
                            destination: { kind: "sinap-pointer", uuid: "2" }
                        },
                    },
                    {
                        kind: "Edge",
                        type: "NFAEdge",
                        uuid: "9",
                        data: {
                            label: "1",
                            source: { kind: "sinap-pointer", uuid: "3" },
                            destination: { kind: "sinap-pointer", uuid: "3" }
                        },
                    },
                ]
            });

            const [context, serialGraph] = setupTest(nfa, model);
            const pluginProg = new context.global["plugin-stub"].Program(JSON.parse(serialGraph));
            const prog = new Program(pluginProg, nfa);

            runProg(prog, "11", 3, true, nfa);
        });
        it("checks for two character transitions", () => {
            const model = new CoreModel(nfa, {
                format: "sinap-file-format",
                kind: ["Formal Languages", "NFA"],
                version: "0.0.8",
                elements: [
                    {
                        kind: "Graph",
                        type: "NFAGraph",
                        uuid: "0",
                        data: {
                        }
                    },
                    {
                        kind: "Node",
                        type: "NFANode",
                        uuid: "1",
                        data: {
                            isStartState: true,
                            isAcceptState: true,
                            label: "q0",
                        },
                    },
                    {
                        kind: "Node",
                        type: "NFANode",
                        uuid: "2",
                        data: {
                            isStartState: false,
                            isAcceptState: false,
                            label: "q1",
                        },
                    },
                    {
                        kind: "Node",
                        type: "NFANode",
                        uuid: "3",
                        data: {
                            isStartState: false,
                            isAcceptState: false,
                            label: "q2",
                        },
                    },
                    {
                        kind: "Edge",
                        type: "NFAEdge",
                        uuid: "4",
                        data: {
                            label: "23",
                            source: { kind: "sinap-pointer", uuid: "1" },
                            destination: { kind: "sinap-pointer", uuid: "1" }
                        },
                    },
                    {
                        kind: "Edge",
                        type: "NFAEdge",
                        uuid: "5",
                        data: {
                            label: "1",
                            source: { kind: "sinap-pointer", uuid: "1" },
                            destination: { kind: "sinap-pointer", uuid: "2" }
                        },
                    },
                    {
                        kind: "Edge",
                        type: "NFAEdge",
                        uuid: "6",
                        data: {
                            label: "1",
                            source: { kind: "sinap-pointer", uuid: "2" },
                            destination: { kind: "sinap-pointer", uuid: "1" }
                        },
                    },
                    {
                        kind: "Edge",
                        type: "NFAEdge",
                        uuid: "7",
                        data: {
                            label: "0",
                            source: { kind: "sinap-pointer", uuid: "2" },
                            destination: { kind: "sinap-pointer", uuid: "3" }
                        },
                    },
                    {
                        kind: "Edge",
                        type: "NFAEdge",
                        uuid: "8",
                        data: {
                            label: "0",
                            source: { kind: "sinap-pointer", uuid: "3" },
                            destination: { kind: "sinap-pointer", uuid: "2" }
                        },
                    },
                    {
                        kind: "Edge",
                        type: "NFAEdge",
                        uuid: "9",
                        data: {
                            label: "1",
                            source: { kind: "sinap-pointer", uuid: "3" },
                            destination: { kind: "sinap-pointer", uuid: "3" }
                        },
                    },
                ]
            });

            const [context, serialGraph] = setupTest(nfa, model);
            const pluginProg = new context.global["plugin-stub"].Program(JSON.parse(serialGraph));
            const prog = new Program(pluginProg, nfa);

            checkError(prog, "11", "Edge 23 must be one symbol", nfa);
        });
        it("supports non-determinism", () => {
            const model = new CoreModel(nfa, {
                format: "sinap-file-format",
                kind: ["Formal Languages", "NFA"],
                version: "0.0.8",
                elements: [
                    {
                        kind: "Graph",
                        type: "NFAGraph",
                        uuid: "0",
                        data: {
                        }
                    },
                    {
                        kind: "Node",
                        type: "NFANode",
                        uuid: "1",
                        data: {
                            isStartState: true,
                            isAcceptState: false,
                            label: "q0",
                        },
                    },
                    {
                        kind: "Node",
                        type: "NFANode",
                        uuid: "2",
                        data: {
                            isStartState: false,
                            isAcceptState: true,
                            label: "q1",
                        },
                    },
                    {
                        kind: "Edge",
                        type: "NFAEdge",
                        uuid: "3",
                        data: {
                            label: "1",
                            source: { kind: "sinap-pointer", uuid: "1" },
                            destination: { kind: "sinap-pointer", uuid: "1" }
                        },
                    },
                    {
                        kind: "Edge",
                        type: "NFAEdge",
                        uuid: "4",
                        data: {
                            label: "1",
                            source: { kind: "sinap-pointer", uuid: "1" },
                            destination: { kind: "sinap-pointer", uuid: "2" }
                        },
                    },
                    {
                        kind: "Edge",
                        type: "NFAEdge",
                        uuid: "5",
                        data: {
                            label: "0",
                            source: { kind: "sinap-pointer", uuid: "1" },
                            destination: { kind: "sinap-pointer", uuid: "1" }
                        },
                    },
                ]
            });

            const [context, serialGraph] = setupTest(nfa, model);
            const pluginProg = new context.global["plugin-stub"].Program(JSON.parse(serialGraph));
            const prog = new Program(pluginProg, nfa);

            runProg(prog, "11", 3, true, nfa);
            runProg(prog, "10001", 6, true, nfa);
            runProg(prog, "0001", 5, true, nfa);
            runProg(prog, "1100", 5, false, nfa);
        });
    });
    describe("turing machine", () => {
        let turing: Plugin;
        before((done) => {
            loadTestPlugin("turing").then((turingPlugin) => {
                turing = turingPlugin;
                done();
            });
        });

        it("compiles", () => {
            expect(turing.results.diagnostics).to.deep.equal({
                global: [],
                semantic: [],
                syntactic: [],
            });
        });

        function setPrim(c: CoreValue<PluginTypeEnvironment>, s: string, v: any) {
            if (!(c instanceof CoreObjectValue || c instanceof CoreIntersectionValue)) {
                throw new Error("set prim wants an object like");
            }
            const prim = c.get(s);
            if (prim instanceof CoreUnionValue && prim.value instanceof CorePrimitiveValue) {
                prim.value = makeValue(c.type.env, v, false);
            } else if (prim instanceof CorePrimitiveValue) {
                prim.data = v;
            } else {
                throw new Error(`."${s}" must be a primitive`);
            }
        }

        it("does a simple thing", () => {
            const model = new CoreModel(turing);
            const graph = model.addElement(CoreElementKind.Graph);
            setPrim(graph, "blank", "K");
            const q1 = model.addElement(CoreElementKind.Node);
            const q2 = model.addElement(CoreElementKind.Node);
            const q3 = model.addElement(CoreElementKind.Node);
            setPrim(q1, "label", "q1");
            setPrim(q2, "label", "q2");
            setPrim(q3, "label", "q3");
            setPrim(q1, "isStartState", true);
            setPrim(q3, "isAcceptState", true);

            const t1 = model.addElement(CoreElementKind.Edge);
            t1.set("source", q1);
            t1.set("destination", q2);
            setPrim(t1, "read", "1");
            setPrim(t1, "write", "2");
            setPrim(t1, "move", "Right");

            const t2 = model.addElement(CoreElementKind.Edge);
            t2.set("source", q2);
            t2.set("destination", q3);
            setPrim(t2, "read", "2");
            setPrim(t2, "write", "3");
            setPrim(t2, "move", "Right");

            const [context, serialGraph] = setupTest(turing, model);
            const pluginProg = new context.global["plugin-stub"].Program(JSON.parse(serialGraph));
            const prog = new Program(pluginProg, turing);

            runProg(prog, "11", 3, false, turing);
            runProg(prog, "12", 3, true, turing);

            // TODO: make this test pass
            // const results = prog.run([makeValue(turing.typeEnvironment, "12", false)]);
            // const lastState = results.states.pop()!;
            // expect(lastState.jsonify(() => { return { result: false, value: undefined }; })).to.deep.equal(
            //     {}
            // );
        });
    });
});