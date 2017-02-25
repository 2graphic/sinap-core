import { Type, ObjectType, UnionType, TypeEnvironment, isObjectType, isUnionType } from ".";

export class CoreValue {
    constructor(readonly type: Type, public data?: any) {
        if (data === undefined) {
            // TODO: initilize it based on `Type`
        }
    }
}

export class CoreObjectValue extends CoreValue {
    value(k: string) {
        const type = this.type.members.get(k);
        if (type === undefined) {
            throw `key "${k}" not found`;
        }
        return makeValue(this.data[k], type);
    }

    constructor(readonly type: ObjectType, data: {[a: string]: any}) {
        // TODO: allow data to be undefined, so we can initilize it
        super(type, data);
    }
}

export class CoreUnionValue extends CoreValue {
    narrow() {
        const iter = this.type.types.values();
        iter.next();
        return makeValue(this.data, iter.next().value);
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
    if (type instanceof TypeEnvironment) {
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