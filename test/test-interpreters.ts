/// <reference path="../typings/globals/mocha/index.d.ts" />
import { loadPluginDir, CoreModel, Plugin, CoreValue, Program } from "../src/";
import { LocalFileService } from "./files-mock";
import * as assert from "assert";
import * as vm from "vm";

describe("various interpreters", () => {
    function setupTest(plugin: Plugin, model: CoreModel) {
        const script = new vm.Script(plugin.results.js as string);

        const serialGraph = JSON.stringify(model.serialize());

        const sandbox: any = { console: console, global: {} };
        const context = vm.createContext(sandbox);
        script.runInContext(context);
        return [context as any, serialGraph];
    }

    const fs = new LocalFileService();
    function loadTestPlugin(name: string): Promise<Plugin> {
        return fs.directoryByName(fs.joinPath("interpreters", name))
            .then((directory) => loadPluginDir(directory, fs));
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
                kind: "TODO: implement this",
                version: "0.0.6",
                elements: [
                    {
                        kind: "Graph",
                        type: "DFAGraph",
                        data: {
                        }
                    },
                    {
                        kind: "Node",
                        type: "DFANode",
                        data: {
                            isStartState: true,
                            isAcceptState: true,
                            label: "q0",
                        },
                    },
                    {
                        kind: "Node",
                        type: "DFANode",
                        data: {
                            isStartState: false,
                            isAcceptState: false,
                            label: "q1",
                        },
                    },
                    {
                        kind: "Node",
                        type: "DFANode",
                        data: {
                            isStartState: false,
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

            const [context, serialGraph] = setupTest(dfa, model);
            const pluginProg = new context.global["plugin-stub"].Program(JSON.parse(serialGraph));
            const prog = new Program(pluginProg, dfa);
            const stringType = dfa.typeEnvironment.getStringType();

            let results;
            results = prog.run([new CoreValue(stringType, "11")]);
            assert.equal(3, results.states.length, "correct number of states");
            assert.equal(true, results.result.value, "correct value");
            results = prog.run([new CoreValue(stringType, "")]);
            assert.equal(1, results.states.length, "correct number of states");
            assert.equal(true, results.result.value, "correct value");
            results = prog.run([new CoreValue(stringType, "101")]);
            assert.equal(4, results.states.length, "correct number of states");
            assert.equal(false, results.result.value, "correct value");
            results = prog.run([new CoreValue(stringType, "1000")]);
            assert.equal(5, results.states.length, "correct number of states");
            assert.equal(false, results.result.value, "correct value");
            results = prog.run([new CoreValue(stringType, "1001")]);
            assert.equal(5, results.states.length, "correct number of states");
            assert.equal(true, results.result.value, "correct value");
            results = prog.run([new CoreValue(stringType, "01")]);
            assert.equal(3, results.states.length, "correct number of states");
            assert.equal(false, results.result.value, "correct value");
            results = prog.run([new CoreValue(stringType, "011")]);
            assert.equal(4, results.states.length, "correct number of states");
            assert.equal(true, results.result.value, "correct value");

            for (let x = 0; x < 10000; x++) {
                assert.equal(x % 3 === 0, prog.run([new CoreValue(stringType, x.toString(2))]).result.value);
            }

        });
        it("checks for 1 start states", () => {
            const model = new CoreModel(dfa, {
                format: "sinap-file-format",
                kind: "TODO: implement this",
                version: "0.0.6",
                elements: [
                    {
                        kind: "Graph",
                        type: "DFAGraph",
                        data: {
                        }
                    },
                    {
                        kind: "Node",
                        type: "DFANode",
                        data: {
                            isStartState: true,
                            isAcceptState: true,
                            label: "q0",
                        },
                    },
                    {
                        kind: "Node",
                        type: "DFANode",
                        data: {
                            isStartState: true,
                            isAcceptState: false,
                            label: "q1",
                        },
                    },
                    {
                        kind: "Node",
                        type: "DFANode",
                        data: {
                            isStartState: false,
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

            const [context, serialGraph] = setupTest(dfa, model);
            const pluginProg = new context.global["plugin-stub"].Program(JSON.parse(serialGraph));
            const prog = new Program(pluginProg, dfa);
            const stringType = dfa.typeEnvironment.getStringType();

            assert.throws(() => prog.run([new CoreValue(stringType, "11")]), "allows multiple start states");
        });
        it("checks for 0 start states", () => {
            const model = new CoreModel(dfa, {
                format: "sinap-file-format",
                kind: "TODO: implement this",
                version: "0.0.6",
                elements: [
                    {
                        kind: "Graph",
                        type: "DFAGraph",
                        data: {
                        }
                    },
                    {
                        kind: "Node",
                        type: "DFANode",
                        data: {
                            isStartState: false,
                            isAcceptState: true,
                            label: "q0",
                        },
                    },
                    {
                        kind: "Node",
                        type: "DFANode",
                        data: {
                            isStartState: false,
                            isAcceptState: false,
                            label: "q1",
                        },
                    },
                    {
                        kind: "Node",
                        type: "DFANode",
                        data: {
                            isStartState: false,
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

            const [context, serialGraph] = setupTest(dfa, model);
            const pluginProg = new context.global["plugin-stub"].Program(JSON.parse(serialGraph));
            const prog = new Program(pluginProg, dfa);
            const stringType = dfa.typeEnvironment.getStringType();

            assert.throws(() => prog.run([new CoreValue(stringType, "11")]), "allows zero start states");
        });
        it("checks for empty transitions", () => {
            const model = new CoreModel(dfa, {
                format: "sinap-file-format",
                kind: "TODO: implement this",
                version: "0.0.6",
                elements: [
                    {
                        kind: "Graph",
                        type: "DFAGraph",
                        data: {
                        }
                    },
                    {
                        kind: "Node",
                        type: "DFANode",
                        data: {
                            isStartState: true,
                            isAcceptState: true,
                            label: "q0",
                        },
                    },
                    {
                        kind: "Node",
                        type: "DFANode",
                        data: {
                            isStartState: false,
                            isAcceptState: false,
                            label: "q1",
                        },
                    },
                    {
                        kind: "Node",
                        type: "DFANode",
                        data: {
                            isStartState: false,
                            isAcceptState: false,
                            label: "q2",
                        },
                    },
                    {
                        kind: "Edge",
                        type: "DFAEdge",
                        data: {
                            label: "",
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

            const [context, serialGraph] = setupTest(dfa, model);
            const pluginProg = new context.global["plugin-stub"].Program(JSON.parse(serialGraph));
            const prog = new Program(pluginProg, dfa);
            const stringType = dfa.typeEnvironment.getStringType();

            assert.throws(() => prog.run([new CoreValue(stringType, "11")]), "allows empty transitions");
        });
        it("checks for two character transitions", () => {
            const model = new CoreModel(dfa, {
                format: "sinap-file-format",
                kind: "TODO: implement this",
                version: "0.0.6",
                elements: [
                    {
                        kind: "Graph",
                        type: "DFAGraph",
                        data: {
                        }
                    },
                    {
                        kind: "Node",
                        type: "DFANode",
                        data: {
                            isStartState: true,
                            isAcceptState: true,
                            label: "q0",
                        },
                    },
                    {
                        kind: "Node",
                        type: "DFANode",
                        data: {
                            isStartState: false,
                            isAcceptState: false,
                            label: "q1",
                        },
                    },
                    {
                        kind: "Node",
                        type: "DFANode",
                        data: {
                            isStartState: false,
                            isAcceptState: false,
                            label: "q2",
                        },
                    },
                    {
                        kind: "Edge",
                        type: "DFAEdge",
                        data: {
                            label: "23",
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

            const [context, serialGraph] = setupTest(dfa, model);
            const pluginProg = new context.global["plugin-stub"].Program(JSON.parse(serialGraph));
            const prog = new Program(pluginProg, dfa);
            const stringType = dfa.typeEnvironment.getStringType();

            assert.throws(() => prog.run([new CoreValue(stringType, "11")]), "allows two character transitions");
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
                kind: "TODO: implement this",
                version: "0.0.6",
                elements: [
                    {
                        kind: "Graph",
                        type: "NFAGraph",
                        data: {
                        }
                    },
                    {
                        kind: "Node",
                        type: "NFANode",
                        data: {
                            isStartState: true,
                            isAcceptState: true,
                            label: "q0",
                        },
                    },
                    {
                        kind: "Node",
                        type: "NFANode",
                        data: {
                            isStartState: false,
                            isAcceptState: false,
                            label: "q1",
                        },
                    },
                    {
                        kind: "Node",
                        type: "NFANode",
                        data: {
                            isStartState: false,
                            isAcceptState: false,
                            label: "q2",
                        },
                    },
                    {
                        kind: "Edge",
                        type: "NFAEdge",
                        data: {
                            label: "0",
                            source: { kind: "sinap-pointer", index: 1 },
                            destination: { kind: "sinap-pointer", index: 1 }
                        },
                    },
                    {
                        kind: "Edge",
                        type: "NFAEdge",
                        data: {
                            label: "1",
                            source: { kind: "sinap-pointer", index: 1 },
                            destination: { kind: "sinap-pointer", index: 2 }
                        },
                    },
                    {
                        kind: "Edge",
                        type: "NFAEdge",
                        data: {
                            label: "1",
                            source: { kind: "sinap-pointer", index: 2 },
                            destination: { kind: "sinap-pointer", index: 1 }
                        },
                    },
                    {
                        kind: "Edge",
                        type: "NFAEdge",
                        data: {
                            label: "0",
                            source: { kind: "sinap-pointer", index: 2 },
                            destination: { kind: "sinap-pointer", index: 3 }
                        },
                    },
                    {
                        kind: "Edge",
                        type: "NFAEdge",
                        data: {
                            label: "0",
                            source: { kind: "sinap-pointer", index: 3 },
                            destination: { kind: "sinap-pointer", index: 2 }
                        },
                    },
                    {
                        kind: "Edge",
                        type: "NFAEdge",
                        data: {
                            label: "1",
                            source: { kind: "sinap-pointer", index: 3 },
                            destination: { kind: "sinap-pointer", index: 3 }
                        },
                    },
                ]
            });

            const [context, serialGraph] = setupTest(nfa, model);
            const pluginProg = new context.global["plugin-stub"].Program(JSON.parse(serialGraph));
            const prog = new Program(pluginProg, nfa);
            const stringType = nfa.typeEnvironment.getStringType();

            let results;
            results = prog.run([new CoreValue(stringType, "11")]);
            assert.equal(3, results.states.length, "correct number of states");
            assert.equal(true, results.result.value, "correct value");
            results = prog.run([new CoreValue(stringType, "")]);
            assert.equal(1, results.states.length, "correct number of states");
            assert.equal(true, results.result.value, "correct value");
            results = prog.run([new CoreValue(stringType, "101")]);
            assert.equal(4, results.states.length, "correct number of states");
            assert.equal(false, results.result.value, "correct value");
            results = prog.run([new CoreValue(stringType, "1000")]);
            assert.equal(5, results.states.length, "correct number of states");
            assert.equal(false, results.result.value, "correct value");
            results = prog.run([new CoreValue(stringType, "1001")]);
            assert.equal(5, results.states.length, "correct number of states");
            assert.equal(true, results.result.value, "correct value");
            results = prog.run([new CoreValue(stringType, "01")]);
            assert.equal(3, results.states.length, "correct number of states");
            assert.equal(false, results.result.value, "correct value");
            results = prog.run([new CoreValue(stringType, "011")]);
            assert.equal(4, results.states.length, "correct number of states");
            assert.equal(true, results.result.value, "correct value");

            for (let x = 0; x < 10000; x++) {
                assert.equal(x % 3 === 0, prog.run([new CoreValue(stringType, x.toString(2))]).result.value);
            }

        });
        it("checks for 1 start states", () => {
            const model = new CoreModel(nfa, {
                format: "sinap-file-format",
                kind: "TODO: implement this",
                version: "0.0.6",
                elements: [
                    {
                        kind: "Graph",
                        type: "NFAGraph",
                        data: {
                        }
                    },
                    {
                        kind: "Node",
                        type: "NFANode",
                        data: {
                            isStartState: true,
                            isAcceptState: true,
                            label: "q0",
                        },
                    },
                    {
                        kind: "Node",
                        type: "NFANode",
                        data: {
                            isStartState: true,
                            isAcceptState: false,
                            label: "q1",
                        },
                    },
                    {
                        kind: "Node",
                        type: "NFANode",
                        data: {
                            isStartState: false,
                            isAcceptState: false,
                            label: "q2",
                        },
                    },
                    {
                        kind: "Edge",
                        type: "NFAEdge",
                        data: {
                            label: "0",
                            source: { kind: "sinap-pointer", index: 1 },
                            destination: { kind: "sinap-pointer", index: 1 }
                        },
                    },
                    {
                        kind: "Edge",
                        type: "NFAEdge",
                        data: {
                            label: "1",
                            source: { kind: "sinap-pointer", index: 1 },
                            destination: { kind: "sinap-pointer", index: 2 }
                        },
                    },
                    {
                        kind: "Edge",
                        type: "NFAEdge",
                        data: {
                            label: "1",
                            source: { kind: "sinap-pointer", index: 2 },
                            destination: { kind: "sinap-pointer", index: 1 }
                        },
                    },
                    {
                        kind: "Edge",
                        type: "NFAEdge",
                        data: {
                            label: "0",
                            source: { kind: "sinap-pointer", index: 2 },
                            destination: { kind: "sinap-pointer", index: 3 }
                        },
                    },
                    {
                        kind: "Edge",
                        type: "NFAEdge",
                        data: {
                            label: "0",
                            source: { kind: "sinap-pointer", index: 3 },
                            destination: { kind: "sinap-pointer", index: 2 }
                        },
                    },
                    {
                        kind: "Edge",
                        type: "NFAEdge",
                        data: {
                            label: "1",
                            source: { kind: "sinap-pointer", index: 3 },
                            destination: { kind: "sinap-pointer", index: 3 }
                        },
                    },
                ]
            });

            const [context, serialGraph] = setupTest(nfa, model);
            const pluginProg = new context.global["plugin-stub"].Program(JSON.parse(serialGraph));
            const prog = new Program(pluginProg, nfa);
            const stringType = nfa.typeEnvironment.getStringType();

            assert.throws(() => prog.run([new CoreValue(stringType, "11")]), "allows multiple start states");
        });
        it("checks for 0 start states", () => {
            const model = new CoreModel(nfa, {
                format: "sinap-file-format",
                kind: "TODO: implement this",
                version: "0.0.6",
                elements: [
                    {
                        kind: "Graph",
                        type: "NFAGraph",
                        data: {
                        }
                    },
                    {
                        kind: "Node",
                        type: "NFANode",
                        data: {
                            isStartState: false,
                            isAcceptState: true,
                            label: "q0",
                        },
                    },
                    {
                        kind: "Node",
                        type: "NFANode",
                        data: {
                            isStartState: false,
                            isAcceptState: false,
                            label: "q1",
                        },
                    },
                    {
                        kind: "Node",
                        type: "NFANode",
                        data: {
                            isStartState: false,
                            isAcceptState: false,
                            label: "q2",
                        },
                    },
                    {
                        kind: "Edge",
                        type: "NFAEdge",
                        data: {
                            label: "0",
                            source: { kind: "sinap-pointer", index: 1 },
                            destination: { kind: "sinap-pointer", index: 1 }
                        },
                    },
                    {
                        kind: "Edge",
                        type: "NFAEdge",
                        data: {
                            label: "1",
                            source: { kind: "sinap-pointer", index: 1 },
                            destination: { kind: "sinap-pointer", index: 2 }
                        },
                    },
                    {
                        kind: "Edge",
                        type: "NFAEdge",
                        data: {
                            label: "1",
                            source: { kind: "sinap-pointer", index: 2 },
                            destination: { kind: "sinap-pointer", index: 1 }
                        },
                    },
                    {
                        kind: "Edge",
                        type: "NFAEdge",
                        data: {
                            label: "0",
                            source: { kind: "sinap-pointer", index: 2 },
                            destination: { kind: "sinap-pointer", index: 3 }
                        },
                    },
                    {
                        kind: "Edge",
                        type: "NFAEdge",
                        data: {
                            label: "0",
                            source: { kind: "sinap-pointer", index: 3 },
                            destination: { kind: "sinap-pointer", index: 2 }
                        },
                    },
                    {
                        kind: "Edge",
                        type: "NFAEdge",
                        data: {
                            label: "1",
                            source: { kind: "sinap-pointer", index: 3 },
                            destination: { kind: "sinap-pointer", index: 3 }
                        },
                    },
                ]
            });

            const [context, serialGraph] = setupTest(nfa, model);
            const pluginProg = new context.global["plugin-stub"].Program(JSON.parse(serialGraph));
            const prog = new Program(pluginProg, nfa);
            const stringType = nfa.typeEnvironment.getStringType();

            assert.throws(() => prog.run([new CoreValue(stringType, "11")]), "allows zero start states");
        });
        it("allows empty transitions", () => {
            const model = new CoreModel(nfa, {
                format: "sinap-file-format",
                kind: "TODO: implement this",
                version: "0.0.6",
                elements: [
                    {
                        kind: "Graph",
                        type: "NFAGraph",
                        data: {
                        }
                    },
                    {
                        kind: "Node",
                        type: "NFANode",
                        data: {
                            isStartState: true,
                            isAcceptState: true,
                            label: "q0",
                        },
                    },
                    {
                        kind: "Node",
                        type: "NFANode",
                        data: {
                            isStartState: false,
                            isAcceptState: false,
                            label: "q1",
                        },
                    },
                    {
                        kind: "Node",
                        type: "NFANode",
                        data: {
                            isStartState: false,
                            isAcceptState: false,
                            label: "q2",
                        },
                    },
                    {
                        kind: "Edge",
                        type: "NFAEdge",
                        data: {
                            label: "",
                            source: { kind: "sinap-pointer", index: 1 },
                            destination: { kind: "sinap-pointer", index: 1 }
                        },
                    },
                    {
                        kind: "Edge",
                        type: "NFAEdge",
                        data: {
                            label: "1",
                            source: { kind: "sinap-pointer", index: 1 },
                            destination: { kind: "sinap-pointer", index: 2 }
                        },
                    },
                    {
                        kind: "Edge",
                        type: "NFAEdge",
                        data: {
                            label: "1",
                            source: { kind: "sinap-pointer", index: 2 },
                            destination: { kind: "sinap-pointer", index: 1 }
                        },
                    },
                    {
                        kind: "Edge",
                        type: "NFAEdge",
                        data: {
                            label: "0",
                            source: { kind: "sinap-pointer", index: 2 },
                            destination: { kind: "sinap-pointer", index: 3 }
                        },
                    },
                    {
                        kind: "Edge",
                        type: "NFAEdge",
                        data: {
                            label: "0",
                            source: { kind: "sinap-pointer", index: 3 },
                            destination: { kind: "sinap-pointer", index: 2 }
                        },
                    },
                    {
                        kind: "Edge",
                        type: "NFAEdge",
                        data: {
                            label: "1",
                            source: { kind: "sinap-pointer", index: 3 },
                            destination: { kind: "sinap-pointer", index: 3 }
                        },
                    },
                ]
            });

            const [context, serialGraph] = setupTest(nfa, model);
            const pluginProg = new context.global["plugin-stub"].Program(JSON.parse(serialGraph));
            const prog = new Program(pluginProg, nfa);
            const stringType = nfa.typeEnvironment.getStringType();

            prog.run([new CoreValue(stringType, "11")]);
        });
        it("checks for two character transitions", () => {
            const model = new CoreModel(nfa, {
                format: "sinap-file-format",
                kind: "TODO: implement this",
                version: "0.0.6",
                elements: [
                    {
                        kind: "Graph",
                        type: "NFAGraph",
                        data: {
                        }
                    },
                    {
                        kind: "Node",
                        type: "NFANode",
                        data: {
                            isStartState: true,
                            isAcceptState: true,
                            label: "q0",
                        },
                    },
                    {
                        kind: "Node",
                        type: "NFANode",
                        data: {
                            isStartState: false,
                            isAcceptState: false,
                            label: "q1",
                        },
                    },
                    {
                        kind: "Node",
                        type: "NFANode",
                        data: {
                            isStartState: false,
                            isAcceptState: false,
                            label: "q2",
                        },
                    },
                    {
                        kind: "Edge",
                        type: "NFAEdge",
                        data: {
                            label: "23",
                            source: { kind: "sinap-pointer", index: 1 },
                            destination: { kind: "sinap-pointer", index: 1 }
                        },
                    },
                    {
                        kind: "Edge",
                        type: "NFAEdge",
                        data: {
                            label: "1",
                            source: { kind: "sinap-pointer", index: 1 },
                            destination: { kind: "sinap-pointer", index: 2 }
                        },
                    },
                    {
                        kind: "Edge",
                        type: "NFAEdge",
                        data: {
                            label: "1",
                            source: { kind: "sinap-pointer", index: 2 },
                            destination: { kind: "sinap-pointer", index: 1 }
                        },
                    },
                    {
                        kind: "Edge",
                        type: "NFAEdge",
                        data: {
                            label: "0",
                            source: { kind: "sinap-pointer", index: 2 },
                            destination: { kind: "sinap-pointer", index: 3 }
                        },
                    },
                    {
                        kind: "Edge",
                        type: "NFAEdge",
                        data: {
                            label: "0",
                            source: { kind: "sinap-pointer", index: 3 },
                            destination: { kind: "sinap-pointer", index: 2 }
                        },
                    },
                    {
                        kind: "Edge",
                        type: "NFAEdge",
                        data: {
                            label: "1",
                            source: { kind: "sinap-pointer", index: 3 },
                            destination: { kind: "sinap-pointer", index: 3 }
                        },
                    },
                ]
            });

            const [context, serialGraph] = setupTest(nfa, model);
            const pluginProg = new context.global["plugin-stub"].Program(JSON.parse(serialGraph));
            const prog = new Program(pluginProg, nfa);
            const stringType = nfa.typeEnvironment.getStringType();

            assert.throws(() => prog.run([new CoreValue(stringType, "11")]), "allows two character transitions");
        });
        it("supports non-determinism", () => {
            const model = new CoreModel(nfa, {
                format: "sinap-file-format",
                kind: "TODO: implement this",
                version: "0.0.6",
                elements: [
                    {
                        kind: "Graph",
                        type: "NFAGraph",
                        data: {
                        }
                    },
                    {
                        kind: "Node",
                        type: "NFANode",
                        data: {
                            isStartState: true,
                            isAcceptState: false,
                            label: "q0",
                        },
                    },
                    {
                        kind: "Node",
                        type: "NFANode",
                        data: {
                            isStartState: false,
                            isAcceptState: true,
                            label: "q1",
                        },
                    },
                    {
                        kind: "Edge",
                        type: "NFAEdge",
                        data: {
                            label: "1",
                            source: { kind: "sinap-pointer", index: 1 },
                            destination: { kind: "sinap-pointer", index: 1 }
                        },
                    },
                    {
                        kind: "Edge",
                        type: "NFAEdge",
                        data: {
                            label: "1",
                            source: { kind: "sinap-pointer", index: 1 },
                            destination: { kind: "sinap-pointer", index: 2 }
                        },
                    },
                    {
                        kind: "Edge",
                        type: "NFAEdge",
                        data: {
                            label: "0",
                            source: { kind: "sinap-pointer", index: 1 },
                            destination: { kind: "sinap-pointer", index: 1 }
                        },
                    },
                ]
            });

            const [context, serialGraph] = setupTest(nfa, model);
            const pluginProg = new context.global["plugin-stub"].Program(JSON.parse(serialGraph));
            const prog = new Program(pluginProg, nfa);
            const stringType = nfa.typeEnvironment.getStringType();

            assert.equal(true, prog.run([new CoreValue(stringType, "11")]).result.value);
            assert.equal(true, prog.run([new CoreValue(stringType, "10001")]).result.value);
            assert.equal(true, prog.run([new CoreValue(stringType, "0001")]).result.value);
            assert.equal(false, prog.run([new CoreValue(stringType, "1100")]).result.value);
        });
    });
});