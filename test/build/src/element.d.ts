import { ObjectType } from "./types";
import { Plugin } from "./plugin";
export declare enum CoreElementKind {
    Node = 0,
    Edge = 1,
    Graph = 2,
}
export declare class CoreElement {
    readonly type: ObjectType;
    readonly kind: CoreElementKind;
    data: {
        [a: string]: any;
    };
    constructor(type: ObjectType, kind: CoreElementKind);
}
export declare type SerialJSO = {
    format: string;
    kind: string;
    version: string;
    elements: {
        kind: string;
        type: string;
        data: any;
    }[];
};
export declare class CoreModel {
    private plugin;
    elements: CoreElement[];
    constructor(plugin: Plugin, pojo: SerialJSO);
    serialize(): SerialJSO;
}
