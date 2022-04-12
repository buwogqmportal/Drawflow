module.exports = {
  entry: "./src/drawflow.js",
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  output: {
    library: "Drawflow",
    libraryTarget: "umd",
    libraryExport: "default",
    filename: "drawflow.min.js",
    globalObject: `(typeof self !== 'undefined' ? self : this)`,
  },
};
