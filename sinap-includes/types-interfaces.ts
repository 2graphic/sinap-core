export interface TypeEnvironment {
    kind: "SinapTypeEnvironment";

    getAnyType(): Type<this>;
    getStringType(): Type<this>;
    getNumberType(): Type<this>;
    getBooleanType(): Type<this>;
    getVoidType(): Type<this>;
    getUndefinedType(): Type<this>;
    getNullType(): Type<this>;
    getESSymbolType(): Type<this>;
    getNeverType(): Type<this>;
    getUnknownType(): Type<this>;
    getStringLiteralType(text: string): Type<this>;
    getNumberLiteralType(text: string): Type<this>;
    getFalseType(): Type<this>;
    getTrueType(): Type<this>;
    lookupGlobalType(name: string): Type<this>;
}

export interface TypeComparisons<T extends TypeEnvironment> {
    /**
     * Return true if this type is assignable to that type
     */
    isSubtypeOf(that: Type<T>): boolean;

    /**
     * Return true if this type is assignable to that type
     */
    isAssignableTo(that: Type<T>, alreadyFlipped?: boolean): boolean;

    /**
     * Return true if this type is assignable to that type
     */
    isAssignableFrom(that: Type<T>, alreadyFlipped?: boolean): boolean;

    /**
     * Return true if this type is identical to that type
     */
    isIdenticalTo(that: Type<T>): boolean;
}

export interface Type<T extends TypeEnvironment> extends TypeComparisons<T> {
    readonly name: string;
    readonly env: T;

    canHold(a: any): { result: boolean, message?: string };
}

export interface UnionType<T extends TypeEnvironment> extends Type<T> {
    types: Set<Type<T>>;
    kind: "SinapUnionType";
}

export interface IntersectionType<T extends TypeEnvironment> extends Type<T> {
    types: Set<Type<T>>;
    kind: "SinapIntersectionType";
}

export interface ObjectType<T extends TypeEnvironment> extends Type<T> {
    readonly members: Map<string, Type<T>>;
    kind: "SinapObjectType";
    isArray(): this is ArrayType<T>;
}

export interface ArrayType<T extends TypeEnvironment> extends ObjectType<T> {
    typeArguments: Type<T>[];
}

export function isObjectType<T extends TypeEnvironment>(t: Type<T>): t is ObjectType<T> {
    return t && (t as any).kind === "SinapObjectType";
}

export function isUnionType<T extends TypeEnvironment>(t: Type<T>): t is UnionType<T> {
    return t && (t as any).kind === "SinapUnionType";
}

export function isIntersectionType<T extends TypeEnvironment>(t: Type<T>): t is IntersectionType<T> {
    return t && (t as any).kind === "SinapIntersectionType";
}

export function isTypeEnvironment(t: any): t is TypeEnvironment {
    return t && t.kind === "SinapTypeEnvironment";
}