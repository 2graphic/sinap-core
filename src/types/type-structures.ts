/**
 * Main interface for all types
 */
export interface MetaType {
    /**
     * Return whether `this` is a subtype of `that`, in the case of variables this
     * function can add some constraints on `this` to make it allowed to return 
     * true.
     *
     * If `that.rsubtype` is defined, you should probably call it first to be nice to
     * variables. 
     * TODO: find a better way to enforce this.
     **/
    subtype(that: MetaType): boolean;

    /*
     * Is `that` a subtype of `this`
     */
    rsubtype?(that: MetaType): boolean;

    /*
     * Return a new version of this type in the context 
     * of types
     * this probably means just passing it to all inner types
     * and replacing them with the values they return
     * unless this is a variable.
     *
     * TODO: consider making everything return a copy
     * most mutate right now
     */
    feed(types: Map<string, MetaType>): MetaType;

    /*
     * Determine whether `this` is "valid"
     * things like invalid overrides should throw a descriptive error message here
     * mostly only used by ClassMetaType. Needs to happen after all feeds
     * also always throws `PREFIX+": free variable"` it it encounters a variable
     */
    validate(): void;

    /*
     * A textual name for the type
     */
    kind: string;

    isInstance(inp: any): boolean;
}

export class TypeScope {
    constructor(public definitions: Map<string, MetaType>) {

    }

    feed(scope: TypeScope): TypeScope {
        // TODO: make faster?
        const types = new Map([...this.definitions.entries()].concat([...scope.definitions.entries()]));

        for (const [key, type] of this.definitions.entries()) {
            this.definitions.set(key, type.feed(types));
        }
        return this;
    }

    validate() {
        for (const type of this.definitions.values()) {
            type.validate();
        }
    }
}

export class TypeVariable implements MetaType {
    readonly kind = "Variable";

    constructor(public type?: MetaType, public lookupName?: string, public matchName?: string) {

    }
    subtype(that: MetaType): boolean {
        if (!this.type) {
            this.type = that;
            return true;
        }
        if (this.type.subtype(that)) {
            return true;
        }
        if (that.subtype(this.type)) {
            this.type = that;
            return true;
        }
        return false;
    }

    rsubtype(that: MetaType) {
        if (!this.type) {
            this.type = that;
            return true;
        }
        if (that.subtype(this.type)) {
            return true;
        }
        if (this.type.subtype(that)) {
            this.type = that;
            return true;
        }
        return false;
    }

    feed(types: Map<string, MetaType>): MetaType {
        if (this.lookupName) {
            const replacementMetaType = types.get(this.lookupName);
            if (replacementMetaType) {
                return replacementMetaType;
            }
        }
        return this;
    }
    validate() { }

    isInstance(a: any) {
        if (this.type) {
            return this.type.isInstance(a);
        }
        return true;
    }

    toString() {
        return "(" + this.matchName + "?" + this.lookupName + ":" + this.type + ")";
    }
}

// literal: keyword
export class PrimitiveMetaType implements MetaType {
    readonly kind: string;
    constructor(readonly name: string) {
        this.kind = name;
    }

	/**
	 * true if `this` is a subtype of `that`.
	 **/
    subtype(that: MetaType): boolean {
        if (that.rsubtype) {
            return that.rsubtype(this);
        }
        return (that instanceof PrimitiveMetaType) && that.name === this.name;
    }

    toString() {
        return this.name;
    }

    feed(types: Map<string, MetaType>) {
        return this;
    }
    validate() { }

    isInstance(a: any) {
        switch (this.kind) {
            case "String":
                return typeof (a) === "string";
            case "Character":
                return (typeof (a) === "string") && a.length === 1;
            case "Number":
                return !Number.isNaN(a);
            case "Color":
                // TODO: make better
                return a instanceof String && a[0] === "#"
            case "Integer":
                return Number.isInteger(a);
            case "Boolean":
                return a === true || a === false;

            //TODO: implement
            case "File":
            default:
                return false;
        }
    }

}

// literal (t1, t2, ...)
export class TupleMetaType implements MetaType {
    readonly kind = "Tuple"
    constructor(readonly types: MetaType[]) {
    }

    subtype(that: MetaType): boolean {
        if (that.rsubtype) {
            return that.rsubtype(this);
        }
        if (!(that instanceof TupleMetaType)) {
            return false;
        }
        if (that.types.length !== this.types.length) {
            return false;
        }
        for (let i = 0; i < this.types.length; i++) {
            if (!this.types[i].subtype(that.types[i])) {
                return false;
            }
        }
        return true;
    }

    feed(types: Map<string, MetaType>) {
        for (let i = 0; i < this.types.length; i++) {
            this.types[i] = this.types[i].feed(types);
        }
        return this;
    }

    isInstance(a: any) {
        for (let i = 0; i < this.types.length; i++) {
            if (!this.types[i].isInstance(i)) {
                return false;
            }
        }
        return true;
    }

    validate() { }

    toString() {
        return "(" + this.types.join(", ") + ")";
    }
}

// literal List<t1>
export class ListMetaType implements MetaType {
    readonly kind = "List"
    constructor(public type: MetaType) {
    }

    subtype(that: MetaType): boolean {
        if (that.rsubtype) {
            return that.rsubtype(this);
        }
        if (!(that instanceof ListMetaType)) {
            return false;
        }
        return this.type.subtype(that.type);
    }

    feed(types: Map<string, MetaType>) {
        this.type = this.type.feed(types);
        return this;
    }
    validate() { }

