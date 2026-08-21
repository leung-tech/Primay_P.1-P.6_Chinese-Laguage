/*
 * 學生共用答題回饋
 * 不改變各關卡的計分或題目判定；只統一既有 .wrong / .correct 狀態的可視與語音輔助回饋。
 */
(function () {
    'use strict';

    const WRONG_MESSAGE = '這次未答對，請再試一次。你可以先看看提示，再選另一個答案。';
    const CORRECT_MESSAGE = '答對了！做得好。';
    let feedbackRegion;
    let dismissTimer;

    function injectStyles() {
        if (document.getElementById('student-feedback-styles')) return;
        const style = document.createElement('style');
        style.id = 'student-feedback-styles';
        style.textContent = `
            .option-btn.wrong,
            .student-feedback-wrong {
                background-color: #fee2e2 !important;
                border-color: #ef4444 !important;
                color: #991b1b !important;
                opacity: 1 !important;
                box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.18) !important;
            }
            .option-btn.correct,
            .student-feedback-correct {
                background-color: #dcfce7 !important;
                border-color: #22c55e !important;
                color: #166534 !important;
                box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.16) !important;
            }
            #student-answer-feedback {
                position: fixed;
                z-index: 9999;
                left: 50%;
                bottom: calc(1rem + env(safe-area-inset-bottom));
                transform: translate(-50%, 140%);
                width: min(92vw, 38rem);
                display: flex;
                align-items: flex-start;
                gap: 0.75rem;
                padding: 0.9rem 1rem;
                border: 2px solid #ef4444;
                border-radius: 1rem;
                background: #fff7f7;
                color: #7f1d1d;
                box-shadow: 0 12px 30px rgba(15, 23, 42, 0.24);
                font-size: 1rem;
                font-weight: 800;
                line-height: 1.5;
                opacity: 0;
                pointer-events: none;
                transition: transform 180ms ease, opacity 180ms ease;
            }
            #student-answer-feedback.is-visible {
                transform: translate(-50%, 0);
                opacity: 1;
            }
            #student-answer-feedback[data-tone="success"] {
                border-color: #22c55e;
                background: #f0fdf4;
                color: #166534;
            }
            #student-answer-feedback .student-feedback-icon {
                flex: 0 0 auto;
                font-size: 1.25rem;
                line-height: 1.35;
            }
            @media (prefers-reduced-motion: reduce) {
                #student-answer-feedback { transition: none; }
            }
        `;
        document.head.appendChild(style);
    }

    function ensureRegion() {
        if (feedbackRegion) return feedbackRegion;
        feedbackRegion = document.createElement('div');
        feedbackRegion.id = 'student-answer-feedback';
        feedbackRegion.setAttribute('role', 'status');
        feedbackRegion.setAttribute('aria-live', 'polite');
        feedbackRegion.setAttribute('aria-atomic', 'true');
        document.body.appendChild(feedbackRegion);
        return feedbackRegion;
    }

    function show(message, tone) {
        const region = ensureRegion();
        clearTimeout(dismissTimer);
        region.dataset.tone = tone === 'success' ? 'success' : 'error';
        region.innerHTML = `<span class="student-feedback-icon" aria-hidden="true">${tone === 'success' ? '✅' : '↩️'}</span><span>${message}</span>`;
        region.classList.add('is-visible');
        dismissTimer = setTimeout(() => region.classList.remove('is-visible'), tone === 'success' ? 1800 : 4200);
    }

    function markWrong(element) {
        if (!element) return;
        element.classList.add('student-feedback-wrong');
        element.setAttribute('aria-invalid', 'true');
        element.setAttribute('aria-describedby', 'student-answer-feedback');
    }

    function announceWrong(element, message = WRONG_MESSAGE) {
        markWrong(element);
        show(message, 'error');
    }

    function announceCorrect(element, message = CORRECT_MESSAGE) {
        if (element) {
            element.classList.add('student-feedback-correct');
            element.setAttribute('aria-invalid', 'false');
        }
        show(message, 'success');
    }

    function clearState(element) {
        if (!element) return;
        element.classList.remove('student-feedback-wrong', 'student-feedback-correct');
        element.removeAttribute('aria-invalid');
        element.removeAttribute('aria-describedby');
    }

    function observeAnswerState() {
        const observer = new MutationObserver(records => {
            records.forEach(record => {
                if (record.type !== 'attributes' || record.attributeName !== 'class') return;
                const element = record.target;
                if (!(element instanceof HTMLElement)) return;
                if (element.classList.contains('wrong') && !element.dataset.studentFeedbackWrongShown) {
                    element.dataset.studentFeedbackWrongShown = 'true';
                    announceWrong(element);
                }
                if (element.classList.contains('correct') && !element.dataset.studentFeedbackCorrectShown) {
                    element.dataset.studentFeedbackCorrectShown = 'true';
                    announceCorrect(element);
                }
            });
        });
        observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'] });
    }

    function init() {
        injectStyles();
        ensureRegion();
        observeAnswerState();
    }

    window.StudentFeedback = Object.freeze({
        wrong: announceWrong,
        markWrong,
        correct: announceCorrect,
        clear: clearState,
        show
    });

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
})();
