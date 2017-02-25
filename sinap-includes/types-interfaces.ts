export interface Type {
    readonly name: string;

    /**
     * Return if this type is assignable to that type
     */
    isAssignableTo(that: Type): boolean;
}

export interface UnionType {
    types: Type[];
}

export interface IntersectionType {
    types: Type[];
}

export interface ObjectType {
    readonly members: Map<string, Type>;
}