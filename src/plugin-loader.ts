import { readFile } from "./files";
import * as path from "path";
import { Plugin } from "./plugin";

const pluginFileKey = "plugin-file";
const pluginKindKey = "kind";
const pluginLoaderKey = "loader";

export class PluginInfo {
    public readonly interpreterInfo: InterpreterInfo;
    constructor(public readonly packageJson: any, directory: string) {
        const sinap = packageJson.sinap;
        const file = path.join(directory, sinap[pluginFileKey]);
        this.interpreterInfo = new InterpreterInfo(file, sinap[pluginLoaderKey], directory);
    }

    get pluginKind(): string[] {
        return this.packageJson.sinap[pluginKindKey];
    }

    get description(): string {
        return this.packageJson.description;
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

export async function getPluginInfo(directory: string): Promise<PluginInfo> {
    const json = JSON.parse(await readFile(path.join(directory, "package.json")));
    return new PluginInfo(json, directory);
}
