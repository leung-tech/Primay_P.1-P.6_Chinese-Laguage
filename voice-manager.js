/*
 * 學習關卡共用語音管理器。
 * 以粵語／香港中文為優先，並為沒有可用中文語音的裝置提供可理解的提示。
 */
(function () {
    'use strict';

    const preferredLanguages = ['yue-Hant-HK', 'yue-HK', 'zh-HK', 'zh-TW', 'zh-CN', 'zh'];
    let voices = [];
    let activeUtterance = null;
    let activeText = '';

    function isSupported() {
        return 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
    }

    function refreshVoices() {
        voices = isSupported() ? window.speechSynthesis.getVoices() : [];
        return voices;
    }

    function cleanText(text) {
        return String(text || '')
            .replace(/___/g, '什麼')
            .replace(/<br\s*\/?>/gi, '。')
            .replace(/<[^>]*>?/gm, '')
            .replace(/[✅❌💡【】_]/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function getPreferredVoice() {
        refreshVoices();
        for (const language of preferredLanguages) {
            const exactVoice = voices.find(voice => voice.lang.toLowerCase() === language.toLowerCase());
            if (exactVoice) return exactVoice;
        }
        return voices.find(voice => /^(yue|zh)/i.test(voice.lang)) || null;
    }

    function ensureLiveRegion() {
        let region = document.getElementById('learning-voice-live-region');
        if (region) return region;
        region = document.createElement('div');
        region.id = 'learning-voice-live-region';
        region.setAttribute('role', 'status');
        region.setAttribute('aria-live', 'polite');
        region.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;';
        document.body.appendChild(region);
        return region;
    }

    function notify(message, tone) {
        const status = document.getElementById('voice-status');
        if (status) {
            const color = tone === 'error' ? 'text-rose-200' : tone === 'warning' ? 'text-amber-200' : tone === 'active' ? 'text-emerald-300' : 'text-slate-300';
            status.className = `mt-3 text-sm font-bold min-h-5 relative z-10 ${color}`;
            status.textContent = message;
        }
        ensureLiveRegion().textContent = message;
        if (typeof window.showToast === 'function' && (tone === 'error' || tone === 'warning')) {
            window.showToast(message);
        }
    }

    function describeUnavailable() {
        if (!isSupported()) return '此瀏覽器不支援朗讀功能。';
        return voices.length === 0
            ? '正在準備裝置語音；如仍無法朗讀，請在裝置設定下載中文語音。'
            : '此裝置沒有可用的中文語音，請在裝置設定下載後再試。';
    }

    function stop(silent) {
        if (isSupported()) window.speechSynthesis.cancel();
        activeUtterance = null;
        activeText = '';
        if (!silent) notify('已停止朗讀。', 'neutral');
    }

    function speak(text, options) {
        const settings = options || {};
        const voice = getPreferredVoice();
        if (!voice) {
            const message = describeUnavailable();
            notify(message, 'warning');
            if (settings.onUnavailable) settings.onUnavailable(message);
            return false;
        }

        const preparedText = cleanText(text);
        if (!preparedText) return false;
        stop(true);

        const utterance = new SpeechSynthesisUtterance(preparedText);
        utterance.lang = voice.lang || 'zh-HK';
        utterance.voice = voice;
        utterance.rate = Number(settings.rate) || 0.9;
        activeUtterance = utterance;
        activeText = preparedText;

        utterance.onstart = function () {
            if (activeUtterance !== utterance) return;
            notify(`正在朗讀${settings.label || '內容'}。`, 'active');
            if (settings.onStart) settings.onStart();
        };
        utterance.onend = function () {
            if (activeUtterance !== utterance) return;
            activeUtterance = null;
            activeText = '';
            notify('朗讀完成。', 'neutral');
            if (settings.onEnd) settings.onEnd();
        };
        utterance.onerror = function (event) {
            if (activeUtterance !== utterance) return;
            activeUtterance = null;
            activeText = '';
            if (!['canceled', 'interrupted'].includes(event.error)) {
                notify('暫時無法朗讀，請檢查裝置的中文語音設定。', 'error');
            }
            if (settings.onError) settings.onError(event);
        };
        if (settings.onBoundary) utterance.onboundary = settings.onBoundary;

        try {
            window.speechSynthesis.speak(utterance);
            return true;
        } catch (error) {
            activeUtterance = null;
            activeText = '';
            notify('暫時無法啟動朗讀，請稍後再試。', 'error');
            if (settings.onError) settings.onError(error);
            return false;
        }
    }

    function toggle(text, options) {
        const preparedText = cleanText(text);
        if (activeUtterance && activeText === preparedText) {
            stop();
            return false;
        }
        return speak(preparedText, options);
    }

    function init() {
        if (!isSupported()) return;
        refreshVoices();
        window.speechSynthesis.addEventListener('voiceschanged', refreshVoices);
        setTimeout(refreshVoices, 300);
    }

    window.LearningVoice = { init, speak, toggle, stop, cleanText, getPreferredVoice, isSupported };
    window.addEventListener('pagehide', () => stop(true));
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
})();
