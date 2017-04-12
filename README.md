# Introduction

In order to support arbitrary graph based languages, sinap uses plugins to determine how to execute a graph. These plugins can be written in a number of langauges (currently [TypeScript](https://www.github.com/2graphic/sinap-typescript-loader)).

## PluginLoaderManager

`PluginLoaderManager` is a class that manages various plugin loaders. For example, to load the TypeScript loader: 

```
const manager = new PluginLoaderManager();
manager.loaders.set("typescript", new TypescriptPluginLoader());
// ...
// TODO: Dyllon, update to reflect the new, non-directory-based API
manager.loadPlugin(directory, fs)
```

## Plugin Architecture
**TODO: Dyllon, describe the overall structure of an plugin, being a directory with some package.json**

## Model

`Model` is the class that manages Sinap's representation of a graph. 

```
// make a model of the default type
const q0 = model.makeNode();
// set an attribute
q0.set("label", Value.makePrimitive(model.environment, "q0"));
```

For more of a reference on how to use sinap `Values` (the thing that makeNode/Edge return) see [sinap-types](https://www.github.com/2graphic/sinap-types). For more examples of using the model see [test-model](src/test-model.ts).
