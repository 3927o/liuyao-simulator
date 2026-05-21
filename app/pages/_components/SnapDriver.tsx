'use client';

import { useEffect, useRef } from 'react';

const VIBRATE_MS = 12;
const THRESHOLD_PX = 80;        // 越过 section 边缘后再拉 80px 才触震 + 进入 commit 区
const RESISTANCE_FACTOR = 0.32; // 过阈值后阻力系数：每 1px 输入 = 0.32px 实际位移
const SETTLE_MS = 140;          // wheel / scrollbar 路径：scroll 静默 140ms 视为手势结束
const ANIM_MS = 540;            // 程序滚动锁定时长
const ANIM_TAIL_MS = 80;        // snap 动画末尾解锁前的小延时缓冲
const MAX_VISUAL_OVERSHOOT = 100; // wheel pull 模式视觉位移上限：阈值 80 之上只留 20px 的"给"，撞墙后 trackpad 怎么推都不动

/**
 * §SnapDriver · 边缘 pull-to-commit（手机 + 桌面均带阻力）
 *
 * 模型：把每个 [data-section] 当作一个长内容容器。section 内部允许任意原生滚动
 * （便于读长文）。只有当用户**滚出当前 section 的边缘**（顶/底）后继续拉，
 * 才进入"承诺区"。
 *
 * **触摸路径（移动端）—— iOS overscroll 式阻力：**
 *   - section 内部：原生滚动，不接管
 *   - 边缘 + 手指继续朝外：进入 pull 模式，`preventDefault` + JS 直接管 scrollY
 *   - 阻力曲线：0–80 线性 1:1；过 80 后按 0.32 衰减
 *   - 越过 80 触震
 *   - 松手：过线 → snap 到 ±1；未过 → 弹回边缘
 *
 * **滚轮路径（桌面）—— 复用 touch pull 同一套公式：**
 *   - section 内部：原生滚动
 *   - 边缘 + 滚轮继续朝外：进入 wheel pull，`preventDefault` + JS 管 scrollY
 *   - 阻力同 touch；**视觉再钳制在 ±MAX_VISUAL_OVERSHOOT**，trackpad 持续推也只多移那么多，磁吸感强
 *   - 反向回拉（朝 section 内部）→ 立即退出 pull，让 native 接管这一帧 wheel
 *   - 滚动静默 140ms 后 `commitOrSnapBack` 结算
 *
 * **scrollbar 拖拽** 不发 wheel/touch，绕过阻力；commitOrSnapBack 仍能 snap，
 * 但用户能直接拖过去——可接受的边缘情况。
 *
 * 外部跨章节跳转（IssueSpine 等）通过 window 上的 `obs:snap-to` 事件触发，绕过
 * pull/threshold 逻辑直达。
 *
 * 真正 commit 切换 section 时会广播 `obs:section-enter`，FxCinematicFlash 监听该事件
 * 播放转场动效。回弹（snapBack）和 clamp 后的无变化 snap 都不广播。
 */
