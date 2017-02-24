import { PluginProgram, isError } from "../sinap-includes/plugin-program";
import { CoreValue, Plugin, Type, WrappedScriptUnionType, FakeUnionType, TypeEnvironment } from ".";

function signatureAssignable(t1: Type[], t2: Type[]) {
    return t1.reduce((a, v, i) => a && v.isAssignableTo(t2[i]), true)
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
        return new FakeUnionType(new Set([...bestSignature.types.values()].filter(t => !t.isIdenticalTo(stateType))));
    }

    return bestSignature;
}

export class Program {
    constructor(private program: PluginProgram, private plugin: Plugin) {
    };

    validate(): string[] {
        return this.program.validate();
    }

    runArguments: Type[][];
    run(a: CoreValue[]): { states: CoreValue[], result: CoreValue } {
        const output = this.program.run(a.map(v => v.data));
        if (isError(output)) {
            throw output.error;
        }
        const stateType = this.plugin.typeEnvironment.lookupPluginType("State");
        return {
            states: output.states.map(s => new CoreValue(stateType, s)),
            result: new CoreValue(
                pickReturnType(a.map(v => v.type), this.plugin.typeEnvironment.startTypes, stateType, this.plugin.typeEnvironment),
                output.result),
        };
    }
}
