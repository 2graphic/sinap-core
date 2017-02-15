/// <reference path="../typings/globals/mocha/index.d.ts" />
import { loadPlugin } from "../src/";
import * as assert from "assert";

describe("plugin loader", ()=>
    it("emit results", ()=>{
    const plugin = loadPlugin("test/plugin1.ts");
    assert.equal(false, plugin.results.emitResults.emitSkipped);
}));