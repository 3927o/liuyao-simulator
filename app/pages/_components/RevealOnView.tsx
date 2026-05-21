'use client';

import { useEffect, useRef } from 'react';

/**
 * 通用入场观察：进入视口 10% 时给元素加 .in。给 .reveal / .thought / .dateline 用。
 */
export function useRevealOnView<T extends Element>(threshold = 0.1) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) e.target.classList.add('in');
        });
      },
      { threshold }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return ref;
}
