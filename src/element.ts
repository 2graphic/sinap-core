import { Plugin, ObjectType, CoreObjectValue, CoreValue, makeValue } from ".";
import * as assert from "assert";

export enum CoreElementKind { Node, Edge, Graph };

function makeDataProxy(data: { [a: string]: any }, type: ObjectType) {
    return new Proxy(data, {
        get: (b, k: string) => {
            const bv = b[k];
            if (bv instanceof CoreElement) {
                return bv;
            }
            return makeValue(bv, type.members.get(k) || type.env);
        },
        set: () => {
            throw new Error("setting values is unimplemented");
        }
    });
}

/**
 * Represents nodes, edges, and graphs.
 */
export class CoreElement extends CoreObjectValue {
    private _data: { [a: string]: any };
    private _value: { [a: string]: CoreValue };

    /**
     * Distinction between data and value:
     * data = {
     *  [a: string]: CoreElement (if this.members.get(a) == CoreElement
     *  [b: string]: raw_data (Unwrapped CoreValue if this.members.get(b) != CoreElement)
     * }
     */
    get data() {
        return this._data;
    }

    set data(d) {
        this._value = makeDataProxy(d, this.type);
        this._data = d;
    }

    get value() {
        return this._value;
    }

    set value(obj) {
        // TODO: this needs test cases
        for (const key of Object.getOwnPropertyNames(obj)) {
            this._value[key] = obj[key];
        }
    }

    constructor(readonly type: ObjectType, readonly kind: CoreElementKind) {
        super(type, {});

        this.data = {};
    }
}

/**
 * The file format.
 */
export type SerialJSO = {
    format: string,
    kind: string[],
    version: string,
    elements: { kind: string, type: string, data: any }[],
};

export class CoreModel {
    elements: CoreElement[];

    /**
     * Create a new CoreModel. If `pojo` is provided, build the model from the
     * serial represnetation.
     *
     * Note that this modifies the pojo object given and once it is passed to this
     * constructor, it should not be reused.
     */
    constructor(private plugin: Plugin, pojo?: SerialJSO) {
        if (pojo === undefined) {
            this.elements = [];
            return;
        }

        assert.deepEqual(plugin.pluginKind, pojo.kind);

        if (pojo.format !== "sinap-file-format" || pojo.version !== "0.0.7") {
            throw Error("not a CoreModel");
        }

        this.elements = pojo.elements.map((e) => this.plugin.makeElement(CoreElementKind[e.kind as any] as any, e.type));

        // TODO: typecheck all values against plugin-declared.
        const traverse = (a: any) => {
            if (typeof (a) !== "object") {
                return;
            }
            for (const k of Object.getOwnPropertyNames(a)) {
                const el = a[k];
                if (el.kind === "sinap-pointer") {
                    a[k] = this.elements[el.index];
                } else {
                    traverse(el);
                }
            }
        };

        traverse(pojo.elements);

        for (let i = 0; i < pojo.elements.length; i++) {
            this.elements[i].data = pojo.elements[i].data;
        }

    }

    /**
     * Store a new element with this model
     */
    addElement(kind: CoreElementKind, type?: string) {
        const element = this.plugin.makeElement(kind, type);
        this.elements.push(element);
        return element;
    }

    removeElement(element: CoreElement) {
        const idx = this.elements.indexOf(element);
        if (idx === -1) {
            throw Error("element doesn't exist");
        }
        this.elements.splice(idx, 1);
    }

    /**
     * Generate an acyclic JS object which can be used to reconstruct this
     * model.
     */
    serialize(): SerialJSO {
        return {
            format: "sinap-file-format",
            kind: this.plugin.pluginKind,
            version: "0.0.7",
            elements: this.elements.map((element) => {
                return {
                    kind: CoreElementKind[element.kind],
                    type: element.type.name,
                    data: JSON.parse(JSON.stringify(element.data, (_, v) => {
                        const idx = this.elements.indexOf(v);
                        if (idx !== -1) {
                            return {
                                kind: "sinap-pointer",
                                index: idx,
                            };
                        }
                        return v;
                    })),
                };
            }),
        };
    }
}