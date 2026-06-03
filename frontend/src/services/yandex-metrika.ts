const COUNTER_ID = import.meta.env.VITE_YANDEX_METRIKA_COUNTER_ID as string | undefined;
const SCRIPT_ID = 'yandex-metrika-script';

declare global {
  interface Window {
    ym?: (...args: unknown[]) => void;
  }
}

export function initYandexMetrika() {
  if (!COUNTER_ID || typeof window === 'undefined') {
    return;
  }

  const counterNumber = Number(COUNTER_ID);
  if (!Number.isFinite(counterNumber)) {
    return;
  }

  if (!window.ym) {
    const queuedYm = function (...args: unknown[]) {
      (queuedYm.a = queuedYm.a || []).push(args);
    } as typeof window.ym & { a?: unknown[][]; l?: number };

    queuedYm.l = Date.now();
    window.ym = queuedYm;
  }

  if (!document.getElementById(SCRIPT_ID)) {
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.async = true;
    script.src = 'https://mc.yandex.ru/metrika/tag.js';
    document.head.appendChild(script);
  }

  window.ym(counterNumber, 'init', {
    clickmap: true,
    trackLinks: true,
    accurateTrackBounce: true,
    webvisor: false,
  });
}

export function trackYandexPageView(path: string) {
  if (!COUNTER_ID || !window.ym) {
    return;
  }

  const counterNumber = Number(COUNTER_ID);
  if (!Number.isFinite(counterNumber)) {
    return;
  }

  window.ym(counterNumber, 'hit', path);
}
