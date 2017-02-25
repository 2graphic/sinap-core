import * as ts from "typescript";
import { Type, UnionType, IntersectionType, ObjectType, TypeComparisons, isObjectType, isUnionType, TypeEnvironment, ArrayType } from ".";

/**
 * Store a mapping of typescript types to our wrappers.
 *
 * In order to avoid infinite loops, we need to cache the ones
 * that we find.
 */
export class ScriptTypeEnvironment implements TypeEnvironment {
    kind: "SinapTypeEnvironment" = "SinapTypeEnvironment";
    private types = new Map<ts.Type, WrappedScriptType>();

    constructor(public checker: ts.TypeChecker) {
    }

    getType(type: ts.Type) {
        const t = this.types.get(type);
        if (t) {
            return t;
        }
        let wrapped: WrappedScriptType;
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

export class WrappedScriptType implements Type {
    get name() {
        return this.env.checker.typeToString(this.type);
    }
    // TODO: protect the arguments
    /**
     * Never call this manually, use getType on the appropriate
     * TypeEnvironment
     */
    constructor(public env: ScriptTypeEnvironment, public type: ts.Type) {
    }

    /**
     * Return if this type is assignable to that type
     */
    public isAssignableTo(that: Type): boolean {
        if (!(that instanceof WrappedScriptType)) {
            return that.isAssignableFrom(this, true);
        }
        return this.env.checker.isAssignableTo(this.type, that.type);
    }
    /**
     * Return if this type is assignable to that type
     */
    public isAssignableFrom(that: Type): boolean {
        if (!(that instanceof WrappedScriptType)) {
            return that.isAssignableTo(this, true);
        }
        return this.env.checker.isAssignableTo(that.type, this.type);
    }
    /**
     * Return if this type is identical to that type
     */
    public isIdenticalTo(that: Type): boolean {
        if (!(that instanceof WrappedScriptType)) {
            return that.isIdenticalTo(this);
        }
        return this.env.checker.isIdenticalTo(this.type, that.type);
    }
}

export class WrappedScriptUnionType extends WrappedScriptType implements UnionType {
    kind: "SinapUnionType" = "SinapUnionType";
    types: Set<WrappedScriptType>;

    constructor(env: ScriptTypeEnvironment, type: ts.UnionType) {
        super(env, type);
        this.types = new Set(type.types.map(t => this.env.getType(t)));
    }
}

export class WrappedScriptIntersectionType extends WrappedScriptType implements IntersectionType {
    kind: "SinapIntersectionType" = "SinapIntersectionType";
    types: WrappedScriptType[];

    constructor(env: ScriptTypeEnvironment, type: ts.IntersectionType) {
        super(env, type);
        this.types = type.types.map(t => this.env.getType(t));
    }
}

export class WrappedScriptObjectType extends WrappedScriptType implements ObjectType, ArrayType {
    kind: "SinapObjectType" = "SinapObjectType";
    readonly members = new Map<string, WrappedScriptType>();
    readonly prettyNames = new Map<string, string>();

    constructor(env: ScriptTypeEnvironment, type: ts.ObjectType) {
        super(env, type);
        if (this.type.symbol === undefined || this.type.symbol.members === undefined) {
            // throw Error("not an object type");;
            // TODO: address this
            return;
        }
        this.type.symbol.members.forEach((value, key) => {
            const tsType = this.env.checker.getTypeOfSymbol(value);
            let wrappingType: WrappedScriptType;
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

    get typeArguments(): WrappedScriptType[] {
        // not sure what type this actually is,
        // I found `typeArguments` in the debugger,
        // this isn't super safe, but Idk where to get it
        // grepping in typescript would probably turn up nice
        // results. For now, `any` works
        const args: ts.Type[] = (this.type as any).typeArguments;
        return args.map(t => this.env.getType(t));
    }
}

export function validateEdge(edge: WrappedScriptObjectType, source?: WrappedScriptObjectType, destination?: WrappedScriptObjectType): boolean {
    const destinationExpected = edge !== undefined ? edge.members.get("destination") : null;
    const sourceExpected = edge !== undefined ? edge.members.get("source") : null;

    // constrain that 0th is assignable to 1st
    const constraints: [WrappedScriptType, WrappedScriptType][] = [];

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

    function addParentChildConstraint(listType?: WrappedScriptType) {
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

export abstract class FakeType implements Type {
    constructor(public env: TypeEnvironment) {

    }
    /**
     * Return if this type is assignable to that type
     */
    public abstract isXTo(that: Type, X: keyof TypeComparisons): boolean;

    public isAssignableTo(that: Type) {
        return this.isXTo(that, "isAssignableTo");
    }
    public isAssignableFrom(that: Type) {
        return this.isXTo(that, "isAssignableFrom");
    }
    public isIdenticalTo(that: Type) {
        return this.isXTo(that, "isIdenticalTo");
    }

    abstract name: string;
}

export class FakeUnionType extends FakeType implements UnionType {
    kind: "SinapUnionType" = "SinapUnionType";

    constructor(env: TypeEnvironment, readonly types: Set<Type>) {
        super(env);
    }

    public isXTo(that: Type, X: keyof TypeComparisons): boolean {
        if ((that instanceof WrappedScriptType) && (that.type as any).intrinsicName === "any") {
            return true;
        }
        if (isUnionType(that)) {
            if (this.types.size !== that.types.size) {
                return false;
            }

            outerLoop: for (const type of this.types.values()) {
                if (that.types.has(type)) {
                    continue;
                }
                for (const thatType of that.types.values()) {
                    if (type[X](thatType)) {
                        continue outerLoop;
                    }
                }
                return false;
            }
            return true;
        }
        return false;
    }

    get name() {
        return [...this.types.values()].map(t => t.name).join(" | ");
    }
}

export class FakeObjectType extends FakeType implements ObjectType {
    kind: "SinapObjectType" = "SinapObjectType";

    constructor(env: TypeEnvironment, readonly members: Map<string, Type>) {
        super(env);
    }

    public isXTo(that: Type, X: keyof TypeComparisons): boolean {
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

    name = "SinapObjectType(Change this)";
}
