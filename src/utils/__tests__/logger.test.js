/**
 * Unit tests for logger: setMinLevel and that log functions do not throw.
 */
import logger from '../logger';

describe('logger', () => {
  const originalWarn = global.console?.warn;
  const originalLog = global.console?.log;
  const originalError = global.console?.error;

  afterEach(() => {
    if (global.console) {
      global.console.warn = originalWarn;
      global.console.log = originalLog;
      global.console.error = originalError;
    }
  });

  it('setMinLevel does not throw', () => {
    expect(() => logger.setMinLevel('info')).not.toThrow();
    expect(() => logger.setMinLevel('warn')).not.toThrow();
  });

  it('info does not throw', () => {
    expect(() => logger.info('Test', 'message')).not.toThrow();
  });

  it('warn does not throw', () => {
    expect(() => logger.warn('Test', 'warning')).not.toThrow();
  });

  it('error does not throw', () => {
    expect(() => logger.error('Test', 'error')).not.toThrow();
  });

  it('apiLogger.info does not throw', () => {
    expect(() => logger.apiLogger.info('cache hit', 'url')).not.toThrow();
  });
});
