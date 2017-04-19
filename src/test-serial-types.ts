import { TypeSerializer } from "./serial-types";
import { Type, Value } from "sinap-types";
import { expect } from "chai";
import { ElementType } from "./index";

describe("Types Serialize", () => {
    it("serializes CustomObjects", () => {
        const ser = new TypeSerializer();
        const t1 = new Type.CustomObject("Class1", null, new Map());
        const t2 = new Type.CustomObject("Class2", null, new Map());
        expect(ser.addType(t1))
            .to.deep.equal({ object: "Class1" });

        expect(ser.addType(t2))
            .to.deep.equal({ object: "Class2" });

        expect(() => ser.addType(new Type.CustomObject("Class2", null, new Map()))).to.throw();

        expect(ser.getType({ object: "Class1" }).equals(t1)).to.be.true;
    });
    it("serializes sub CustomObjects", () => {
        const ser = new TypeSerializer();
        const t1 = new Type.CustomObject("ClassForObject", null, new Map());
        const t2 = new Type.CustomObject("ClassForUnion", null, new Map());
        const t3 = new Type.CustomObject("ClassForIntersection", null, new Map());
        const t4 = new Type.CustomObject("ClassForArray", null, new Map());
        const t5 = new Type.CustomObject("ClassForMap1", null, new Map());
        const t6 = new Type.CustomObject("ClassForMap2", null, new Map());
        const t7 = new Type.CustomObject("ClassForSet", null, new Map());
        const t8 = new Type.CustomObject("ClassForTuple", null, new Map());

        ser.addType(new Type.CustomObject("Object", null, new Map([['o2', t1]])));
        ser.addType(new Type.Union([t2]));
        ser.addType(new Type.Intersection([t3]));
        ser.addType(new Value.ArrayType(t4));
        ser.addType(new Value.MapType(t5, t6));
        ser.addType(new Value.SetType(t7));
        ser.addType(new Value.TupleType([t8]));

        expect(ser.getType({ object: "ClassForObject" }).equals(t1)).to.be.true;
        expect(ser.getType({ object: "ClassForUnion" }).equals(t2)).to.be.true;
        expect(ser.getType({ object: "ClassForIntersection" }).equals(t3)).to.be.true;
        expect(ser.getType({ object: "ClassForArray" }).equals(t4)).to.be.true;
        expect(ser.getType({ object: "ClassForMap1" }).equals(t5)).to.be.true;
        expect(ser.getType({ object: "ClassForMap2" }).equals(t6)).to.be.true;
        expect(ser.getType({ object: "ClassForSet" }).equals(t7)).to.be.true;
        expect(ser.getType({ object: "ClassForTuple" }).equals(t8)).to.be.true;
    });
    it("serializes Records", () => {
        const ser = new TypeSerializer();
        expect(ser.addType(new Type.Record(new Map([["f1", new Type.Primitive("string")]]))))
            .to.deep.equal({ record: { f1: { primitive: "string" } } });
        expect(ser.getType({ record: { f1: { primitive: "string" } } })
            .equals(new Type.Record(new Map([["f1", new Type.Primitive("string")]])))).to.be.true;
    });
    it("serializes Literals", () => {
        const ser = new TypeSerializer();
        expect(ser.addType(new Type.Literal(3))).to.deep.equal({ literal: 3 });
        expect(ser.addType(new Type.Literal("3"))).to.deep.equal({ literal: "3" });

        expect(ser.getType({ literal: 3 }).equals(new Type.Literal(3))).to.be.true;
        expect(ser.getType({ literal: "3" }).equals(new Type.Literal("3"))).to.be.true;
    });
    it("serializes Primitives", () => {
        const ser = new TypeSerializer();
        expect(ser.addType(new Type.Primitive("string"))).to.deep.equal({ primitive: "string" });
        expect(ser.addType(new Type.Primitive("number"))).to.deep.equal({ primitive: "number" });
        expect(ser.addType(new Type.Primitive("boolean"))).to.deep.equal({ primitive: "boolean" });
        expect(ser.getType({ primitive: "string" }).equals(new Type.Primitive("string"))).to.be.true;
        expect(ser.getType({ primitive: "number" }).equals(new Type.Primitive("number"))).to.be.true;
        expect(ser.getType({ primitive: "boolean" }).equals(new Type.Primitive("boolean"))).to.be.true;
    });
    it("serializes Tuples", () => {
        const ser = new TypeSerializer();
        expect(ser.addType(new Value.TupleType([new Type.Primitive("string"), new Type.Primitive("number")])))
            .to.deep.equal({ tuple: [{ primitive: "string" }, { primitive: "number" }] });
        expect(ser.getType({ tuple: [{ primitive: "string" }, { primitive: "number" }] })
            .equals(new Value.TupleType([new Type.Primitive("string"), new Type.Primitive("number")]))).to.be.true;
    });
    it("serializes Arrays", () => {
        const ser = new TypeSerializer();
        expect(ser.addType(new Value.ArrayType(new Type.Primitive("string"))))
            .to.deep.equal({ array: { primitive: "string" } });
        expect(ser.getType({ array: { primitive: "string" } })
            .equals(new Value.ArrayType(new Type.Primitive("string")))).to.be.true;
    });
    it("serializes Sets", () => {
        const ser = new TypeSerializer();
        expect(ser.addType(new Value.SetType(new Type.Primitive("string"))))
            .to.deep.equal({ set: { primitive: "string" } });
        expect(ser.getType({ set: { primitive: "string" } })
            .equals(new Value.SetType(new Type.Primitive("string")))).to.be.true;
    });
    it("serializes Maps", () => {
        const ser = new TypeSerializer();
        expect(ser.addType(new Value.MapType(new Type.Primitive("string"), new Type.Primitive("number"))))
            .to.deep.equal({ map: [{ primitive: "string" }, { primitive: "number" }] });
        expect(ser.getType({ map: [{ primitive: "string" }, { primitive: "number" }] })
            .equals(new Value.MapType(new Type.Primitive("string"), new Type.Primitive("number")))).to.be.true;
    });
    it("serializes Unions", () => {
        const ser = new TypeSerializer();
        expect(ser.addType(new Type.Union([new Type.Primitive("string"), new Type.Literal(7)])))
            .to.deep.equal({ union: [{ primitive: "string" }, { literal: 7 }] });
        expect(ser.getType({ union: [{ primitive: "string" }, { literal: 7 }] })
            .equals(new Type.Union([new Type.Primitive("string"), new Type.Literal(7)]))).to.be.true;
    });
    it("serializes Intesections", () => {
        const ser = new TypeSerializer();
        const t1 = new Type.CustomObject("Obj1", null, new Map());
        const t2 = new Type.CustomObject("Obj2", null, new Map());
        expect(ser.addType(new Type.Intersection([t1, t2])))
            .to.deep.equal({ intersection: [{ object: "Obj1" }, { object: "Obj2" }] });
        expect(ser.getType({ intersection: [{ object: "Obj1" }, { object: "Obj2" }] })
            .equals(new Type.Intersection([t1, t2]))).to.be.true;
    });
    it("serializes ElementType", () => {
        const ser = new TypeSerializer();
        const t1 = new Type.CustomObject("Obj1", null, new Map());
        const t2 = new Type.CustomObject("Obj2", null, new Map());
        expect(ser.addType(new ElementType(t1, t2)))
            .to.deep.equal({ element: { plugin: { object: "Obj1" }, drawable: { object: "Obj2" } } });
        expect(ser.getType({ element: { plugin: { object: "Obj1" }, drawable: { object: "Obj2" } } }))
            .to.instanceof(ElementType);
        expect(ser.getType({ element: { plugin: { object: "Obj1" }, drawable: { object: "Obj2" } } })
            .equals(new ElementType(t1, t2))).to.be.true;
    });
});