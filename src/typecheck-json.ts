import { Type, isUnionType, isIntersectionType, isObjectType } from ".";

function flattenUnions(type: Type, acumulator?: Type[]) {
    if (!acumulator) {
        acumulator = [];
    }
    if (!(isUnionType(type) || isIntersectionType(type))) {
        acumulator.push(type);
        return acumulator;
    }
    for (const t of type.types) {
        flattenUnions(t, acumulator);
    }
    return acumulator;
}

// TODO: handle generic parameterized types

/**
 * Check whether `value` conforms to the type `typeWrapped`
 */
export function checkJSON(type: Type, value: any, key?: string) {
    const env = type.env;
    if (value === undefined && !env.getUndefinedType().isAssignableTo(type)) {
        throw new Error(`missing field "${key}"`);
    }
    if (isObjectType(type)) {
        // for object types we recurse except for arrays which we handle seperately
        // since typescript unifies symbols, if something is an array it's type's symbol
        // will be the same as the global Array type's symbol.

        // in general this is where parameterized types should be handled, so we can deal
        // with type arguments, but that seems exceedingly difficult right now
        if (type.isArray()) {
            if (!Array.isArray(value)) {
                throw new Error(`"${key}" should be an array type`);
            }
            value.forEach((v) => {
                checkJSON(type.typeArguments[0], v);
            });
        } else {
            for (const [k, t] of type.members) {
                checkJSON(t, value[k], (key !== undefined ? key + "." : "") + k);
            }
        }
    } else {
        const tofv = value === null ? "null" : typeof value;
        if (flattenUnions(type).filter(t => t.name === tofv).length === 0) {
            throw new Error(`typeof "${key}" should be "${type.name}" but is "${typeof value}"`);
        }
    }
}