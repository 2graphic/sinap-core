import { Type, ObjectType, UnionType, TypeEnvironment, isObjectType, isUnionType, isTypeEnvironment, checkJSON } from ".";

export class CoreValue {
    listeners = new Set<(this: CoreValue, newValue: any) => void>();

    constructor(readonly type: Type, protected _value: any | { [a: string]: CoreValue }, public mutable: boolean) {
        // TODO: initilize it based on `Type`
    }

    get value() {
        return this._value;
    }
    set value(v: any) {
        if (!this.mutable) {
            throw new Error("trying to modify an immutable CoreValue");
        }

        checkJSON(this.type, v);

        for (const listener of this.listeners.values()) {
            listener.apply(this, [v]);
        }
        this._value = v;
    }
}

export class CoreObjectValue extends CoreValue {
    constructor(readonly type: ObjectType, value: { [a: string]: CoreValue }, public mutable: boolean) {
        // TODO: allow data to be undefined, so we can initilize it
        super(type, value, mutable);
    }
}

export class CoreUnionValue extends CoreValue {
    narrow() {
        const possibleTypes = [...this.type.types].filter((type) => {
            try {
                checkJSON(type, this.value);
            } catch (err) {
                return false;
            }
            return true;
        });

        if (possibleTypes.length !== 1) {
            throw new Error("cannot narrow");
        }
        return makeValue(this.value, possibleTypes[0]);
    }

    constructor(readonly type: UnionType, data: any, mutable: boolean) {
        // TODO: allow data to be undefined, so we can initilize it
        super(type, data, mutable);
    }
}

export function makeValue(a: any, type: Type | TypeEnvironment, mutable = false) {
    if (a instanceof CoreValue) {
        return a;
    }
    if (isTypeEnvironment(type)) {
        // TODO: make this do cleverer inference

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

    let cons = CoreValue;
    if (isUnionType(type)) {
        cons = CoreUnionValue;
    }

    if (isObjectType(type)) {
        cons = CoreObjectValue;

        const valueObject: { [a: string]: CoreValue } = {};
        for (const [key, t] of type.members.entries()) {
            valueObject[key] = makeValue(a[key], t, mutable);
        }

        a = valueObject;
    }

    return new cons(type, a, mutable);
}