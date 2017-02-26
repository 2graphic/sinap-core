import { Type, ObjectType, UnionType, TypeEnvironment, isObjectType, isUnionType, isTypeEnvironment, checkJSON } from ".";

export class CoreValue {
    constructor(readonly type: Type, public value: any | { [a: string]: CoreValue }) {
        // TODO: initilize it based on `Type`
    }
}

export class CoreObjectValue extends CoreValue {
    constructor(readonly type: ObjectType, value: { [a: string]: CoreValue }) {
        // TODO: allow data to be undefined, so we can initilize it
        super(type, value);
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

    constructor(readonly type: UnionType, data: any) {
        // TODO: allow data to be undefined, so we can initilize it
        super(type, data);
    }
}

export function makeValue(a: any, type: Type | TypeEnvironment) {
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
            type = type.getStringLiteralType(a);
        } else if (typeof a === "number") {
            type = type.getNumberLiteralType(a.toString());
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
    }

    return new cons(type, a);
}