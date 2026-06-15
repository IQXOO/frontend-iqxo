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
 *   window.location.href = 'iqxo://auth#...' to bring the user back to the app.
 *   This is more reliable than redirecting directly to iqxo:// from Supabase.
 *
 * - In the web browser (normal) → redirect to website.com/home (unchanged).
 */
export function buildOAuthRedirectUrl(): string {
  if (typeof window !== "undefined" && (window as any).isNativeApp) {
    // Pass iqxo_app=1 so the website knows to redirect back to the native app
    return buildAppUrl("/home?iqxo_app=1");
  }
  return buildAppUrl("/home");
}
