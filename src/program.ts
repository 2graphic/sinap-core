import { PluginProgram, isError } from "../sinap-includes/plugin-program";
import { CoreValue, Plugin, Type, WrappedScriptUnionType, FakeUnionType, TypeEnvironment, makeValue } from ".";

function signatureAssignable(t1: Type[], t2: Type[]) {
    return t1.reduce((a, v, i) => a && v.isAssignableTo(t2[i]), true);
}

function pickReturnType(argTypes: Type[], signatures: [Type[], Type][], stateType: Type, env: TypeEnvironment): Type {
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

    if (bestSignature instanceof WrappedScriptUnionType) {
        return new FakeUnionType(env, new Set([...bestSignature.types.values()].filter(t => !t.isIdenticalTo(stateType))));
    }

    return bestSignature;
}

export class Program {
    constructor(private program: PluginProgram, public plugin: Plugin) {
        this.runArguments = this.plugin.typeEnvironment.startTypes.map(
            t => t[0].slice(1)
        );
    };

    validate(): string[] {
        return this.program.validate();
    }

    runArguments: Type[][];
    run(a: CoreValue[]): { states: CoreValue[], result: CoreValue } {
        const output = this.program.run(a.map(v => v.value));
        const stateType = this.plugin.typeEnvironment.lookupPluginType("State");
        const errorType = this.plugin.typeEnvironment.lookupGlobalType("Error");

        let result: CoreValue;

        if (isError(output.result)) {
            const err = new Error(output.result.message);
            err.stack = output.result.stack;
            result = makeValue(err, errorType);
        } else {
            result = makeValue(
                output.result,
                pickReturnType(a.map(v => v.type), this.plugin.typeEnvironment.startTypes, stateType, this.plugin.typeEnvironment)
            );
        }

        return {
            states: output.states.map(s => makeValue(s, stateType)),
            result: result,
        };
    }
}
