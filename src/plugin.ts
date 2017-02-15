import * as ts from "typescript";
import { CoreElementKind, CoreElement } from "./element";
import { TypeEnvironment, getTypes, Type, UnionType, ObjectType } from "./types";
import { printDiagnostics } from "../src/plugin-loader";

function unionToList(type: Type): [string, ObjectType][] {
    if (type instanceof UnionType) {
        return type.types.map(unionToList).reduce((p, c) => p.concat(c));
    } else if (type instanceof ObjectType) {
        return [[type.name, type]];
    }
    throw `type must be a union type or an object type.`

}

function kindToKey(kind: CoreElementKind): string {
    switch (kind) {
        case CoreElementKind.Edge:
            return "Edges";
        case CoreElementKind.Node:
            return "Nodes";
        case CoreElementKind.Graph:
            return "Graph";
    }
}


export class PluginTypeEnvironment extends TypeEnvironment {
    private pluginTypes: Map<string, Map<string, ObjectType>>;
    constructor(program: ts.Program) {
        super(program.getTypeChecker());

        // TODO: magic "plugin.ts" string
        const types = getTypes(this, program.getSourceFile("plugin.ts"), new Set(["Nodes", "Edges", "Graph"]));
        this.pluginTypes = new Map([...types.entries()]
            .map(([n, v]) => [n, new Map(unionToList(v))] as [string, Map<string, ObjectType>]));
    }

    elementTypes(kind: CoreElementKind) {
        const type = this.pluginTypes.get(kindToKey(kind));
        if (type === undefined) {
            throw "kind not found";
        }
        return type.keys();
    }

    getElementType(kind: CoreElementKind, type: string): ObjectType {
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

export class Plugin {
    public typeEnvironment: PluginTypeEnvironment;

    constructor(program: ts.Program, private results: { js: string | undefined, emitResults: ts.EmitResult }) {
        this.typeEnvironment = new PluginTypeEnvironment(program);
    }

    // TODO: remove
    public printResults() {
        printDiagnostics(this.results.emitResults);
    }

    makeElement(kind: CoreElementKind, type?: string) {
        if (type === undefined) {
            type = this.elementTypes(kind).next().value;
        }
        return new CoreElement(this.typeEnvironment.getElementType(kind, type), kind);
    }

    elementTypes(kind: CoreElementKind) {
        return this.typeEnvironment.elementTypes(kind);
    }
}