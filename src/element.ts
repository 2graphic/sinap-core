import {
    Plugin,
    ObjectType,
    CoreIntersectionValue,
    PluginTypeEnvironment,
    FakeIntersectionType,
    CoreValue,
    MakeValue,
} from ".";
import * as assert from "assert";

export enum CoreElementKind { Node, Edge, Graph };

/**
 * Represents nodes, edges, and graphs.
 */
export class CoreElement extends CoreIntersectionValue<PluginTypeEnvironment> {
    constructor(readonly pluginType: ObjectType<PluginTypeEnvironment>, readonly kind: CoreElementKind, readonly uuid: string, data: any, initialValue: MakeValue<PluginTypeEnvironment>) {
        super(new FakeIntersectionType<PluginTypeEnvironment>(pluginType.env,
            new Set([pluginType, pluginType.env.lookupSinapType("Drawable" + CoreElementKind[kind])])), data, true, initialValue);
    }

    jsonify(a: (a: CoreValue<PluginTypeEnvironment>) => { value: any, result: boolean }) {
        return {
            kind: CoreElementKind[this.kind],
            type: this.pluginType.name,
            uuid: this.uuid,
            data: super.jsonify(a),
        };
    }
}

/**
 * The file format.
 */
export type SerialJSO = {
    format: string,
    kind: string[],
    version: string,
    elements: { kind: string, type: string, data: any, uuid: string }[],
};

export class FakePromise<T> {
    waiters: ((t: T) => void)[] = [];

    then(a: (t: T) => void) {
        this.waiters.push(a);
    }

    resolve = (t: T) => {
        for (const waiter of this.waiters) {
            waiter(t);
        }
    }
}

export class CoreModel {
    elements: Map<string, CoreElement>;

    /**
     * Create a new CoreModel. If `pojo` is provided, build the model from the
     * serial represnetation.
     *
     * Note that this modifies the pojo object given and once it is passed to this
     * constructor, it should not be reused.
     */
    constructor(private plugin: Plugin, pojo?: SerialJSO) {
        if (pojo === undefined) {
            this.elements = new Map();
            return;
        }

        assert.deepEqual(plugin.pluginKind, pojo.kind);

        if (pojo.format !== "sinap-file-format" || pojo.version !== "0.0.8") {
            throw Error("not a CoreModel");
        }

        const elementsPromises: [string, ((e: CoreElement) => void)][] = [];

        const transformer: MakeValue<PluginTypeEnvironment> = (t, a, mutable) => {
            if (a && a.kind === "sinap-pointer") {
                const prom = new FakePromise();
                elementsPromises.push([a.uuid, prom.resolve]);
                return prom;
            }
            return this.plugin.typeEnvironment.typeToValue(t, a, mutable, transformer);
        };

        const elementsList = pojo.elements.map((e) => {
            const kind: CoreElementKind = CoreElementKind[e.kind as any] as any;
            return new CoreElement(
                plugin.typeEnvironment.getElementType(kind, e.type),
                kind,
                e.uuid,
                e.data,
                transformer
            );
        });

        this.elements = new Map(elementsList.map(e => [e.uuid, e] as [string, CoreElement]));

        for (const [uuid, resolve] of elementsPromises) {
            resolve(this.elements.get(uuid)!);
        }
    }

    /**
     * Store a new element with this model
     */
    addElement(kind: CoreElementKind, type?: string) {
        const element = this.plugin.makeElement(kind, type);
        if (this.elements.has(element.uuid)) {
            throw new Error("Reused UUID");
        }
        this.elements.set(element.uuid, element);
        return element;
    }

    removeElement(element: CoreElement) {
        if (!this.elements.has(element.uuid)) {
            throw Error("element doesn't exist");
        }
        this.elements.delete(element.uuid);
    }

    /**
     * Generate an acyclic JS object which can be used to reconstruct this
     * model.
     */
    serialize(): SerialJSO {
        return {
            format: "sinap-file-format",
            kind: this.plugin.pluginKind,
            version: "0.0.8",
            elements: [...this.elements.values()].map((element) => element.jsonify((a) => {
                if (a instanceof CoreElement) {
                    if (!this.elements.has(a.uuid)) {
                        throw new Error(`somewhere in the graph is an element not in the model: ${a.uuid}`);
                    }
                    return {
                        result: true,
                        value: {
                            kind: "sinap-pointer",
                            uuid: a.uuid,
                        }
                    };
                }
                return { result: false, value: undefined };
            })),
        };
    }
}