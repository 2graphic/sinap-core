import * as ts from "typescript";
import { Plugin } from "./plugin";
export declare function loadPlugin(pluginLocation: string): Plugin;
export declare function printDiagnostics(results: ts.EmitResult): void;
