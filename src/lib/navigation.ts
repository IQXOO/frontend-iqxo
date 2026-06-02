let routerNavigate: ((to: string, options?: { replace?: boolean }) => void) | null = null;

export function setRouterNavigate(fn: (to: string, options?: { replace?: boolean }) => void) {
  routerNavigate = fn;
}

export function navigateToPath(pathname: string, options?: { replace?: boolean }) {
  if (routerNavigate) {
    try {
      routerNavigate(pathname, options);
      return;
    } catch (e) {
      // fallthrough to history fallback
    }
  }

  if (typeof window === "undefined") return;

  if (options?.replace) {
    window.history.replaceState(window.history.state, "", pathname);
  } else {
    window.history.pushState(window.history.state, "", pathname);
  }

  window.dispatchEvent(new PopStateEvent("popstate"));
}

