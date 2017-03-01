/// <reference path="../typings/globals/mocha/index.d.ts" />
/// <reference path="../typings/modules/chai/index.d.ts" />

import {
    loadPluginDir,
    Plugin,
    valueWrap,
    Type,
    CoreValue,
    CoreModel,
    CoreElementKind,
    CoreObjectValue,
    TypeEnvironment,
    CorePrimitiveValue,
} from "../src/";
import { LocalFileService } from "./files-mock";
import { expect } from "chai";

describe("CV ChangeDetection", () => {

    const fs = new LocalFileService();
    function loadTestPlugin(name: string): Promise<Plugin> {
        return fs.directoryByName(fs.joinPath("test", "interpreters", name))
            .then((directory) => loadPluginDir(directory, fs));
    }

    let plugin: Plugin;
    let stringType: Type<TypeEnvironment>;

    before(() => {
        return loadTestPlugin("ideal-dfa-interpreter-v2").then((p) => {
            plugin = p;
            stringType = plugin.typeEnvironment.getStringType();
        });
    });

    it("handles simple case", (done) => {
        const v = valueWrap(plugin.typeEnvironment, "hello", true);
        expect(stringType.isIdenticalTo(v.type)).to.equal(true, "CoreValue isn't a string");

        if (!(v instanceof CorePrimitiveValue)) {
            throw new Error("bad value made");
        }

        v.listeners.add(function(value: CoreValue<TypeEnvironment>, newValue: string) {
            if (!(value instanceof CorePrimitiveValue)) {
                throw new Error("Test failed");
            }
            expect(value.data).to.equal("hello");
            expect(newValue).to.equal("world");
            done();
        });

        v.data = "world";
    });

    it("handles nesting", (done) => {
        const nestedValue = valueWrap(plugin.typeEnvironment, { myO2: { myNum: 15 } }, true);

        if (!(nestedValue instanceof CoreObjectValue)) {
            throw new Error("Not an object value");
        }

        const myO2 = nestedValue.get("myO2");

        if (!(myO2 instanceof CoreObjectValue)) {
            throw new Error("Not an object value");
        }

        myO2.get("myNum").listeners.add(function(value: CoreValue<TypeEnvironment>, newValue: string) {
            if (!(value instanceof CorePrimitiveValue)) {
                throw new Error("Test failed");
            }
            expect(value.data).to.equal(15);
            expect(newValue).to.equal(18);
            done();
        });

        const o2 = nestedValue.get("myO2");
        if (!(o2 instanceof CoreObjectValue)) {
            throw new Error("Test failed");
        }
        const primitive = o2.get("myNum");

        if (!(primitive instanceof CorePrimitiveValue)) {
            throw new Error("primitive should be a primitive");
        }
        primitive.data = 18;
    });


    it("handles CoreElement", (done) => {
        const m = new CoreModel(plugin);
        const e = m.addElement(CoreElementKind.Node, "DFANode");
        const isAcceptState = e.get("isAcceptState");
        const label = e.get("label");
        if (isAcceptState instanceof CorePrimitiveValue && label instanceof CorePrimitiveValue) {
            isAcceptState.data = true;
            label.data = "hello";
        } else {
            throw new Error("not primitive values");
        }

        e.get("isAcceptState").listeners.add((value: CoreValue<TypeEnvironment>, newValue: boolean) => {
            if (!(value instanceof CorePrimitiveValue)) {
                throw new Error("Test failed");
            }
            expect(value.data).to.be.true;
            expect(newValue).to.be.false;
            done();
        });

        const acceptState = e.get("isAcceptState");
        if (!(acceptState instanceof CorePrimitiveValue)) {
            throw new Error("! (acceptState instanceof CorePrimitiveValue)");
        }

        acceptState.data = false;
    });

    it("immutablilty means something", () => {
        const v = valueWrap(plugin.typeEnvironment, "hello", false);
        if (!(v instanceof CorePrimitiveValue)) {

            throw new Error("! (v instanceof CorePrimitiveValue)");
        }
        expect(plugin.typeEnvironment.getStringLiteralType("hello").isIdenticalTo(v.type)).to.equal(true, "CoreValue isn't a string");
        expect(() => v.data = "world").to.throw();
    });
});