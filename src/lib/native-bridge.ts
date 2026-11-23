/**
 * Native Bridge Helper for IQXO Mobile Wrapper
 * Handles bulletproof detection and messaging to the React Native host app.
 */

export function isIQXONativeApp(): boolean {
  if (typeof window === "undefined") return false;
  const win = window as any;

  if (
    win.__IQXO_IS_NATIVE === true ||
    win.isNativeApp === true ||
    Boolean(win.ReactNativeWebView) ||
    typeof win.__IQXO_postMessage === "function" ||
    Boolean(win.webkit?.messageHandlers?.ReactNativeWebView)
  ) {
    return true;
  }

  if (typeof navigator !== "undefined" && navigator.userAgent) {
    if (/IQXONativeApp|ReactNativeWebView/i.test(navigator.userAgent)) {
      return true;
    }
  }

  if (typeof window.location !== "undefined" && window.location.search) {
    if (window.location.search.includes("isNative=true")) {
      return true;
    }
  }

  return false;
}

export function postToNativeBridge(msg: Record<string, unknown>): boolean {
  if (typeof window === "undefined") return false;
  const win = window as any;
  const payloadStr = typeof msg === "string" ? msg : JSON.stringify(msg);

  // 1. Try __IQXO_postMessage shim
  if (typeof win.__IQXO_postMessage === "function") {
    try {
      win.__IQXO_postMessage(payloadStr);
      return true;
    } catch (_) {}
  }

  // 2. Try standard react-native-webview bridge
  if (win.ReactNativeWebView && typeof win.ReactNativeWebView.postMessage === "function") {
    try {
      win.ReactNativeWebView.postMessage(payloadStr);
      return true;
    } catch (_) {}
  }

  // 3. Try direct iOS WebKit messageHandler (instantiated natively on iOS WKWebView)
  if (
    win.webkit &&
    win.webkit.messageHandlers &&
    win.webkit.messageHandlers.ReactNativeWebView &&
    typeof win.webkit.messageHandlers.ReactNativeWebView.postMessage === "function"
  ) {
    try {
      win.webkit.messageHandlers.ReactNativeWebView.postMessage(payloadStr);
      return true;
    } catch (_) {}
  }

  return false;
}

export function shareViaNativeBridge(payload: {
  title?: string;
  message?: string;
  text?: string;
  url?: string;
}): boolean {
  if (!isIQXONativeApp()) return false;

  const msg = payload.message || payload.text || "";
  const title = payload.title || "IQXO";
  const url = payload.url || "https://iqxo.ai";

  const sent = postToNativeBridge({
    type: "share",
    title,
    message: msg,
    text: msg,
    url,
  });

  // Always return true if we are in the native app so that callers NEVER
  // fall through to WebKit's navigator.share() which spawns a broken popover.
  return true;
}

export function openExternalNative(url: string): boolean {
  if (!isIQXONativeApp()) {
    if (typeof window !== "undefined") {
      window.open(url, "_blank");
    }
    return false;
  }

  postToNativeBridge({
    type: "openExternal",
    url,
  });
  return true;
}

// Auto-shim navigator.share if running inside the IQXO native app wrapper
// This completely prevents WebKit's WKShareSheet from ever being invoked.
if (typeof window !== "undefined") {
  try {
    if (isIQXONativeApp() && typeof navigator !== "undefined") {
      const shim = (data: any) => {
        shareViaNativeBridge({
          title: data?.title,
          message: data?.text || data?.title || "",
          text: data?.text,
          url: data?.url,
        });
        return Promise.resolve();
      };
      try {
        (navigator as any).share = shim;
      } catch (_) {}
      try {
        if (typeof Navigator !== "undefined" && Navigator.prototype) {
          Object.defineProperty(Navigator.prototype, "share", {
            value: shim,
            configurable: true,
            writable: true,
          });
        }
      } catch (_) {}
    }
  } catch (_) {}
}

