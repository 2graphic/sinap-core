import { Type, Value } from "sinap-types";

export class TypeSerializer {
    readonly serials = new Map<string, any>();
    readonly types = new Map<string, Type.Type>();

    addType(t: Type.Type) {
        let serial: any;
        if (t instanceof Type.Literal) {
            serial = { literal: t.value };
        } else if (t instanceof Type.Primitive) {
            serial = { primitive: t.name };
        } else if (t instanceof Type.Record) {
            const inner: any = {};
            for (const [name, type] of t.members) {
                inner[name] = this.addType(type);
            }
            serial = { record: inner };
        } else if (t instanceof Type.CustomObject) {
            const existing = this.types.get(t.name);
            if (existing) {
                if (!existing.equals(t)) {
                    throw new Error(`type-serializer: distinct types have the same name ${t.name}`);
                }
                serial = this.serials.get(t.name);
            } else {
                serial = { object: t.name };
                this.serials.set(t.name, serial);
                this.types.set(t.name, t);

                for (const type of t.members.values()) {
                    this.addType(type);
                }
                for (const obj of t.methods.values()) {
                    obj.argTypes.map((t) => this.addType(t));
                    if (obj.returnType) {
                        this.addType(obj.returnType);
                    }
                }
            }
        } else if (t instanceof Value.TupleType) {
            serial = { tuple: t.typeParameters.map((t) => this.addType(t)) };
        } else if (t instanceof Value.ArrayType) {
            serial = { array: this.addType(t.typeParameter) };
        } else if (t instanceof Value.MapType) {
            serial = { map: [this.addType(t.keyType), this.addType(t.valueType)] };
        } else if (t instanceof Value.SetType) {
            serial = { set: this.addType(t.typeParameter) };
        } else if (t instanceof Type.Intersection) {
            serial = { intersection: [...t.types].map((t) => this.addType(t)) };
        } else if (t instanceof Type.Union) {
            serial = { union: [...t.types].map((t) => this.addType(t)) };
        } else {
            throw new Error("type-serializer: unknown type encountered");
        }
        return serial;
    }

    private insistExists(name: string) {
        const t = this.types.get(name);
        if (!t) {
            throw new Error(`insistExists: name (${name}) not found`);
        }
        return t;
    }

    getType(a: any): Type.Type {
        for (const key in a) {
            if (key === "literal") {
                return new Type.Literal(a[key]);
            } else if (key === "primitive") {
                return new Type.Primitive(a[key]);
            } else if (key === "array") {
                return new Value.ArrayType(this.getType(a[key]));
            } else if (key === "map") {
                return new Value.MapType(this.getType(a[key][0]), this.getType(a[key][1]));
            } else if (key === "set") {
                return new Value.SetType(this.getType(a[key]));
            } else if (key === "tuple") {
                return new Value.TupleType(a[key].map((a: any) => this.getType(a)));
            } else if (key === "union") {
                return new Type.Union(a[key].map((a: any) => this.getType(a)));
            } else if (key === "record") {
                const params = new Map<string, Type.Type>();
                for (const k in a[key]) {
                    params.set(k, this.getType(a[key][k]));
                }
                return new Type.Record(params);
            } else if (key === "object") {
                return this.insistExists(a[key]);
            } else if (key === "intersection") {
                return new Type.Intersection(a[key].map((a: any) => this.getType(a)));
            }
        }
        throw new Error("type-deserializer: unknown type encountered");
    }
}