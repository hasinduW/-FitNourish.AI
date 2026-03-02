/**
 * Shim for expo/dom/global (not in Expo SDK 49). No-op on web.
 */
export function addGlobalDomEventListener(_handler) {
  return function remove() {};
}
