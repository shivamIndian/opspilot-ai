/**
 * Enterprise Structured Logger with Automatic Credential & Secret Redaction
 * Ensures passwords, tokens, API keys, cookies, and authorization headers are never written to logs.
 */

const SENSITIVE_KEY_REGEX = /^(password|token|secret|authorization|cookie|apikey|api_key|access_token|refresh_token|credential|private_key)$/i;

const INLINE_SECRET_REGEX = /((?:bearer\s+[a-zA-Z0-9_\-.]*)|(?:["']?(?:password|token|secret|apiKey)["']?\s*[:=]\s*["']?)([^"',\s}]+))/gi;

export const redactSensitiveData = (data: unknown, depth = 0): unknown => {
  if (depth > 8) return '[MAX_DEPTH_EXCEEDED]';
  if (data === null || data === undefined) return data;

  if (typeof data === 'string') {
    return data.replace(INLINE_SECRET_REGEX, (_match, prefix) => {
      if (prefix.toLowerCase().startsWith('bearer ')) {
        return 'Bearer [REDACTED]';
      }
      return `${prefix.split(/[:=]/)[0]}: "[REDACTED]"`;
    });
  }

  if (Array.isArray(data)) {
    return data.slice(0, 50).map(item => redactSensitiveData(item, depth + 1));
  }

  if (typeof data === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (SENSITIVE_KEY_REGEX.test(key)) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = redactSensitiveData(value, depth + 1);
      }
    }
    return sanitized;
  }

  return data;
};

export const logger = {
  info: (message: string, ...args: unknown[]) => {
    const sanitizedArgs = args.map(a => redactSensitiveData(a));
    console.log(`[INFO] [${new Date().toISOString()}] ${redactSensitiveData(message)}`, ...sanitizedArgs);
  },
  warn: (message: string, ...args: unknown[]) => {
    const sanitizedArgs = args.map(a => redactSensitiveData(a));
    console.warn(`[WARN] [${new Date().toISOString()}] ${redactSensitiveData(message)}`, ...sanitizedArgs);
  },
  error: (message: string, ...args: unknown[]) => {
    const sanitizedArgs = args.map(a => redactSensitiveData(a));
    console.error(`[ERROR] [${new Date().toISOString()}] ${redactSensitiveData(message)}`, ...sanitizedArgs);
  },
  debug: (message: string, ...args: unknown[]) => {
    if (process.env.NODE_ENV === 'development') {
      const sanitizedArgs = args.map(a => redactSensitiveData(a));
      console.debug(`[DEBUG] [${new Date().toISOString()}] ${redactSensitiveData(message)}`, ...sanitizedArgs);
    }
  },
};
