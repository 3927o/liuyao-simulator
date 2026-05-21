'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ARTICLES_META, ARTICLE_BODIES } from '../_articles/articles';

const ROMANS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface ArticleReaderProps {
  openIdx: number | null;  // null = closed; number = open at idx
  onClose: () => void;
}

/**
 * 文章 Reader 全屏 takeover。完全复刻 B-obsidian §7-8 的"翻杂志"动效：
 *
 * 打开 (~1.2s)：上下幕帘不对称入场 → 中央 hairline + §06.NN 标签 → 幕帘退开同时
 *   masthead / h1 / deck / dropcap / roman 按 220 / 150 / 50 / 200 / 280ms staged reveal
 * 翻篇 (~600ms)：ghost overlay crossfade，real stage 从反方向滑入，~280ms 双页同框
 *   触发途径：键盘 ←/→、触摸横向滑动
 * 关闭：反向幕帘 + 中央换成 FIN 标签
 */
export function ArticleReader({ openIdx, onClose }: ArticleReaderProps) {
  const [mounted, setMounted] = useState(false);
  const [currentIdx, setCurrentIdx] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // refs to DOM nodes — animations need imperative access
  const readerRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const romanRef = useRef<HTMLSpanElement>(null);
  const progressFillRef = useRef<HTMLDivElement>(null);
  const curtainLabelRef = useRef<HTMLSpanElement>(null);
  const savedScrollY = useRef(0);
  const isAnimatingRef = useRef(false);

  useEffect(() => { setMounted(true); }, []);

  // ── curtain helpers ────────────────────────────────────────────
  const setCurtainLabel = useCallback((text: string) => {
    const el = curtainLabelRef.current;
    if (el) el.textContent = text;
  }, []);

  const curtainIn = useCallback(async (label: string) => {
    setCurtainLabel(label);
    document.body.classList.remove('curtain-out');
    // force reflow so a freshly-removed `out` doesn't bleed into `in`
    void document.body.offsetWidth;
    document.body.classList.add('curtain-in');
    await sleep(420); // bottom curtain delay 60 + dur 360
  }, [setCurtainLabel]);

  // ── populate ──────────────────────────────────────────────────
  // After React renders the new article, inject .deck class + dropcap + endmark
  // and reset next-nav handlers + scroll.
  const afterPopulate = useCallback((idx: number) => {
    const body = bodyRef.current;
    if (!body) return;

    // Find first <p> after <h1> and turn it into the deck w/ dropcap
    const h1 = body.querySelector('h1');
    if (h1) {
      let sib: Element | null = h1.nextElementSibling;
      while (sib && sib.tagName !== 'P') sib = sib.nextElementSibling;
      if (sib && !sib.querySelector('.dropcap')) {
        sib.classList.add('deck');
        applyDropCap(sib as HTMLParagraphElement);
      }
    }

    // Endmark on last paragraph
    const allParas = body.querySelectorAll('p');
    const lastPara = allParas[allParas.length - 1];
    if (lastPara && !lastPara.querySelector('.endmark')) {
      const em = document.createElement('span');
      em.className = 'endmark';
      em.setAttribute('aria-hidden', 'true');
      lastPara.appendChild(em);
    }

    // Reset scroll and progress
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    if (progressFillRef.current) progressFillRef.current.style.width = '0%';

    // Update roman numeral
    if (romanRef.current) romanRef.current.textContent = ROMANS[idx] ?? String(idx + 1);
  }, []);

  // ── pageTurn ──────────────────────────────────────────────────
  const pageTurn = useCallback(async (toIdx: number) => {
    if (isAnimatingRef.current) return;
    if (toIdx === currentIdx) return;
    if (toIdx < 0 || toIdx >= ARTICLES_META.length) return;
    const scroll = scrollRef.current;
    const stage = stageRef.current;
    if (!scroll || !stage) return;
    isAnimatingRef.current = true;

    const goingNext = toIdx > (currentIdx ?? 0);
    const scrollTop = scroll.scrollTop;
    const scrollRect = scroll.getBoundingClientRect();

    // ghost overlay holds the OLD content while real stage repopulates underneath
    const overlay = document.createElement('div');
    overlay.style.cssText = `position: fixed; left: ${scrollRect.left}px; top: ${scrollRect.top}px;
      width: ${scrollRect.width}px; height: ${scrollRect.height}px;
      overflow: hidden; pointer-events: none; z-index: 305;`;

    const ghost = stage.cloneNode(true) as HTMLElement;
    ghost.style.cssText = `position: absolute; top: ${-scrollTop}px; left: 0; right: 0;
      will-change: transform, opacity; transform: translateX(0); opacity: 1; margin: 0;`;
    const ghostRail = ghost.querySelector('.reader-rail');
    if (ghostRail) ghostRail.remove();

    overlay.appendChild(ghost);
    document.body.appendChild(overlay);

    // populate real stage with new content
    setCurrentIdx(toIdx);
    // wait for React to commit
    await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));
    afterPopulate(toIdx);

    stage.style.transition = 'none';
    stage.style.transform = `translateX(${goingNext ? 6 : -6}%)`;
    stage.style.opacity = '0';

    await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));

    ghost.style.transition = 'transform 0.46s cubic-bezier(.55, 0, .35, 1), opacity 0.36s cubic-bezier(.6,0,.9,.4)';
    ghost.style.transform = `translateX(${goingNext ? -6 : 6}%)`;
    ghost.style.opacity = '0';

    await sleep(100);
    stage.style.transition = 'transform 0.48s cubic-bezier(.16, .82, .3, 1), opacity 0.42s cubic-bezier(.16,.82,.3,1)';
    stage.style.transform = '';
    stage.style.opacity = '';

    await sleep(500);
    overlay.remove();
    stage.style.transition = '';
    stage.style.transform = '';
    stage.style.opacity = '';
    isAnimatingRef.current = false;
  }, [currentIdx, afterPopulate]);

  // ── open from list ────────────────────────────────────────────
  useEffect(() => {
    if (openIdx == null) return;
    // Already open & same idx → no-op
    if (isOpen && currentIdx === openIdx) return;

    let cancelled = false;
    async function doOpen() {
      if (isAnimatingRef.current) return;
      isAnimatingRef.current = true;
      savedScrollY.current = window.scrollY;
      const meta = ARTICLES_META[openIdx!];
      await curtainIn(`§06.${meta.num} · ${meta.tag}`);
      if (cancelled) { isAnimatingRef.current = false; return; }

      // populate behind the curtain
      setIsOpen(true);
      setCurrentIdx(openIdx);
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';

      // wait for React to render the body
      await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));
      afterPopulate(openIdx!);

      await sleep(120);

      // Curtains retreat + staged reveal — fire TOGETHER (chat2: critical timing)
      document.body.classList.remove('curtain-in');
      document.body.classList.add('curtain-out');
      bodyRef.current?.classList.add('is-revealing');
      romanRef.current?.classList.add('is-revealing');

      await sleep(580);
      if (cancelled) return;
      document.body.classList.remove('curtain-out');
      setCurtainLabel('');
      isAnimatingRef.current = false;

      // Clean up reveal class once animations finish
      setTimeout(() => {
        bodyRef.current?.classList.remove('is-revealing');
        romanRef.current?.classList.remove('is-revealing');
      }, 1100);
    }

    doOpen();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openIdx]);

  // ── close ─────────────────────────────────────────────────────
  const closeReader = useCallback(async () => {
    if (isAnimatingRef.current) return;
    isAnimatingRef.current = true;
    await curtainIn('FIN');
    setIsOpen(false);
    setCurrentIdx(null);
    bodyRef.current?.classList.remove('is-revealing');
    romanRef.current?.classList.remove('is-revealing');
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    window.scrollTo(0, savedScrollY.current);
    await sleep(80);
    document.body.classList.remove('curtain-in');
    document.body.classList.add('curtain-out');
    await sleep(580);
    document.body.classList.remove('curtain-out');
    setCurtainLabel('');
    isAnimatingRef.current = false;
    onClose();
  }, [curtainIn, onClose, setCurtainLabel]);

  // Once isOpen + idx + DOM are all in place, after re-renders, also rerun afterPopulate
  useEffect(() => {
    if (isOpen && currentIdx != null) {
      afterPopulate(currentIdx);
    }
  }, [isOpen, currentIdx, afterPopulate]);

  // ── keyboard & scroll progress ────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.preventDefault(); closeReader(); }
      else if (e.key === 'ArrowRight' && currentIdx != null && currentIdx < ARTICLES_META.length - 1) {
        e.preventDefault();
        if (navigator.vibrate) navigator.vibrate(6);
        pageTurn(currentIdx + 1);
      } else if (e.key === 'ArrowLeft' && currentIdx != null && currentIdx > 0) {
        e.preventDefault();
        if (navigator.vibrate) navigator.vibrate(6);
        pageTurn(currentIdx - 1);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, currentIdx, closeReader, pageTurn]);

  useEffect(() => {
    if (!isOpen) return;
    const scroll = scrollRef.current;
    if (!scroll) return;
    function update() {
      const max = scroll!.scrollHeight - scroll!.clientHeight;
      const pct = max > 0 ? (scroll!.scrollTop / max) * 100 : 0;
      if (progressFillRef.current) progressFillRef.current.style.width = `${pct}%`;
    }
    scroll.addEventListener('scroll', update, { passive: true });
    return () => scroll.removeEventListener('scroll', update);
  }, [isOpen, currentIdx]);

  // ── touch gestures (direction-locked) ─────────────────────────
  //
  // 先 12px 阈值识别方向（h 需要 1.3× of v），然后锁定为：
  //   · 'h' → 横滑切文章 stage.translateX + 透明度衰减，触发 22vw 阈值则 pageTurn
  //   · 'v' atTop + 下拉 → drag-to-close（frame.translateY + 透明度），110px 阈值关闭
  //   · 其他 'v' 走原生滚动
  useEffect(() => {
    if (!isOpen) return;
    const scroll = scrollRef.current;
    if (!scroll) return;

    type Dir = 'h' | 'v' | null;
    const touch = {
      startX: null as number | null,
      startY: null as number | null,
      dir: null as Dir,
      atTop: false,
      dragX: 0,
      dragY: 0,
    };

    function getStage(): HTMLElement | null {
      return scroll!.querySelector<HTMLElement>('.reader-stage');
    }
    function getFrame(): HTMLElement | null {
      // reader-frame is sibling-ish; query from the dialog root
      return readerRef.current?.querySelector<HTMLElement>('.reader-frame') ?? null;
    }

    function onTouchStart(e: TouchEvent) {
      if (isAnimatingRef.current || e.touches.length !== 1) return;
      touch.startX = e.touches[0].clientX;
      touch.startY = e.touches[0].clientY;
      touch.dir = null;
      touch.dragX = 0;
      touch.dragY = 0;
      touch.atTop = scroll!.scrollTop <= 1;
    }

    function onTouchMove(e: TouchEvent) {
      if (touch.startX == null || isAnimatingRef.current) return;
      const dx = e.touches[0].clientX - touch.startX;
      const dy = e.touches[0].clientY - touch.startY!;

      if (!touch.dir) {
        if (Math.abs(dx) > 12 || Math.abs(dy) > 12) {
          touch.dir = Math.abs(dx) > Math.abs(dy) * 1.3 ? 'h' : 'v';
        } else return;
      }

      if (touch.dir === 'h') {
        touch.dragX = dx;
        let drag = dx;
        // 边界橡皮筋衰减
        if ((currentIdx ?? 0) <= 0 && drag > 0) drag *= 0.35;
        if ((currentIdx ?? 0) >= ARTICLES_META.length - 1 && drag < 0) drag *= 0.35;
        const stage = getStage();
        if (stage) {
          stage.style.transition = 'none';
          stage.style.transform = `translateX(${drag}px)`;
          stage.style.opacity = `${Math.max(0.4, 1 - Math.abs(drag) / 900)}`;
        }
      } else if (touch.dir === 'v') {
        // atTop + 下拉 → drag-to-close
        if (touch.atTop && dy > 0) {
          e.preventDefault();
          touch.dragY = dy;
          const frame = getFrame();
          if (frame) {
            frame.style.transition = 'none';
            frame.style.transform = `translateY(${dy * 0.85}px)`;
            frame.style.opacity = `${Math.max(0.5, 1 - dy / 700)}`;
          }
        }
        // 其他 v：让原生滚动接管
      }
    }

    function onTouchEnd() {
      if (touch.startX == null) return;

      if (touch.dir === 'h') {
        const threshold = window.innerWidth * 0.22;
        const stage = getStage();
        if (touch.dragX < -threshold && currentIdx != null && currentIdx < ARTICLES_META.length - 1) {
          if (stage) { stage.style.transition = ''; stage.style.transform = ''; stage.style.opacity = ''; }
          if (navigator.vibrate) navigator.vibrate(10);
          pageTurn(currentIdx + 1);
        } else if (touch.dragX > threshold && currentIdx != null && currentIdx > 0) {
          if (stage) { stage.style.transition = ''; stage.style.transform = ''; stage.style.opacity = ''; }
          if (navigator.vibrate) navigator.vibrate(10);
          pageTurn(currentIdx - 1);
        } else if (stage) {
          // 回弹
          stage.style.transition = 'transform 0.34s cubic-bezier(.2,.7,.2,1), opacity 0.34s ease';
          stage.style.transform = '';
          stage.style.opacity = '';
          setTimeout(() => { stage.style.transition = ''; }, 360);
        }
      } else if (touch.dir === 'v' && touch.atTop && touch.dragY > 0) {
        // drag-to-close 结算
        const frame = getFrame();
        if (touch.dragY > 110) {
          if (navigator.vibrate) navigator.vibrate(12);
          closeReader();
          if (frame) {
            setTimeout(() => { frame.style.transition = ''; frame.style.transform = ''; frame.style.opacity = ''; }, 700);
          }
        } else if (frame) {
          frame.style.transition = 'transform 0.34s cubic-bezier(.2,.7,.2,1), opacity 0.34s ease';
          frame.style.transform = '';
          frame.style.opacity = '';
          setTimeout(() => { frame.style.transition = ''; }, 360);
        }
      }

      touch.startX = null;
      touch.startY = null;
      touch.dir = null;
    }

    scroll.addEventListener('touchstart', onTouchStart, { passive: true });
    scroll.addEventListener('touchmove', onTouchMove, { passive: false });
    scroll.addEventListener('touchend', onTouchEnd);
    return () => {
      scroll.removeEventListener('touchstart', onTouchStart);
      scroll.removeEventListener('touchmove', onTouchMove);
      scroll.removeEventListener('touchend', onTouchEnd);
    };
  }, [isOpen, currentIdx, pageTurn, closeReader]);

  // ── render ─────────────────────────────────────────────────────
  const meta = currentIdx != null ? ARTICLES_META[currentIdx] : null;

  if (!mounted) return null;

  return createPortal(
    <>
      <div
        id="obs-reader"
        className="obs-reader"
        lang="zh-CN"
        data-open={isOpen ? '1' : '0'}
        role="dialog"
        aria-modal="true"
        aria-label="文章"
        ref={readerRef}
      >
        <div className="reader-noise" />
        <div className="reader-frame">
          <div className="reader-progress"><div className="fill" ref={progressFillRef} /></div>

          <header className="reader-chrome">
            <div className="left">
              <span className="sq" />
              {meta && (
                <span className="meta">
                  <span className="num">§06.{meta.num}</span>
                  <span className="sep">·</span>
                  <span className="title">{meta.title}</span>
                </span>
              )}
            </div>
            <div className="kbd-hint">
              <kbd>←</kbd><kbd>→</kbd> 翻篇 &nbsp; <kbd>ESC</kbd> 关闭
            </div>
            <button className="reader-close" onClick={closeReader} aria-label="Close">×</button>
          </header>

          <div className="reader-scroll" ref={scrollRef}>
            <div className="reader-stage" ref={stageRef}>
              <aside className="reader-rail">
                <span className="reader-roman" ref={romanRef}>
                  {currentIdx != null ? (ROMANS[currentIdx] ?? String(currentIdx + 1)) : 'I'}
                </span>
              </aside>

              <div className="reader-body" ref={bodyRef}>
                {meta && (
                  <div className="masthead">
                    <span className="num">NO. {meta.num}</span>
                    <span className="key">·</span>
                    <span className="val">{meta.tag}</span>
                    <span className="stretch" />
                    <span className="key">FILED</span>
                    <span className="val">{meta.date}</span>
                    <span className="key">·</span>
                    <span className="val">{meta.read}</span>
                  </div>
                )}
                {currentIdx != null && ARTICLE_BODIES[currentIdx]}
              </div>

              <nav className="reader-next">
                <a
                  className="back"
                  href="#"
                  onClick={(e) => { e.preventDefault(); closeReader(); }}
                >
                  <span className="arrow">←</span>
                  <span>回到 文章目录</span>
                </a>
              </nav>
            </div>
          </div>
        </div>
      </div>

      <div className="obs-reader-curtain top" aria-hidden="true" />
      <div className="obs-reader-curtain bottom" aria-hidden="true" />
      <div className="obs-reader-curtain-label" aria-hidden="true">
        <span className="lbl" ref={curtainLabelRef} />
      </div>
    </>,
    document.body
  );
}

/**
 * Inject a .dropcap span over the first non-whitespace character of <p>.
 * 兼容首字是中文 / 标点 / 英文 / 已有内联标签的情况。
 */
function applyDropCap(p: HTMLParagraphElement) {
  function findFirstTextNode(node: Node): Text | null {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE && (child as Text).nodeValue?.trim().length) return child as Text;
      if (child.nodeType === Node.ELEMENT_NODE) {
        const found = findFirstTextNode(child);
        if (found) return found;
      }
    }
    return null;
  }
  const firstText = findFirstTextNode(p);
  if (!firstText) return;
  const raw = firstText.nodeValue ?? '';
  let i = 0;
  while (i < raw.length && /\s/.test(raw[i])) i++;
  if (i >= raw.length) return;
  const firstChar = raw[i];
  const before = raw.slice(0, i);
  const after = raw.slice(i + 1);
  const parent = firstText.parentNode!;
  const span = document.createElement('span');
  span.className = 'dropcap';
  span.textContent = firstChar;
  parent.insertBefore(document.createTextNode(before), firstText);
  parent.insertBefore(span, firstText);
  parent.insertBefore(document.createTextNode(after), firstText);
  parent.removeChild(firstText);
}
