/// <reference path="../typings/globals/mocha/index.d.ts" />
import { loadPluginDir, CoreModel, Plugin, CoreValue, Program } from "../src/";
import { LocalFileService } from "./files-mock";
import * as assert from "assert";
import * as vm from "vm";

describe("complex node", () => {
    function setupTest(plugin: Plugin, model: CoreModel) {
        const script = new vm.Script(plugin.results.js as string);

        const serialGraph = JSON.stringify(model.serialize());

        const sandbox: any = { console: console, global: {} };
        const context = vm.createContext(sandbox);
        script.runInContext(context);
        return [context as any, serialGraph];
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
    it("handles nesting", () => {
        const model = new CoreModel(plugin, {
            format: "sinap-file-format",
            kind: "TODO: implement this",
            version: "0.0.6",
            elements: [
                {
                    kind: "Graph",
                    type: "ComplexGraph",
                    data: {
                        startState: { kind: "sinap-pointer", index: 1 },
                    }
                },
                {
                    kind: "Node",
                    type: "ComplexNode",
                    data: {
                        blah: { foo: { bar: { woooo: 1777243 } } },
                    },
                },
            ]
        });

        // TODO: uncomment
        // assert.equal(1777243, model.elements[1].value.blah.value.foo.value.bar.value.wooo);

        const [context, serialGraph] = setupTest(plugin, model);
        const pluginProg = new context.global["plugin-stub"].Program(JSON.parse(serialGraph));
        const prog = new Program(pluginProg, plugin);
        const stringType = plugin.typeEnvironment.getStringType();

        let results;
        results = prog.run([new CoreValue(stringType, "11")]);
        assert.equal(0, results.states.length, "correct number of states");
        assert.equal(1777243, results.result.value, "correct value");
        assert.equal(plugin.typeEnvironment.getNumberType(), results.result.type, "correct type");
    });

});