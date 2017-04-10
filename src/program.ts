import { Value } from "sinap-types";
import { Model, Plugin } from ".";

export interface Program {
    readonly plugin: Plugin;
    validate(): Value.Primitive | null;
    readonly model: Model;
    run(a: Value.Value[]): { steps: Value.CustomObject[], result?: Value.Value, error?: Value.Primitive };
}
