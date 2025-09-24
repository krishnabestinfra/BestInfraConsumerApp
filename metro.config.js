// metro.config.js
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Configure SVG support
config.resolver.assetExts = config.resolver.assetExts.filter(
  (ext) => ext !== "svg"
);
config.resolver.sourceExts.push("svg");

config.transformer.babelTransformerPath = require.resolve(
  "react-native-svg-transformer"
);

// Configure SVG transformer to handle namespaces
config.transformer.svgrConfig = {
  throwIfNamespace: false,
  svgProps: {
    width: "100%",
    height: "100%",
  },
};

// Fix for Metro version compatibility
config.resolver.platforms = ["ios", "android", "native", "web"];

module.exports = config;
