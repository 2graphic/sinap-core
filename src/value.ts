import {
    Type,
    ObjectType,
    UnionType,
    IntersectionType,
    TypeEnvironment,
    isObjectType,
    isUnionType,
    isIntersectionType,
    isTypeEnvironment,
    WrappedScriptType,
    FakeObjectType,
    FakePromise,
} from ".";

import * as ts from "typescript";
const deepEqual = require("deep-equal");

// If returning a promise, it must be resolved before the CoreValue structure is used
export type MakeValue<T extends TypeEnvironment> = (t: Type<T>, a: any, mutable: boolean) => CoreValue<T> | FakePromise<CoreValue<T>>;

export abstract class CoreValue<T extends TypeEnvironment> {
    listeners = new Set<(value: CoreValue<T>, newValue: any) => void>();

    protected notify(nv: any) {
        for (const listener of this.listeners) {
            listener(this, nv);
        }
    }

    constructor(readonly type: Type<T>, public mutable: boolean, protected converter: MakeValue<T>) {
    }

    abstract jsonify(a: (a: CoreValue<T>) => { value: any, result: boolean }): any;
    deepEqual(v: CoreValue<T>): boolean {
        const thisJSO = this.jsonify(() => { return { result: false, value: undefined }; });
        const thatJSO = v.jsonify(() => { return { result: false, value: undefined }; });

        return deepEqual(thisJSO, thatJSO);
    };
}

export class CorePlaceholderValue<T extends TypeEnvironment> extends CoreValue<T> {
    constructor(type: Type<T>, converter: MakeValue<T>) {
        super(type, true, converter);
    }

    jsonify(_: any) {
        return { kind: "sinap-placeholder" };
    }

    deepEqual() {
        return false;
    }
}

export type PrimitiveTypes = boolean | number | string | undefined | null;

export class CorePrimitiveValue<T extends TypeEnvironment> extends CoreValue<T> {
    constructor(type: Type<T>, private _data: PrimitiveTypes, mutable: boolean, converter: MakeValue<T>) {
        super(type, mutable, converter);
        if (this._data == null) {
            this.initialize();
        }
    }

    get data() {
        return this._data;
    }
    set data(a: PrimitiveTypes) {
        if (!this.mutable) {
            throw new Error("cannot load into immutable object");
        }

        const canHold = this.type.canHold(a);
        if (!canHold.result) {
            throw new Error(canHold.message);
        }
        this.notify(a);
        this._data = a;
    }

    initialize() {
        if (this.type instanceof WrappedScriptType) {
            if (this.type.type.flags & ts.TypeFlags.NumberLiteral) {
                this._data = Number(this.type.name);
            } else if (this.type.type.flags & ts.TypeFlags.StringLiteral) {
                this._data = this.type.name.substring(1, this.type.name.length - 1);
            } else if (this.type.type.flags & ts.TypeFlags.BooleanLiteral) {
                this._data = Boolean(this.type.name);
            } else if (this.type.type.flags & ts.TypeFlags.String) {
                this._data = "";
            } else if (this.type.type.flags & ts.TypeFlags.Number) {
                this._data = 0;
            } else if (this.type.type.flags & ts.TypeFlags.Boolean) {
                this._data = false;
            } else if (this.type.type.flags & ts.TypeFlags.Null) {
                this._data = null;
            } else if (this.type.type.flags & ts.TypeFlags.Undefined) {
                this._data = undefined;
            }
        }
    }

    jsonify() {
        return this.data;
    }

    // deepEqual(v: CoreValue<T>): boolean {
    //     if (!(v instanceof CorePrimitiveValue)) {
    //         return false;
    //     }
    //     return this.data === v.data;
    // }
}

export class CoreWrappedStringValue<T extends TypeEnvironment> extends CorePrimitiveValue<T> {
    constructor(env: T, data: string, mutable: boolean, converter: MakeValue<T>) {
        super(env.getStringType(), data, mutable, converter);
    }
}

export class CoreObjectValue<T extends TypeEnvironment> extends CoreValue<T> {
    constructor(readonly type: ObjectType<T>, data: any, readonly values: { [a: string]: CoreValue<T> }, public mutable: boolean, converter: MakeValue<T>) {
        super(type, mutable, converter);

        if (type.isArray()) {
            throw new Error("Arrays are not CoreObjectValue's");
        }

        if (data) {
            this.load(data);
        }
    }

