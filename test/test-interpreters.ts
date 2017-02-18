/// <reference path="../typings/globals/mocha/index.d.ts" />
import { loadPlugin, CoreModel, Plugin } from "../src/";
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

    describe("dfa", () => {
        const dfa = loadPlugin("interpreters/dfa.ts");
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
            const prog = new context.global['plugin-stub'].Program(JSON.parse(serialGraph));

            let results;
            results = prog.run('11');
            assert.equal(3, results.states.length, "correct number of states");
            assert.equal(true, results.result, "correct value");
            results = prog.run('');
            assert.equal(1, results.states.length, "correct number of states");
            assert.equal(true, results.result, "correct value");
            results = prog.run('101');
            assert.equal(4, results.states.length, "correct number of states");
            assert.equal(false, results.result, "correct value");
            results = prog.run('1000');
            assert.equal(5, results.states.length, "correct number of states");
            assert.equal(false, results.result, "correct value");
            results = prog.run('1001');
            assert.equal(5, results.states.length, "correct number of states");
            assert.equal(true, results.result, "correct value");
            results = prog.run('01');
            assert.equal(3, results.states.length, "correct number of states");
            assert.equal(false, results.result, "correct value");
            results = prog.run('011');
            assert.equal(4, results.states.length, "correct number of states");
            assert.equal(true, results.result, "correct value");

            for (let x = 0; x < 10000; x++) {
                assert.equal(x % 3 == 0, prog.run(x.toString(2)).result);
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
            const prog = new context.global['plugin-stub'].Program(JSON.parse(serialGraph));

            assert(prog.run('11').error !== undefined, "allows multiple start states");
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
            const prog = new context.global['plugin-stub'].Program(JSON.parse(serialGraph));

            assert(prog.run('11').error !== undefined, "allows zero start states");
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
            const prog = new context.global['plugin-stub'].Program(JSON.parse(serialGraph));

            assert(prog.run('11').error !== undefined, "allows empty transitions");
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
            const prog = new context.global['plugin-stub'].Program(JSON.parse(serialGraph));

            assert(prog.run('11').error !== undefined, "allows two character transitions");
        });
    });
    describe("nfa", () => {
        const nfa = loadPlugin("interpreters/nfa.ts");
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
            const prog = new context.global['plugin-stub'].Program(JSON.parse(serialGraph));

            let results;
            results = prog.run('11');
            assert.equal(3, results.states.length, "correct number of states");
            assert.equal(true, results.result, "correct value");
            results = prog.run('');
            assert.equal(1, results.states.length, "correct number of states");
            assert.equal(true, results.result, "correct value");
            results = prog.run('101');
            assert.equal(4, results.states.length, "correct number of states");
            assert.equal(false, results.result, "correct value");
            results = prog.run('1000');
            assert.equal(5, results.states.length, "correct number of states");
            assert.equal(false, results.result, "correct value");
            results = prog.run('1001');
            assert.equal(5, results.states.length, "correct number of states");
            assert.equal(true, results.result, "correct value");
            results = prog.run('01');
            assert.equal(3, results.states.length, "correct number of states");
            assert.equal(false, results.result, "correct value");
            results = prog.run('011');
            assert.equal(4, results.states.length, "correct number of states");
            assert.equal(true, results.result, "correct value");

            for (let x = 0; x < 10000; x++) {
                assert.equal(x % 3 == 0, prog.run(x.toString(2)).result);
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
            const prog = new context.global['plugin-stub'].Program(JSON.parse(serialGraph));

            assert(prog.run('11').error !== undefined, "allows multiple start states");
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
            const prog = new context.global['plugin-stub'].Program(JSON.parse(serialGraph));

            assert(prog.run('11').error !== undefined, "allows zero start states");
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
            const prog = new context.global['plugin-stub'].Program(JSON.parse(serialGraph));

            prog.run('11');
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
            const prog = new context.global['plugin-stub'].Program(JSON.parse(serialGraph));

            assert(prog.run('11').error !== undefined, "allows two character transitions");
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
            const prog = new context.global['plugin-stub'].Program(JSON.parse(serialGraph));

            assert.equal(true, prog.run('11').result);
            assert.equal(true, prog.run('10001').result);
            assert.equal(true, prog.run('0001').result);
            assert.equal(false, prog.run('1100').result);
        });
    });
});