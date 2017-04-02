import * as ts from "typescript";
import { CompilationResult } from ".";
import { readFile } from "./files";
import * as path from "path";
import * as fs from "fs";
import { Plugin } from "./plugin";

const pluginFileKey = "plugin-file";
const pluginKindKey = "kind";

const options: ts.CompilerOptions = {
    noEmitOnError: false,

    noImplicitAny: true,
    target: ts.ScriptTarget.ES2016,
    removeComments: false,
    module: ts.ModuleKind.AMD,
    outFile: "result.js",
};

function nullPromise<T>(obj: T, name: string): Promise<T> {
    return obj ? Promise.resolve(obj) : Promise.reject(`${name} may not be null.`);
}

class InterpreterInfo {
    constructor(readonly interp: string, readonly pluginKind: string[], readonly description: string, readonly directory: string) {
    }
}

export function loadPluginDir(directory: string): Promise<Plugin> {
    return getInterpreterInfo(directory).then((interpreterInfo) => loadPlugin(interpreterInfo));
}

function getInterpreterInfo(directory: string): Promise<InterpreterInfo> {
    return readFile(path.join(directory, "package.json"))
        .then((contents): Promise<InterpreterInfo> => {
            const pack = JSON.parse(contents);
            const description = pack.description ? pack.description : "No plugin description provided.";
            return nullPromise(pack.sinap, "sinap").then((sinapJson) => {
                const filePromise = nullPromise(sinapJson[pluginFileKey], `sinap.${pluginFileKey}`);
                const pluginKind = nullPromise(sinapJson[pluginKindKey], `sinap.${pluginKindKey}`);
                return Promise.all([filePromise, pluginKind]);
            })
                .then(([pluginFile, pluginKind]): InterpreterInfo => {
                    return new InterpreterInfo(path.join(directory, pluginFile), pluginKind, description, directory);
                });
        });
}

/**
 * An abstract representation of a plugin
 */
function loadPlugin(pluginInfo: InterpreterInfo): Promise<Plugin> {
    const pluginLocation = pluginInfo.interp;
    let script: string | undefined = undefined;
    const pluginStub = require("!!raw-loader!../sinap-includes/plugin-stub.ts");
    const pluginProgram = require("!!raw-loader!../sinap-includes/plugin-program.ts");
    function emitter(_: string, content: string): void {
        // TODO: actually use AMD for cicular dependencies
        script = require("!!raw-loader!../sinap-includes/amd-loader.js") + "\n" + content;
    }
    return readFile(pluginLocation).then((pluginScript) => {
        const host = createCompilerHost(new Map([
            ["plugin.ts", pluginScript],
            ["plugin-stub.ts", pluginStub],
            ["plugin-program.ts", pluginProgram],
        ]), options, emitter);

        const program = ts.createProgram(["plugin-stub.ts"], options, host);
        // TODO: only compute if asked for.
        const results = {
            global: program.getGlobalDiagnostics(),
            syntactic: program.getSyntacticDiagnostics(),
            semantic: program.getSemanticDiagnostics(),
        };
        program.emit();
        if (script === undefined) {
            throw Error("failed to emit");
        }
        const compInfo = new CompilationResult(script, results);
        return new Plugin(program, compInfo, pluginInfo.pluginKind, pluginInfo.description, pluginInfo.directory);
    });
}

export function printDiagnostics(diagnostics: ts.Diagnostic[]) {
    for (const result of diagnostics) {
        console.log();
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

function createCompilerHost(files: Map<string, string>, options: ts.CompilerOptions, emit: (name: string, content: string) => void): ts.CompilerHost {
    return {
        getSourceFile: (fileName): ts.SourceFile => {
            let source = files.get(fileName);
            if (!source) {
                // if we didn't bundle the source file, maybe it's a lib?
                if (fileName.indexOf("/") !== -1) {
                    throw Error("no relative/absolute paths here");
                }
                source = fs.readFileSync(path.join("node_modules", "typescript", "lib", fileName), "utf8");
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
            return files.has(fileName);
        },
        readFile: () => "",
        directoryExists: () => true,
        getDirectories: () => []
    };
}
