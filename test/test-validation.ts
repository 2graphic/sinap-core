/// <reference path="../typings/globals/mocha/index.d.ts" />

import * as assert from "assert";
import * as ts from "typescript";
import { TypeEnvironment, UnionType, validateEdge, ObjectType, Type } from "../src/"

describe("isValidEdge", () => {
    const program = ts.createProgram(["test/definitions.ts"], {
        target: ts.ScriptTarget.ES2016, module: ts.ModuleKind.CommonJS
    });

    const env = new TypeEnvironment(program.getTypeChecker());

    const typeMap = new Map(["Nodes",
        "Edges",
        "Graph",].map(k => [k, env.getType(env.checker.lookupTypeAt(k, program.getSourceFile("test/definitions.ts")))] as [string, Type]));

    const nodes = typeMap.get("Nodes") as UnionType;
    const node1 = nodes.types[0] as ObjectType;
    const node3 = nodes.types[2] as ObjectType;
    const node2 = nodes.types[1] as ObjectType;
    const edges = typeMap.get("Edges") as UnionType;
    const edge1 = edges.types[0] as ObjectType;
    const edge2 = edges.types[1] as ObjectType;

    it("map edges", () => {
        assert.equal(true, validateEdge(edge1, node1, node2));
        assert.equal(false, validateEdge(edge1, node1, node3));
        assert.equal(true, validateEdge(edge1, node1, node2));
        assert.equal(false, validateEdge(edge2, node1, node2));
    });
});