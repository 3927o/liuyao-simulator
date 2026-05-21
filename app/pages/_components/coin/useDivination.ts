'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { YaoValue } from '../../../../lib/LiuYaoEngine';

const SETTLE_DELAY = 500;
const NEXT_LINE_DELAY = 1500;

type CoinResult = '阳' | '阴' | '侧立';

interface DivinationState {
  yaoList: YaoValue[];
  currentResults: Record<string, CoinResult>;
  resetSignal: number;
  isShaking: boolean;
  attempt: number;
}

/**
 * Project II 的状态机。
 * 6 爻闭环：每一组 3 枚硬币结算 → 推一爻 → 自动 reset → 摇下一组。
 * 满 6 爻后停止接收新的硬币结果，等 reset() 重新开始。
 */
export function useDivination() {
  const [state, setState] = useState<DivinationState>({
    yaoList: [],
    currentResults: {},
    resetSignal: 0,
    isShaking: false,
    attempt: 1,
  });

  const isFinished = state.yaoList.length === 6;

  const onShake = useCallback(() => {
    setState(s => (s.isShaking || isFinished ? s : { ...s, isShaking: true }));
  }, [isFinished]);

  const onCoinSettle = useCallback((id: string, result: CoinResult) => {
    setState(s => {
      // 没经过摇动 / 已结束，忽略
      if (!s.isShaking || s.yaoList.length >= 6) return s;
      return { ...s, currentResults: { ...s.currentResults, [id]: result } };
    });
  }, []);

  // 三枚硬币都有结果时结算
  useEffect(() => {
    if (state.yaoList.length >= 6) return;
    const ids = ['COIN-01', 'COIN-02', 'COIN-03'];
    const results = ids.map(id => state.currentResults[id]);
    if (results.some(r => !r)) return;
    // 有侧立则提示重摇（这里直接重置等下一次摇）
    if (results.some(r => r === '侧立')) {
      const t = setTimeout(() => {
        setState(s => ({ ...s, currentResults: {}, resetSignal: s.resetSignal + 1, isShaking: false, attempt: s.attempt + 1 }));
      }, 600);
      return () => clearTimeout(t);
    }

    const yangCount = results.filter(r => r === '阳').length;
    const map: Record<number, YaoValue> = { 0: 6, 1: 7, 2: 8, 3: 9 };
    const newYao = map[yangCount];

    const t = setTimeout(() => {
      setState(s => {
        if (s.yaoList.length >= 6) return s;
        return { ...s, yaoList: [...s.yaoList, newYao], currentResults: {} };
      });
    }, SETTLE_DELAY);
    return () => clearTimeout(t);
  }, [state.currentResults, state.yaoList.length]);

  // 进下一爻自动 reset 硬币
  const yaoCount = state.yaoList.length;
  const prevCountRef = useRef(0);
  useEffect(() => {
    if (yaoCount > prevCountRef.current && yaoCount < 6) {
      const t = setTimeout(() => {
        setState(s => ({ ...s, resetSignal: s.resetSignal + 1, isShaking: false, attempt: s.attempt + 1 }));
      }, NEXT_LINE_DELAY);
      prevCountRef.current = yaoCount;
      return () => clearTimeout(t);
    }
    prevCountRef.current = yaoCount;
  }, [yaoCount]);

  const reset = useCallback(() => {
    setState(s => ({
      yaoList: [],
      currentResults: {},
      resetSignal: s.resetSignal + 1,
      isShaking: false,
      attempt: 1,
    }));
  }, []);

  return {
    yaoList: state.yaoList,
    resetSignal: state.resetSignal,
    attempt: state.attempt,
    isFinished,
    onShake,
    onCoinSettle,
    reset,
  };
}
