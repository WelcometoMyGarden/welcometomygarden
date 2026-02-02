enum LogLevel {
  error = 0,
  warn = 1,
  info = 2,
  debug = 3
}

let currentLevel = import.meta.env.LOG_LEVEL ? parseInt(import.meta.env.LOG_LEVEL) : 2;

type LoggerFunction = (message: any, ...args: any[]) => void;

const createLogger = (key: keyof typeof LogLevel, minLevel: LogLevel) =>
  ((...args) => currentLevel >= minLevel && console[key](...args)) satisfies LoggerFunction;

export default {
  // Derive loggers from enum levels
  ...(Object.fromEntries(
    Object.entries(LogLevel).map(([k, v]) => [
      k,
      createLogger(k as keyof typeof LogLevel, v as LogLevel)
    ])
  ) as { [k in keyof typeof LogLevel]: LoggerFunction }),
  // Extra aliases
  log: createLogger('info', LogLevel.info)
};
