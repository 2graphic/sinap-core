import * as ts from "typescript";
import * as interfaces from "../sinap-includes/types-interfaces";
export declare class TypeEnvironment {
    checker: ts.TypeChecker;
    private types;
    constructor(checker: ts.TypeChecker);
    getType(type: ts.Type): Type;
}
export declare class Type implements interfaces.Type {
    env: TypeEnvironment;
    type: ts.Type;
    readonly name: string;
    constructor(env: TypeEnvironment, type: ts.Type);
    isAssignableTo(that: Type): boolean;
}
export declare class UnionType extends Type implements interfaces.UnionType {
    types: Type[];
    constructor(env: TypeEnvironment, type: ts.UnionType);
}
export declare class IntersectionType extends Type implements interfaces.IntersectionType {
    types: Type[];
    constructor(env: TypeEnvironment, type: ts.IntersectionType);
}
export declare class ObjectType extends Type implements interfaces.ObjectType {
    readonly members: Map<string, Type>;
    constructor(env: TypeEnvironment, type: ts.ObjectType);
}
export declare function getTypes(env: TypeEnvironment, file: ts.SourceFile, searchNames: Set<string>): Map<string, Type>;
export declare function validateEdge(edge: ObjectType, source?: ObjectType, destination?: ObjectType): boolean;
