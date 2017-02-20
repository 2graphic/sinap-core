/// <reference path="../typings/globals/mocha/index.d.ts" />
import { loadPlugin } from "../src/";
import * as assert from "assert";

describe("plugin", () => {
    it("loading", () => {
        loadPlugin("interpreters/dfa.ts");
    });

    it("provides start type info", () => {
        const plugin = loadPlugin("interpreters/dfa.ts");
        const ts = plugin.typeEnvironment.startTypes;

        assert.equal(1, ts.length);
        assert.equal(2, ts[0].length);
        assert.equal("DFAGraph", ts[0][0].name);
        assert.equal("string", ts[0][1].name);
    });

    it("handles overloads", () => {
        const plugin = loadPlugin("test/start-functions.ts");
        const ts = plugin.typeEnvironment.startTypes.map(m => m.map(n => n.name));

        assert.deepEqual([['number', 'number'], ['string', 'string'],], ts);
    });
});
