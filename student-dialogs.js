(() => {
  'use strict';

  const DEFAULT_CONFIRM_TITLE = '請確認你的選擇';
  let activeConfirm = null;
  let lastFocusedElement = null;
  let liveRegion;
  let notificationTimer;

  function ensureLiveRegion() {
    if (liveRegion) return liveRegion;
    liveRegion = document.getElementById('student-inline-notice');
    if (!liveRegion) {
      liveRegion = document.createElement('section');
      liveRegion.id = 'student-inline-notice';
      liveRegion.className = 'student-inline-notice';
      liveRegion.setAttribute('role', 'status');
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.setAttribute('aria-atomic', 'true');
      document.body.appendChild(liveRegion);
    }
    return liveRegion;
  }

  function notify(message, tone = 'info') {
    const region = ensureLiveRegion();
    clearTimeout(notificationTimer);
    region.dataset.tone = tone;
    region.textContent = message;
    region.classList.add('is-visible');
    notificationTimer = setTimeout(() => region.classList.remove('is-visible'), tone === 'success' ? 2600 : 4800);
  }

  function closeConfirm(accepted) {
    if (!activeConfirm) return;
    const { overlay, resolve } = activeConfirm;
    activeConfirm = null;
    overlay.remove();
    document.removeEventListener('keydown', handleConfirmKeydown, true);
    if (lastFocusedElement?.isConnected) lastFocusedElement.focus();
    lastFocusedElement = null;
    resolve(Boolean(accepted));
  }

  function handleConfirmKeydown(event) {
    if (!activeConfirm) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeConfirm(false);
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = [...activeConfirm.overlay.querySelectorAll('button:not([disabled])')];
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function confirm({ title = DEFAULT_CONFIRM_TITLE, message, confirmLabel = '確定', cancelLabel = '取消', danger = false } = {}) {
    if (activeConfirm) closeConfirm(false);
    lastFocusedElement = document.activeElement;
    return new Promise(resolve => {
      const overlay = document.createElement('div');
      overlay.className = 'student-confirm-overlay';
      overlay.innerHTML = `
        <section class="student-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="student-confirm-title" aria-describedby="student-confirm-message">
          <h2 id="student-confirm-title" class="student-confirm-title"></h2>
          <p id="student-confirm-message" class="student-confirm-message"></p>
          <div class="student-confirm-actions">
            <button type="button" class="student-confirm-cancel"></button>
            <button type="button" class="student-confirm-accept"></button>
          </div>
        </section>`;
      overlay.querySelector('#student-confirm-title').textContent = title;
      overlay.querySelector('#student-confirm-message').textContent = message || '';
      const cancelButton = overlay.querySelector('.student-confirm-cancel');
      const acceptButton = overlay.querySelector('.student-confirm-accept');
      cancelButton.textContent = cancelLabel;
      acceptButton.textContent = confirmLabel;
      acceptButton.classList.toggle('is-danger', danger);
      cancelButton.addEventListener('click', () => closeConfirm(false));
      acceptButton.addEventListener('click', () => closeConfirm(true));
      overlay.addEventListener('mousedown', event => { if (event.target === overlay) closeConfirm(false); });
      document.body.appendChild(overlay);
      activeConfirm = { overlay, resolve };
      document.addEventListener('keydown', handleConfirmKeydown, true);
      cancelButton.focus();
    });
  }

  window.StudentDialogs = Object.freeze({ notify, confirm });
})();
