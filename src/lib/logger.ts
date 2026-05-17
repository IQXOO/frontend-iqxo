type Loggable = Record<string, unknown>;

const REDACTED = "[REDACTED]";
const SENSITIVE_KEY = /^(authorization|token|access_token|refresh_token|password|secret|apiKey|apikey|jwt)$/i;
const SENSITIVE_STRING = /(Bearer\s+[A-Za-z0-9._-]+|eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/g;

let requestCounter = 0;

function isVerboseLoggingEnabled(): boolean {
  return Boolean(import.meta.env.DEV || import.meta.env.VITE_DEBUG_LOGS === "true");
}

function createRequestId(scope: string): string {
  requestCounter = (requestCounter + 1) % Number.MAX_SAFE_INTEGER;
  return `${scope}-${Date.now().toString(36)}-${requestCounter.toString(36)}`;
}

function redactString(value: string): string {
  if (!value) return value;
  return value.replace(SENSITIVE_STRING, REDACTED);
}

function redactValue(value: unknown, depth = 0): unknown {
  if (value == null) return value;
  if (typeof value === "string") return redactString(value);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "function") return "[Function]";
  if (typeof value !== "object") return value;
  if (depth >= 2) return Array.isArray(value) ? "[Array]" : "[Object]";

  if (value instanceof Error) {
    return serializeError(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item, depth + 1));
  }

  const output: Loggable = {};
  for (const [key, item] of Object.entries(value as Loggable)) {
    output[key] = SENSITIVE_KEY.test(key) ? REDACTED : redactValue(item, depth + 1);
  }
  return output;
}

export function serializeError(error: unknown): Loggable {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: redactString(error.message),
      stack: error.stack,
    };
  }

  return {
    message: typeof error === "string" ? redactString(error) : "Unknown error",
    value: redactValue(error),
  };
}

export function getFriendlyErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  if (error instanceof DOMException && error.name === "AbortError") {
    return "The request took too long. Please try again.";
  }

  if (error instanceof TypeError && /fetch/i.test(error.message)) {
    return "We couldn't reach the server. Please check your internet connection and try again.";
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes("401") || message.includes("unauthorized") || message.includes("session")) {
      return "Your session may have expired. Please log in again.";
    }
    if (message.includes("403") || message.includes("forbidden") || message.includes("rls")) {
      return "You don’t have access to that item. Please refresh and try again.";
    }
    if (message.includes("404")) {
      return "That item could not be found. Please refresh and try again.";
    }
    if (message.includes("timeout")) {
      return "The request took too long. Please try again.";
    }
    if (message.trim()) {
      return message;
    }
  }

  return fallback;
}

export function devLog(scope: string, message: string, context?: Loggable): void {
  if (!isVerboseLoggingEnabled()) return;
  if (context) {
    console.info(`[${scope}] ${message}`, redactValue(context));
    return;
  }
  console.info(`[${scope}] ${message}`);
}

export function devWarn(scope: string, message: string, context?: Loggable): void {
  if (context) {
    console.warn(`[${scope}] ${message}`, redactValue(context));
    return;
  }
  console.warn(`[${scope}] ${message}`);
}

export function devError(scope: string, message: string, error?: unknown, context?: Loggable): void {
  console.error(`[${scope}] ${message}`, {
    ...serializeError(error),
    ...(context ? redactValue(context) : {}),
  });
}

export function logApiRequest(
  scope: string,
  requestId: string,
  details: { method: string; label: string; context?: Loggable },
): void {
  const payload = {
    requestId,
    method: details.method,
    label: details.label,
    ...(details.context ? redactValue(details.context) : {}),
  };
  if (isVerboseLoggingEnabled()) {
    console.groupCollapsed(`[${scope}] ${requestId} ${details.method} ${details.label} started`);
    console.info(payload);
    console.groupEnd();
    return;
  }
  console.info(`[${scope}] ${requestId} ${details.method} ${details.label} started`, payload);
}