    get(k: string, destValue?: any, isLoading = false) {
        if (this.values[k] === undefined) {
            const type = this.type.members.get(k);
            if (type) {
                // When a union of string literal types makes it here we DIE
                // TODO

                // TODO: this resolution logic should be a function
                const value = this.converter(type, destValue, this.mutable);
                if (value instanceof FakePromise) {
                    const sentinal = "SOME SENTINAL VALUE";
                    this.values[k] = sentinal as any;
                    value.then((v) => {
                        if (this.values[k] as any !== sentinal) {
                            throw new Error("mutated while waiting on promise");
                        }
                        this.values[k] = v;
                    });
                } else {
                    this.values[k] = value;
                }
            } else if (!isLoading) {
                throw new Error(`Can't get "${k}"`);
            }
        }
        return this.values[k];
    }

    set(k: string, v: CoreValue<T>) {
        // TODO: insert safety check here
        this.notify({ [k]: v });
        this.values[k] = v;
    }

    private load(a: any) {
        if (typeof a !== "object") {
            throw new Error("cannot load a non-object to an object");
        }

        for (const k of Object.getOwnPropertyNames(a)) {
            this.get(k, a[k], true);
        }
    }

    jsonify(a: (a: CoreValue<T>) => { value: any, result: boolean }) {
        const result: { [a: string]: any } = {};
        for (const key of this.type.members.keys()) {
            const child = this.get(key);
            const trans = a(child);
            if (trans.result) {
                result[key] = trans.value;
            } else {
                result[key] = child.jsonify(a);
            }
        }
        return result;
    }

    deepEqual(that: CoreValue<T>): boolean {
        if (!(that instanceof CoreObjectValue)) {
            return false;
        }
        for (const key of this.type.members.keys()) {
            if (!this.get(key).deepEqual(that.get(key))) {
                return false;
            }
        }
        return true;
    }
}

export class CoreArrayValue<T extends TypeEnvironment> extends CoreValue<T> {
    readonly values: CoreValue<T>[] = [];
    constructor(type: ObjectType<T>, data: any, public mutable: boolean, converter: MakeValue<T>) {
        super((() => {
            if (type.isArray()) {
                return type.typeArguments[0];
            } else {
                throw new Error("Not an array type");
            }
        })(), mutable, converter);

        if (data) {
            this.load(data);
        }
    }

    jsonify(a: (a: CoreValue<T>) => { value: any, result: boolean }) {
        return this.values.map(v => {
            const trans = a(v);
            if (trans.result) {
                return trans.value;
            } else {
                return v.jsonify(a);
            }
        });
    }

    private load(a: any) {
        if (!Array.isArray(a)) {
            throw new Error("can only load an array");
        }
        a.map(v => {
            if (!this.type.canHold(v)) {
                throw new Error("adding a value we can't hold");
            }
            const value = this.converter(this.type, v, this.mutable);
            if (value instanceof FakePromise) {
                value.then(value => this.values.push(value));
            } else {
                this.values.push(value);
            }
        });
    }

    deepEqual(that: CoreValue<T>): boolean {
        if (!(that instanceof CoreArrayValue)) {
            return false;
        }

        if (this.values.length !== that.values.length) {
            return false;
        }

        return this.values.reduce((pv, v1, idx) => {
            return pv && v1.deepEqual(that.values[idx]);
        }, true);
    }
}


export class CoreUnionValue<T extends TypeEnvironment> extends CoreValue<T> {
    _value: CoreValue<T>;
    constructor(readonly type: UnionType<T>, data: any, mutable: boolean, converter: MakeValue<T>) {
        super(type, mutable, converter);
        const value = this.converter(this.type.types.values().next().value, data, this.mutable);
        if (value instanceof FakePromise) {
            value.then(value => this._value = value);
        } else {
            this._value = value;
        }
    }

    get value() {
        return this._value;
    }

    set value(value) {
        this.notify(value);
        this._value = value;
    }

    jsonify(a: (a: CoreValue<T>) => { value: any, result: boolean }) {
        const trans = a(this.value);
        if (trans.result) {
            return trans.value;
        }
        return this.value.jsonify(a);
    }

    // deepEqual(that: CoreValue<T>): boolean {
    //     return this.value.deepEqual(that);
    // }
}

export class CoreIntersectionValue<T extends TypeEnvironment> extends CoreValue<T> {
    public values: Map<Type<T>, CoreValue<T>>;
    constructor(readonly type: IntersectionType<T>, data: any, mutable: boolean, converter: MakeValue<T>) {
        super(type, mutable, converter);

        const values: { [a: string]: CoreValue<T> } = {};
        const types = [...type.types.values()].filter(isObjectType) as ObjectType<T>[];
        if (types.length !== type.types.size) {
            throw new Error("all members of intersection must be objects");
        }
        this.values = new Map(types.map(t => [t, new CoreObjectValue(t, data, values, mutable, converter)] as [Type<T>, CoreValue<T>]));


        for (const t of this.type.types.values()) {
            if (!this.values.has(t)) {
                const value = this.converter(t, data, this.mutable);
                if (value instanceof FakePromise) {
                    value.then(value => this.values.set(t, value));
                } else {
                    this.values.set(t, value);
                }
            }
        }
    }

