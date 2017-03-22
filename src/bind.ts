import {
    CoreValue,
    TypeEnvironment,
    CoreObjectValue,
    CorePrimitiveValue,
    CoreUnionValue,
    CoreIntersectionValue,
    CoreArrayValue
} from ".";


/**
 * One way binding. Any changes to value will be propagated to json
 * @param value Value to bind to
 * @param json Object to be changed as value changes
 */
export function bind<T extends TypeEnvironment>(value: CoreObjectValue<T>, json: any) {
    Object.assign(json, value.jsonify(() => { return { result: false, value: undefined }; }));
    deepListen(value, (_, nv) => {
        Object.assign(json, nv);
    });
}

function recursivelyUnsetListener<T extends TypeEnvironment>(value: CoreValue<T>, listener: (v: CoreValue<T>, nv: any) => void) {
    if (value.listeners.has(listener)) {
        value.listeners.delete(listener);
        return;
    } else if (value instanceof CoreObjectValue) {
        for (const key of Object.getOwnPropertyNames(value.values)) {
            recursivelyUnsetListener(value.values[key], listener);
        }
    } else if (value instanceof CorePrimitiveValue) {
    } else if (value instanceof CoreUnionValue) {
        recursivelyUnsetListener(value.value, listener);
    } else if (value instanceof CoreArrayValue) {
        for (const val of value.values) {
            recursivelyUnsetListener(val, listener);
        }
    } else {
        throw new Error("Unknown core value type to unset");
    }
}

export function deepListen<T extends TypeEnvironment>(value: CoreValue<T>, listener: (v: CoreValue<T>, nv: any) => void) {
    if (value instanceof CoreObjectValue) {
        const ownedListeners = new Map<string, (v: CoreValue<T>, nv: any) => void>();
        function addListener(newObject: CoreValue<T>, key: string) {
            if (ownedListeners.has(key)) {
                recursivelyUnsetListener(value, ownedListeners.get(key)!);
            }
            const l = (_: CoreValue<T>, innerNV: any) => {
                listener(value, { [key]: innerNV });
            };
            ownedListeners.set(key, l);
            deepListen(newObject, l);
        }

        for (const key of value.type.members.keys()) {
            addListener(value.get(key), key);
        }

        value.listeners.add((_, nv) => {
            for (const innerValueKey of Object.getOwnPropertyNames(nv)) {
                listener(value, {
                    [innerValueKey]: (nv[innerValueKey] as CoreValue<T>)
                        .jsonify(() => { return { result: false, value: undefined }; }
                        )
                });
                addListener(nv[innerValueKey], innerValueKey);
            }
        }
        );
    } else if (value instanceof CorePrimitiveValue) {
        value.listeners.add(listener);
    } else if (value instanceof CoreUnionValue) {
        const ownedListener = (_: CoreValue<T>, nv: any) => {
            listener(value, nv);
        };
        deepListen(value.value, ownedListener);
        value.listeners.add((_, nv) => {
            recursivelyUnsetListener(value, ownedListener);
            deepListen(value.value, ownedListener);
            listener(value, nv.jsonify(() => { return { result: false, value: undefined }; }));
        });
    } else if (value instanceof CoreIntersectionValue) {
        for (const v of value.values.values()) {
            deepListen(v, (_, nv) => listener(value, nv));
        }
    } else if (value instanceof CoreArrayValue) {
        // TODO: track new elements to array
        // and removals from arrays
        for (const v of value.values) {
            deepListen(v, (_, nv) => listener(value, [nv]));
        }
    } else {
        throw new Error("Unknown object kind to bind to");
    }

}