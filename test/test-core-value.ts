/// <reference path="../typings/globals/mocha/index.d.ts" />
/// <reference path="../typings/modules/chai/index.d.ts" />
import * as ts from "typescript";

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
    ScriptTypeEnvironment,
    CorePrimitiveValue,
    makeValue,
    CoreArrayValue,
    typeToValue,
    FakeIntersectionType,
    CoreIntersectionValue,
    FakeUnionType,
} from "../src/";
import { LocalFileService } from "./files-mock";
import { expect } from "chai";

describe("Core Value", () => {

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

    it("has set on object", () => {
        const value1 = valueWrap(plugin.typeEnvironment, { a: { b: "1" } }, true);
        const value2 = valueWrap(plugin.typeEnvironment, { b: "4" }, true);
        if (!(value1 instanceof CoreObjectValue)) {
            throw new Error("!(value1 instanceof CoreObjectValue)");
        }
        value1.set("a", value2);

        expect(value1.jsonify(() => { return { result: false, value: undefined }; }))
            .to.deep.equal({ a: { b: "4" } });
    });

    it("has set on intersection", () => {
        const value1 = valueWrap(plugin.typeEnvironment, { a: { b: "1" } }, true);
        const value2 = valueWrap(plugin.typeEnvironment, { b: "4" }, true);
        const value3 = typeToValue(new FakeIntersectionType(plugin.typeEnvironment, new Set([
            value1.type,
            value2.type,
        ])), { a: { b: "2" }, b: "5" }, true, makeValue);

        expect(value3.jsonify(() => { return { result: false, value: undefined }; }))
            .to.deep.equal({ a: { b: "2" }, b: "5" });

        if (!(value3 instanceof CoreIntersectionValue)) {
            throw new Error("!(value3 instanceof CoreIntersectionValue)");
        }
        value3.set("b", valueWrap(plugin.typeEnvironment, "7", true));

        expect(value3.jsonify(() => { return { result: false, value: undefined }; }))
            .to.deep.equal({ a: { b: "2" }, b: "7" });

        value3.set("a", value2);

        expect(value3.jsonify(() => { return { result: false, value: undefined }; }))
            .to.deep.equal({ a: { b: "4" }, b: "7" });

        expect(value3.get("a")).to.equal(value2);
    });

    it("immutablilty means something", () => {
        const v = valueWrap(plugin.typeEnvironment, "hello", false);
        if (!(v instanceof CorePrimitiveValue)) {

            throw new Error("! (v instanceof CorePrimitiveValue)");
        }
        expect(plugin.typeEnvironment.getStringLiteralType("hello").isIdenticalTo(v.type)).to.equal(true, "CoreValue isn't a string");
        expect(() => v.data = "world").to.throw();
    });


    describe("deep equals", () => {
        it("primitive", () => {
            const v1 = valueWrap(plugin.typeEnvironment, "hello", false);
            const v2 = valueWrap(plugin.typeEnvironment, "hello", true);
            if (!(v1 instanceof CorePrimitiveValue && (v2 instanceof CorePrimitiveValue))) {
                throw new Error("! (v[12] instanceof CorePrimitiveValue)");
            }

            expect(v1.deepEqual(v2)).to.be.true;
            v2.data = "world";
            expect(v1.deepEqual(v2)).to.be.false;
        });

        it("object", () => {
            const v1 = valueWrap(plugin.typeEnvironment, { "hello": "world" }, false);
            const v2 = valueWrap(plugin.typeEnvironment, { "hello": "world" }, true);
            const v3 = valueWrap(plugin.typeEnvironment, "yo", true);
            if (!(v1 instanceof CoreObjectValue && (v2 instanceof CoreObjectValue))) {
                throw new Error("! (v[12] object value)");
            }

            expect(v1.deepEqual(v2)).to.be.true;
            const v4 = v2.get("hello");
            if (!(v4 instanceof CorePrimitiveValue)) {
                throw new Error("v4 not a primitive value");
            }
            v4.data = "world1";
            expect(v1.deepEqual(v2)).to.be.false;
            expect(v1.deepEqual(v3)).to.be.false;
            expect(v2.deepEqual(v3)).to.be.false;
            expect(v1.deepEqual(v1)).to.be.true;
            expect(v2.deepEqual(v2)).to.be.true;
            expect(v3.deepEqual(v3)).to.be.true;
        });

        it("array", () => {
            const program = ts.createProgram(["test/array-type.ts"], {});
            const env = new ScriptTypeEnvironment(program.getTypeChecker());
            const array1 = env.getType(env.checker.lookupTypeAt("array1", program.getSourceFile("test/array-type.ts")));
            const array2 = env.getType(env.checker.lookupTypeAt("array2", program.getSourceFile("test/array-type.ts")));

            const v1 = makeValue(array1, [{ a: 1 }, { a: 2 }, { a: 3 }], true);
            const v2 = makeValue(array1, [{ a: 1 }, { a: 2 }, { a: 3 }], true);
            const v3 = makeValue(array1, [{ a: 2 }, { a: 3 }], true);

            expect(v1).to.instanceOf(CoreArrayValue);

            expect(v1.deepEqual(v2)).to.be.true;
            expect(v1.deepEqual(v3)).to.be.false;

            const v4 = makeValue(array2, [1, 2, 3], true);
            const v5 = makeValue(array2, [1, 2, 3], true);
            const v6 = makeValue(array2, [1, 2, 4], true);
            const v7 = makeValue(array2, [1, 4, 3], true);

            expect(v4.deepEqual(v5)).to.be.true;
            expect(v4.deepEqual(v6)).to.be.false;
            expect(v4.deepEqual(v7)).to.be.false;

            expect(v1.deepEqual(v6)).to.be.false;
            expect(v6.deepEqual(v1)).to.be.false;
        });

        it("intersection", () => {
            throw new Error("not implemented");
        });
        it("union", () => {
            const v1 = valueWrap(plugin.typeEnvironment, 17, true);
            const v2 = valueWrap(plugin.typeEnvironment, "hello", true);
            const v3 = makeValue(new FakeUnionType(plugin.typeEnvironment, new Set([v1.type, v2.type])), 15, true);

            expect(v3.deepEqual(v1)).to.be.false;
            expect(v3.deepEqual(v2)).to.be.false;

            (v3 as any).data = "hello";

            expect(v3.deepEqual(v2)).to.be.true;
            expect(v2.deepEqual(v3)).to.be.true;
        });
    });
});