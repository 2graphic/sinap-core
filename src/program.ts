import { PluginProgram, isError } from "../sinap-includes/plugin-program";
import {
    CoreValue,
    Plugin,
    Type,
    FakeUnionType,
    TypeEnvironment,
    PluginTypeEnvironment,
    CoreElement,
    isTypeEnvironment,
    makeValueFactory,
    CoreWrappedStringValue,
    isObjectType,
    isUnionType,
} from ".";

function signatureAssignable<T extends TypeEnvironment>(t1: Type<T>[], t2: Type<T>[]) {
    return t1.reduce((a, v, i) => a && v.isAssignableTo(t2[i]), true);
}

function filterState<T extends TypeEnvironment>(type: Type<T>, stateType: Type<T>): Type<T> {
    if (isUnionType(type)) {
        const types = [...type.types.values()].filter(t => !t.isIdenticalTo(stateType));
        if (types.length === 1) {
            return types[0];
        }
        return new FakeUnionType(type.env, new Set(types));
    }
    return type;
}

function pickReturnType<T extends TypeEnvironment>(argTypes: Type<T>[], signatures: [Type<T>[], Type<T>][], stateType: Type<T>, env: T): Type<T> {
    // find all the signatures that argTypes is assignable to
    const viableSignatures = signatures.filter(sig =>
        signatureAssignable(argTypes, sig[0].slice(1))
    ).map(t => t[1]);

    if (viableSignatures.length === 0) {
        throw new Error("no matching function signatures found");
    }

    const nonAnySigs = viableSignatures.filter(t => !t.isIdenticalTo(env.getAnyType()));

    let bestSignature = nonAnySigs.pop();
    if (bestSignature === undefined) {
        return viableSignatures[0];
    }

    // the best signature is the most specific signature
    for (const signature of nonAnySigs) {
        if (signature.isAssignableTo(bestSignature)) {
            bestSignature = signature;
        }
    }

    return filterState(bestSignature, stateType);
}

export class Program {
    makeValue: (type: Type<PluginTypeEnvironment>, a: any, mutable: boolean) => CoreValue<PluginTypeEnvironment>;
    constructor(private program: PluginProgram, public plugin: Plugin) {
        this.stateType = this.plugin.typeEnvironment.lookupPluginType("State");
        this.runArguments = this.plugin.typeEnvironment.startTypes.map(
            t => t[0].slice(1)
        );

        this.runReturn = this.plugin.typeEnvironment.startTypes.map(
            t => filterState<PluginTypeEnvironment>(t[1], this.stateType)
        );

        const wrappedStringType = this.plugin.typeEnvironment.lookupSinapType("WrappedString");
        const elementType = this.plugin.typeEnvironment.lookupSinapType("PluginElement");

        this.makeValue = (type, a, mutable): CoreValue<PluginTypeEnvironment> => {
            if (a && a.sinapUniqueIdentifier) {
                return a.sinapUniqueIdentifier;
            }
            if (!isTypeEnvironment(type)) {
                if (isObjectType(type) && !type.isArray()) {
                    if (type.isSubtypeOf(wrappedStringType)) {
                        return new CoreWrappedStringValue(type.env, "", mutable, this.makeValue);
                    }
                    if (type.isSubtypeOf(elementType)) {
                        return { gah: 7 } as any;
                    }
                }
            }
            return makeValueFactory(type, a, mutable, this.makeValue);
        };

    };

    validate(): string[] {
        return this.program.validate();
    }

    stateType: Type<PluginTypeEnvironment>;
    runArguments: Type<PluginTypeEnvironment>[][];
    runReturn: Type<PluginTypeEnvironment>[];
    run(a: CoreValue<PluginTypeEnvironment>[]): { states: CoreValue<PluginTypeEnvironment>[], result: CoreValue<PluginTypeEnvironment> } {
        const output = this.program.run(a.map(v => v.jsonify((a) => {
            if (a instanceof CoreElement) {
                throw new Error("passing core elements to programs is not yet supported");
            }
            return { result: false, value: undefined };
        })));
        const errorType = this.plugin.typeEnvironment.lookupGlobalType("Error");

        const resultType = isError(output.result) ?
            errorType :
            pickReturnType<PluginTypeEnvironment>(a.map(v => v.type),
                this.plugin.typeEnvironment.startTypes, this.stateType,
                this.plugin.typeEnvironment);
        const result = this.makeValue(resultType, output.result, false);

        return {
            states: output.states.map(v => this.makeValue(this.stateType, v, false)),
            result: result,
        };
    }
}
