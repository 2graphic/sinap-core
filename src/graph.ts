import { ObjectType } from "./types"

export enum CoreElementKind { Node, Edge, Graph };

export class CoreElement {
    data: { [a: string]: any };

    constructor(readonly type: ObjectType, readonly kind: CoreElementKind) {
        this.data = {};
    }
}