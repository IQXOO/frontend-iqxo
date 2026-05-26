export function navigateToPath(pathname: string, options?: { replace?: boolean }) {
  if (typeof window === "undefined") return;

  if (options?.replace) {
    window.history.replaceState(window.history.state, "", pathname);
  } else {
    window.history.pushState(window.history.state, "", pathname);
  }

  window.dispatchEvent(new PopStateEvent("popstate"));
}
