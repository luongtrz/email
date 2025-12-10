/**
 * Logger Service
 *
 * Centralized logging utility that:
 * - Logs to console in development
 * - Can be extended to send to monitoring service (Sentry, LogRocket, etc.) in production
 * - Provides type-safe logging methods
 */

type LogLevel = "log" | "info" | "warn" | "error" | "debug";

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private isDevelopment = import.meta.env.MODE === "development";
  private isProduction = import.meta.env.MODE === "production";

  /**
   * General log - use for debugging
   */
  log(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.log(`[LOG] ${message}`, context || "");
    }
  }

  /**
   * Info log - use for informational messages
   */
  info(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.info(`[INFO] ${message}`, context || "");
    }
  }

  /**
   * Warning log - use for non-critical issues
   */
  warn(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.warn(`[WARN] ${message}`, context || "");
    }
    // TODO: Send to monitoring service in production
    if (this.isProduction) {
      this.sendToMonitoring("warn", message, context);
    }
  }

  /**
   * Error log - use for errors that need attention
   */
  error(message: string, error?: unknown, context?: LogContext): void {
    if (this.isDevelopment) {
      console.error(`[ERROR] ${message}`, error || "", context || "");
    }

    // TODO: Send to monitoring service in production (Sentry, etc.)
    if (this.isProduction) {
      this.sendToMonitoring("error", message, { error, ...context });
    }
  }

  /**
   * Debug log - use for detailed debugging
   */
  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.debug(`[DEBUG] ${message}`, context || "");
    }
  }

  /**
   * Send logs to external monitoring service
   * TODO: Implement integration with Sentry, LogRocket, or similar
   */
  private sendToMonitoring(
    level: LogLevel,
    message: string,
    context?: LogContext
  ): void {
    // Example Sentry integration:
    // if (window.Sentry) {
    //   window.Sentry.captureMessage(message, {
    //     level: level === 'error' ? 'error' : 'warning',
    //     extra: context,
    //   });
    // }

    // For now, just store in browser for debugging
    try {
      const logs = JSON.parse(sessionStorage.getItem("app_logs") || "[]");
      logs.push({
        timestamp: new Date().toISOString(),
        level,
        message,
        context,
      });
      // Keep only last 100 logs
      if (logs.length > 100) {
        logs.shift();
      }
      sessionStorage.setItem("app_logs", JSON.stringify(logs));
    } catch {
      // Ignore storage errors
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Export type for testing
export type { Logger };
