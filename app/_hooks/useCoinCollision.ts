'use client';

import { useCallback, useRef } from 'react';
import { coinAudioManager } from '../_lib/CoinAudioManager';
import { COIN_CONFIG } from '../_lib/sceneConfig';

const { vibration } = COIN_CONFIG;

export function useCoinCollision() {
  const lastCollisionTime = useRef(0);

  const handleCollision = useCallback(() => {
    const now = Date.now();

    // 冷却时间检查（从配置读取）
    if (now - lastCollisionTime.current < vibration.cooldown) {
      return;
    }

    lastCollisionTime.current = now;

    // 随机力度模拟不同碰撞强度
    const velocity = 0.3 + Math.random() * 0.7;

    // 1. 触发震动反馈（从配置读取时长范围）
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      const [minDuration, maxDuration] = vibration.duration;
      const duration = Math.round(minDuration + velocity * (maxDuration - minDuration));
      navigator.vibrate(duration);
    }

    // 2. 播放碰撞音效
    coinAudioManager.playCollision(velocity);
  }, []);

  return { handleCollision };
}
