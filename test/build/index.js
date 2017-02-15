/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// identity function for calling harmony imports with the correct context
/******/ 	__webpack_require__.i = function(value) { return value; };
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 17);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports) {

module.exports = require("assert");

/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
__export(__webpack_require__(6));
__export(__webpack_require__(4));
__export(__webpack_require__(3));
__export(__webpack_require__(5));


/***/ }),
/* 2 */
/***/ (function(module, exports) {

module.exports = require("typescript");

/***/ }),
/* 3 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var CoreElementKind;
(function (CoreElementKind) {
    CoreElementKind[CoreElementKind["Node"] = 0] = "Node";
    CoreElementKind[CoreElementKind["Edge"] = 1] = "Edge";
    CoreElementKind[CoreElementKind["Graph"] = 2] = "Graph";
})(CoreElementKind = exports.CoreElementKind || (exports.CoreElementKind = {}));
;
class CoreElement {
    constructor(type, kind) {
        this.type = type;
        this.kind = kind;
        this.data = {};
    }
}
exports.CoreElement = CoreElement;
class CoreModel {
    constructor(plugin, pojo) {
        this.plugin = plugin;
        if (pojo.format !== "sinap-file-format" || pojo.version !== "0.0.6") {
            throw "not a CoreModel";
        }
        this.elements = pojo.elements.map((e) => this.plugin.makeElement(CoreElementKind[e.kind], e.type));
        const traverse = (a) => {
            if (typeof (a) !== "object") {
                return;
            }
            for (const k of Object.getOwnPropertyNames(a)) {
                const el = a[k];
                if (el.kind === "sinap-pointer") {
                    a[k] = this.elements[el.index];
                }
                else {
                    traverse(el);
                }
            }
        };
        traverse(pojo.elements);
        for (let i = 0; i < pojo.elements.length; i++) {
            this.elements[i].data = pojo.elements[i].data;
        }
    }
    serialize() {
        return {
            format: "sinap-file-format",
            kind: "TODO: implement this",
            version: "0.0.6",
            elements: this.elements.map((element) => {
                return {
                    kind: CoreElementKind[element.kind],
                    type: element.type.name,
                    data: JSON.parse(JSON.stringify(element.data, (_, v) => {
                        const idx = this.elements.indexOf(v);
                        if (idx !== -1) {
                            return {
                                kind: "sinap-pointer",
                                index: idx,
                            };
                        }
                        return v;
                    })),
                };
            }),
        };
    }
}
exports.CoreModel = CoreModel;


/***/ }),
/* 4 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

const ts = __webpack_require__(2);
const fs = __webpack_require__(16);
const plugin_1 = __webpack_require__(5);
const options = {
    noEmitOnError: false,
    noImplicitAny: true,
    target: ts.ScriptTarget.ES2016,
    removeComments: false,
    module: ts.ModuleKind.AMD,
    outFile: "result.js",
};
function loadPlugin(pluginLocation) {
    let script = undefined;
    const host = createCompilerHost(new Map([
        ["plugin.ts", fs.readFileSync(pluginLocation, "utf-8")],
        ["plugin-stub.ts", __webpack_require__(12)],
        ["sinap.d.ts", __webpack_require__(13)],
        ["types-interfaces.d.ts", __webpack_require__(14)],
    ]), options, (_, content) => {
        script = __webpack_require__(11) + "\n" + content;
    });
    const program = ts.createProgram(["plugin-stub.ts"], options, host);
    const results = program.emit();
    return new plugin_1.Plugin(program, { emitResults: results, js: script });
}
exports.loadPlugin = loadPlugin;
function printDiagnostics(results) {
    for (const result of results.diagnostics) {
        console.log();
        if (result.file) {
            const { line, character } = result.file.getLineAndCharacterOfPosition(result.start);
            const starts = result.file.getLineStarts();
            console.log(result.file.fileName, line.toString() + ", " + character.toString() + ":", result.messageText);
            console.log(result.file.text.substring(starts[line], starts[line + 1] - 1).replace("\t", " "));
            let pad = "";
            for (let i = 0; i < character; i++) {
                pad += " ";
            }
            for (let i = 0; i < result.length; i++) {
                pad += "~";
            }
            console.log(pad);
        }
        else {
            console.log("unknown file:", result.messageText);
        }
    }
    console.log("Emit Skipped?", results.emitSkipped);
}
exports.printDiagnostics = printDiagnostics;
function createCompilerHost(files, options, emit) {
    return {
        getSourceFile: (fileName) => {
            let source = files.get(fileName);
            if (!source) {
                if (fileName.indexOf("/") !== -1) {
                    throw "no relative/absolute paths here";
                }
                source = fs.readFileSync("node_modules/typescript/lib/" + fileName, "utf-8");
            }
            return source ?
                ts.createSourceFile(fileName, source, options.target ? options.target : ts.ScriptTarget.ES2016)
                : undefined;
        },
        writeFile: (name, text) => {
            emit(name, text);
        },
        getDefaultLibFileName: () => {
            return "lib.es2016.d.ts";
        },
        useCaseSensitiveFileNames: () => false,
        getCanonicalFileName: fileName => fileName,
        getCurrentDirectory: () => "",
        getNewLine: () => "\n",
        fileExists: (fileName) => {
            return files.has(fileName);
        },
        readFile: () => "",
        directoryExists: () => true,
        getDirectories: () => []
    };
}


/***/ }),
/* 5 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

const element_1 = __webpack_require__(3);
const types_1 = __webpack_require__(6);
const plugin_loader_1 = __webpack_require__(4);
function unionToList(type) {
    if (type instanceof types_1.UnionType) {
        return type.types.map(unionToList).reduce((p, c) => p.concat(c));
    }
    else if (type instanceof types_1.ObjectType) {
        return [[type.name, type]];
    }
    throw `type must be a union type or an object type.`;
}
function kindToKey(kind) {
    switch (kind) {
        case element_1.CoreElementKind.Edge:
            return "Edges";
        case element_1.CoreElementKind.Node:
            return "Nodes";
        case element_1.CoreElementKind.Graph:
            return "Graph";
    }
}
class PluginTypeEnvironment extends types_1.TypeEnvironment {
    constructor(program) {
        super(program.getTypeChecker());
        const types = types_1.getTypes(this, program.getSourceFile("plugin.ts"), new Set(["Nodes", "Edges", "Graph"]));
        this.pluginTypes = new Map([...types.entries()]
            .map(([n, v]) => [n, new Map(unionToList(v))]));
    }
    elementTypes(kind) {
        const type = this.pluginTypes.get(kindToKey(kind));
        if (type === undefined) {
            throw "kind not found";
        }
        return type.keys();
    }
    getElementType(kind, type) {
        const t = this.pluginTypes.get(kindToKey(kind));
        if (t === undefined) {
            throw "kind not found";
        }
        const ty = t.get(type);
        if (ty === undefined) {
            throw "type not found";
        }
        return ty;
    }
}
exports.PluginTypeEnvironment = PluginTypeEnvironment;
class Plugin {
    constructor(program, results) {
        this.results = results;
        this.typeEnvironment = new PluginTypeEnvironment(program);
    }
    printResults() {
        plugin_loader_1.printDiagnostics(this.results.emitResults);
    }
    makeElement(kind, type) {
        if (type === undefined) {
            type = this.elementTypes(kind).next().value;
        }
        return new element_1.CoreElement(this.typeEnvironment.getElementType(kind, type), kind);
    }
    elementTypes(kind) {
        return this.typeEnvironment.elementTypes(kind);
    }
}
exports.Plugin = Plugin;


/***/ }),
/* 6 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

const ts = __webpack_require__(2);
class TypeEnvironment {
    constructor(checker) {
        this.checker = checker;
        this.types = new Map();
    }
    getType(type) {
        const t = this.types.get(type);
        if (t) {
            return t;
        }
        let wrapped;
        if (type.flags & ts.TypeFlags.Union) {
            wrapped = new UnionType(this, type);
        }
        else if (type.flags & ts.TypeFlags.Intersection) {
            wrapped = new IntersectionType(this, type);
        }
        else if (type.flags & ts.TypeFlags.Object) {
            wrapped = new ObjectType(this, type);
        }
        else {
            wrapped = new Type(this, type);
        }
        this.types.set(type, wrapped);
        return wrapped;
    }
}
exports.TypeEnvironment = TypeEnvironment;
class Type {
    constructor(env, type) {
        this.env = env;
        this.type = type;
        this.name = env.checker.typeToString(type);
    }
    isAssignableTo(that) {
        return this.env.checker.isAssignableTo(this.type, that.type);
    }
}
exports.Type = Type;
class UnionType extends Type {
    constructor(env, type) {
        super(env, type);
        this.types = type.types.map(t => this.env.getType(t));
    }
}
exports.UnionType = UnionType;
class IntersectionType extends Type {
    constructor(env, type) {
        super(env, type);
        this.types = type.types.map(t => this.env.getType(t));
    }
}
exports.IntersectionType = IntersectionType;
class ObjectType extends Type {
    constructor(env, type) {
        super(env, type);
        this.members = new Map();
        if (this.type.symbol === undefined || this.type.symbol.members === undefined) {
            return;
        }
        this.type.symbol.members.forEach((value, key) => {
            this.members.set(key, this.env.getType(this.env.checker.getTypeOfSymbol(value)));
        });
    }
}
exports.ObjectType = ObjectType;
function getTypes(env, file, searchNames) {
    const results = new Map([...searchNames].map((x) => [x, new Set()]));
    ts.forEachChild(file, (node) => {
        if (!(node.kind === ts.SyntaxKind.ClassDeclaration
            || node.kind === ts.SyntaxKind.InterfaceDeclaration
            || node.kind === ts.SyntaxKind.TypeAliasDeclaration)) {
            return;
        }
        const declaration = node;
        if (declaration.name === undefined) {
            return;
        }
        const symbol = env.checker.getSymbolAtLocation(declaration.name);
        const r = results.get(symbol.name);
        if (!r) {
            return;
        }
        if (node.kind === ts.SyntaxKind.TypeAliasDeclaration) {
            visitAlias(node, r);
        }
        else {
            r.add(env.getType(env.checker.getTypeOfSymbol(symbol)));
        }
    });
    return new Map([...results.entries()]
        .map(([k, v]) => {
        if (v.size !== 1) {
            throw "Redunadant type specification";
        }
        return [k, v.values().next().value];
    }));
    function visitAlias(parent, r) {
        ts.forEachChild(parent, (node) => {
            if (node.kind !== ts.SyntaxKind.Identifier && node.kind !== ts.SyntaxKind.ExportKeyword) {
                r.add(env.getType(env.checker.getTypeAtLocation(node)));
            }
        });
    }
}
exports.getTypes = getTypes;
function validateEdge(edge, source, destination) {
    const destinationExpected = edge !== undefined ? edge.members.get("destination") : null;
    const sourceExpected = edge !== undefined ? edge.members.get("source") : null;
    const constraints = [];
    if (destinationExpected && destination) {
        constraints.push([destination, destinationExpected]);
    }
    if (sourceExpected && source) {
        constraints.push([source, sourceExpected]);
    }
    if (destination !== undefined) {
        addParentChildConstraint(destination.members.get("parents"));
    }
    if (source !== undefined) {
        addParentChildConstraint(source.members.get("children"));
    }
    function addParentChildConstraint(listType) {
        if (listType) {
            if (listType.type.flags & ts.TypeFlags.Object) {
                const obj = listType.type;
                if (obj.objectFlags & ts.ObjectFlags.Reference) {
                    const ref = obj;
                    constraints.push([edge, listType.env.getType(ref.typeArguments[0])]);
                }
                else {
                    throw "parents/children must be a reference to an array type";
                }
            }
            else {
                throw "parents/children must be a reference to an array type";
            }
        }
    }
    return constraints.reduce((prev, [t1, t2]) => prev ? t1.isAssignableTo(t2) : false, true);
}
exports.validateEdge = validateEdge;


/***/ }),
/* 7 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

const _1 = __webpack_require__(1);
const assert = __webpack_require__(0);
describe("plugin loader", () => it("emit results", () => {
    const plugin = _1.loadPlugin("test/plugin1.ts");
    assert.equal(false, plugin.results.emitResults.emitSkipped);
}));


/***/ }),
/* 8 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

const dfa_definitions_1 = __webpack_require__(15);
const assert = __webpack_require__(0);
describe("run the ideal interpreter v1", () => {
    describe("graph 1", () => {
        const g = {
            startState: {
                children: [
                    {
                        label: "1",
                        destination: {
                            isAcceptState: true,
                            children: [],
                        }
                    }
                ],
                isAcceptState: false,
            }
        };
        it("1", () => {
            assert.equal(true, dfa_definitions_1.interpret(g, "1"));
        });
        it("0", () => {
            assert.equal(false, dfa_definitions_1.interpret(g, "0"));
        });
        it("empty", () => {
            assert.equal(false, dfa_definitions_1.interpret(g, ""));
        });
        it("10", () => {
            assert.equal(false, dfa_definitions_1.interpret(g, "10"));
        });
        it("101", () => {
            assert.equal(false, dfa_definitions_1.interpret(g, "101"));
        });
    });
    describe("graph 2", () => {
        const g = {
            startState: {
                children: [
                    {
                        label: "1",
                        destination: {
                            isAcceptState: true,
                            children: [],
                        }
                    }
                ],
                isAcceptState: false,
            }
        };
        g.startState.children[0].destination.children.push({
            label: "0",
            destination: g.startState,
        });
        it("101", () => {
            assert.equal(true, dfa_definitions_1.interpret(g, "101"));
        });
        it("10", () => {
            assert.equal(false, dfa_definitions_1.interpret(g, "10"));
        });
    });
});


/***/ }),
/* 9 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

const _1 = __webpack_require__(1);
const assert = __webpack_require__(0);
function roundTripJSO(plugin, jso) {
    const jsoString = JSON.stringify(jso);
    const model = new _1.CoreModel(plugin, jso);
    const serialString = JSON.stringify(model.serialize());
    const model2 = new _1.CoreModel(plugin, JSON.parse(serialString));
    const serialString2 = JSON.stringify(model2.serialize());
    assert.equal(serialString2, jsoString, "checking roundtrip equal");
    return model2;
}
describe("Serialization", () => {
    it("one", () => {
        const test = roundTripJSO(_1.loadPlugin("test/definitions.ts"), {
            format: "sinap-file-format",
            kind: "TODO: implement this",
            version: "0.0.6",
            elements: [
                {
                    kind: "Graph",
                    type: "Graph1",
                    data: {
                        startState: { kind: "sinap-pointer", index: 1 },
                    },
                },
                {
                    kind: "Node",
                    type: "Node1",
                    data: {
                        a: true,
                    },
                },
            ]
        });
        assert.equal(true, test.elements[0].data['startState'].data.a);
    });
    it("two", () => {
        const test = roundTripJSO(_1.loadPlugin("test/definitions-for-serial.ts"), {
            format: "sinap-file-format",
            kind: "TODO: implement this",
            version: "0.0.6",
            elements: [
                {
                    kind: "Graph",
                    type: "Graph1",
                    data: {
                        startState: { kind: "sinap-pointer", index: 2 },
                    },
                },
                {
                    kind: "Node",
                    type: "Node1",
                    data: {
                        a: true,
                    },
                },
                {
                    kind: "Node",
                    type: "Node2",
                    data: {
                        b: {
                            n: { kind: "sinap-pointer", index: 1 },
                        },
                    },
                },
            ]
        });
        assert.equal(true, test.elements[0].data['startState'].data.b.n.data.a);
    });
});


/***/ }),
/* 10 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

const assert = __webpack_require__(0);
const ts = __webpack_require__(2);
const _1 = __webpack_require__(1);
describe("isValidEdge", () => {
    const program = ts.createProgram(["test/definitions.ts"], {
        target: ts.ScriptTarget.ES2016, module: ts.ModuleKind.CommonJS
    });
    const typeMap = _1.getTypes(new _1.TypeEnvironment(program.getTypeChecker()), program.getSourceFile("test/definitions.ts"), new Set([
        "Nodes",
        "Edges",
        "Graph",
    ]));
    const nodes = typeMap.get("Nodes");
    const node1 = nodes.types[0];
    const node3 = nodes.types[2];
    const node2 = nodes.types[1];
    const edges = typeMap.get("Edges");
    const edge1 = edges.types[0];
    const edge2 = edges.types[1];
    it("map edges", () => {
        assert.equal(true, _1.validateEdge(edge1, node1, node2));
        assert.equal(false, _1.validateEdge(edge1, node1, node3));
        assert.equal(true, _1.validateEdge(edge1, node1, node2));
        assert.equal(false, _1.validateEdge(edge2, node1, node2));
    });
});


/***/ }),
/* 11 */
/***/ (function(module, exports) {

module.exports = "function getNS(a){\n    if (global[a] === undefined){\n        global[a] = {};\n    }\n    return global[a];\n}\n\nfunction define(name, requires, func){\n    let exports = getNS(name);\n    let args = requires.slice(2).map(getNS);\n    func(...[null, exports].concat(args));\n}"

/***/ }),
/* 12 */
/***/ (function(module, exports) {

module.exports = "import * as plugin from \"./plugin\";\nimport * as types from \"./types-interfaces\";\n\n// TODO: consider\nexport interface FunctionTypeInfo {\n    args: types.Type[];\n    returnValue: types.Type;\n}\n\ninterface PropertyObject {\n    [propName: string]: any;\n}\n\ninterface Element extends PropertyObject {\n    label: string;\n}\n\ninterface Node extends Element {\n    parents: Edge[];\n    children: Edge[];\n}\n\ninterface Edge extends Element {\n    source: Node;\n    destination: Node;\n}\n\nfunction transferProperties(source: any, destination: PropertyObject) {\n    const propSet = source.pluginProperties;\n    for (const propName in propSet) {\n        destination[propName] = propSet[propName];\n    }\n}\n\n/**\n * This class is the graph presented to the user. For convenience of reading this data structure, there are duplicate\n * and cyclical references. The constructor guarantees that these are consistent, but any changes after construction\n * should be done in a consistent fashion. TODO: Make mutator methods for plugins to utilize once mutation of the graph\n * during interpretation is added.\n */\nclass Graph implements PropertyObject {\n    nodes: Node[];\n    edges: Edge[];\n    public constructor(serialGraph: any) {\n\n        serialGraph = serialGraph.graph;\n        transferProperties(serialGraph, this);\n\n        this.nodes = serialGraph.nodes.map((oldNode: any) => {\n            const result: Node = {\n                label: oldNode.drawableProperties.Label,\n                parents: [],\n                children: []\n            };\n            transferProperties(oldNode, result);\n            return result;\n        });\n\n        // This seems like duplicate code but I'm not sure how to clean it up and combine it with the code above.\n        this.edges = serialGraph.edges.map((oldEdge: any) => {\n            const source = this.nodes[oldEdge.source];\n            const destination = this.nodes[oldEdge.destination];\n\n            const result: Edge = {\n                label: oldEdge.pluginProperties.Symbol,\n                source: source,\n                destination: destination\n            };\n\n            transferProperties(oldEdge, result);\n\n            source.children.push(result);\n            destination.parents.push(result);\n            return result;\n        });\n    }\n}\n\nexport function compile(g: any) {\n    // TODO: cleanup, remove any, add try catch\n    return plugin.compile(new Graph(g) as any);\n}"

/***/ }),
/* 13 */
/***/ (function(module, exports) {

module.exports = "\nexport type ProgramOutput = any;\nexport type ProgramInput = any;\n\n/**\n * This interface is to be used for debugging support and is expected to maintain mutable state.\n */\nexport interface RunningProgram {\n    /**\n     * These are the properties that will be displayed to the user. TODO: Allow for this to be more flexible if there are large numbers of properties available.\n     */\n    debugProperties: [string];\n\n    /**\n     * Gets the result of the computation after the program completes. Behavior is undefined if called when isComplete is false.\n     */\n    result: ProgramOutput | null;\n\n    /**\n     * Performs one unit of work in the forward direction. Advanced debugging support should be provided elsewhere (such as step over or continue).\n     */\n    step(): void;\n\n    /**\n     * Performs one unit of work backwards. This method is optional since backwards debugging may be non-trivial for some plugins.\n     */\n    stepBack?(): void;\n\n    /**\n     * Retrieves the value of a property enumerated in debugProperties.\n     */\n    getDebugValue(property: string): ProgramOutput;\n}\n\n/**\n * This represents a compiled program given an input computation graph. It should be immutable, though the RunningProgram returned by initDebugging may be mutable itself.\n * If desired, a simple run method or initDebugging method can be provided and then fillInProgram will fill out the rest of the required fields/methods.\n */\nexport interface Program {\n    /**\n     * Any messages associated with graph compilation.\n     */\n    compilationMessages: string[];\n\n    /**\n     * Runs the input according to the graph this program was derived from.\n     */\n    run(input: ProgramInput): ProgramOutput; // This should be filled in by fillInProgram if not present.\n\n    /**\n     * Creates a new debugging instance. While the returned instance may itself be mutable, this object should have no change in state. This method is optional.\n     */\n    initDebugging?(input: ProgramInput): RunningProgram; // This is completely optional and must be checked.\n}"

/***/ }),
/* 14 */
/***/ (function(module, exports) {

module.exports = "export interface Type {\n    readonly name: string;\n\n    /**\n     * Return if this type is assignable to that type\n     */\n    isAssignableTo(that: Type): boolean;\n}\n\nexport interface UnionType {\n    types: Type[];\n}\n\nexport interface IntersectionType {\n    types: Type[];\n}\n\nexport interface ObjectType {\n    readonly members: Map<string, Type>;\n}"

/***/ }),
/* 15 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

class DFANode {
}
exports.DFANode = DFANode;
class DFAEdge {
}
exports.DFAEdge = DFAEdge;
class DFAGraph {
}
exports.DFAGraph = DFAGraph;
function interpret(graph, input) {
    let current = graph.startState;
    for (const char of input) {
        const possibleStates = current.children
            .filter(e => e.label === char)
            .map(e => e.destination);
        if (possibleStates.length < 1) {
            return false;
        }
        else if (possibleStates.length === 1) {
            current = possibleStates[0];
        }
        else {
            throw "Not a DFA";
        }
    }
    return current.isAcceptState;
}
exports.interpret = interpret;


/***/ }),
/* 16 */
/***/ (function(module, exports) {

module.exports = require("fs");

/***/ }),
/* 17 */
/***/ (function(module, exports, __webpack_require__) {

__webpack_require__(7);
__webpack_require__(8);
__webpack_require__(9);
module.exports = __webpack_require__(10);


/***/ })
/******/ ]);
//# sourceMappingURL=index.js.map