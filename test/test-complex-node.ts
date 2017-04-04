/// <reference path="../typings/globals/mocha/index.d.ts" />
/// <reference path="../typings/modules/chai/index.d.ts" />
import { loadPluginDir, CoreModel, Plugin, makeValue, Program, CorePrimitiveValue } from "../src/";
import { LocalFileService } from "./files-mock";
import { expect } from "chai";
import * as vm from "vm";

describe("complex node", () => {
    function setupTest(plugin: Plugin) {
        const script = new vm.Script(plugin.results.js as string);
        const sandbox: any = { console: console, global: {} };
        const context = vm.createContext(sandbox);
        script.runInContext(context);
        return context as any;
    }

    const fs = new LocalFileService();
    function loadTestPlugin(name: string): Promise<Plugin> {
        return fs.directoryByName(fs.joinPath("test", "interpreters", name))
            .then((directory) => loadPluginDir(directory, fs));
    }

    let plugin: Plugin;
    before(() => {
        return loadTestPlugin("complicated-node").then((plug) => {
            plugin = plug;
        });
    });

    it("builds", () => {
        expect(plugin.results.diagnostics.global).to.deep.equal([]);
        expect(plugin.results.diagnostics.semantic).to.deep.equal([]);
        expect(plugin.results.diagnostics.syntactic).to.deep.equal([]);
    });

    it("handles nesting", () => {
        const model = new CoreModel(plugin, {
            format: "sinap-file-format",
            kind: ["Test", "Complex Node"],
            version: "0.0.8",
            elements: [
                {
                    kind: "Graph",
                    type: "ComplexGraph",
                    uuid: "0",
                    data: {
                        startState: { kind: "sinap-pointer", uuid: "1" },
                    }
                },
                {
                    kind: "Node",
                    type: "ComplexNode",
                    uuid: "1",
                    data: {
                        blah: { foo: { bar: { woooo: 1777243 } } },
                    },
                },
            ]
        });

        const context = setupTest(plugin);
        const prog = new Program(model, context.global["plugin-stub"].Program);

        const results = prog.run([makeValue(plugin.typeEnvironment, "11", false)]);
        if (!(results.result instanceof CorePrimitiveValue)) {
            throw new Error("fail test");
        }
        expect(results.states.length)
            .to.equal(0, "correct number of states");
        expect(results.result.data)
            .to.equal(1777243, "correct value");
        expect(results.result.type)
            .to.equal(plugin.typeEnvironment.getNumberType(), "correct type");
    });

});