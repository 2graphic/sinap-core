import { ObjectType } from "./types";
import { Plugin } from "./plugin";

export enum CoreElementKind { Node, Edge, Graph };

export class CoreElement {
    data: { [a: string]: any };

    constructor(readonly type: ObjectType, readonly kind: CoreElementKind) {
        this.data = {};
    }
}

export type SerialJSO = {
    format: string,
    kind: string,
    version: string,
    elements: {kind: string, type: string, data: any}[],
};

export class CoreModel {
    elements: CoreElement[];

    /**
     * Modifies pojo
     */
    constructor(private plugin: Plugin, pojo: SerialJSO) {
        // TODO: check correct plugin kind
        if (pojo.format !== "sinap-file-format" || pojo.version !== "0.0.6"){
            throw "not a CoreModel";
        }

        this.elements = pojo.elements.map((e) => this.plugin.makeElement(CoreElementKind[e.kind as any] as any, e.type));

        // TODO: typecheck all values against plugin-declared. 
        const traverse = (a: any) => {
            if (typeof(a) !== "object"){
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

    serialize(): SerialJSO {
        return {
            format: "sinap-file-format",
            kind: "TODO: implement this",
            version: "0.0.6",
            elements: this.elements.map((element)=>{
                return {
                    kind: CoreElementKind[element.kind],
                    type: element.type.name,
                    data: JSON.parse(JSON.stringify(element.data, (_, v)=>{
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