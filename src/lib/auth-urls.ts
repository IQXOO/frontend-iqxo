export function getAppBaseUrl(): string {
  const configuredBaseUrl =
    import.meta.env.VITE_APP_URL || import.meta.env.VITE_SITE_URL;

  if (configuredBaseUrl && configuredBaseUrl.trim()) {
    return configuredBaseUrl.replace(/\/+$/, "");
  }

  return window.location.origin;
}

export function buildAppUrl(pathname: string): string {
  return new URL(pathname, getAppBaseUrl()).toString();
}

/**
 * Builds the OAuth redirectTo URL.
 *
 * Strategy:
 * - In the native WebView app  → redirect to website.com/home?iqxo_app=1
 *   The website detects this flag and the access_token in the hash, then does
 *   window.location.href = 'com.iqxo.app://auth#...' to bring user back to app.
 *   Uses com.iqxo.app:// scheme which is registered in AndroidManifest.xml.
 *
 * - In the web browser (normal) → redirect to website.com/home (unchanged).
 */
export function buildOAuthRedirectUrl(): string {
  if (typeof window !== "undefined" && (window as Window & { isNativeApp?: unknown }).isNativeApp) {
    // Pass iqxo_app=1 so the website knows to redirect back to the native app
    return buildAppUrl("/home?iqxo_app=1");
  }
  return buildAppUrl("/home");
}

export function getDeepLinkUrl(hash: string): string {
  if (typeof window === "undefined") return "";

  const ua = navigator.userAgent || "";
  const isAndroid = /Android/i.test(ua);
  
  // Clean hash to avoid double `#`
  const cleanHash = hash ? (hash.startsWith("#") ? hash.substring(1) : hash) : "";
  
  if (isAndroid) {
    // Android Chrome requires intent:// to launch reliably and handle fallbacks to Google Play gracefully
    return `intent://auth#${cleanHash}#Intent;scheme=iqxo;package=com.iqxo.app;end;`;
  } else {
    // iOS and other platforms work best with the simple scheme iqxo:// 
    return `iqxo://auth#${cleanHash}`;
  }
}

export function launchAppWithFallback(hash: string, iosFallbackUrl?: string) {
  if (typeof window === "undefined") return;

  const url = getDeepLinkUrl(hash);
  const ua = navigator.userAgent || "";
  const isAndroid = /Android/i.test(ua);
  const isIos = /iPhone|iPad|iPod/i.test(ua);

  // App Store URL for iOS (User can update this with the real App Store URL later)
  const appStoreLink = iosFallbackUrl || "https://apps.apple.com/app/6785537974"; 

  if (isAndroid) {
    // Android Intent automatically handles the fallback to Play Store via package=com.iqxo.app
    window.location.href = url;
  } else if (isIos) {
    // iOS doesn't have a built-in fallback for custom schemes.
    // We try to open the app via the scheme.
    window.location.href = url;
    
    // Set a timeout. If the app is installed, the system switches to it and the browser goes to background.
    // If it's not installed, the browser stays active, and after 2.5 seconds we redirect to the App Store.
    setTimeout(() => {
      if (document.visibilityState === 'visible') {
        window.location.href = appStoreLink;
      }
    }, 2500);
  } else {
    // Fallback for desktop or other platforms
    window.location.href = url;
  }
}
