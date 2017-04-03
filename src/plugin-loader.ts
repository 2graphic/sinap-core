import { File, FileService, readAsJson, Directory, Plugin } from ".";

const pluginFileKey: "plugin-file" = "plugin-file";
const pluginKindKey: "kind" = "kind";
const descriptionKey = "description";

function nullPromise<T>(obj: T, name: string): Promise<T> {
    return obj ? Promise.resolve(obj) : Promise.reject(`${name} may not be null.`);
}

export class InterpreterInfo {
    constructor(readonly interp: File, readonly pluginKind: string[], readonly description: string, readonly directory: Directory, readonly loader: string) {
    }
}

export interface PluginLoader {
    loadPlugin(pluginInfo: InterpreterInfo, fileService: FileService): Promise<Plugin>;
}

export class PluginLoaderManager {
    loaders = new Map<string, PluginLoader>();

    loadPlugin(directory: Directory, fileService: FileService): Promise<Plugin> {
        return getInterpreterInfo(directory).then((interpreterInfo) => {
            const loader = this.loaders.get(interpreterInfo.loader);
            if (!loader) {
                throw new Error(`loader: ${interpreterInfo.loader} is not recognized`);
            }
            return loader.loadPlugin(interpreterInfo, fileService);
        });
    }
}

function getInterpreterInfo(directory: Directory): Promise<InterpreterInfo> {
    return directory.getFiles().then((pluginFiles: File[]): Promise<InterpreterInfo> => {
        const fileArr: [string, File][] = pluginFiles.map((file): [string, File] => [file.name, file]);
        const fileMap = new Map(fileArr);
        // TODO run npm install.
        return nullPromise(fileMap.get("package.json"), `package.json for plugin ${directory.fullName}`)
            .then((npmFile: File): Promise<InterpreterInfo> => {
                return readAsJson(npmFile).then<any>((pluginJson): Promise<InterpreterInfo> => nullPromise(pluginJson.sinap, "sinap"))
                    .then((sinapJson) => {
                        let description = sinapJson[descriptionKey];
                        description = description ? description : 'No plugin description provided.';
                        const filePromise = nullPromise(sinapJson[pluginFileKey], `sinap.${pluginFileKey}`);
                        const pluginKind = nullPromise(sinapJson[pluginKindKey], `sinap.${pluginKindKey}`);
                        return Promise.all([filePromise, pluginKind, Promise.resolve(description)]);
                    })
                    .then(([pluginName, pluginKind, description]) => {
                        return nullPromise(fileMap.get(pluginName), pluginName)
                            .then((pluginFile: File) => new InterpreterInfo(pluginFile, pluginKind, description, directory, "typescript"));
                    });
            });
    });
}