export function SnapDriver() {
  const currentIdxRef = useRef(0);

  useEffect(() => {
    let sections = Array.from(document.querySelectorAll<HTMLElement>('[data-section]'));
    if (!sections.length) return;

    let vibrated = false;
    let isAnimating = false;
    let isTouching = false;
    let settleTimer: ReturnType<typeof setTimeout> | null = null;
    let animTimer: ReturnType<typeof setTimeout> | null = null;

    // Pull 模式状态（仅触摸路径用）
    let touchStartY = 0;
    let touchStartX = 0;
    let touchAxis: 'vertical' | 'horizontal' | 'undetermined' = 'undetermined';
    let pullActive = false;
    let pullStartScrollY = 0;
    let pullStartTouchY = 0;
    let pullAmount = 0; // raw 手指位移，不经阻力换算

    // Wheel 路径 pull 模式状态
    let wheelPullActive = false;
    let wheelPullStartScrollY = 0;
    let wheelPullRawAccum = 0;
    let wheelPullExpectedSign = 0; // +1 = 朝下 pull, -1 = 朝上 pull

    function isReaderOpen() {
      return document.querySelector('.obs-reader[data-open="1"]') != null;
    }

    function getActiveIdx() {
      const y = window.scrollY;
      for (let i = sections.length - 1; i >= 0; i--) {
        if (sections[i].offsetTop <= y + 1) return i;
      }
      return 0;
    }

    currentIdxRef.current = getActiveIdx();

    function getEdges(idx: number) {
      const sec = sections[idx];
      const top = sec.offsetTop;
      // bottom 是"section 底边对齐视口底边"时的 scrollY；对 ≤100vh section bottom = top
      const bottom = Math.max(top, sec.offsetTop + sec.offsetHeight - window.innerHeight);
      return { top, bottom };
    }

    function getPullDistance() {
      const sec = sections[currentIdxRef.current];
      if (!sec) return 0;
      const { top, bottom } = getEdges(currentIdxRef.current);
      const y = window.scrollY;
      if (y > bottom) return y - bottom;
      if (y < top) return y - top;
      return 0;
    }

    /** 阻力曲线：0–THRESHOLD 线性；之后 RESISTANCE_FACTOR 衰减 */
    function applyResistance(raw: number) {
      const sign = Math.sign(raw);
      const abs = Math.abs(raw);
      if (abs <= THRESHOLD_PX) return raw;
      const excess = abs - THRESHOLD_PX;
      return sign * (THRESHOLD_PX + excess * RESISTANCE_FACTOR);
    }

    function snapToIdx(idx: number, doVibrate = false) {
      idx = Math.max(0, Math.min(sections.length - 1, idx));
      if (isAnimating) return;
      const isChange = idx !== currentIdxRef.current;
      isAnimating = true;
      currentIdxRef.current = idx;
      window.scrollTo({ top: sections[idx].offsetTop, behavior: 'smooth' });
      if (isChange) {
        window.dispatchEvent(new CustomEvent('obs:section-enter', { detail: { idx } }));
      }
      if (doVibrate && typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(VIBRATE_MS);
      }
      if (animTimer) clearTimeout(animTimer);
      animTimer = setTimeout(() => { isAnimating = false; vibrated = false; }, ANIM_MS + ANIM_TAIL_MS);
    }

    function snapBack() {
      const sec = sections[currentIdxRef.current];
      if (!sec || isAnimating) return;
      const { top, bottom } = getEdges(currentIdxRef.current);
      const y = window.scrollY;
      const targetY = y > bottom ? bottom : y < top ? top : y;
      if (Math.abs(y - targetY) < 1) { vibrated = false; return; }
      isAnimating = true;
      window.scrollTo({ top: targetY, behavior: 'smooth' });
      if (animTimer) clearTimeout(animTimer);
      animTimer = setTimeout(() => { isAnimating = false; vibrated = false; }, ANIM_MS + ANIM_TAIL_MS);
    }

    function commitOrSnapBack() {
      if (isAnimating) return;
      const pull = getPullDistance();
      if (Math.abs(pull) > THRESHOLD_PX) {
        const targetIdx = pull > 0 ? currentIdxRef.current + 1 : currentIdxRef.current - 1;
        snapToIdx(targetIdx);
      } else if (pull !== 0) {
        snapBack();
      }
      // wheel 一次手势结束：清理 pull 状态
      wheelPullActive = false;
      wheelPullRawAccum = 0;
    }

    /** 触摸路径：到边缘后接管，应用阻力 */
    function onTouchStart(e: TouchEvent) {
      if (isReaderOpen() || e.touches.length !== 1) return;
      isTouching = true;
      pullActive = false;
      pullAmount = 0;
      touchStartY = e.touches[0].clientY;
      touchStartX = e.touches[0].clientX;
      touchAxis = 'undetermined';
    }

    function onTouchMove(e: TouchEvent) {
      if (!isTouching || isReaderOpen() || isAnimating) return;
      if (e.touches.length !== 1) return;
      const touchY = e.touches[0].clientY;
      const touchX = e.touches[0].clientX;

      if (!pullActive) {
        const dyFromStart = touchStartY - touchY; // > 0: 手指向上 = 内容向下
        const dxFromStart = touchStartX - touchX;

        // 首次决定性位移定轴 —— 横向锁定后让原生 carousel / scroll-snap 完整接管
        if (touchAxis === 'undetermined') {
          if (Math.abs(dxFromStart) >= 8 || Math.abs(dyFromStart) >= 8) {
            touchAxis = Math.abs(dxFromStart) > Math.abs(dyFromStart) ? 'horizontal' : 'vertical';
          } else {
            return; // 还没动够，等
          }
        }
        if (touchAxis === 'horizontal') return; // 横向手势 → 不进 pull，不 preventDefault

        // 纵向已锁定 —— 看是否到边缘 + 手指继续往外拉
        const { top, bottom } = getEdges(currentIdxRef.current);
        const y = window.scrollY;
        const atBottom = y >= bottom - 1;
        const atTop = y <= top + 1;

        if ((atBottom && dyFromStart > 0) || (atTop && dyFromStart < 0)) {
          // 边缘 + 朝外 → 进入 pull 模式
          pullActive = true;
          pullStartTouchY = touchY;
          pullStartScrollY = atBottom ? bottom : top;
        } else {
          return; // section 内部，让原生滚动接管
        }
      }

      // Pull 模式生效
      e.preventDefault();
      const rawDy = pullStartTouchY - touchY;
      pullAmount = rawDy;
      const adjusted = applyResistance(rawDy);
      window.scrollTo(0, pullStartScrollY + adjusted);

      // Schmitt 触发震动
      if (Math.abs(rawDy) > THRESHOLD_PX && !vibrated) {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(VIBRATE_MS);
        }
        vibrated = true;
      } else if (Math.abs(rawDy) < THRESHOLD_PX) {
        vibrated = false;
      }
    }

    function onTouchEnd() {
      if (!isTouching) return;
      isTouching = false;

      if (pullActive) {
        // 用 raw 手指位移决定 commit / spring-back（不是经过阻力的视觉位移）
        if (Math.abs(pullAmount) > THRESHOLD_PX) {
          const targetIdx = pullAmount > 0 ? currentIdxRef.current + 1 : currentIdxRef.current - 1;
          snapToIdx(targetIdx);
        } else {
          snapBack();
        }
        pullActive = false;
        pullAmount = 0;
      } else {
        // 没进入 pull 模式 —— 让 wheel/scrollbar 那条静默结算路径处理
        if (settleTimer) { clearTimeout(settleTimer); settleTimer = null; }
        commitOrSnapBack();
      }
    }

    /** 滚轮路径：到边缘后接管，应用阻力 + 视觉钳制 */
    function onWheel(e: WheelEvent) {
      if (isReaderOpen() || isAnimating || isTouching) return;

      const { top, bottom } = getEdges(currentIdxRef.current);
      const y = window.scrollY;
      const atBottom = y >= bottom - 1;
      const atTop = y <= top + 1;

      if (!wheelPullActive) {
        const outwardDown = atBottom && e.deltaY > 0;
        const outwardUp = atTop && e.deltaY < 0;
        if (!outwardDown && !outwardUp) return; // section 内部 → native scroll
        wheelPullActive = true;
        wheelPullStartScrollY = outwardDown ? bottom : top;
        wheelPullExpectedSign = outwardDown ? 1 : -1;
        wheelPullRawAccum = 0;
      }

      const newAccum = wheelPullRawAccum + e.deltaY;

      // 反向（朝 section 内部回拉）→ 立刻退出 pull，让 native 处理这一帧
      if (Math.sign(newAccum) === -wheelPullExpectedSign && newAccum !== 0) {
        wheelPullActive = false;
        wheelPullRawAccum = 0;
        window.scrollTo(0, wheelPullStartScrollY);
        return;
      }

      e.preventDefault();
      wheelPullRawAccum = newAccum;

      const adjusted = applyResistance(wheelPullRawAccum);
      const visual = Math.sign(adjusted) * Math.min(Math.abs(adjusted), MAX_VISUAL_OVERSHOOT);
      window.scrollTo(0, wheelPullStartScrollY + visual);

      // Schmitt 触发震动
      if (Math.abs(wheelPullRawAccum) > THRESHOLD_PX && !vibrated) {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(VIBRATE_MS);
        }
        vibrated = true;
      } else if (Math.abs(wheelPullRawAccum) < THRESHOLD_PX) {
        vibrated = false;
      }
    }

    /** 通用 scroll 监听：scrollbar 拖拽 / 程序滚动等没经 wheel 也没经 touch 的路径 */
    function onScroll() {
      if (isReaderOpen() || isAnimating || isTouching) return;

      if (settleTimer) clearTimeout(settleTimer);
      settleTimer = setTimeout(() => {
        if (!isTouching) commitOrSnapBack();
      }, SETTLE_MS);
    }

    function onKey(e: KeyboardEvent) {
      if (isReaderOpen() || isAnimating) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      const cur = currentIdxRef.current;
      if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        snapToIdx(cur + 1, true);
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        snapToIdx(cur - 1, true);
      } else if (e.key === 'Home') {
        e.preventDefault();
        snapToIdx(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        snapToIdx(sections.length - 1);
      }
    }

    function onResize() {
      sections = Array.from(document.querySelectorAll<HTMLElement>('[data-section]'));
      currentIdxRef.current = getActiveIdx();
    }

    /**
     * 外部跨章节跳转入口。
     *   detail.id  : 目标 section 的 DOM id（如 'p2'）
     *   detail.idx : 目标 section 的下标（与 id 二选一）
     */
    function onExternalSnap(e: Event) {
      const detail = (e as CustomEvent).detail;
      if (!detail) return;
      if (settleTimer) { clearTimeout(settleTimer); settleTimer = null; }
      if (typeof detail.idx === 'number') {
        snapToIdx(detail.idx);
      } else if (typeof detail.id === 'string') {
        const idx = sections.findIndex(s => s.id === detail.id);
        if (idx >= 0) snapToIdx(idx);
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('wheel', onWheel, { passive: false });  // preventDefault 必需
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });  // preventDefault 必需
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('touchcancel', onTouchEnd);
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    window.addEventListener('obs:snap-to', onExternalSnap);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('obs:snap-to', onExternalSnap);
      if (settleTimer) clearTimeout(settleTimer);
      if (animTimer) clearTimeout(animTimer);
    };
  }, []);

  return null;
}
