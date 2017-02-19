import * as ts from "typescript";
import { File, FileService, readAsJson, Directory, Plugin, CompilationResult } from ".";

const pluginFileKey = 'plugin-file';
const pluginKindKey = 'kind'

const options: ts.CompilerOptions = {
    noEmitOnError: false,

    noImplicitAny: true,
    target: ts.ScriptTarget.ES2016,
    removeComments: false,
    module: ts.ModuleKind.AMD,
    outFile: "result.js",
};

function nullMultiple(object: any, ...attrChain: string[]): boolean {
    let current = object;
    for(const attr of attrChain) {
        if(!current || !current[attr]) {
            return false;
        } else {
            current = current[attr];
        }
    }

    return true;
}

class InterpreterInfo {
    constructor(readonly interp: File, readonly pluginKind: string[]) {
    }
}

export function loadPluginDir(directory: Directory, fileService: FileService): Promise<Plugin> {
    return getInterpreterInfo(directory).then((interpreterInfo) => loadPlugin(interpreterInfo, fileService));
}

function getInterpreterInfo(directory: Directory): Promise<InterpreterInfo> {
    return directory.getFiles().then((pluginFiles: File[]): Promise<InterpreterInfo> => {
        const fileArr: [string, File][] = pluginFiles.map((file): [string, File] => [file.name, file]);
        const fileMap = new Map(fileArr);
        // TODO run npm install.
        const npmFile = fileMap.get('package.json');
        if (npmFile) {
            return readAsJson(npmFile).then((pluginJson) => {
                if (nullMultiple(pluginJson, 'sinap', pluginFileKey) && pluginJson.sinap[pluginKindKey]) {
                    const pluginName: string = pluginJson.sinap[pluginFileKey];
                    const pluginKind: string[] = pluginJson.sinap[pluginKindKey];
                    const pluginFile = fileMap.get(pluginName);
                    if (pluginFile) {
                        return new InterpreterInfo(pluginFile, pluginKind)
                    } else {
                        return Promise.reject(`Could not find plugin interpreter at ${pluginName}`);
                    }
                } else {
                    return Promise.reject(`package.json for ${directory.name} does not conform to schema.`);
                }
            });
        } else {
            return Promise.reject(`Could not find a package.json for ${directory.name}`);
        }
    });
}

/**
 * An abstract representation of a plugin 
 */
function loadPlugin(pluginInfo: InterpreterInfo, fileService: FileService): Promise<Plugin> {
    const pluginLocation = pluginInfo.interp;
    let script: string | undefined = undefined;
    const pluginStub = require("!!raw-loader!../sinap-includes/plugin-stub.ts");
    function emitter(_: string, content: string): void {
        // TODO: actually use AMD for cicular dependencies
        script = require("!!raw-loader!../sinap-includes/amd-loader.js") + "\n" + content;
    }
    return pluginLocation.readData().then((pluginScript) => {
        const host = createCompilerHost(new Map([
            ["plugin.ts", pluginScript],
            ["plugin-stub.ts", pluginStub],
        ]), options, emitter, fileService);

        const program = ts.createProgram(["plugin-stub.ts"], options, host);
        // TODO: only compute if asked for.
        const results = {
            global: program.getGlobalDiagnostics(),
            syntactic: program.getSyntacticDiagnostics(),
            semantic: program.getSemanticDiagnostics(),
        };
        program.emit();
        if (script === undefined) {
            throw Error("failed to emit");;
        }
        const compInfo = new CompilationResult(script, results);
        return new Plugin(program, compInfo, pluginInfo.pluginKind);
    });
}

export function printDiagnostics(diagnostics: ts.Diagnostic[]) {
    for (const result of diagnostics) {
        console.log()
        if (result.file) {
            const { line, character } = result.file.getLineAndCharacterOfPosition(result.start);
            const starts = result.file.getLineStarts();
            console.log(result.file.fileName, line.toString() + ", " + character.toString() + ":", result.messageText);
            console.log(result.file.text.substring(starts[line], starts[line + 1] - 1).replace("\t", " "));
            let pad = "";
            for (let i = 0; i < character; i++) {
                pad += " ";
            }
            for (let i = 0; i < result.length; i++) {
                pad += "~";
            }
            console.log(pad);
        } else {
            console.log("unknown file:", result.messageText);
        }
    }
}

function createCompilerHost(files: Map<string, string>, options: ts.CompilerOptions, emit: (name: string, content: string) => void, fileService: FileService): ts.CompilerHost {
    return {
        getSourceFile: (fileName): ts.SourceFile => {
            let source = files.get(fileName);
            if (!source) {
                // if we didn't bundle the source file, maybe it's a lib? 
                if (fileName.indexOf("/") !== -1) {
                    throw Error("no relative/absolute paths here");;
                }
                source = fileService.getModuleFile(fileService.joinPath("typescript", "lib", fileName));
            }

            // any to suppress strict error about undefined
            return source ?
                ts.createSourceFile(fileName, source, options.target ? options.target : ts.ScriptTarget.ES2016)
                : undefined as any;
        },
        writeFile: (name, text) => {
            emit(name, text);
        },
        getDefaultLibFileName: () => {
            return "lib.es2016.d.ts";
        },
        useCaseSensitiveFileNames: () => false,
        getCanonicalFileName: fileName => fileName,
        getCurrentDirectory: () => "",
        getNewLine: () => "\n",
        fileExists: (fileName): boolean => {
            return files.has(fileName)
        },
        readFile: () => "",
        directoryExists: () => true,
        getDirectories: () => []
    };
}