    getType(key: string): CoreObjectValue<T> {
        let objectTypes = [...this.type.types.values()].filter(isObjectType) as ObjectType<T>[];
        objectTypes = objectTypes.filter((ok) => ok.members.has(key));

        if (objectTypes.length === 0) {
            throw new Error("Key not found");
        }
        let type = objectTypes[0];
        // TODO: don't do this special case
        // should pick most specific underlying
        if (objectTypes.length > 1 && (this as any).pluginType) {
            type = (this as any).pluginType;
        }
        return this.values.get(type) as CoreObjectValue<T>;
    }

    get(key: string) {
        return this.getType(key).get(key);
    }

    set(key: string, v: CoreValue<T>) {
        return this.getType(key).set(key, v);
    }

    jsonify(a: (a: CoreValue<T>) => { value: any, result: boolean }) {
        const result: { [a: string]: any } = {};
        for (const value of this.values.values()) {
            const trans = a(value);
            const obj = trans.result ? trans.value : value.jsonify(a);
            Object.assign(result, obj);
        }
        return result;
    }

    // deepEqual(that: CoreValue<T>): boolean {
    //     if (!(that instanceof CoreIntersectionValue)) {
    //         return false;
    //     }
    //     return false;
    // }

}

function makePrimitiveValue<T extends TypeEnvironment>(a: any, type: Type<T> | T, mutable: boolean, converter: MakeValue<T>): CoreValue<T> {
    if (a instanceof CoreValue) {
        return a;
    }
    if (isTypeEnvironment(type)) {
        if (typeof a === "object") {
            throw new Error("can't makePrimitiveValue an object");
        }
        if (a === undefined) {
            type = type.getUndefinedType();
        } else if (a === null) {
            type = type.getNullType();
        } else if (typeof a === "string") {
            if (mutable) {
                type = type.getStringType();
            } else {
                type = type.getStringLiteralType(a);
            }
        } else if (typeof a === "number") {
            if (mutable) {
                type = type.getNumberType();
            } else {
                type = type.getNumberLiteralType(a.toString());
            }
        } else {
            type = type.getAnyType();
        }
    }

    return new CorePrimitiveValue(type, a, mutable, converter);
}

export function makeValueFactory<T extends TypeEnvironment>(type: T | Type<T>, a: any, mutable: boolean, converter: MakeValue<T> = makeValue) {
    if (isTypeEnvironment(type)) {
        return valueWrap(type, a, mutable, converter);
    }
    return typeToValue(type, a, mutable, converter);
}

export function valueWrap<T extends TypeEnvironment>(env: T, a: any, mutable: boolean, converter: MakeValue<T> = makeValue): CoreValue<T> {
    if (typeof a !== "object") {
        return makePrimitiveValue(a, env, mutable, converter);
    } else if (Array.isArray(a)) {
        throw new Error("don't make arrays without types");
    } else {
        const members: [string, Type<T>][] = [];
        const res: { [a: string]: CoreValue<T> } = {};
        for (const key of Object.getOwnPropertyNames(a)) {
            const value = valueWrap(env, a[key], mutable, converter);
            members.push([key, value.type]);
            res[key] = value;
        }
        return new CoreObjectValue(new FakeObjectType(env, new Map(members)), {}, res, mutable, converter);
    }
}

const primitiveFlags = ts.TypeFlags.Boolean
    | ts.TypeFlags.String
    | ts.TypeFlags.Number
    | ts.TypeFlags.Null
    | ts.TypeFlags.Undefined
    | ts.TypeFlags.StringOrNumberLiteral;

function isPrimitiveType<T extends TypeEnvironment>(type: Type<T>) {
    return type instanceof WrappedScriptType && (type.type.flags & primitiveFlags);
}

export function typeToValue<T extends TypeEnvironment>(type: Type<T>, data: any, mutable: boolean, converter: MakeValue<T>): CoreValue<T> {
    if (isPrimitiveType(type)) {
        return new CorePrimitiveValue(type, data, mutable, converter);
    } else if (isObjectType(type)) {
        if (type.isArray()) {
            return new CoreArrayValue(type, data, mutable, converter);
        }
        return new CoreObjectValue(type, data, {}, mutable, converter);
    } else if (isUnionType(type)) {
        return new CoreUnionValue(type, data, mutable, converter);
    } else if (isIntersectionType(type)) {
        return new CoreIntersectionValue(type, data, mutable, converter);
    } else {
        return new CorePrimitiveValue(type, data, mutable, converter);
    }
}

export function makeValue<T extends TypeEnvironment>(type: T | Type<T>, a: any, mutable: boolean): CoreValue<T> {
    return makeValueFactory(type, a, mutable, makeValue);
}