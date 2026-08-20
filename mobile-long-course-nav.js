/*
 * 標準版及進階版長關卡的手機導覽輔助。
 * 依現有目錄按鈕與狀態文字提供「繼續未完成」及「只看未完成」；
 * 有章節標題的目錄會額外加入收合控制。所有偏好只保留在本機。
 */
(function () {
  'use strict';

  const page = location.pathname.split('/').pop() || '';
  const configByPage = {
    'read_standard.html': [{ id: 'read-standard', container: '#directory-content', selector: 'button[onclick*="startPassage"]', label: '閱讀任務' }],
    'read_advanced.html': [{ id: 'read-advanced', container: '#directory-content', selector: 'button[onclick*="startPassage"]', label: '閱讀任務' }],
    'listen_standard.html': [
      { id: 'listen-standard-listen', container: '#listen-content', selector: 'button[onclick*="startListen"]', label: '聆聽任務' },
      { id: 'listen-standard-speak', container: '#speak-content', selector: 'button[onclick*="startSpeak"]', label: '說話練習' }
    ],
    'listen_advanced.html': [
      { id: 'listen-advanced-listen', container: '#listen-content', selector: 'button[onclick*="startListen"]', label: '聆聽任務' },
      { id: 'listen-advanced-speak', container: '#speak-content', selector: 'button[onclick*="startSpeak"]', label: '說話練習' }
    ],
    'sentence_standard.html': [{ id: 'sentence-standard', container: '#directory-content', selector: 'button[onclick*="startQuestion"]', label: '句子練習' }],
    'sentence_advanced.html': [{ id: 'sentence-advanced', container: '#directory-content', selector: 'button[onclick*="startQuestion"]', label: '句子練習' }],
    'paragraph_standard.html': [{ id: 'paragraph-standard', container: '#directory-content', selector: 'button[onclick*="startQuestion"]', label: '段落練習' }],
    'paragraph_advanced.html': [{ id: 'paragraph-advanced', container: '#directory-content', selector: 'button[onclick*="startQuestion"]', label: '段落練習' }],
    'write_standard.html': [
      { id: 'write-standard-expand', container: '#expand-content', selector: 'button[onclick*="startExpand"]', label: '擴寫任務' },
      { id: 'write-standard-expo', container: '#expo-content', selector: 'button[onclick*="startExpo"]', label: '說明文任務' },
      { id: 'write-standard-trans', container: '#trans-content', selector: 'button[onclick*="startTrans"]', label: '過渡句任務' }
    ],
    'write_advanced.html': [
      { id: 'write-advanced-vocab', container: '#vocab-content', selector: 'button[onclick*="startVocab"]', label: '精準用詞' },
      { id: 'write-advanced-analyze', container: '#analyze-content', selector: 'button[onclick*="startAnalyze"]', label: '範文分析' },
      { id: 'write-advanced-outline', container: '#outline-content', selector: 'button[onclick*="startOutline"]', label: '大綱重組' },
      { id: 'write-advanced-trans', container: '#trans-content', selector: 'button[onclick*="startTrans"]', label: '過渡句特訓' },
      { id: 'write-advanced-write', container: '#write-content', selector: 'button[onclick*="startWrite"]', label: '拔尖重組' },
      { id: 'write-advanced-edit', container: '#edit-content', selector: 'button[onclick*="startEdit"]', label: '小編輯診所' }
    ]
  };

  const completePattern = /已完成|已練習|完美|過關|🌟|✅/;

  function getItems(container, selector) {
    return [...container.querySelectorAll(selector)];
  }

  function isComplete(item) {
    return completePattern.test(item.textContent || '');
  }

  function storageKey(config, suffix) {
    return `mobileLongCourse.${config.id}.${suffix}`;
  }

  function createToolbar(config, container) {
    const existing = document.getElementById(`mobile-nav-${config.id}`);
    if (existing) existing.remove();

    const items = getItems(container, config.selector);
    if (!items.length) return;
    const completed = items.filter(isComplete).length;
    const next = items.find(item => !isComplete(item));
    const onlyIncomplete = localStorage.getItem(storageKey(config, 'onlyIncomplete')) === 'true';

    const toolbar = document.createElement('div');
    toolbar.id = `mobile-nav-${config.id}`;
    toolbar.className = 'mobile-course-toolbar sticky top-2 z-20 mb-4 rounded-2xl border-2 border-sky-200 bg-white/95 p-3 shadow-lg backdrop-blur';
    toolbar.innerHTML = `
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p class="text-sm font-black text-slate-700" role="status">${next ? `${config.label}：完成 ${completed} / ${items.length}` : `🎉 ${config.label}已全部完成 ${completed} / ${items.length}`}</p>
        <div class="grid grid-cols-2 gap-2 sm:w-auto">
          <button type="button" class="mobile-course-resume min-h-11 rounded-xl px-4 py-2.5 text-sm font-black ${next ? 'bg-sky-600 text-white hover:bg-sky-700' : 'cursor-not-allowed bg-slate-200 text-slate-500'}" ${next ? '' : 'disabled'}>${next ? '▶️ 繼續未完成' : '🏆 已完成'}</button>
          <button type="button" class="mobile-course-filter min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-100" aria-pressed="${onlyIncomplete}">${onlyIncomplete ? '顯示全部' : '只看未完成'}</button>
        </div>
      </div>`;
    container.parentNode.insertBefore(toolbar, container);

    toolbar.querySelector('.mobile-course-resume').addEventListener('click', function () {
      const freshItems = getItems(container, config.selector);
      const firstUnfinished = freshItems.find(item => !isComplete(item));
      if (firstUnfinished) firstUnfinished.click();
    });
    toolbar.querySelector('.mobile-course-filter').addEventListener('click', function () {
      const nextValue = localStorage.getItem(storageKey(config, 'onlyIncomplete')) !== 'true';
      localStorage.setItem(storageKey(config, 'onlyIncomplete'), String(nextValue));
      applyFilter(config, container);
      createToolbar(config, container);
    });

    applyFilter(config, container);
    attachChapterControls(config, container);
  }

  function applyFilter(config, container) {
    const onlyIncomplete = localStorage.getItem(storageKey(config, 'onlyIncomplete')) === 'true';
    getItems(container, config.selector).forEach(item => {
      item.classList.toggle('mobile-course-filtered', onlyIncomplete && isComplete(item));
    });
  }

  function attachChapterControls(config, container) {
    [...container.children].forEach((section, index) => {
      const heading = section.querySelector(':scope h3');
      const candidate = section.querySelector(':scope > div:last-child');
      if (!heading || !candidate || candidate === heading.parentElement || candidate.dataset.mobileChapterReady === 'true') return;
      const itemCount = candidate.querySelectorAll(config.selector).length;
      if (!itemCount) return;
      candidate.dataset.mobileChapterReady = 'true';
      const key = storageKey(config, `chapter-${index}`);
      const collapsed = localStorage.getItem(key) === 'true';
      const control = document.createElement('button');
      control.type = 'button';
      control.className = 'mobile-chapter-toggle ml-auto min-h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-100';
      const apply = function () {
        const isCollapsed = localStorage.getItem(key) === 'true';
        candidate.hidden = isCollapsed;
        control.setAttribute('aria-expanded', String(!isCollapsed));
        control.textContent = isCollapsed ? '展開題目 ⌄' : '收合本章 ⌃';
      };
      control.addEventListener('click', function () {
        localStorage.setItem(key, String(localStorage.getItem(key) !== 'true'));
        apply();
      });
      heading.parentElement.classList.add('flex', 'items-center', 'gap-2');
      heading.parentElement.appendChild(control);
      if (collapsed) apply(); else apply();
    });
  }

  function mount() {
    (configByPage[page] || []).forEach(config => {
      const container = document.querySelector(config.container);
      if (container) createToolbar(config, container);
    });
  }

  window.addEventListener('load', function () {
    mount();
    setTimeout(mount, 250);
  });
})();
