import * as Structure from "./type-structures";

///////
/// Wrap up ./type-parser-inner.js
///////

declare function require(name:string): any;

const tpi = require("./type-parser-inner");

// type defintion for the kind of exception thrown by the parser
export type SyntaxError = {
    message: string;
    expected: { ignoreCase: boolean, test: string, type: string }[];
    found: string;
    location: { start: location, end: location };
    name: "SyntaxError";
}
export type location = { column: number, line: number, offset: number };

export type Typed = [any, Structure.MetaType];
export type TypedVariable = [string, Structure.MetaType];

/**
 * Check whther an exception is a syntax error
 **/
export function isSyntaxError(e: any): e is SyntaxError {
    return e.name && e.name === "SyntaxError";
}


export { MetaType, TypeScope, ClassMetaType, ListMetaType, TupleMetaType, TypeVariable } from "./type-structures";

/*
 * Parse a scope literal on its own
 */
export function parseScopeRaw(str: string): Structure.TypeScope {
    return tpi.parse("{" + str + "}", { startRule: "Definitions" });
}

/*
 * Parse a scope literal either in the default scope or in `inject`
 */
export function parseScope(str: string, inject?: Structure.TypeScope): Structure.TypeScope {
    if (inject === undefined) {
        inject = builtins;
    }
    return parseScopeRaw(str).feed(inject);
}

/*
 * Parse a type literal on its own
 */
export function parseTypeRaw(str: string): Structure.MetaType {
    return tpi.parse(str, { startRule: "Type" });
}

/*
 * Parse a type literal either in the default scope or in `inject`
 */
export function parseType(str: string, inject?: Structure.TypeScope): Structure.MetaType {
    if (inject === undefined) {
        inject = builtins;
    }
    return parseTypeRaw(str).feed(inject.definitions);
}

export class CharacterMetaType extends Structure.PrimitiveMetaType {
    constructor() {
        super("Character");
    }

    subtype(t: Structure.MetaType) {
        // Make sure rsubtype ends up called correctly
        if (super.subtype(t)) {
            return true;
        }
        return (t instanceof Structure.PrimitiveMetaType) && t.name === "String";
    }
}

/**
 * List of all primitive types
 **/

const StringType = new Structure.PrimitiveMetaType("String");
const CharacterType = new CharacterMetaType();
const FileType = new Structure.PrimitiveMetaType("File");
const NumberType = new Structure.PrimitiveMetaType("Number");
const ColorType = new Structure.PrimitiveMetaType("Color");
const IntegerType = new Structure.PrimitiveMetaType("Integer");
const BooleanType = new Structure.PrimitiveMetaType("Boolean");

export const primitives = new Structure.TypeScope(new Map<string, Structure.MetaType>([
    ["String", StringType],
    ["Character", CharacterType],
    ["Number", NumberType],
    ["Color", ColorType],
    ["Integer", IntegerType],
    ["Boolean", BooleanType],
    ["File", FileType],
]));

/**
 * Exported scope containing all "Builtin" types
 **/
export const builtins = parseScopeRaw(`
Point = class {
	x: Number
	y: Number
}

Graph = class {
	nodes: List<Node>
	edges: List<Edge>
}

Node = class {
    label: String
    children: List<Edge>
}

Edge = class {
    label: String
    source: Node
    destination: Node
}

Shape = enum {circle, square}
LineStyles = enum {dotted, solid, dashed}
`).feed(primitives)

for (const [name, type] of primitives.definitions) {
    builtins.definitions.set(name, type);
}

/**
 * Allow for easy imports of builtins.
 **/
export const Type = {
    String: StringType,
    Character: CharacterType,
    File: FileType,
    Number: NumberType,
    Color: ColorType,
    Integer: IntegerType,
    Boolean: BooleanType,
    Point: builtins.definitions.get("Point") as Structure.ClassMetaType,
    Graph: builtins.definitions.get("Graph") as Structure.ClassMetaType,
    Node: builtins.definitions.get("Node") as Structure.ClassMetaType,
    Edge: builtins.definitions.get("Edge") as Structure.ClassMetaType,
    Shape: builtins.definitions.get("Shape") as Structure.EnumMetaType,
    LineStyles: builtins.definitions.get("LineStyles") as Structure.EnumMetaType,
}