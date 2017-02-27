/// <reference path="../typings/globals/mocha/index.d.ts" />

import * as assert from "assert";
import * as ts from "typescript";
import { checkJSON, ScriptTypeEnvironment } from "../src/";

describe("check-json", () => {
    const program = ts.createProgram(["test/check-json-simple-ts-file.ts"], {
        target: ts.ScriptTarget.ES2016, module: ts.ModuleKind.CommonJS, strictNullChecks: true
    });

    const checker = program.getTypeChecker();
    const env = new ScriptTypeEnvironment(checker);
    const classA = env.getType(checker.lookupTypeAt("A", program.getSourceFile("test/check-json-simple-ts-file.ts")));
    const classB = env.getType(checker.lookupTypeAt("B", program.getSourceFile("test/check-json-simple-ts-file.ts")));
    const classC = env.getType(checker.lookupTypeAt("C", program.getSourceFile("test/check-json-simple-ts-file.ts")));
    const classD = env.getType(checker.lookupTypeAt("D", program.getSourceFile("test/check-json-simple-ts-file.ts")));
    const classE = env.getType(checker.lookupTypeAt("E", program.getSourceFile("test/check-json-simple-ts-file.ts")));

    it("allows valid schema", () => {
        assert.doesNotThrow(() => checkJSON(classA, {
            "number": 8,
            "possiblyNullNumber": 8,
            "possiblyUndefinedNumber": 8,
        }), "doesn't pass simple case");

        assert.doesNotThrow(() => checkJSON(classA, {
            "number": 8,
            "possiblyNullNumber": null,
            "possiblyUndefinedNumber": 8,
        }));

        assert.doesNotThrow(() => checkJSON(classA, {
            "number": 8,
            "possiblyNullNumber": null,
            "possiblyUndefinedNumber": 8,
        }), "can't handle nullable fields");

        assert.doesNotThrow(() => {
            checkJSON(classA, {
                "number": 8,
                "possiblyNullNumber": 8,
            });
        }, "can't handle optional fields");
    });
    it("fails on missing fields", () => {
        assert.throws(() => {
            checkJSON(classA, { "a": "8" });
        }, /missing field (("possiblyNullNumber")|("number"))/, "doesn't throw on missing required field number");

        assert.throws(() => {
            checkJSON(classA, {
                "number": 8,
                "possiblyUndefinedNumber": 8,
            });
        }, /missing field "possiblyNullNumber"/, "doesn't throw on missing null field possiblyNullNumber");
    });

    it("fails on incorrectly typed fields", () => {
        assert.throws(() => {
            checkJSON(classA, {
                "number": "string",
                "possiblyNullNumber": 8,
                "possiblyUndefinedNumber": 8,
            });
        }, /typeof "number" should be "number"/, "doesn't throw on incorrectly typed field");

        assert.throws(() => {
            checkJSON(classA, {
                "number": 8,
                "possiblyNullNumber": 8,
                "possiblyUndefinedNumber": "string",
            });
        }, /typeof "possiblyUndefinedNumber" should be "[^"]*number[^"]*"/, "doesn't throw on incorrectly typed field");
    });

    it("allows unions", () => {
        checkJSON(classD, { "numberOrString": "8" });
        checkJSON(classD, { "numberOrString": 8 });
        assert.throws(() => checkJSON(classD, { "numberOrString": false }));
    });

    it("handles lists", () => {
        checkJSON(classB, {
            "list": [1, 2, 3],
        });
        assert.throws(() => checkJSON(classB, {
            "list": [1, "2", 3],
        }));
        checkJSON(classC, {
            "list": [1, "2", 3],
        });
    });

    it("handles objects", () => {
        checkJSON(classE, {
            "ab": { a: 6, b: "hi" },
        });
        assert.throws(() => checkJSON(classE, {
            "ab": { a: "hi", b: "hi" },
        }), /typeof "ab.a" should be "number" but is "string"/);
        assert.throws(() => checkJSON(classE, {
            "ab": { a: 7 },
        }), /missing field "ab.b"/);
    });
});