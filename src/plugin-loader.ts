import { readFile } from "./files";
import * as path from "path";
import { Plugin } from "./plugin";

const pluginFileKey = "plugin-file";
const pluginKindKey = "kind";
const pluginLoaderKey = "loader";

function nullPromise<T>(obj: T, name: string): Promise<T> {
    return obj ? Promise.resolve(obj) : Promise.reject(`${name} may not be null.`);
}

export class PluginInfo {
    constructor(readonly interpreterInfo: InterpreterInfo, readonly pluginKind: string[], readonly description: string) {
    }
}

export class InterpreterInfo {
    constructor(readonly interpreter: string, readonly loader: string, readonly directory: string) {
    }
}

export interface PluginLoader {
    load(pluginInfo: PluginInfo): Promise<Plugin>;
    name: string;
}

export function getInterpreterInfo(directory: string): Promise<PluginInfo> {
    return readFile(path.join(directory, "package.json"))
        .then((contents): Promise<PluginInfo> => {
            const pack = JSON.parse(contents);
            const description = pack.description ? pack.description : "No plugin description provided.";
            return nullPromise(pack.sinap, "sinap").then((sinapJson) => {
                const filePromise = nullPromise(sinapJson[pluginFileKey], `sinap.${pluginFileKey}`);
                const pluginKind = nullPromise(sinapJson[pluginKindKey], `sinap.${pluginKindKey}`);
                const loader = nullPromise(sinapJson[pluginLoaderKey], `sinap.${pluginLoaderKey}`);
                return Promise.all([filePromise, pluginKind, loader]);
            })
                .then(([pluginFile, pluginKind, pluginLoader]): PluginInfo => {
                    const interp = new InterpreterInfo(path.join(directory, pluginFile), pluginLoader, directory);
                    return new PluginInfo(interp, pluginKind, description);
                });
        });
}
