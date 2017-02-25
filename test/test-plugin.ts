/// <reference path="../typings/globals/mocha/index.d.ts" />
import { loadPluginDir, Plugin, Program, CoreValue, Type, isUnionType } from "../src/";
import { LocalFileService } from "./files-mock";
import * as assert from "assert";
import * as vm from "vm";

describe("plugin", () => {
    const fs = new LocalFileService();
    function loadTestPlugin(name: string, dirs = ["interpreters"]): Promise<Plugin> {
        return fs.directoryByName(fs.joinPath(...dirs.concat([name])))
            .then((directory) => loadPluginDir(directory, fs));
    }

    it("loading", () => {
        return loadTestPlugin("dfa");
    });

    it("provides start type info", () => {
        return loadTestPlugin("dfa").then(plugin => {
            const ts = plugin.typeEnvironment.startTypes.map(m => [m[0].map(n => n.name), m[1].name]);
            assert.deepEqual([[["DFAGraph", "string"], "boolean | State"]], ts);
        });
    });

    it("handles overloads", () => {
        return loadTestPlugin("start-functions", ["test", "interpreters"]).then(plugin => {
            const ts = plugin.typeEnvironment.startTypes.map(m => [m[0].map(n => n.name), m[1].name]);
            assert.deepEqual([
                [["Graph", "any", "any"], "any"],
                [["Graph", "number", "number"], "number"],
                [["Graph", "number", "string"], "number"],
                [["Graph", "string", "string"], "string"],
                [["Graph", "string", "string"], "string | number"],
            ], ts);
        });
    });

    describe("start-functions", () => {
        let program: Program;
        let stringType: Type;
        let numberType: Type;
        before(() => {
            return loadTestPlugin("start-functions", ["test", "interpreters"]).then(plugin => {
                const script = new vm.Script(plugin.results.js as string);

                const sandbox: any = { console: console, global: {} };
                const context: any = vm.createContext(sandbox);
                script.runInContext(context);

                const pluginProgram = new context.global["plugin-stub"].Program({ elements: [] });

                program = new Program(pluginProgram, plugin);
                // const anyType = plugin.typeEnvironment.getType(plugin.typeEnvironment.checker.getAnyType());
                stringType = plugin.typeEnvironment.getType(plugin.typeEnvironment.checker.getStringType());
                numberType = plugin.typeEnvironment.getType(plugin.typeEnvironment.checker.getNumberType());
            });
        });
        // TODO: make the commented out cases pass (non-urgent, this only applies if several types are given for the
        // start function)

        // it("handles any case", () => {
        //     assert.equal(2, program.run([new CoreValue(anyType, 2), new CoreValue(anyType, 4)]).result.data);
        //     assert.equal("akd", program.run([new CoreValue(anyType, 2), new CoreValue(anyType, 4)]).result.type.name);
        // });
        it("handles string case", () => {
            assert.equal("string", program.run([new CoreValue(stringType, "2"), new CoreValue(stringType, "4")]).result.type.name);
        });
        it("handles number case", () => {
            assert.equal("number", program.run([new CoreValue(numberType, 2), new CoreValue(numberType, 4)]).result.type.name);
        });
        // it("handles string-number case", () => {
        //     assert.equal("any", program.run([new CoreValue(stringType, "2"), new CoreValue(numberType, 4)]).result.data.name);
        // });
        // it("handles number-string case", () => {
        //     assert.equal("number", program.run([new CoreValue(numberType, 2), new CoreValue(stringType, 4)]).result.data.name);
        // });
    });
    describe("start-functions-2", () => {
        let program: Program;
        let stringType: Type;
        let numberType: Type;
        before(() => {
            return loadTestPlugin("start-functions-2", ["test", "interpreters"]).then(plugin => {
                const script = new vm.Script(plugin.results.js as string);

                const sandbox: any = { console: console, global: {} };
                const context: any = vm.createContext(sandbox);
                script.runInContext(context);

                const pluginProgram = new context.global["plugin-stub"].Program({ elements: [] });

                program = new Program(pluginProgram, plugin);
                // const anyType = plugin.typeEnvironment.getType(plugin.typeEnvironment.checker.getAnyType());
                stringType = plugin.typeEnvironment.getType(plugin.typeEnvironment.checker.getStringType());
                numberType = plugin.typeEnvironment.getType(plugin.typeEnvironment.checker.getNumberType());
            });
        });

        it("cancels state", () => {
            const rtype = program.run([new CoreValue(numberType, 2), new CoreValue(numberType, 4)]).result.type;
            if (!isUnionType(rtype)) {
                throw new Error("didn't return union type");
            }
            assert.equal(1, rtype.types.size);
            assert.equal(numberType, rtype.types.values().next().value);
        });
    });
});