/// <reference path="../typings/index.d.ts" />
import { loadPluginDir, Plugin, Program, Model } from "../src/";
import { LocalFileService } from "./files-mock";
import { Value } from "sinap-types";
import { expect } from "chai";

describe("the nerfed interpreter", () => {
    let plugin: Plugin;

    before(function(done) {
        const fileService = new LocalFileService();
        fileService.directoryByName("test/interpreters/dfa-interpreter").then((directory) => {
            return loadPluginDir(directory, fileService);
        })
            .then((locPlug) => {
                plugin = locPlug;
                done();
            });
    });

    it("computes divisibility", () => {
        const model = new Model(plugin);
        const q0 = model.makeNode();
        q0.set("label", Value.makePrimitive(model.environment, "q0"));
        q0.set("isStartState", Value.makePrimitive(model.environment, true));
        q0.set("isAcceptState", Value.makePrimitive(model.environment, true));
        const q1 = model.makeNode();
        q1.set("label", Value.makePrimitive(model.environment, "q1"));
        q1.set("isStartState", Value.makePrimitive(model.environment, false));
        q1.set("isAcceptState", Value.makePrimitive(model.environment, false));
        const q2 = model.makeNode();
        q2.set("label", Value.makePrimitive(model.environment, "q2"));
        q2.set("isStartState", Value.makePrimitive(model.environment, false));
        q2.set("isAcceptState", Value.makePrimitive(model.environment, false));

        const e00 = model.makeEdge(undefined, q0, q0);
        e00.set("label", Value.makePrimitive(model.environment, "0"));
        const e01 = model.makeEdge(undefined, q0, q1);
        e01.set("label", Value.makePrimitive(model.environment, "1"));
        const e10 = model.makeEdge(undefined, q1, q2);
        e10.set("label", Value.makePrimitive(model.environment, "0"));
        const e11 = model.makeEdge(undefined, q1, q0);
        e11.set("label", Value.makePrimitive(model.environment, "1"));
        const e20 = model.makeEdge(undefined, q2, q1);
        e20.set("label", Value.makePrimitive(model.environment, "0"));
        const e21 = model.makeEdge(undefined, q2, q2);
        e21.set("label", Value.makePrimitive(model.environment, "1"));

        const prog = new Program(model, plugin);

        for (let x = 0; x < 1000; x++) {
            const result = prog.run([Value.makePrimitive(prog.environment, x.toString(2))]);
            if (result.error) {
                throw new Error("test failed error returned: " + result.error.value + " steps: " + result.steps.join(", "));
            }
            expect((result as any).result.value).to.equal(x % 3 === 0);
        }
    });
});