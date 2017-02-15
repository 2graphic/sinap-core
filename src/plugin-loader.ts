import * as ts from "typescript";
import * as fs from "fs";

import { Plugin } from "./plugin";

const options: ts.CompilerOptions = {
    noEmitOnError: false,

    noImplicitAny: true,
    target: ts.ScriptTarget.ES2016,
    removeComments: false,
    module: ts.ModuleKind.AMD,
    outFile: "result.js",
};

/**
 * An abstract representation of a plugin 
 */
export function loadPlugin(pluginLocation: string) {
    let script: string | undefined = undefined;
    const host = createCompilerHost(new Map([
        ["plugin.ts", fs.readFileSync(pluginLocation, "utf-8")],
        ["plugin-stub.ts", require("!!raw-loader!../sinap-includes/plugin-stub.ts")],
    ]), options, (_, content) => {
        // TODO: actually use AMD for cicular dependencies
        script = require("!!raw-loader!../sinap-includes/amd-loader.js") + "\n" + content;
    });

    const program = ts.createProgram(["plugin-stub.ts"], options, host);
    // TODO: only compute if asked for.
    const results = {
        global: program.getGlobalDiagnostics(),
        syntactic: program.getSyntacticDiagnostics(),
        semantic: program.getSemanticDiagnostics(),
    }
    program.emit();
    if (script === undefined) {
        throw "failed to emit";
    }
    return new Plugin(program, { diagnostics: results, js: script });
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

function createCompilerHost(files: Map<string, string>, options: ts.CompilerOptions, emit: (name: string, content: string) => void): ts.CompilerHost {
    return {
        getSourceFile: (fileName) => {
            let source = files.get(fileName);
            if (!source) {
                // if we didn't bundle the source file, maybe it's a lib? 
                if (fileName.indexOf("/") !== -1) {
                    throw "no relative/absolute paths here";
                }
                source = fs.readFileSync("node_modules/typescript/lib/" + fileName, "utf-8");
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
