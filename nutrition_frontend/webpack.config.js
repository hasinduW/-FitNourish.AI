const path = require("path");
const webpack = require("webpack");
const createExpoWebpackConfigAsync = require("@expo/webpack-config");

const shimsDir = path.join(__dirname, "webpack-expo-dom-shims");
const ctxShim = path.join(__dirname, "ctx.web.shim.js");
const appAbsolute = path.join(__dirname, "app");

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);
  config.resolve = config.resolve || {};
  config.resolve.alias = config.resolve.alias || {};
  // Expo SDK 49 has no expo/dom; use directory shims.
  config.resolve.alias["expo/dom"] = path.join(shimsDir, "dom");
  config.resolve.alias["expo/dom/global"] = path.join(shimsDir, "dom", "global.js");
  config.plugins = config.plugins || [];
  config.plugins.push(
    new webpack.DefinePlugin({
      __EXPO_ROUTER_APP_ABSOLUTE__: JSON.stringify(appAbsolute),
    })
  );
  config.plugins.push(
    new webpack.NormalModuleReplacementPlugin(
      /[\\/]expo-router[\\/]_ctx\.web\.js$/,
      ctxShim
    )
  );
  return config;
};
