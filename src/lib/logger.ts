
import { format } from 'date-fns';

type LogLevel = 'info' | 'success' | 'warn' | 'error';
type LogListener = (message: string, level: LogLevel) => void;

class UILogger {
  private listeners: Set<LogListener> = new Set();

  subscribe(listener: LogListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private log(message: string, level: LogLevel, data?: any) {
    const timestamp = format(new Date(), 'HH:mm:ss.SSS');
    const formattedMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    
    // Log to console as a fallback
    switch (level) {
      case 'info':
        console.info(formattedMessage, data || '');
        break;
      case 'success':
        console.log(`%c${formattedMessage}`, 'color: green;', data || '');
        break;
      case 'warn':
        console.warn(formattedMessage, data || '');
        break;
      case 'error':
        console.error(formattedMessage, data || '');
        break;
    }

    // Notify UI listeners
    const uiMessage = data ? `${formattedMessage} ${JSON.stringify(data)}` : formattedMessage;
    this.listeners.forEach(listener => listener(uiMessage, level));
  }

  info(message: string, data?: any) {
    this.log(message, 'info', data);
  }

  success(message: string, data?: any) {
    this.log(message, 'success', data);
  }

  warn(message: string, data?: any) {
    this.log(message, 'warn', data);
  }

  error(message: string, data?: any) {
    this.log(message, 'error', data);
  }
}

export const logger = new UILogger();
