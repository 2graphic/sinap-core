import * as ts from "typescript";
import { CoreElementKind, CoreElement } from "./element";
import { TypeEnvironment, ObjectType } from "./types";
export declare class PluginTypeEnvironment extends TypeEnvironment {
    private pluginTypes;
    constructor(program: ts.Program);
    elementTypes(kind: CoreElementKind): IterableIterator<string>;
    getElementType(kind: CoreElementKind, type: string): ObjectType;
}
export declare class Plugin {
    results: {
        js: string | undefined;
        emitResults: ts.EmitResult;
    };
    typeEnvironment: PluginTypeEnvironment;
    constructor(program: ts.Program, results: {
        js: string | undefined;
        emitResults: ts.EmitResult;
    });
    printResults(): void;
    makeElement(kind: CoreElementKind, type?: string): CoreElement;
    elementTypes(kind: CoreElementKind): IterableIterator<string>;
}
