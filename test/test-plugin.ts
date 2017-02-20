/// <reference path="../typings/globals/mocha/index.d.ts" />
import { loadPlugin } from "../src/";
import * as assert from "assert";

describe("plugin", () => {
    it("loading", () => {
        loadPlugin("interpreters/dfa.ts");
    });

    it("provides start type info", () => {
        const plugin = loadPlugin("interpreters/dfa.ts");
        const ts = plugin.typeEnvironment.startTypes.map(m => [m[0].map(n => n.name), m[1].name]);

        assert.deepEqual([[['DFAGraph', 'string'], 'boolean | State']], ts);
    });

    it("handles overloads", () => {
        const plugin = loadPlugin("test/start-functions.ts");
        const ts = plugin.typeEnvironment.startTypes.map(m => [m[0].map(n => n.name), m[1].name]);

        assert.deepEqual([[['number', 'number'], 'number'], [['string', 'string'], 'string'],], ts);
    });
});
