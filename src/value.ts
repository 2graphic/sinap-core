import { Type, ObjectType, UnionType, TypeEnvironment, isObjectType, isUnionType, isTypeEnvironment, checkJSON } from ".";

export class CoreValue {
    constructor(readonly type: Type, public data: any | { [a: string]: CoreValue }) {
        // TODO: initilize it based on `Type`
    }
}

export class CoreObjectValue extends CoreValue {
    constructor(readonly type: ObjectType, data: { [a: string]: CoreValue }) {
        // TODO: allow data to be undefined, so we can initilize it
        super(type, data);
    }
}

export class CoreUnionValue extends CoreValue {
    narrow() {
        const possibleTypes = [...this.type.types].filter((type) => {
            try {
                checkJSON(type, this.data);
            } catch (err) {
                return false;
            }
            return true;
        });

        if (possibleTypes.length !== 1) {
            throw new Error("cannot narrow");
        }
        return makeValue(this.data, possibleTypes[0]);
    }

    constructor(readonly type: UnionType, data: any) {
        // TODO: allow data to be undefined, so we can initilize it
        super(type, data);
    }
}

export function makeValue(a: any, type: Type | TypeEnvironment) {
    if (a instanceof CoreValue) {
        a = a.data;
    }
    if (isTypeEnvironment(type)) {
        // TODO: make this do cleverer inference
        type = type.getAnyType();
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