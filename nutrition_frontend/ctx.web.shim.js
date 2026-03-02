/**
 * Shim for expo-router/_ctx.web.js. Uses __EXPO_ROUTER_APP_ABSOLUTE__ (injected by
 * webpack DefinePlugin) so require.context resolves correctly.
 */
/* global __EXPO_ROUTER_APP_ABSOLUTE__ */
export const ctx = require.context(
  __EXPO_ROUTER_APP_ABSOLUTE__,
  true,
  /^(?:\.\/)(?!(?:(?:(?:.*\+api)|(?:\+middleware)|(?:\+(html|native-intent))))\.[tj]sx?$).*(?:\.android|\.ios|\.native)?\.[tj]sx?$/
);
