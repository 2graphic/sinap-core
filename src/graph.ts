import { ObjectType } from "./types";

export class CoreElement {
    constructor(public type: ObjectType) {
    }

    serialize(): any {

    }
}

export class CoreNode extends CoreElement {
}

export class CoreEdge extends CoreElement {
}

export class CoreGraph extends CoreElement {
    nodes: CoreNode[];
    edges: CoreEdge[];
}
