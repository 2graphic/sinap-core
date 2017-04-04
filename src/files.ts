import * as fs from "fs";

export class NodePromise<T> {
    readonly promise: Promise<T>;
    readonly cb: (err: any, obj: T) => void;
    private _resolve: (res: T) => void;
    private _reject: (err: any) => void;

    constructor() {
        this.promise = new Promise<T>((resolve, reject) => {
            this._resolve = resolve;
            this._reject = reject;
        });

        this.cb = (err, obj) => {
            if (err) this._reject(err);
            else this._resolve(obj);
        };
    }
}

export function readdir(directory: string): Promise<string[]> {
    const result = new NodePromise<string[]>();
    fs.readdir(directory, result.cb);
    return result.promise;
}

export function readFile(file: string): Promise<string> {
    const result = new NodePromise<string>();
    fs.readFile(file, "utf8", result.cb);
    return result.promise;
}