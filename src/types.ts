import * as ts from "typescript";
import * as interfaces from "../sinap-includes/types-interfaces";

export type IType = interfaces.Type;

interface AssignableFrom {
    isAssignableFrom(that: Type): boolean;
}

function hasAssignableFrom(t: Type | AssignableFrom): t is AssignableFrom {
    return (t as any).isAssignableFrom !== undefined;
}

/**
 * Store a mapping of typescript types to our wrappers.
 *
 * In order to avoid infinite loops, we need to cache the ones
 * that we find.
 */
export class TypeEnvironment {
    private types = new Map<ts.Type, Type>();

    constructor(public checker: ts.TypeChecker) {
    }

    getType(type: ts.Type) {
        const t = this.types.get(type);
        if (t) {
            return t;
        }
        let wrapped: Type;
        if (type.flags & ts.TypeFlags.Union) {
            wrapped = new UnionType(this, type as ts.UnionType);
        } else if (type.flags & ts.TypeFlags.Intersection) {
            wrapped = new IntersectionType(this, type as ts.IntersectionType);
        } else if (type.flags & ts.TypeFlags.Object) {
            wrapped = new ObjectType(this, type as ts.ObjectType);
        } else {
            wrapped = new Type(this, type);
        }
        this.types.set(type, wrapped);
        return wrapped;
    }

    getAnyType() { return this.getType(this.checker.getAnyType()); }
    getStringType() { return this.getType(this.checker.getStringType()); }
    getNumberType() { return this.getType(this.checker.getNumberType()); }
    getBooleanType() { return this.getType(this.checker.getBooleanType()); }
    getVoidType() { return this.getType(this.checker.getVoidType()); }
    getUndefinedType() { return this.getType(this.checker.getUndefinedType()); }
    getNullType() { return this.getType(this.checker.getNullType()); }
    getESSymbolType() { return this.getType(this.checker.getESSymbolType()); }
    getNeverType() { return this.getType(this.checker.getNeverType()); }
    getUnknownType() { return this.getType(this.checker.getUnknownType()); }
    getStringLiteralType(text: string) { return this.getType(this.checker.getStringLiteralType(text)); };
    getNumberLiteralType(text: string) { return this.getType(this.checker.getNumberLiteralType(text)); };
    getFalseType() { return this.getType(this.checker.getFalseType()); }
    getTrueType() { return this.getType(this.checker.getTrueType()); }
}

export class Type implements interfaces.Type {
    get name() {
        return this.env.checker.typeToString(this.type);
    }
    // TODO: protect the arguments
    /**
     * Never call this manually, use getType on the appropriate
     * TypeEnvironment
     */
    constructor(public env: TypeEnvironment, public type: ts.Type) {
    }

    /**
     * Return if this type is assignable to that type
     */
    public isAssignableTo(that: Type) {
        // TODO: this is so funky
        if (hasAssignableFrom(that)) {
            return that.isAssignableFrom(this);
        }
        return this.env.checker.isAssignableTo(this.type, that.type);
    }
}

export class UnionType extends Type implements interfaces.UnionType {
    types: Type[];

    constructor(env: TypeEnvironment, type: ts.UnionType) {
        super(env, type);
        this.types = type.types.map(t => this.env.getType(t));
    }
}

/**
 * Don't call `.type` on this, it is mocked
 */
export class FakeUnionType implements interfaces.Type {
    constructor(public types: Type[]) {
    }

    /**
     * Return if this type is assignable to that type
     */
    public isAssignableTo(that: Type, cond = (that: UnionType) => (acc: boolean, t: Type, i: number) => acc && t.isAssignableTo(that.types[i])) {
        if ((that.type as any).intrinsicName === "any") {
            return true;
        }
        if (that instanceof UnionType) {
            return this.types.reduce(cond(that), true);
        }
        return false;
    }

    public isAssignableFrom(that: Type) {
        return this.isAssignableTo(that, (that) => (acc, t, i) => acc && that.types[i].isAssignableTo(t));
    }

    get name() {
        return this.types.map(t => t.name).join(" | ");
    }
}

export class IntersectionType extends Type implements interfaces.IntersectionType {
    types: Type[];

    constructor(env: TypeEnvironment, type: ts.IntersectionType) {
        super(env, type);
        this.types = type.types.map(t => this.env.getType(t));
    }
}

export class ObjectType extends Type implements interfaces.ObjectType {
    readonly members = new Map<string, Type>();
    readonly prettyNames = new Map<string, string>();

    constructor(env: TypeEnvironment, type: ts.ObjectType) {
        super(env, type);
        if (this.type.symbol === undefined || this.type.symbol.members === undefined) {
            // throw Error("not an object type");
            // TODO: address this
            return;
        }
        this.type.symbol.members.forEach((value, key) => {
            const tsType = this.env.checker.getTypeOfSymbol(value);
            let wrappingType: Type;
            if (tsType === type) {
                wrappingType = this;
            } else {
                wrappingType = this.env.getType(tsType);
            }
            this.members.set(key, wrappingType);

            let prettyName: string;
            const docComment = value.getDocumentationComment();
            if (docComment !== undefined && docComment.length > 0) {
                prettyName = docComment[0].text.trim();
            } else {
                prettyName = key[0].toUpperCase() + key.substr(1).replace(/([a-z])([A-Z])/g, "$1 $2");
            }

            this.prettyNames.set(key, prettyName);
        });
    }
}

export function validateEdge(edge: ObjectType, source?: ObjectType, destination?: ObjectType): boolean {
    const destinationExpected = edge !== undefined ? edge.members.get("destination") : null;
    const sourceExpected = edge !== undefined ? edge.members.get("source") : null;

    // constrain that 0th is assignable to 1st
    const constraints: [Type, Type][] = [];

    if (destinationExpected && destination) {
        constraints.push([destination, destinationExpected]);
    }

    if (sourceExpected && source) {
        constraints.push([source, sourceExpected]);
    }

    // constrain that the edge is assignable to the child array
    // and the parent array of the source and destination nodes
    // respectively
    if (destination !== undefined) {
        addParentChildConstraint(destination.members.get("parents"));
    }
    if (source !== undefined) {
        addParentChildConstraint(source.members.get("children"));
    }

    function addParentChildConstraint(listType?: Type) {
        // if there is actually the field declared
        if (listType) {
            if (listType.type.flags & ts.TypeFlags.Object) {
                const obj = listType.type as ts.ObjectType;
                if (obj.objectFlags & ts.ObjectFlags.Reference) {
                    const ref = obj as ts.TypeReference;
                    constraints.push([edge, listType.env.getType(ref.typeArguments[0])]);
                } else {
                    // don't care if there is a parents/child field
                    // but if there is, it better be a list
                    throw Error("parents/children must be a reference to an array type");
                }
            } else {
                // don't care if there is a parents/child field
                // but if there is, it better be a list
                throw Error("parents/children must be a reference to an array type");
            }
        }
    }

    return constraints.reduce((prev, [t1, t2]) => prev ? t1.isAssignableTo(t2) : false, true);
}