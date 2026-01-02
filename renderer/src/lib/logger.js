// Lightweight logger wrapper for renderer
const isDev = import.meta.env && import.meta.env.MODE === 'development';

function debug(...args) {
  if (isDev) console.debug('[debug]', ...args);
}

function info(...args) {
  console.info('[info]', ...args);
}

function warn(...args) {
  console.warn('[warn]', ...args);
}

function error(...args) {
  console.error('[error]', ...args);
}

export default { debug, info, warn, error };