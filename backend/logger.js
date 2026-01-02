// Lightweight logger for backend
const isDev = process.env.NODE_ENV !== 'production';

function debug(...args) { if (isDev) console.debug('[debug]', ...args); }
function info(...args) { console.info('[info]', ...args); }
function warn(...args) { console.warn('[warn]', ...args); }
function error(...args) { console.error('[error]', ...args); }

module.exports = { debug, info, warn, error };