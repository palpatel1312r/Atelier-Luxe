const levels = { error: 0, warn: 1, info: 2, debug: 3 };
const current = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

function log(level, ...args) {
  if ((levels[level] ?? 2) > (levels[current] ?? 2)) return;
  const ts = new Date().toISOString();
  const prefix = `[${ts}] [${level.toUpperCase()}]`;
  if (level === 'error') console.error(prefix, ...args);
  else if (level === 'warn') console.warn(prefix, ...args);
  else console.log(prefix, ...args);
}

export const logger = {
  error: (...a) => log('error', ...a),
  warn: (...a) => log('warn', ...a),
  info: (...a) => log('info', ...a),
  debug: (...a) => log('debug', ...a),
};
