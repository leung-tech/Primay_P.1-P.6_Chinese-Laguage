/*
 * 本機前端診斷器：不傳送資料到外部服務，只保留最近 30 筆錯誤於此瀏覽器。
 * 開發或驗收時可在主控台使用 window.LearningDiagnostics.summary()、list()、clear()。
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'primaryChineseDiagnosticsV1';
  const LIMIT = 30;

  function readEntries() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(stored) ? stored : [];
    } catch (_) {
      return [];
    }
  }

  function saveEntry(entry) {
    try {
      const entries = readEntries();
      entries.push(entry);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-LIMIT)));
    } catch (_) {
      // 本機儲存空間不可用時，不應阻礙學生的學習流程。
    }
  }

  function normalise(value) {
    return String(value || '未知錯誤').replace(/\s+/g, ' ').slice(0, 500);
  }

  function record(kind, message, source) {
    saveEntry({
      time: new Date().toISOString(),
      page: location.pathname.split('/').pop() || 'index.html',
      kind: normalise(kind),
      message: normalise(message),
      source: normalise(source || '')
    });
  }

  window.addEventListener('error', function (event) {
    record('error', event.message, event.filename ? `${event.filename}:${event.lineno || 0}:${event.colno || 0}` : '');
  });

  window.addEventListener('unhandledrejection', function (event) {
    const reason = event.reason && event.reason.message ? event.reason.message : event.reason;
    record('unhandledrejection', reason, 'Promise');
  });

  window.LearningDiagnostics = Object.freeze({
    list: function () { return readEntries(); },
    summary: function () {
      const entries = readEntries();
      return {
        count: entries.length,
        newest: entries.length ? entries[entries.length - 1] : null,
        pages: [...new Set(entries.map(entry => entry.page))]
      };
    },
    clear: function () {
      try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
      return true;
    }
  });
})();
