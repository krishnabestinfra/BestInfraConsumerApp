/**
 * Unit tests for performanceMonitor – ensures reporting never throws and thresholds work.
 */
const pm = require('../performanceMonitor');
const reportApiLatency = pm.reportApiLatency || pm.default?.reportApiLatency;
const reportColdStart = pm.reportColdStart || pm.default?.reportColdStart;

describe('performanceMonitor', () => {
  const originalDev = global.__DEV__;
  const originalWarn = global.console?.warn;
  const originalLog = global.console?.log;

  afterEach(() => {
    global.__DEV__ = originalDev;
    if (global.console) {
      global.console.warn = originalWarn;
      global.console.log = originalLog;
    }
  });

  describe('reportApiLatency', () => {
    it('does not throw when called with valid args', () => {
      expect(() => reportApiLatency('https://api.example.com/path', 100, 'GET')).not.toThrow();
      expect(() => reportApiLatency('https://api.example.com/path', 2000, 'POST')).not.toThrow();
    });

    it('does not report when duration is below threshold (1500ms)', () => {
      let warned = false;
      global.console.warn = () => { warned = true; };
      global.__DEV__ = true;
      reportApiLatency('https://api.example.com', 500, 'GET');
      expect(warned).toBe(false);
    });

    it('reports when duration is at or above threshold in __DEV__', () => {
      let warned = false;
      global.console.warn = () => { warned = true; };
      global.__DEV__ = true;
      reportApiLatency('https://api.example.com/foo', 1600, 'GET');
      expect(warned).toBe(true);
    });

    it('strips query string from endpoint in path', () => {
      let captured = '';
      global.console.warn = (msg) => { captured = msg; };
      global.__DEV__ = true;
      reportApiLatency('https://api.example.com/bar?token=secret', 2000, 'GET');
      expect(captured).not.toMatch(/token|secret/);
      expect(captured).toMatch(/\/bar/);
    });
  });

  describe('reportColdStart', () => {
    it('does not throw when called with no args', () => {
      expect(() => reportColdStart()).not.toThrow();
    });

    it('does not throw when called with startMark', () => {
      expect(() => reportColdStart(Date.now() - 100)).not.toThrow();
    });
  });
});
