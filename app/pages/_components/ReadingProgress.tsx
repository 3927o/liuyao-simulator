'use client';

import { useEffect, useRef } from 'react';

/**
 * 顶部 1.5px acid 进度条，滚动时显示，停下 800ms 后淡出。
 */
export function ReadingProgress() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let idleTimer: ReturnType<typeof setTimeout> | null = null;
    function setProg() {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const pct = max > 0 ? (window.scrollY / max) * 100 : 0;
      el!.style.width = `${pct}%`;
      el!.classList.add('active');
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => el!.classList.remove('active'), 800);
    }

    window.addEventListener('scroll', setProg, { passive: true });
    setProg();
    const initialFade = setTimeout(() => el.classList.remove('active'), 1200);

    return () => {
      window.removeEventListener('scroll', setProg);
      if (idleTimer) clearTimeout(idleTimer);
      clearTimeout(initialFade);
    };
  }, []);

  return <div className="progress" ref={ref} />;
}
