var nodeExternals = require('webpack-node-externals');
var merge = require("webpack-merge");

var baseConfig = {
  externals: [nodeExternals()],
  resolve: {
    // Add `.ts` and `.tsx` as a resolvable extension.
    extensions: ['.ts', '.tsx', '.js'] // note if using webpack 1 you'd also need a '' in the array as well
  },
  devtool: 'source-map',
  module: {
    rules: [
      { test: /\.ts$/, loader: 'ts-loader'}
    ]
  }
};

module.exports = [merge(baseConfig, {
  entry: "./src/index.ts",
  output: {
    filename: './lib/index.js'
  }
}), merge(baseConfig, {
  entry: "./tests/index.ts",
  output: {
    filename: './tests/build/index.js',
    devtoolModuleFilenameTemplate: '[absolute-resource-path]',
    devtoolFallbackModuleFilenameTemplate: '[absolute-resource-path]?[hash]',
  },
})];