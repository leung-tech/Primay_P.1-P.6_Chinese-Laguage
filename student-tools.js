/* 學生自助工具：完全在學生瀏覽器本機運作，不讀取或修改教師後台資料。 */
(function () {
  'use strict';

  const PREFIX = 'studentPreference.';
  const BACKUP_SCHEMA = 'primary-chinese-progress-v1';
  const MAX_BACKUP_KEYS = 600;
  const courseLabels = {
    'word_basic.html': '字詞基礎・補底版', 'word_standard.html': '字詞基礎・標準版', 'word_advanced.html': '字詞基礎・拔尖版',
    'sentence_basic.html': '句子與語法・補底版', 'sentence_standard.html': '句子與語法・標準版', 'sentence_advanced.html': '句子與語法・拔尖版',
    'rhetoric_basic.html': '修辭與標點・補底版', 'rhetoric_standard.html': '修辭與標點・標準版', 'rhetoric_advanced.html': '修辭與標點・拔尖版',
    'paragraph_basic.html': '段落與實用文・補底版', 'paragraph_standard.html': '段落與實用文・標準版', 'paragraph_advanced.html': '段落與實用文・拔尖版',
    'read_basic.html': '閱讀理解・補底版', 'read_standard.html': '閱讀理解・標準版', 'read_advanced.html': '閱讀理解・拔尖版',
    'listen_basic.html': '聆聽與說話・補底版', 'listen_standard.html': '聆聽與說話・標準版', 'listen_advanced.html': '聆聽與說話・拔尖版',
    'culture_basic.html': '文化常識・補底版', 'culture_standard.html': '文化常識・標準版', 'culture_advanced.html': '文化常識・拔尖版',
    'write_basic.html': '綜合寫作・補底版', 'write_standard.html': '綜合寫作・標準版', 'write_advanced.html': '綜合寫作・拔尖版'
  };

  function getPref(name, fallback) {
    const value = localStorage.getItem(PREFIX + name);
    return value === null ? fallback : value;
  }

  function setPref(name, value) {
    localStorage.setItem(PREFIX + name, String(value));
  }

  function showNotice(message) {
    const notice = document.getElementById('student-tool-notice');
    if (!notice) return;
    notice.textContent = message;
    notice.classList.remove('hidden');
    clearTimeout(showNotice.timer);
    showNotice.timer = setTimeout(() => notice.classList.add('hidden'), 4200);
  }

  function applyPreferences() {
    const root = document.documentElement;
    const scale = Number(getPref('fontScale', '100'));
    root.style.fontSize = `${[100, 110, 120].includes(scale) ? scale : 100}%`;
    root.toggleAttribute('data-student-high-contrast', getPref('highContrast', 'false') === 'true');
    root.toggleAttribute('data-student-reduce-motion', getPref('reduceMotion', 'false') === 'true');
  }

  function isExportableKey(key) {
    return Boolean(key) &&
      !key.startsWith('_profile_') &&
      !key.startsWith('__') &&
      !key.startsWith('firebase:') &&
      !key.startsWith('primaryChineseDiagnostics') &&
      !key.startsWith('studentLastCourse') &&
      !key.startsWith('studentProgressLastBackup') &&
      !key.startsWith('studentTool') &&
      key !== 'admin' &&
      key.length <= 120;
  }

  function collectProgressData() {
    const data = {};
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (isExportableKey(key)) data[key] = localStorage.getItem(key);
    }
    return data;
  }

  function downloadText(text, fileName, contentType) {
    const blob = new Blob([text], { type: contentType || 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // 最近學習與本機備份日期屬於學生帳戶資料，不可由另一個帳戶讀取。
  function getScopedStorageKey(key) {
    const activeProfile = sessionStorage.getItem('activeProfile');
    const profileId = activeProfile && activeProfile !== 'admin' ? activeProfile : 'anonymous';
    return `${key}.${profileId}`;
  }

  function recordLastCourse(url) {
    if (!courseLabels[url]) return;
    localStorage.setItem(getScopedStorageKey('studentLastCourse'), JSON.stringify({ url, label: courseLabels[url], savedAt: new Date().toISOString() }));
  }

  function getLastCourse() {
    try {
      const course = JSON.parse(localStorage.getItem(getScopedStorageKey('studentLastCourse')) || 'null');
      return course && courseLabels[course.url] ? course : null;
    } catch (_) {
      return null;
    }
  }

  function renderHub() {
    const content = document.querySelector('#dashboard-screen > .max-w-7xl');
    const grid = content && content.querySelector(':scope > .grid');
    if (!content || !grid || document.getElementById('student-tools-hub')) return;
    const recent = getLastCourse();
    const recentLabel = recent ? recent.label : '尚未開始關卡';
    const backupAt = localStorage.getItem(getScopedStorageKey('studentProgressLastBackup'));
    const backupLabel = backupAt ? `最近備份：${new Date(backupAt).toLocaleString()}` : '尚未建立本機備份';
    const hub = document.createElement('section');
    hub.id = 'student-tools-hub';
    hub.className = 'mb-6 grid grid-cols-1 gap-4 md:grid-cols-3';
    hub.innerHTML = `
      <article class="rounded-2xl border-2 border-sky-200 bg-white p-4 shadow-md">
        <p class="text-sm font-black text-sky-700">📍 最近學習</p>
        <p id="student-recent-label" class="mt-1 min-h-12 text-base font-black text-slate-800">${recentLabel}</p>
        <button type="button" id="student-recent-go" class="mt-3 min-h-11 w-full rounded-xl bg-sky-600 px-4 py-2 text-sm font-black text-white shadow hover:bg-sky-700">▶️ 繼續這個關卡</button>
      </article>
      <article class="rounded-2xl border-2 border-emerald-200 bg-white p-4 shadow-md">
        <p class="text-sm font-black text-emerald-700">⚙️ 學習設定</p>
        <p class="mt-1 min-h-12 text-sm font-bold leading-relaxed text-slate-600">調整文字大小、對比、動畫偏好與朗讀測試語速。</p>
        <button type="button" data-student-open="settings" class="mt-3 min-h-11 w-full rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white shadow hover:bg-emerald-700">開啟設定</button>
      </article>
      <article class="rounded-2xl border-2 border-amber-200 bg-white p-4 shadow-md">
        <p class="text-sm font-black text-amber-700">🛡️ 進度保護</p>
        <p id="student-backup-label" class="mt-1 min-h-12 text-sm font-bold leading-relaxed text-slate-600">${backupLabel}</p>
        <button type="button" data-student-open="backup" class="mt-3 min-h-11 w-full rounded-xl bg-amber-500 px-4 py-2 text-sm font-black text-slate-900 shadow hover:bg-amber-400">備份／還原</button>
      </article>`;
    content.insertBefore(hub, grid);

    hub.querySelector('#student-recent-go').addEventListener('click', () => {
      const latest = getLastCourse();
      if (!latest) { showNotice('尚未找到最近學習紀錄，請先從下方選擇一個關卡。'); return; }
      location.href = latest.url;
    });
    hub.querySelectorAll('[data-student-open]').forEach(button => button.addEventListener('click', () => openStudentTools(button.dataset.studentOpen)));
  }

  function createModal() {
    if (document.getElementById('student-tools-modal')) return;
    const modal = document.createElement('div');
    modal.id = 'student-tools-modal';
    modal.className = 'student-tools-modal fixed inset-0 z-[150] hidden items-end justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:items-center';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'student-tools-title');
    modal.innerHTML = `
      <div class="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-7" id="student-tools-panel">
        <div class="mb-5 flex items-start justify-between gap-4 border-b-2 border-slate-100 pb-4">
          <div><h2 id="student-tools-title" class="text-2xl font-black text-slate-800">學生工具</h2><p id="student-tools-subtitle" class="mt-1 text-sm font-bold text-slate-500"></p></div>
          <button type="button" id="student-tools-close" aria-label="關閉學生工具" class="min-h-11 min-w-11 rounded-xl text-3xl font-bold text-slate-400 hover:bg-slate-100 hover:text-slate-700">×</button>
        </div>
        <div id="student-tool-notice" role="status" aria-live="polite" class="mb-4 hidden rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm font-bold text-sky-800"></div>
        <div id="student-tools-content"></div>
      </div>`;
    document.body.appendChild(modal);
    modal.querySelector('#student-tools-close').addEventListener('click', closeStudentTools);
    modal.addEventListener('click', event => { if (event.target === modal) closeStudentTools(); });
  }

  function renderSettings() {
    const content = document.getElementById('student-tools-content');
    document.getElementById('student-tools-title').textContent = '⚙️ 學習設定';
    document.getElementById('student-tools-subtitle').textContent = '設定只保存在目前瀏覽器，隨時可以調整。';
    content.innerHTML = `
      <div class="space-y-5">
        <section><h3 class="text-lg font-black text-slate-800">文字大小</h3><p class="mt-1 text-sm font-bold text-slate-600">放大後會套用至全站，適合小螢幕與長文閱讀。</p>
          <div class="mt-3 grid grid-cols-3 gap-2" role="group" aria-label="文字大小">${[100, 110, 120].map(scale => `<button type="button" data-font-scale="${scale}" class="settings-choice min-h-11 rounded-xl border-2 px-3 py-2 font-black ${Number(getPref('fontScale', '100')) === scale ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-700'}">${scale === 100 ? '標準' : `${scale}%`}</button>`).join('')}</div>
        </section>
        <section class="grid gap-3 sm:grid-cols-2"><label class="flex min-h-14 items-center justify-between gap-3 rounded-2xl border-2 border-slate-200 p-3 font-black text-slate-700"><span>提高對比</span><input id="pref-contrast" type="checkbox" ${getPref('highContrast', 'false') === 'true' ? 'checked' : ''}></label><label class="flex min-h-14 items-center justify-between gap-3 rounded-2xl border-2 border-slate-200 p-3 font-black text-slate-700"><span>減少動畫</span><input id="pref-motion" type="checkbox" ${getPref('reduceMotion', 'false') === 'true' ? 'checked' : ''}></label></section>
        <section><h3 class="text-lg font-black text-slate-800">朗讀測試語速</h3><p class="mt-1 text-sm font-bold text-slate-600">此設定會用於下方真機語音測試；各關卡可保留自己的語速設定。</p><div class="mt-3 grid grid-cols-3 gap-2" role="group" aria-label="朗讀測試語速">${[['0.7','慢'],['0.85','標準'],['1','快']].map(([rate,label]) => `<button type="button" data-voice-rate="${rate}" class="settings-choice min-h-11 rounded-xl border-2 px-3 py-2 font-black ${getPref('voiceRate', '0.85') === rate ? 'border-sky-500 bg-sky-50 text-sky-800' : 'border-slate-200 bg-white text-slate-700'}">${label}</button>`).join('')}</div></section>
        <button type="button" data-student-open="voice" class="min-h-12 w-full rounded-xl bg-sky-600 px-4 py-3 font-black text-white shadow hover:bg-sky-700">🎧 前往真機語音測試</button>
      </div>`;
    content.querySelectorAll('[data-font-scale]').forEach(button => button.addEventListener('click', () => { setPref('fontScale', button.dataset.fontScale); applyPreferences(); renderSettings(); showNotice('文字大小已更新。'); }));
    content.querySelectorAll('[data-voice-rate]').forEach(button => button.addEventListener('click', () => { setPref('voiceRate', button.dataset.voiceRate); renderSettings(); showNotice('朗讀測試語速已更新。'); }));
    content.querySelector('#pref-contrast').addEventListener('change', event => { setPref('highContrast', event.target.checked); applyPreferences(); showNotice('對比設定已更新。'); });
    content.querySelector('#pref-motion').addEventListener('change', event => { setPref('reduceMotion', event.target.checked); applyPreferences(); showNotice('動畫設定已更新。'); });
    content.querySelector('[data-student-open="voice"]').addEventListener('click', () => renderVoiceTest());
  }

  function renderBackup() {
    const content = document.getElementById('student-tools-content');
    const lastBackup = localStorage.getItem(getScopedStorageKey('studentProgressLastBackup'));
    document.getElementById('student-tools-title').textContent = '🛡️ 進度備份與還原';
    document.getElementById('student-tools-subtitle').textContent = '檔案只會下載到你的裝置，不會傳送到教師後台。';
    content.innerHTML = `
      <div class="space-y-5">
        <section class="rounded-2xl border-2 border-amber-200 bg-amber-50 p-4"><h3 class="font-black text-amber-900">匯出目前進度</h3><p class="mt-1 text-sm font-bold leading-relaxed text-amber-800">下載 JSON 備份檔，請存到自己的雲端硬碟或可信任位置。${lastBackup ? `<br>上次備份：${new Date(lastBackup).toLocaleString()}` : ''}</p><button type="button" id="backup-export" class="mt-3 min-h-11 w-full rounded-xl bg-amber-500 px-4 py-2 font-black text-slate-900 shadow hover:bg-amber-400">⬇️ 下載進度備份</button></section>
        <section class="rounded-2xl border-2 border-sky-200 bg-sky-50 p-4"><h3 class="font-black text-sky-900">還原舊備份</h3><p class="mt-1 text-sm font-bold leading-relaxed text-sky-800">選擇先前下載的 JSON 檔。還原會取代目前裝置中可備份的學習進度，但不會更改登入資料。</p><input id="backup-import-file" type="file" accept="application/json,.json" class="mt-3 block w-full text-sm font-bold text-slate-700"><button type="button" id="backup-import" class="mt-3 min-h-11 w-full rounded-xl bg-sky-600 px-4 py-2 font-black text-white shadow hover:bg-sky-700">↥ 驗證並還原備份</button></section>
      </div>`;
    content.querySelector('#backup-export').addEventListener('click', exportBackup);
    content.querySelector('#backup-import').addEventListener('click', importBackup);
  }

  function exportBackup() {
    const payload = { schema: BACKUP_SCHEMA, exportedAt: new Date().toISOString(), data: collectProgressData() };
    const stamp = payload.exportedAt.replace(/[:.]/g, '-');
    downloadText(JSON.stringify(payload, null, 2), `語文學習進度備份-${stamp}.json`, 'application/json;charset=utf-8');
    localStorage.setItem(getScopedStorageKey('studentProgressLastBackup'), payload.exportedAt);
    const backupLabel = document.getElementById('student-backup-label');
    if (backupLabel) backupLabel.textContent = `最近備份：${new Date(payload.exportedAt).toLocaleString()}`;
    showNotice(`已下載 ${Object.keys(payload.data).length} 項本機學習資料。`);
  }

  function importBackup() {
    const input = document.getElementById('backup-import-file');
    const file = input && input.files && input.files[0];
    if (!file) { showNotice('請先選擇 JSON 備份檔。'); return; }
    if (file.size > 1024 * 1024) { showNotice('備份檔過大，請選擇由本網站匯出的檔案。'); return; }
    const reader = new FileReader();
    reader.onload = async function () {
      try {
        const payload = JSON.parse(String(reader.result || ''));
        if (!payload || payload.schema !== BACKUP_SCHEMA || !payload.data || Array.isArray(payload.data) || typeof payload.data !== 'object') throw new Error('格式不符');
        const entries = Object.entries(payload.data).filter(([key, value]) => isExportableKey(key) && typeof value === 'string');
        if (!entries.length || entries.length > MAX_BACKUP_KEYS) throw new Error('資料項目不符');
        const restoreMessage = `確定還原 ${entries.length} 項學習資料嗎？目前裝置中可備份的學習資料將被取代，但不會更改登入帳戶。`;
        const confirmed = window.StudentDialogs?.confirm
          ? await window.StudentDialogs.confirm({ title: '要還原學習進度嗎？', message: restoreMessage, confirmLabel: '還原進度', cancelLabel: '取消', danger: true })
          : confirm(restoreMessage);
        if (!confirmed) return;
        Object.keys(collectProgressData()).forEach(key => localStorage.removeItem(key));
        entries.forEach(([key, value]) => localStorage.setItem(key, value));
        localStorage.setItem(getScopedStorageKey('studentProgressLastBackup'), new Date().toISOString());
        showNotice('還原完成，頁面將重新載入進度。');
        setTimeout(() => location.reload(), 900);
      } catch (_) {
        showNotice('無法讀取這個檔案。請確認它是由本網站下載的進度備份。');
      }
    };
    reader.readAsText(file, 'utf-8');
  }

  function preferredVoice() {
    const voices = speechSynthesis.getVoices();
    const priority = [/^yue-Hant-HK/i, /^yue-HK/i, /^zh-HK/i, /^zh-TW/i, /^zh-CN/i, /^zh/i];
    return priority.map(pattern => voices.find(voice => pattern.test(voice.lang))).find(Boolean) || null;
  }

  function renderVoiceTest() {
    const content = document.getElementById('student-tools-content');
    const voices = typeof speechSynthesis === 'undefined' ? [] : speechSynthesis.getVoices();
    const chineseVoices = voices.filter(voice => /^(zh|yue)/i.test(voice.lang));
    document.getElementById('student-tools-title').textContent = '🎧 真機語音測試與回報';
    document.getElementById('student-tools-subtitle').textContent = '請在自己的手機、平板與常用瀏覽器各測試一次。';
    content.innerHTML = `
      <div class="space-y-5">
        <section class="rounded-2xl border-2 border-sky-200 bg-sky-50 p-4"><p id="voice-device-status" class="font-black text-sky-900">${typeof speechSynthesis === 'undefined' ? '此瀏覽器不支援語音朗讀。' : chineseVoices.length ? `偵測到 ${chineseVoices.length} 個中文／粵語語音：${chineseVoices.map(voice => `${voice.name}（${voice.lang}）`).join('、')}` : '暫時沒有載入中文／粵語系統語音。請等待數秒或在裝置設定下載語音後再試。'}</p><div class="mt-3 grid grid-cols-2 gap-2"><button type="button" id="voice-test-play" class="min-h-11 rounded-xl bg-sky-600 px-4 py-2 font-black text-white hover:bg-sky-700">▶️ 測試朗讀</button><button type="button" id="voice-test-stop" class="min-h-11 rounded-xl bg-slate-700 px-4 py-2 font-black text-white hover:bg-slate-800">⏹️ 停止朗讀</button></div></section>
        <section><h3 class="text-lg font-black text-slate-800">測試結果</h3><div class="mt-3 space-y-2"><label class="flex min-h-12 items-center gap-3 rounded-xl border-2 border-slate-200 p-3 font-bold"><input id="voice-heard" type="checkbox">我有聽到清楚的中文／粵語朗讀</label><label class="flex min-h-12 items-center gap-3 rounded-xl border-2 border-slate-200 p-3 font-bold"><input id="voice-stopped" type="checkbox">我按停止後，聲音在兩秒內停止</label></div></section>
        <section><label for="voice-issue" class="text-lg font-black text-slate-800">問題描述（可選）</label><textarea id="voice-issue" rows="4" class="mt-2 w-full rounded-xl border-2 border-slate-300 p-3" placeholder="例如：iPhone Safari 第一次按播放沒有聲音；第二次才可以。"></textarea></section>
        <div class="grid gap-2 sm:grid-cols-2"><button type="button" id="voice-copy-report" class="min-h-11 rounded-xl bg-emerald-600 px-4 py-2 font-black text-white hover:bg-emerald-700">複製測試報告</button><button type="button" id="voice-download-report" class="min-h-11 rounded-xl bg-indigo-600 px-4 py-2 font-black text-white hover:bg-indigo-700">下載測試報告</button></div>
      </div>`;
    content.querySelector('#voice-test-play').addEventListener('click', testSpeech);
    content.querySelector('#voice-test-stop').addEventListener('click', () => { if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel(); showNotice('已請求停止朗讀。'); });
    content.querySelector('#voice-copy-report').addEventListener('click', () => copyVoiceReport(buildVoiceReport()));
    content.querySelector('#voice-download-report').addEventListener('click', () => downloadText(buildVoiceReport(), `語音測試報告-${new Date().toISOString().slice(0, 10)}.txt`));
  }

  function testSpeech() {
    if (typeof speechSynthesis === 'undefined') { showNotice('此瀏覽器不支援語音朗讀。'); return; }
    const voice = preferredVoice();
    if (!voice) { showNotice('尚未找到中文或粵語系統語音，請在裝置設定下載語音後再試。'); return; }
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance('你好，這是一段語音朗讀測試。請確認你聽到的內容清楚，並試按停止朗讀。');
    utterance.lang = voice.lang;
    utterance.voice = voice;
    utterance.rate = Number(getPref('voiceRate', '0.85'));
    utterance.onstart = () => showNotice(`正在使用 ${voice.name}（${voice.lang}）朗讀。`);
    utterance.onend = () => showNotice('朗讀完成。請勾選測試結果，並在需要時下載或複製報告。');
    utterance.onerror = () => showNotice('朗讀未能開始。請確認媒體音量、靜音模式與系統中文語音。');
    speechSynthesis.speak(utterance);
  }

  function buildVoiceReport() {
    const diagnosticEntries = window.LearningDiagnostics && typeof window.LearningDiagnostics.list === 'function' ? window.LearningDiagnostics.list() : [];
    const selectedVoice = typeof speechSynthesis === 'undefined' ? null : preferredVoice();
    return [
      '語文學習網站｜真機語音測試報告',
      `時間：${new Date().toISOString()}`,
      `裝置資訊：${navigator.userAgent}`,
      `選用語音：${selectedVoice ? `${selectedVoice.name} (${selectedVoice.lang})` : '未偵測到中文／粵語語音'}`,
      `聽到朗讀：${document.getElementById('voice-heard')?.checked ? '是' : '否／未確認'}`,
      `停止正常：${document.getElementById('voice-stopped')?.checked ? '是' : '否／未確認'}`,
      `問題描述：${document.getElementById('voice-issue')?.value.trim() || '無'}`,
      `本機診斷記錄：${JSON.stringify(diagnosticEntries.slice(-5))}`
    ].join('\n');
  }

  function copyVoiceReport(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => showNotice('測試報告已複製，可直接貼到回報訊息。')).catch(() => downloadText(text, '語音測試報告.txt'));
    } else {
      downloadText(text, '語音測試報告.txt');
      showNotice('此瀏覽器不支援直接複製，已改為下載報告。');
    }
  }

  function openStudentTools(view) {
    createModal();
    const modal = document.getElementById('student-tools-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    if (view === 'settings') renderSettings();
    else if (view === 'backup') renderBackup();
    else if (view === 'voice') renderVoiceTest();
    else renderSettings();
    setTimeout(() => modal.querySelector('#student-tools-close').focus(), 20);
  }

  function closeStudentTools() {
    const modal = document.getElementById('student-tools-modal');
    if (!modal) return;
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }

  window.StudentTools = Object.freeze({ recordLastCourse, open: openStudentTools, close: closeStudentTools, applyPreferences });
  window.openStudentTools = openStudentTools;
  window.closeStudentTools = closeStudentTools;

  applyPreferences();
  window.addEventListener('load', function () {
    renderHub();
    createModal();
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.onvoiceschanged = function () {};
  });
})();
