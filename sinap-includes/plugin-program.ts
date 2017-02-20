export type Error = { error: string };
export type Result = { states: any[], result: any };

export interface PluginProgram {
    run(a: any): Result | Error;
    validate(): string[];
}

export function isError(e: { states: any[], result: any } | { error: any } | null): e is Error {
    return e != null && (e as any).error !== undefined;
}