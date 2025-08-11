/**
 * Structured logging system for Art Recommendation SaaS
 * Replaces console.log with proper logging levels
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export interface LogContext {
  component?: string;
  userId?: string;
  requestId?: string;
  duration?: number;
  [key: string]: any;
}

class Logger {
  private logLevel: LogLevel;

  constructor() {
    // Set log level based on environment
    const envLevel = process.env.LOG_LEVEL?.toLowerCase();
    switch (envLevel) {
      case 'debug':
        this.logLevel = LogLevel.DEBUG;
        break;
      case 'info':
        this.logLevel = LogLevel.INFO;
        break;
      case 'warn':
        this.logLevel = LogLevel.WARN;
        break;
      case 'error':
        this.logLevel = LogLevel.ERROR;
        break;
      default:
        this.logLevel = process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private formatMessage(level: string, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? JSON.stringify(context) : '';
    return `[${timestamp}] ${level}: ${message} ${contextStr}`.trim();
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.debug(this.formatMessage('DEBUG', message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(this.formatMessage('INFO', message, context));
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage('WARN', message, context));
    }
  }

  error(message: string, error?: Error, context?: LogContext): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const errorContext = error ? { error: error.message, stack: error.stack, ...context } : context;
      console.error(this.formatMessage('ERROR', message, errorContext));
    }
  }

  // Performance logging
  perf(message: string, startTime: number, context?: LogContext): void {
    const duration = Date.now() - startTime;
    this.info(message, { ...context, duration: `${duration}ms` });
  }

  // Component-specific loggers
  createComponentLogger(component: string): ComponentLogger {
    return new ComponentLogger(this, component);
  }
}

class ComponentLogger {
  constructor(private logger: Logger, private component: string) {}

  private withComponent(context?: LogContext): LogContext {
    return { component: this.component, ...context };
  }

  debug(message: string, context?: LogContext): void {
    this.logger.debug(message, this.withComponent(context));
  }

  info(message: string, context?: LogContext): void {
    this.logger.info(message, this.withComponent(context));
  }

  warn(message: string, context?: LogContext): void {
    this.logger.warn(message, this.withComponent(context));
  }

  error(message: string, error?: Error, context?: LogContext): void {
    this.logger.error(message, error, this.withComponent(context));
  }

  perf(message: string, startTime: number, context?: LogContext): void {
    this.logger.perf(message, startTime, this.withComponent(context));
  }
}

// Export singleton logger instance
export const logger = new Logger();

// Export component logger creators for common components
export const aiLogger = logger.createComponentLogger('AI-Service');
export const authLogger = logger.createComponentLogger('Auth');
export const dbLogger = logger.createComponentLogger('Database');
export const apiLogger = logger.createComponentLogger('API');
export const serverLogger = logger.createComponentLogger('Server');

export default logger;