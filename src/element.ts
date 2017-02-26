import { Plugin, ObjectType, IType } from ".";
import * as assert from "assert";

export enum CoreElementKind { Node, Edge, Graph };

export class CoreValue {
    constructor(readonly type: IType, public data: any) {

    }
}

/**
 * Represents nodes, edges, and graphs.
 */
export class CoreElement extends CoreValue {
    constructor(readonly type: ObjectType, readonly kind: CoreElementKind) {
        super(type, {});
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
            throw Error("not a CoreModel");;
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
        }

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
            throw Error("element doesn't exist");;
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