/// <reference path="../typings/index.d.ts" />
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
    bind,
    deepListen,
    PluginTypeEnvironment,
    CoreUnionValue,
    FakeObjectType,
    isObjectType
} from "../src/";
import { expect } from "chai";
import * as path from "path";

describe("Core Value", () => {

    function loadTestPlugin(name: string): Promise<Plugin> {
        return loadPluginDir(path.join("test", "interpreters", name));
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

    it("has set on object", (done) => {
        const value1 = valueWrap(plugin.typeEnvironment, { a: { b: "1" } }, true);
        const value2 = valueWrap(plugin.typeEnvironment, { b: "4" }, true);
        if (!(value1 instanceof CoreObjectValue)) {
            throw new Error("!(value1 instanceof CoreObjectValue)");
        }

        value1.listeners.add((v: CoreObjectValue<TypeEnvironment>, newValue: { [a: string]: CoreValue<TypeEnvironment> }) => {
            expect(v.jsonify(() => { return { result: false, value: undefined }; }))
                .to.deep.equal({ a: { b: "1" } });
            expect(newValue.a.jsonify(() => { return { result: false, value: undefined }; }))
                .to.deep.equal({ b: "4" });
            done();
        });

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

        // it("intersection", () => {
        //     throw new Error("not implemented");
        // });
        it("union", () => {
            const v1 = valueWrap(plugin.typeEnvironment, 17, true);
            const v2 = valueWrap(plugin.typeEnvironment, "hello", true);
            const v3 = makeValue(new FakeUnionType(plugin.typeEnvironment, new Set([v1.type, v2.type])), 15, true);

            expect(v3.deepEqual(v1)).to.be.false;
            expect(v3.deepEqual(v2)).to.be.false;

            (v3 as any).value = valueWrap(plugin.typeEnvironment, "hello", true);

            expect(v3.deepEqual(v2)).to.be.true;
            expect(v2.deepEqual(v3)).to.be.true;
        });
    });
    describe("bind", () => {
        describe("deepListen", () => {
            it("prim", (done) => {
                const v1 = valueWrap(plugin.typeEnvironment, "hi", true);

                deepListen(v1, (v, nv) => {
                    expect(v1).to.equal(v);
                    expect(nv).to.equal("hello");
                    done();
                });

                (v1 as any).data = "hello";
            });

            it("object", (done) => {
                const v1 = valueWrap(plugin.typeEnvironment, { a: "hi" }, true);

                deepListen(v1, (v, nv) => {
                    expect(v1).to.equal(v);
                    expect(nv).to.deep.equal({ a: "hello" });
                    done();
                });

                (v1 as any).get("a").data = "hello";
            });

            it("object (deep)", (done) => {
                const v1 = valueWrap(plugin.typeEnvironment, { a: { b: { c: "hi" }, q: "query" } }, true);

                deepListen(v1, (v, nv) => {
                    expect(v1).to.equal(v);
                    expect(nv).to.deep.equal({ a: { b: { c: "hello" } } });
                    done();
                });

                (v1 as any).get("a").get("b").get("c").data = "hello";
            });

            it("object (deep twice)", (done) => {
                const v1 = valueWrap(plugin.typeEnvironment, { a: { b: { c: "hi" }, q: "query" } }, true);

                let callbacks = 0;

                deepListen(v1, (v, nv) => {
                    expect(v1).to.equal(v);
                    if (callbacks === 0) {
                        expect(nv).to.deep.equal({ a: { b: { c: "hello" } } });
                        callbacks++;
                    } else if (callbacks === 1) {
                        expect(nv).to.deep.equal({ a: { b: { c: "jajaj" } } });
                        callbacks++;
                        done();
                    }
                });

                (v1 as any).get("a").get("b").get("c").data = "hello";
                (v1 as any).get("a").get("b").get("c").data = "jajaj";
            });

            it("object (deep twice, setting)", (done) => {
                const v1 = valueWrap(plugin.typeEnvironment, { a: { b: { c: "hi" }, q: "query" } }, true);

                let callbacks = 0;

                deepListen(v1, (v, nv) => {
                    expect(v1).to.equal(v);
                    if (callbacks === 0) {
                        expect(nv).to.deep.equal({ a: { b: { c: "hello" } } });
                        callbacks++;
                    } else if (callbacks === 1) {
                        expect(nv).to.deep.equal({ a: { b: { c: "jajaj" } } });
                        callbacks++;
                        done();
                    }
                });

                (v1 as any).get("a").get("b").set("c", valueWrap(plugin.typeEnvironment, "hello", true));
                (v1 as any).get("a").get("b").set("c", valueWrap(plugin.typeEnvironment, "jajaj", true));
            });

            it("object (deep twice, setting deeper)", (done) => {
                const v1 = valueWrap(plugin.typeEnvironment, { a: { b: { c: "hi" }, q: "query" } }, true);

                let callbacks = 0;

                deepListen(v1, (v, nv) => {
                    expect(v1).to.equal(v);
                    if (callbacks === 0) {
                        expect(nv).to.deep.equal({ a: { b: { c: "hello" } } });
                        callbacks++;
                    } else if (callbacks === 1) {
                        expect(nv).to.deep.equal({ a: { b: { c: "jajaj" } } });
                        callbacks++;
                        done();
                    }
                });

                (v1 as any).get("a").set("b", valueWrap(plugin.typeEnvironment, { c: "hello" }, true));
                (v1 as any).get("a").get("b").set("c", valueWrap(plugin.typeEnvironment, "jajaj", true));
            });

            it("object (unsets)", (done) => {
                const v1 = valueWrap(plugin.typeEnvironment, { a: "initial value" }, true) as CoreObjectValue<PluginTypeEnvironment>;
                const v2 = (v1 as any).get("a");
                const v3 = valueWrap(plugin.typeEnvironment, "change index 0", true) as CorePrimitiveValue<PluginTypeEnvironment>;

                let triggerIndex = 0;
                deepListen(v1, (v, nv) => {
                    expect(v1).to.equal(v);
                    if (triggerIndex === 0) {
                        expect(nv).to.deep.equal({ a: "change index 0" });
                        triggerIndex++;
                    } else if (triggerIndex === 1) {
                        expect(nv).to.deep.equal({ a: "change index 1" });
                        triggerIndex++;
                        done();
                    } else {
                        throw new Error("unexpected callback");
                    }
                });

                // should trigger a change notification
                v1.set('a', v3);
                // should not trigger a notification
                v2.data = "should be undetected";
                // should trigger a change notification
                v3.data = "change index 1";
            });

            // TODO: this test should definitely pass
            // but we don't need it for beta, so...
            // it("object (unsets nested)", (done) => {
            //     const v1 = valueWrap(plugin.typeEnvironment, { a: { b: "initial value" } }, true) as CoreObjectValue<PluginTypeEnvironment>;
            //     const v2 = (v1 as any).get("a");
            //     const v3 = valueWrap(plugin.typeEnvironment, { b: "change index 0" }, true) as CoreObjectValue<PluginTypeEnvironment>;

            //     let triggerIndex = 0;
            //     deepListen(v1, (v, nv) => {
            //         expect(v1).to.equal(v);
            //         if (triggerIndex === 0) {
            //             expect(nv).to.deep.equal({ a: { b: "change index 0" } });
            //             triggerIndex++;
            //         } else if (triggerIndex === 1) {
            //             expect(nv).to.deep.equal({ a: { b: "change index 1" } });
            //             triggerIndex++;
            //             done();
            //         } else {
            //             throw new Error("unexpected callback");
            //         }
            //     });

            //     // should trigger a change notification
            //     v1.set('a', v3);
            //     // should not trigger a notification
            //     v2.get("b").data = "should be undetected";
            //     // should trigger a change notification
            //     (v3.get("b") as CorePrimitiveValue<PluginTypeEnvironment>).data = "change index 1";
            // });

            it("union type 1", (done) => {
                const v1 = makeValue(new FakeUnionType(plugin.typeEnvironment,
                    new Set([plugin.typeEnvironment.getStringType(), plugin.typeEnvironment.getNumberType()])),
                    "hello",
                    true) as CoreUnionValue<PluginTypeEnvironment>;

                deepListen(v1, (v, nv) => {
                    expect(v).to.equal(v1);
                    expect(nv).to.equal("world");
                    done();
                });
                (v1.value as CorePrimitiveValue<PluginTypeEnvironment>).data = "world";
            });

            it("union type 2", (done) => {
                const v1 = makeValue(new FakeUnionType(plugin.typeEnvironment,
                    new Set([plugin.typeEnvironment.getStringType(), plugin.typeEnvironment.getNumberType()])),
                    "hello",
                    true) as CoreUnionValue<PluginTypeEnvironment>;

                deepListen(v1, (v, nv) => {
                    expect(v).to.equal(v1);
                    expect(nv).to.equal("world");
                    done();
                });
                v1.value = valueWrap(plugin.typeEnvironment, "world", true);
            });

            it("union type (boolean)", (done) => {
                const v1 = makeValue(plugin.typeEnvironment.getBooleanType(),
                    true,
                    true) as CorePrimitiveValue<PluginTypeEnvironment>;

                deepListen(v1, (v, nv) => {
                    expect(v).to.equal(v1);
                    expect(nv).to.equal(false);
                    done();
                });
                v1.data = false;
            });

            it("array type", (done) => {
                const nodeType = plugin.typeEnvironment.lookupSinapType("DrawableNode");
                if (!isObjectType(nodeType)) {
                    throw new Error("test failed");
                }
                const listOfPoints = nodeType.members.get("anchorPoints")!;
                const v1 = makeValue(listOfPoints,
                    [{ x: 0, y: 4 }, { x: 1, y: 4 }],
                    true) as CoreArrayValue<PluginTypeEnvironment>;

                deepListen(v1, (v, nv) => {
                    expect(v).to.equal(v1);
                    expect(nv).to.deep.equal([{ x: 7 }]);
                    done();
                });
                (v1.values[1] as any).get("x").data = 7;
            });

            it("intersection 1", (done) => {
                const v1 = makeValue(
                    new FakeIntersectionType(plugin.typeEnvironment,
                        new Set([new FakeObjectType(plugin.typeEnvironment, new Map([["a", plugin.typeEnvironment.getStringType()]])),
                        new FakeObjectType(plugin.typeEnvironment, new Map([["b", plugin.typeEnvironment.getStringType()]]))])),
                    { a: "hi", b: "hello" },
                    true) as CoreIntersectionValue<PluginTypeEnvironment>;

                deepListen(v1, (v, nv) => {
                    expect(v).to.equal(v1);
                    expect(nv).to.deep.equal({ b: "yolo" });
                    done();
                });
                v1.set("b", valueWrap(plugin.typeEnvironment, "yolo", true));
            });

            it("intersection 2", (done) => {
                const v1 = makeValue(
                    new FakeIntersectionType(plugin.typeEnvironment,
                        new Set([new FakeObjectType(plugin.typeEnvironment, new Map([["a", plugin.typeEnvironment.getStringType()]])),
                        new FakeObjectType(plugin.typeEnvironment, new Map([["b", plugin.typeEnvironment.getStringType()]]))])),
                    { a: "hi", b: "hello" },
                    true) as CoreIntersectionValue<PluginTypeEnvironment>;

                deepListen(v1, (v, nv) => {
                    expect(v).to.equal(v1);
                    expect(nv).to.deep.equal({ b: "yolo" });
                    done();
                });
                (v1.get("b") as any).data = "yolo";
            });

            it("intersection 3", (done) => {
                const v1 = makeValue(
                    new FakeIntersectionType(plugin.typeEnvironment,
                        new Set([new FakeObjectType(plugin.typeEnvironment, new Map([["a", plugin.typeEnvironment.getStringType()]])),
                        new FakeObjectType(plugin.typeEnvironment, new Map([["b", plugin.typeEnvironment.getStringType()]]))])),
                    { a: "hi", b: "hello" },
                    true) as CoreIntersectionValue<PluginTypeEnvironment>;

                deepListen(v1, (v, nv) => {
                    expect(v).to.equal(v1);
                    expect(nv).to.deep.equal({ a: "yolo" });
                    done();
                });
                (v1.get("a") as any).data = "yolo";
            });
        });

        it("simple case 1", () => {
            const v1 = valueWrap(plugin.typeEnvironment, { a: "hi" }, true);
            const backer = {};

            bind(v1 as CoreObjectValue<PluginTypeEnvironment>, backer);
            expect(backer).to.deep.equal({ a: "hi" });

            (v1 as any).get("a").data = "hello";
            expect(backer).to.deep.equal({ a: "hello" });
        });
        it("simple case 2", () => {
            const v1 = valueWrap(plugin.typeEnvironment, { a: "hi" }, true);
            const backer = {};

            bind(v1 as CoreObjectValue<PluginTypeEnvironment>, backer);
            expect(backer).to.deep.equal({ a: "hi" });

            (v1 as any).set("a", valueWrap(plugin.typeEnvironment, "hello", true));
            expect(backer).to.deep.equal({ a: "hello" });
        });
        it("more complex case", () => {
            const v1 = valueWrap(plugin.typeEnvironment, { a: { b: "hi" } }, true);
            const backer = {};

            bind(v1 as CoreObjectValue<PluginTypeEnvironment>, backer);
            expect(backer).to.deep.equal({ a: { b: "hi" } });

            (v1 as any).set("a", valueWrap(plugin.typeEnvironment, { b: "hello" }, true));
            expect(backer).to.deep.equal({ a: { b: "hello" } });
        });
    });
});