    isInstance(a: any) {
        if (!Array.isArray(a)) {
            return false;
        }
        for (const el of a) {
            if (!this.type.isInstance(el)) {
                return false;
            }
        }
        return true;
    }


    toString() {
        return "List<" + this.type + ">";
    }
}

// TODO: make this a utility function somewhere else
function capitalize(str: string) {
    str = str.replace(/([a-z])([A-Z])/, "$1 $2");
    return str[0].toUpperCase() + str.slice(1);
}

// literal "class t1, t2, tn... { field:t ... }"
export class ClassMetaType implements MetaType {
    readonly kind = "Class"
    readonly fields = new Map<string, MetaType>();
    readonly names = new Map<string, string>();

    constructor(readonly conformsTo: (ClassMetaType | TypeVariable)[], readonly mappings: [string, [string | null, MetaType]][]) {
        for (const [name, [prettyName, type]] of mappings) {
            this.fields.set(name, type);
            if (prettyName) {
                this.names.set(name, prettyName);
            }
        }
    }

    validate(): void {
        for (const [k, t1] of this.fields.entries()) {
            if (t1 instanceof TypeVariable) {
                throw "ClassMetaType.validate: free type variable";
            }

            for (const t2 of this.promisedMetaTypes(k)) {
                if (!t1.subtype(t2)) {
                    throw "ClassMetaType.validate: cannot override " + t2 + " with " + t1;
                }
            }
        }
    }

    toString() {
        return "ClassMetaType";
    }

    private promisedMetaTypes(key: string): MetaType[] {
        const result: MetaType[] = [];
        for (const t of this.conformsTo) {
            if (t instanceof TypeVariable) {
                throw "ClassMetaType.promisedMetaTypes: free type variable";
            }
            result.push(...t.promisedMetaTypes(key));
        }
        const myPromise = this.fields.get(key);
        if (myPromise) {
            result.push(myPromise);
        }
        return result;
    }

    typeOf(key: string): MetaType {
        const va = new TypeVariable();
        for (const t of this.promisedMetaTypes(key)) {
            if (!va.subtype(t)) {
                throw "ClassMetaType.typeOf: internal inconsistancy, please validate";
            }
        }

        if (!va.type) {
            throw "ClassMetaType.typeOf: field doesn't exist";
        }

        return va.type;
    }

    prettyName(key: string): string {
        const name = this.names.get(key);
        if (name) {
            return name;
        }
        for (const sup of this.conformsTo) {
            if (sup instanceof TypeVariable) {
                throw "ClassMetaType.promisedMetaTypes: free type variable";
            }
            const name = sup.prettyName(key);
            if (name) {
                return name;
            }
        }
        return capitalize(key);
    }

    subtype(that: MetaType): boolean {
        if (that.rsubtype) {
            return that.rsubtype(this);
        }
        if (this === that) {
            return true;
        }
        for (const t of this.conformsTo) {
            if (t.subtype(that)) {
                return true;
            }
        }
        return false;
    }

    feed(types: Map<string, MetaType>) {
        for (const [key, value] of this.fields.entries()) {
            this.fields.set(key, value.feed(types));
        }
        for (let i = 0; i < this.conformsTo.length; i++) {
            const newValue = this.conformsTo[i].feed(types);
            if (newValue instanceof ClassMetaType || newValue instanceof TypeVariable) {
                this.conformsTo[i] = newValue;
            } else {
                throw "ClassMetaType.feed: cannot conform to a non class type"
            }
        }
        return this;
    }

    isInstance(a: any) {
        for (const [n, t] of this.fields.entries()) {
            if (!t.isInstance(a[n])) {
                return false;
            }
        }
        return true;
    }

}


// export class FunctionMetaType implements MetaType {
//     readonly kind = "Function"
//     constructor(public from: MetaType, public to: MetaType) {

//     }

//     subtype(that: MetaType): boolean {
//         if (that.rsubtype) {
//             return that.rsubtype(this);
//         }

//         if (!(that instanceof FunctionMetaType)) {
//             return false;
//         }
//         return that.from.subtype(this.from) && this.to.subtype(that.to);
//     }

//     feed(types: Map<string, MetaType>) {
//         this.from = this.from.feed(types);
//         this.to = this.to.feed(types);
//         return this;
//     }
//     validate() { }
// }

// export class ThunkMetaType implements MetaType {
//     readonly kind = "Thunk"
//     constructor(public to: MetaType) {

//     }

//     subtype(that: MetaType): boolean {
//         if (that.rsubtype) {
//             return that.rsubtype(this);
//         }

//         if (that instanceof ThunkMetaType) {
//             if (this.to.subtype(that.to)) {
//                 return true;
//             }
//         }
//         return this.to.subtype(that);
//     }

//     feed(types: Map<string, MetaType>) {
//         this.to = this.to.feed(types);
//         return this;
//     }
//     validate() { }
// }


export class EnumMetaType implements MetaType {
    readonly kind = "Enum"
    constructor(public literals: string[]) {

    }

    subtype(that: MetaType): boolean {
        if (that.rsubtype) {
            return that.rsubtype(this);
        }

        if (that instanceof EnumMetaType) {
            for (let i = 0; i < this.literals.length; i++) {
                if (this.literals[i] !== that.literals[i]) {
                    return false;
                }
            }
            return true;
        }
        return false;
    }

    isInstance(a: any) {
        return this.literals.indexOf(a) !== -1;
    }

    feed(types: Map<string, MetaType>) {
        return this;
    }
    validate() { }
}