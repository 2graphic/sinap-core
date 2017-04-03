import { Value } from "sinap-types";

export interface Program {
    environment: Value.Environment;
    validate(): Value.Primitive | null;
    run(a: Value.Value[]): { steps: Value.CustomObject[], result?: Value.Value, error?: Value.Primitive };
}