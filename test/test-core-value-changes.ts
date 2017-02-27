/// <reference path="../typings/globals/mocha/index.d.ts" />
import {
    loadPluginDir,
    Plugin,
    makeValue,
    Type,
    CoreValue,
    CoreModel,
    CoreElementKind,
    FakeObjectType,
} from "../src/";
import { LocalFileService } from "./files-mock";
import * as assert from "assert";

describe("CV ChangeDetection", () => {

    const fs = new LocalFileService();
    function loadTestPlugin(name: string): Promise<Plugin> {
        return fs.directoryByName(fs.joinPath("test", "interpreters", name))
            .then((directory) => loadPluginDir(directory, fs));
    }

    let plugin: Plugin;
    let stringType: Type;

    before(() => {
        return loadTestPlugin("ideal-dfa-interpreter-v2").then((p) => {
            plugin = p;
            stringType = plugin.typeEnvironment.getStringType();
        });
    });

    it("handles simple case", (done) => {
        const v = makeValue("hello", plugin.typeEnvironment, true);
        assert(stringType.isIdenticalTo(v.type), "CoreValue isn't a string");

        v.listeners.add(function(this: CoreValue, newValue: string) {
            assert.equal("hello", this.value);
            assert.equal("world", newValue);
            done();
        });

        v.value = "world";
    });

    it("handles nesting", (done) => {
        const O2 = new FakeObjectType(plugin.typeEnvironment, new Map([["myNum", plugin.typeEnvironment.getNumberType()]]));
        const O1 = new FakeObjectType(plugin.typeEnvironment, new Map([["myO2", O2]]));

        const nestedValue = makeValue({ myO2: { myNum: 15 } }, O1, true);

        nestedValue.value.myO2.value.myNum.listeners.add(function(this: CoreValue, newValue: string) {
            assert.equal(15, this.value);
            assert.equal(18, newValue);
            done();
        });

        nestedValue.value.myO2.value.myNum.value = 18;
    });

    it("blocks illegal sets", () => {
        const O2 = new FakeObjectType(plugin.typeEnvironment, new Map([["myNum", plugin.typeEnvironment.getNumberType()]]));
        const O1 = new FakeObjectType(plugin.typeEnvironment, new Map([["myO2", O2]]));

        const nestedValue = makeValue({ myO2: { myNum: 15 } }, O1, true);

        assert.throws(() => nestedValue.value = 18);
        assert.throws(() => nestedValue.value = { "gah": 18 });
        // TODO: make this fail
        // assert.throws(()=>nestedValue.value.gah = 18);
        assert.throws(() => nestedValue.value.myO2.value = 18);
    });


    it("handles CoreElement", (done) => {
        const m = new CoreModel(plugin);
        const e = m.addElement(CoreElementKind.Node, "DFANode");
        e.data = { acceptState: true, label: "hello" };

        e.listeners.add(function(this: CoreValue, newValue: string) {
            assert.equal(true, this.value);
            assert.equal(false, newValue);
            done();
        });

        e.value['acceptState'] = makeValue(false, plugin.typeEnvironment);
    });

    it("immutablilty means something", () => {
        const v = makeValue("hello", plugin.typeEnvironment, false);
        assert(plugin.typeEnvironment.getStringLiteralType("hello").isIdenticalTo(v.type), "CoreValue isn't a string");
        assert.throws(() => v.value = "world");
    });
});