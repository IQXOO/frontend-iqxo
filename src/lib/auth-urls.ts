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
 * - When running inside the native WebView app (window.isNativeApp === true),
 *   returns the iqxo:// deep-link scheme so that after Google auth the OS
 *   hands control back to the app automatically.
 */
export function buildOAuthRedirectUrl(): string {
  if (typeof window !== "undefined" && (window as any).isNativeApp) {
    // iqxo://auth is registered in Supabase → Authentication → URL Configuration
    return "iqxo://auth";
  }
  return buildAppUrl("/home");
}
