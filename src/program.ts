import { Value } from "sinap-types";
import { Model } from ".";

export interface Program {
    environment: Value.Environment;
    validate(): Value.Primitive | null;
    model: Model;
    run(a: Value.Value[]): { steps: Value.CustomObject[], result?: Value.Value, error?: Value.Primitive };
}