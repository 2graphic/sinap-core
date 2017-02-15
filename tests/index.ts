import { run as testValidation } from "./test-validation"
testValidation();

import { run as testIdealDfa } from "./test-ideal-dfa-interpreter";
testIdealDfa();

import { run as testPluginLoader } from "./test-plugin-loader";
testPluginLoader();

import { run as testCurrentDfa } from "./test-current-dfa-interpreter";
testCurrentDfa();

import { run as testCoreGraph } from "./test-core-graph";
testCoreGraph();

import { run as testSerialization } from "./test-serialization";
testSerialization();