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
