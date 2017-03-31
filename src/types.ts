import * as ts from "typescript";
import { Type, UnionType, IntersectionType, ObjectType, TypeComparisons, isObjectType, TypeEnvironment, ArrayType } from ".";

/**
 * Store a mapping of typescript types to our wrappers.
 *
 * In order to avoid infinite loops, we need to cache the ones
 * that we find.
 */
export class ScriptTypeEnvironment implements TypeEnvironment {
    kind: "SinapTypeEnvironment" = "SinapTypeEnvironment";
    private types = new Map<ts.Type, WrappedScriptType<this>>();

    constructor(public checker: ts.TypeChecker) {
    }

    getType(type: ts.Type): WrappedScriptType<this> {
        const t = this.types.get(type);
        if (t) {
            return t;
        }
        let wrapped: WrappedScriptType<this>;
        if (type.flags & ts.TypeFlags.Union) {
            wrapped = new WrappedScriptUnionType(this, type as ts.UnionType);
        } else if (type.flags & ts.TypeFlags.Intersection) {
            wrapped = new WrappedScriptIntersectionType(this, type as ts.IntersectionType);
        } else if (type.flags & ts.TypeFlags.Object) {
            wrapped = new WrappedScriptObjectType(this, type as ts.ObjectType);
        } else {
            wrapped = new WrappedScriptType(this, type);
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
    lookupGlobalType(name: string) {
        return this.getType(this.checker.lookupGlobalType(name));
    }
}

export class WrappedScriptType<T extends ScriptTypeEnvironment> implements Type<T> {
    get name() {
        return this.env.checker.typeToString(this.type);
    }
    // TODO: protect the arguments
    /**
     * Never call this manually, use getType on the appropriate
     * TypeEnvironment
     */
    constructor(public env: T, public type: ts.Type) {
    }

    /**
     * Return if this type is a subtype of that type
     */
    public isSubtypeOf(that: Type<TypeEnvironment>): boolean {
        if (!(that instanceof WrappedScriptType)) {
            return false;
        }
        return this.env.checker.isSubtypeOf(this.type, that.type);
    }
    /**
     * Return if this type is assignable to that type
     */
    public isAssignableTo(that: Type<TypeEnvironment>): boolean {
        if (!(that instanceof WrappedScriptType)) {
            return that.isAssignableFrom(this, true);
        }
        return this.env.checker.isAssignableTo(this.type, that.type);
    }
    /**
     * Return if this type is assignable to that type
     */
    public isAssignableFrom(that: Type<TypeEnvironment>): boolean {
        if (!(that instanceof WrappedScriptType)) {
            return that.isAssignableTo(this, true);
        }
        return this.env.checker.isAssignableTo(that.type, this.type);
    }
    /**
     * Return if this type is identical to that type
     */
    public isIdenticalTo(that: Type<TypeEnvironment>): boolean {
        if (!(that instanceof WrappedScriptType)) {
            return that.isIdenticalTo(this);
        }
        return this.env.checker.isIdenticalTo(this.type, that.type);
    }

    canHold(a: any): { result: boolean, message?: string } {
        const strVersion: string = typeof a === "string" ? '"' + a + '"' : a != null ? a.toString() : "undefined";

        if (typeof a === this.name) {
            return { result: true };
        } else if (strVersion === this.name) {
            return { result: true };
        } else {
            return { result: false, message: `Type ${this.name} cannot hold ${a}` };
        }
    }
}

function objectCanHold(this: ObjectType<TypeEnvironment>, a: any) {
    if (typeof a !== "object") {
        return {
            result: false,
            message: "Object cannot hold non object"
        };
    }
    for (const [key, value] of this.members.entries()) {
        const res = value.canHold(a[key]);
        if (!res.result) {
            return res;
        }
    }
    return { result: true };
}

function unionCanHold(this: UnionType<TypeEnvironment>, a: any) {
    for (const t of this.types) {
        const canHold = t.canHold(a);
        if (canHold.result) {
            return canHold;
        }
    }
    return { result: false, message: "none of the underlying types can hold" };
}

function intersectionCanHold(this: IntersectionType<TypeEnvironment>, a: any) {
    for (const t of this.types) {
        const canHold = t.canHold(a);
        if (!canHold.result) {
            return canHold;
        }
    }
    return { result: true };
}

export class WrappedScriptUnionType<T extends ScriptTypeEnvironment> extends WrappedScriptType<T> implements UnionType<T> {
    kind: "SinapUnionType" = "SinapUnionType";
    types: Set<WrappedScriptType<T>>;

    constructor(env: T, type: ts.UnionType) {
        super(env, type);
        this.types = new Set(type.types.map(t => this.env.getType(t)));
    }

    canHold(a: any) {
        return unionCanHold.apply(this, [a]);
    }
}

export class WrappedScriptIntersectionType<T extends ScriptTypeEnvironment> extends WrappedScriptType<T> implements IntersectionType<T> {
    kind: "SinapIntersectionType" = "SinapIntersectionType";
    types = new Set<WrappedScriptType<T>>();

    constructor(env: T, type: ts.IntersectionType) {
        super(env, type);
        this.types = new Set(type.types.map(t => this.env.getType(t)));
    }

    canHold(a: any) {
        return intersectionCanHold.apply(this, [a]);
    }
}


export class WrappedScriptObjectType<T extends ScriptTypeEnvironment> extends WrappedScriptType<T> implements ObjectType<T>, ArrayType<T> {
    kind: "SinapObjectType" = "SinapObjectType";
    readonly members = new Map<string, WrappedScriptType<T>>();
    readonly prettyNames = new Map<string, string>();

    constructor(env: T, type: ts.ObjectType) {
        super(env, type);
        if (this.type.symbol === undefined || this.type.symbol.members === undefined) {
            // throw Error("not an object type");
            // TODO: address this
            return;
        }
        this.type.symbol.members.forEach((value, key) => {
            const tsType = this.env.checker.getTypeOfSymbol(value);
            let wrappingType: WrappedScriptType<T>;
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

    isArray() {
        return this.type.symbol === this.env.lookupGlobalType("Array").type.symbol;
    }

    get typeArguments(): WrappedScriptType<T>[] {
        // not sure what type this actually is,
        // I found `typeArguments` in the debugger,
        // this isn't super safe, but Idk where to get it
        // grepping in typescript would probably turn up nice
        // results. For now, `any` works
        const args: ts.Type[] = (this.type as any).typeArguments;
        return args.map(t => this.env.getType(t));
    }

    canHold(a: any) {
        return objectCanHold.apply(this, [a]);
    }
}

export function validateEdge<T extends ScriptTypeEnvironment>(edge: WrappedScriptObjectType<T>, source?: WrappedScriptObjectType<T>, destination?: WrappedScriptObjectType<T>): boolean {
    const destinationExpected = edge !== undefined ? edge.members.get("destination") as WrappedScriptObjectType<T> : null;
    const sourceExpected = edge !== undefined ? edge.members.get("source") as WrappedScriptObjectType<T> : null;

    // constrain that 0th is assignable to 1st
    const constraints: [WrappedScriptObjectType<T>, WrappedScriptObjectType<T>][] = [];

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

    function addParentChildConstraint(listType?: WrappedScriptType<T>) {
        // if there is actually the field declared
        if (listType) {
            if (listType.type.flags & ts.TypeFlags.Object) {
                const obj = listType.type as ts.ObjectType;
                if (obj.objectFlags & ts.ObjectFlags.Reference) {
                    const ref = obj as ts.TypeReference;
                    constraints.push([edge, listType.env.getType(ref.typeArguments[0]) as WrappedScriptObjectType<T>]);
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

export abstract class FakeType<T extends TypeEnvironment> implements Type<T> {
    constructor(public env: T) {

    }
    /**
     * Return if this type is assignable to that type
     */
    public abstract isXTo(that: Type<T>, X: keyof TypeComparisons<T>): boolean;

    public isAssignableTo(that: Type<T>) {
        return this.isXTo(that, "isAssignableTo");
    }
    public isAssignableFrom(that: Type<T>) {
        return this.isXTo(that, "isAssignableFrom");
    }
    public isIdenticalTo(that: Type<T>) {
        return this.isXTo(that, "isIdenticalTo");
    }
    public isSubtypeOf(_: Type<T>) {
        return false;
    }
    abstract name: string;
    abstract canHold(a: any): { result: boolean, value?: string };
}

export class FakeUnionType<T extends TypeEnvironment> extends FakeType<T> implements UnionType<T> {
    kind: "SinapUnionType" = "SinapUnionType";

    constructor(env: T, readonly types: Set<Type<T>>) {
        super(env);
    }

    public isXTo(that: Type<T>, X: keyof TypeComparisons<T>): boolean {
        if ((that instanceof WrappedScriptType) && (that.type as any).intrinsicName === "any") {
            return true;
        }
        throw new Error(`not implemented FakeUnionType.${X}`);
    }

    get name() {
        return [...this.types.values()].map(t => t.name).join(" | ");
    }

    canHold(a: any) {
        return unionCanHold.apply(this, [a]);
    }
}

export class FakeIntersectionType<T extends TypeEnvironment> extends FakeType<T> implements IntersectionType<T> {
    kind: "SinapIntersectionType" = "SinapIntersectionType";

    constructor(env: T, readonly types: Set<Type<T>>) {
        super(env);
    }

    public isXTo(that: Type<T>, X: keyof TypeComparisons<T>): boolean {
        if ((that instanceof WrappedScriptType) && (that.type as any).intrinsicName === "any") {
            return true;
        }
        throw new Error(`not implemented FakeIntersectionType.${X}`);
    }

    get name() {
        return [...this.types.values()].map(t => t.name).join(" | ");
    }

    canHold(a: any) {
        return intersectionCanHold.apply(this, [a]);
    }
}

export class FakeObjectType<T extends TypeEnvironment> extends FakeType<T> implements ObjectType<T> {
    kind: "SinapObjectType" = "SinapObjectType";

    constructor(env: T, readonly members: Map<string, Type<T>>) {
        super(env);
    }

    public isXTo(that: Type<T>, X: keyof TypeComparisons<T>): boolean {
        if ((that instanceof WrappedScriptType) && (that.type as any).intrinsicName === "any") {
            return true;
        }
        if (isObjectType(that)) {
            if (this.members.size !== that.members.size) {
                return false;
            }
            for (const [key, type] of this.members.entries()) {
                const thatType = that.members.get(key);
                if (thatType === undefined) {
                    return false;
                }
                if (!type[X](thatType)) {
                    return false;
                }
            }
            return true;
        }
        return false;
    }

    isArray() {
        return false;
    }

    canHold(a: any) {
        return objectCanHold.apply(this, [a]);
    }

    name = "SinapObjectType(Change this)";
}
