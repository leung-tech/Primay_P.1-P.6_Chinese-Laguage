/*
 * 學生端同步狀態提示
 * 僅顯示學生瀏覽器本機與雲端同步狀態，不讀取或修改教師資料。
 */
(function () {
    'use strict';

    const messages = {
        local: '本機進度已保存',
        syncing: '正在同步學習進度…',
        synced: '已同步到雲端',
        pending: '本機已保存；雲端同步稍後完成',
        offline: '目前離線；進度只保存在這台裝置'
    };

    function injectStyles() {
        if (document.getElementById('student-sync-status-styles')) return;
        const style = document.createElement('style');
        style.id = 'student-sync-status-styles';
        style.textContent = `
            #student-sync-status { transition: background-color 160ms ease, color 160ms ease, border-color 160ms ease; }
            #student-sync-status [data-sync-status-icon] { display: inline-flex; width: 0.65rem; height: 0.65rem; border-radius: 9999px; background: currentColor; }
            #student-sync-status[data-state="syncing"] [data-sync-status-icon] { animation: student-sync-pulse 1s ease-in-out infinite; }
            #student-sync-status[data-state="local"] { background: rgba(255,255,255,0.12); color: #c7d2fe; border-color: rgba(199,210,254,0.45); }
            #student-sync-status[data-state="syncing"] { background: rgba(59,130,246,0.22); color: #dbeafe; border-color: rgba(147,197,253,0.72); }
            #student-sync-status[data-state="synced"] { background: rgba(16,185,129,0.2); color: #d1fae5; border-color: rgba(110,231,183,0.72); }
            #student-sync-status[data-state="pending"] { background: rgba(245,158,11,0.22); color: #fef3c7; border-color: rgba(252,211,77,0.78); }
            #student-sync-status[data-state="offline"] { background: rgba(244,63,94,0.24); color: #ffe4e6; border-color: rgba(253,164,175,0.78); }
            @keyframes student-sync-pulse { 50% { transform: scale(1.45); opacity: 0.5; } }
            @media (prefers-reduced-motion: reduce) { #student-sync-status, #student-sync-status[data-state="syncing"] [data-sync-status-icon] { animation: none; transition: none; } }
        `;
        document.head.appendChild(style);
    }

    function element() {
        return document.getElementById('student-sync-status');
    }

    function set(state, message) {
        const status = element();
        if (!status) return;
        status.dataset.state = state;
        const text = status.querySelector('[data-sync-status-text]');
        if (text) text.textContent = message || messages[state] || messages.local;
        status.setAttribute('aria-label', `學習進度狀態：${message || messages[state] || messages.local}`);
    }

    function start(message) {
        set(navigator.onLine ? 'syncing' : 'offline', message || (navigator.onLine ? messages.syncing : messages.offline));
    }

    function success(message) {
        set('synced', message || messages.synced);
    }

    function deferred(message) {
        set(navigator.onLine ? 'pending' : 'offline', message || (navigator.onLine ? messages.pending : messages.offline));
    }

    function local(message) {
        set(navigator.onLine ? 'local' : 'offline', message || (navigator.onLine ? messages.local : messages.offline));
    }

    function init() {
        injectStyles();
        local();
        window.addEventListener('offline', () => deferred(messages.offline));
        window.addEventListener('online', () => deferred('網路已恢復；下次操作會嘗試同步。'));
    }

    window.StudentSyncStatus = Object.freeze({ set, start, success, deferred, local, messages });
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
})();
