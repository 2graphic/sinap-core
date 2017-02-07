import { getTypes, TypeEnvironment, UnionType, validateEdge, ObjectType } from "../src/types"
import * as ts from "typescript";

export function run(){
    console.log("testing isValidEdge")
    const program = ts.createProgram(["tests/definitions.ts"], {
        target: ts.ScriptTarget.ES2016, module: ts.ModuleKind.CommonJS
    });

    const typeMap = getTypes(new TypeEnvironment(program.getTypeChecker()),
                            program.getSourceFile("tests/definitions.ts"),
                            new Set([
                                "Nodes",
                                "Edges",
                                "Graph",
                            ]));

    const nodes = typeMap.get("Nodes") as UnionType;
    const node1 = nodes.types[0] as ObjectType;
    const node3 = nodes.types[2] as ObjectType;
    const node2 = nodes.types[1] as ObjectType;
    const edges = typeMap.get("Edges") as UnionType;
    const edge1 = edges.types[0] as ObjectType;
    const edge2 = edges.types[1] as ObjectType;

    console.log("1.", validateEdge(edge1, node1, node2) === true);
    console.log("2.", validateEdge(edge1, node1, node3) === false);
    console.log("3.", validateEdge(edge1, node1, node2) === true);
    console.log("4.", validateEdge(edge2, node1, node2) === false);
}