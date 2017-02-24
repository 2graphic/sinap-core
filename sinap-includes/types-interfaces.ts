export interface TypeEnvironment {
    kind: "SinapTypeEnvironment";

    getAnyType(): Type;
    getStringType(): Type;
    getNumberType(): Type;
    getBooleanType(): Type;
    getVoidType(): Type;
    getUndefinedType(): Type;
    getNullType(): Type;
    getESSymbolType(): Type;
    getNeverType(): Type;
    getUnknownType(): Type;
    getStringLiteralType(text: string): Type;
    getNumberLiteralType(text: string): Type;
    getFalseType(): Type;
    getTrueType(): Type;
    lookupGlobalType(name: string): Type;
}

export interface TypeComparisons {
    /**
     * Return true if this type is assignable to that type
     */
    isAssignableTo(that: Type, alreadyFlipped?: boolean): boolean;

    /**
     * Return true if this type is assignable to that type
     */
    isAssignableFrom(that: Type, alreadyFlipped?: boolean): boolean;

    /**
     * Return true if this type is identical to that type
     */
    isIdenticalTo(that: Type): boolean;
}

export interface Type extends TypeComparisons {
    readonly name: string;
    readonly env: TypeEnvironment;
}

export interface UnionType extends Type {
    types: Set<Type>;
    kind: "SinapUnionType";
}

export interface IntersectionType extends Type {
    types: Type[];
    kind: "SinapIntersectionType";
}

export interface ObjectType extends Type {
    readonly members: Map<string, Type>;
    kind: "SinapObjectType";
    isArray(): this is ArrayType;
}

export interface ArrayType extends ObjectType {
    typeArguments: Type[];
}

export function isObjectType(t: Type): t is ObjectType {
    return t && (t as any).kind === "SinapObjectType";
}

export function isUnionType(t: Type): t is UnionType {
    return t && (t as any).kind === "SinapUnionType";
}

export function isIntersectionType(t: Type): t is IntersectionType {
    return t && (t as any).kind === "SinapIntersectionType";
}

export function isTypeEnvironment(t: any): t is TypeEnvironment {
    return t && t.kind === "SinapTypeEnvironment";
}