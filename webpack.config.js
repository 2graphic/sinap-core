var nodeExternals = require('webpack-node-externals');
var merge = require("webpack-merge");
var glob = require("glob");

var baseConfig = {
  externals: [nodeExternals()],
  resolve: {
    // Add `.ts` and `.tsx` as a resolvable extension.
    extensions: ['.ts', '.tsx', '.js'] // note if using webpack 1 you'd also need a '' in the array as well
  },
  devtool: 'source-map',
  target: 'node',
  module: {
    rules: [
      { test: /\.ts$/, loader: 'ts-loader'}
    ]
  }
};

module.exports = [{
  entry: "./src/index.ts",
  output: {
    libraryTarget: 'umd',
    filename: './lib/index.js'
  }
}, {
  entry: glob.sync("./test/test-*.ts"),
  output: {
    filename: './test/build/index.js',
    devtoolModuleFilenameTemplate: '[absolute-resource-path]',
    devtoolFallbackModuleFilenameTemplate: '[absolute-resource-path]?[hash]',
  },
}].map(x=>merge(x, baseConfig));