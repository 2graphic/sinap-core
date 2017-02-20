import * as ts from "typescript";
import { CoreElementKind, CoreElement, TypeEnvironment, Type, UnionType, ObjectType, printDiagnostics } from ".";

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
    private pluginSourceFile: ts.SourceFile;
    private sinapSourceFile: ts.SourceFile;

    public drawableTypes: Map<CoreElementKind, ObjectType>;

    public startTypes: [Type[], Type][];

    lookupPluginType(n: string) {
        return this.getType(this.checker.lookupTypeAt(n, this.pluginSourceFile));
    }

    lookupSinapType(n: string) {
        return this.getType(this.checker.lookupTypeAt(n, this.sinapSourceFile));
    }

    private getFunctionSignatures(name: string, node: ts.Node) {
        const functionSymbol = this.checker.getSymbolsInScope(node, ts.SymbolFlags.Function)
            .filter((a) => a.name === name)[0];
        if (functionSymbol === undefined) {
            throw new Error(`function "${name}" not found`);
        }
        const functionType = this.checker.getTypeOfSymbol(functionSymbol);
        const sig = functionType.getCallSignatures();
        return sig.map(s =>
            [
                s.getParameters().map(p => this.getType(this.checker.getTypeOfSymbol(p))),
                this.getType(s.getReturnType())
            ] as [Type[], Type]);
    }

    constructor(program: ts.Program) {
        super(program.getTypeChecker());
        this.pluginSourceFile = program.getSourceFile("plugin.ts");
        this.sinapSourceFile = program.getSourceFile("plugin-stub.ts");
        this.drawableTypes = new Map();
        this.drawableTypes.set(CoreElementKind.Node, this.lookupSinapType("DrawableNode") as ObjectType);
        this.drawableTypes.set(CoreElementKind.Edge, this.lookupSinapType("DrawableEdge") as ObjectType);
        this.drawableTypes.set(CoreElementKind.Graph, this.lookupSinapType("DrawableGraph") as ObjectType);

        this.startTypes = this.getFunctionSignatures("start", program.getSourceFile("plugin.ts"));

        this.pluginTypes = new Map(["Nodes", "Edges", "Graph"]
            .map(k => [k, this.lookupPluginType(k)] as [string, Type])
            .map(([n, v]) => [n, new Map(unionToList(v))] as [string, Map<string, ObjectType>]));
    }

    elementTypes(kind: CoreElementKind) {
        const type = this.pluginTypes.get(kindToKey(kind));
        if (type === undefined) {
            throw Error("kind not found");;
        }
        return type.keys();
    }

    getElementType(kind: CoreElementKind, type: string): ObjectType {
        const t = this.pluginTypes.get(kindToKey(kind));
        if (t === undefined) {
            throw Error("kind not found");;
        }
        const ty = t.get(type);
        if (ty === undefined) {
            throw Error("type not found");;
        }
        return ty;
    }
}

export interface CompilationDiagnostics {
    global: ts.Diagnostic[];
    semantic: ts.Diagnostic[];
    syntactic: ts.Diagnostic[];
}

export class CompilationResult {
    constructor(readonly js: string, readonly diagnostics: CompilationDiagnostics) {
    }
}

export class Plugin {
    public typeEnvironment: PluginTypeEnvironment;

    constructor(program: ts.Program, readonly results: CompilationResult, readonly pluginKind: string[]) {
        this.typeEnvironment = new PluginTypeEnvironment(program);
    }

    // TODO: remove
    public printResults() {
        printDiagnostics(this.results.diagnostics.global);
        printDiagnostics(this.results.diagnostics.semantic);
        printDiagnostics(this.results.diagnostics.syntactic);
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