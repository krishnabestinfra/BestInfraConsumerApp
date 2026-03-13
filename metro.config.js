// metro.config.js
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Alias for ScaledText - enables font scaling across the app
const scaledTextPath = path.resolve(__dirname, "src/components/global/ScaledText.js");
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "@components/global/Text" || moduleName === "@components/global/ScaledText") {
    return { filePath: scaledTextPath, type: "sourceFile" };
  }
  return originalResolveRequest
    ? originalResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

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

// Avoid "Got unexpected undefined" when resolving modules (e.g. after moving files)
config.resolver.unstable_enablePackageExports = false;

// Ensure proper bundle generation
config.serializer = {
  ...config.serializer,
  getModulesRunBeforeMainModule: () => [
    require.resolve('react-native/Libraries/Core/InitializeCore'),
  ],
};

// Fix for bundle generation issues
config.transformer = {
  ...config.transformer,
  minifierConfig: {
    keep_fnames: true,
    mangle: {
      keep_fnames: true,
    },
  },
};

module.exports = config;
