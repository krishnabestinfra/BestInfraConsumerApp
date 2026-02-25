/**
 * Structured logger for app and API layer.
 * - Levels: debug, info, warn, error
 * - In request path: use logger.info/debug so prod can gate or send to backend
 * - Sensitive data must not be passed; redact in beforeSend (Sentry) separately
 */

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };

let minLevel = typeof __DEV__ !== 'undefined' && __DEV__ ? LEVELS.debug : LEVELS.warn;

function shouldLog(level) {
  return LEVELS[level] >= minLevel;
}

function formatMessage(level, prefix, ...args) {
  const prefixStr = prefix ? `[${prefix}] ` : '';
  return [prefixStr, ...args];
}

export function setMinLevel(level) {
  if (LEVELS[level] !== undefined) minLevel = LEVELS[level];
}

export function debug(prefix, ...args) {
  if (shouldLog('debug')) {
    // eslint-disable-next-line no-console
    console.log(...formatMessage('debug', prefix, ...args));
  }
}

export function info(prefix, ...args) {
  if (shouldLog('info')) {
    // eslint-disable-next-line no-console
    console.log(...formatMessage('info', prefix, ...args));
  }
}

export function warn(prefix, ...args) {
  if (shouldLog('warn')) {
    // eslint-disable-next-line no-console
    console.warn(...formatMessage('warn', prefix, ...args));
  }
}

export function error(prefix, ...args) {
  if (shouldLog('error')) {
    // eslint-disable-next-line no-console
    console.error(...formatMessage('error', prefix, ...args));
  }
}

/** Logger for API client: prefix "API" and no sensitive payloads in args */
export const apiLogger = {
  debug: (...args) => debug('API', ...args),
  info: (...args) => info('API', ...args),
  warn: (...args) => warn('API', ...args),
  error: (...args) => error('API', ...args),
};

export default { debug, info, warn, error, setMinLevel, apiLogger };
