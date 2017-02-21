import { Type } from ".";
import * as ts from "typescript";

function flattenUnions(type: ts.Type, acumulator?: ts.Type[]) {
    if (!acumulator) {
        acumulator = [];
    }
    if (!(type.flags & ts.TypeFlags.UnionOrIntersection)) {
        acumulator.push(type);
        return acumulator;
    }
    for (const t of (type as ts.UnionOrIntersectionType).types) {
        flattenUnions(t, acumulator);
    }
    return acumulator;
}

// TODO: handle generic parameterized types

/**
 * Check whether `value` conforms to the type `typeWrapped`
 */
export function checkJSON(typeWrapped: Type, value: any, key?: string) {
    const checker = typeWrapped.env.checker;
    const type = typeWrapped.type;
    const env = typeWrapped.env;
    if (value === undefined && !(checker.isAssignableTo(checker.getUndefinedType(), type))) {
        throw new Error(`missing field "${key}"`);
    }
    if (ts.TypeFlags.Object & type.flags) {
        // for object types we recurse except for arrays which we handle seperately
        // since typescript unifies symbols, if something is an array it's type's symbol
        // will be the same as the global Array type's symbol. 

        // in general this is where parameterized types should be handled, so we can deal
        // with type arguments, but that seems exceedingly difficult right now
        if (type.symbol === checker.lookupGlobalType("Array").symbol) {
            if (!Array.isArray(value)) {
                throw new Error(`"${key}" should be an array type`);
            }
            value.forEach((v) => {
                // not sure what type this actually is, 
                // I found `typeArguments` in the debugger,
                // this isn't super safe, but Idk where to get it
                // grepping in typescript would probably turn up nice
                // results. For now, `any` works
                checkJSON(env.getType((type as any).typeArguments[0]), v)
            });
        } else {
            for (const k of type.getApparentProperties()) {
                const type = checker.getTypeOfSymbol(k);
                checkJSON(env.getType(type), value[k.getName()], (key !== undefined ? key + "." : "") + k.getName());
            }
        }
    } else {
        const tofv = value === null ? "null" : typeof value;
        if (flattenUnions(type).filter(t => checker.typeToString(t) === tofv).length === 0) {
            throw new Error(`typeof "${key}" should be "${checker.typeToString(type)}" but is "${typeof value}"`);
        }
    }
}