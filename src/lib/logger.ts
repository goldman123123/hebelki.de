type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

const MIN_LEVEL: LogLevel = process.env.NODE_ENV === 'production' ? 'info' : 'debug'

function shouldLog(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[MIN_LEVEL]
}

function timestamp(): string {
  return new Date().toISOString()
}

export interface Logger {
  debug(message: string, ...args: unknown[]): void
  info(message: string, ...args: unknown[]): void
  warn(message: string, ...args: unknown[]): void
  error(message: string, ...args: unknown[]): void
}

export function createLogger(tag: string): Logger {
  return {
    debug(message: string, ...args: unknown[]) {
      if (shouldLog('debug')) {
        console.debug(`[${timestamp()}] [DEBUG] [${tag}]`, message, ...args)
      }
    },
    info(message: string, ...args: unknown[]) {
      if (shouldLog('info')) {
        console.info(`[${timestamp()}] [INFO] [${tag}]`, message, ...args)
      }
    },
    warn(message: string, ...args: unknown[]) {
      if (shouldLog('warn')) {
        console.warn(`[${timestamp()}] [WARN] [${tag}]`, message, ...args)
      }
    },
    error(message: string, ...args: unknown[]) {
      if (shouldLog('error')) {
        console.error(`[${timestamp()}] [ERROR] [${tag}]`, message, ...args)
      }
    },
  }
}

const logger = createLogger('app')
export default logger