export function logApiResponse(
  scope: string,
  requestId: string,
  details: { method: string; label: string; status?: number; elapsedMs: number; context?: Loggable },
): void {
  const payload = {
    requestId,
    method: details.method,
    label: details.label,
    status: details.status,
    elapsedMs: details.elapsedMs,
    ...(details.context ? redactValue(details.context) : {}),
  };
  if (isVerboseLoggingEnabled()) {
    console.groupCollapsed(`[${scope}] ${requestId} ${details.method} ${details.label} completed`);
    console.info(payload);
    console.groupEnd();
    return;
  }
  console.info(`[${scope}] ${requestId} ${details.method} ${details.label} completed`, payload);
}

export function logApiFailure(
  scope: string,
  requestId: string,
  details: {
    method: string;
    label: string;
    elapsedMs: number;
    error: unknown;
    status?: number;
    context?: Loggable;
  },
): void {
  console.error(`[${scope}] ${requestId} ${details.method} ${details.label} failed`, {
    requestId,
    method: details.method,
    label: details.label,
    status: details.status,
    elapsedMs: details.elapsedMs,
    ...serializeError(details.error),
    ...(details.context ? redactValue(details.context) : {}),
  });
}

export async function withAsyncDiagnostics<T>(
  scope: string,
  label: string,
  operation: () => Promise<T>,
  options: {
    method?: string;
    context?: Loggable;
    timeoutMs?: number;
    onError?: (message: string, error: unknown) => void;
    onSuccess?: (value: T) => void;
    onFinally?: () => void;
  } = {},
): Promise<T> {
  const requestId = createRequestId(scope);
  const method = options.method || "ASYNC";
  const startedAt = Date.now();

  logApiRequest(scope, requestId, { method, label, context: options.context });

  const timeoutId =
    options.timeoutMs && Number.isFinite(options.timeoutMs)
      ? window.setTimeout(() => undefined, options.timeoutMs)
      : undefined;

  try {
    const value = await operation();
    logApiResponse(scope, requestId, {
      method,
      label,
      elapsedMs: Date.now() - startedAt,
      context: options.context,
    });
    options.onSuccess?.(value);
    return value;
  } catch (error) {
    logApiFailure(scope, requestId, {
      method,
      label,
      elapsedMs: Date.now() - startedAt,
      error,
      context: options.context,
    });
    options.onError?.(getFriendlyErrorMessage(error), error);
    throw error;
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
    options.onFinally?.();
  }
}

export async function readResponseText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

export async function fetchWithDiagnostics(
  scope: string,
  label: string,
  input: RequestInfo | URL,
  init: RequestInit = {},
  options: { timeoutMs?: number; context?: Loggable } = {},
): Promise<Response> {
  const method = (init.method || "GET").toUpperCase();
  const requestId = createRequestId(scope);
  const startedAt = Date.now();

  logApiRequest(scope, requestId, { method, label, context: options.context });

  const controller = options.timeoutMs ? new AbortController() : undefined;
  const timer = controller
    ? window.setTimeout(() => controller.abort(), options.timeoutMs)
    : undefined;

  try {
    const response = await fetch(input, {
      ...init,
      signal: init.signal ?? controller?.signal,
    });

    logApiResponse(scope, requestId, {
      method,
      label,
      status: response.status,
      elapsedMs: Date.now() - startedAt,
      context: options.context,
    });

    if (!response.ok) {
      logApiFailure(scope, requestId, {
        method,
        label,
        elapsedMs: Date.now() - startedAt,
        status: response.status,
        error: new Error(`Request failed with status ${response.status}`),
        context: options.context,
      });
    }

    return response;
  } catch (error) {
    const isAbort = error instanceof DOMException && error.name === "AbortError";
    if (isAbort) {
      devWarn(scope, `${method} ${label} timed out`, {
        requestId,
        timeoutMs: options.timeoutMs,
        ...(options.context ?? {}),
      });
    } else {
      logApiFailure(scope, requestId, {
        method,
        label,
        elapsedMs: Date.now() - startedAt,
        error,
        context: options.context,
      });
    }
    throw error;
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}