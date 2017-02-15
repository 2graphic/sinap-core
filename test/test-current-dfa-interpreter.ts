/// <reference path="../typings/globals/mocha/index.d.ts" />
import { loadPlugin } from "../src/";
import * as assert from "assert";

describe("plugin loader", ()=>{
    const plugin = loadPlugin("test/plugin1.ts");
    it("no dianostic errors", ()=>{
        assert.deepEqual([], plugin.results.emitResults.diagnostics);
    })
});