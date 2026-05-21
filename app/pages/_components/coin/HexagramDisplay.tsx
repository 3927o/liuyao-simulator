'use client';

import { useMemo } from 'react';
import type { HexagramResult, YaoValue } from '../../../../lib/LiuYaoEngine';

interface HexagramDisplayProps {
  yaoList: YaoValue[];
  hexagram: HexagramResult | null;
}

/**
 * §04 FIG·02：本卦 · 动爻 · 变卦。
 * 6 行爻位（上爻在顶 / 初爻在底），随 yaoList 增长逐行点亮。
 * 阳 = 一条整线、阴 = 两段断线、动爻 = acid 色 + O / ✕ 标记。
 * 6 爻满后底部追加 "本卦 → 变卦 · 宫" 行。
 */
export function HexagramDisplay({ yaoList, hexagram }: HexagramDisplayProps) {
  // 渲染顺序：上爻先（index 5 → 0）
  const rows = useMemo(() => {
    const out: { idx: number; v: YaoValue | null }[] = [];
    for (let i = 5; i >= 0; i--) {
      out.push({ idx: i, v: yaoList[i] ?? null });
    }
    return out;
  }, [yaoList]);

  return (
    <div className="cell placeholder">
      <span className="corner">FIG · 02</span>

      <div className="gua">
        {rows.map(({ idx, v }) => {
          const cls = yaoClass(v);
          return (
            <div key={idx} className={`yao ${cls}`}>
              <div className="seg" />
              <div className="gap-mid" />
              <div className="seg" />
            </div>
          );
        })}

        {hexagram ? (
          <div className="name">
            <span className="palace">{hexagram.palace}宫</span>
            <span className="b">{hexagram.name}</span>
            {hexagram.changedName && hexagram.changedName !== hexagram.name && hasAnyMoving(yaoList) && (
              <>
                <span className="arrow">→</span>
                <span>{hexagram.changedName}</span>
              </>
            )}
          </div>
        ) : (
          <div className="name">
            <span className="palace">本卦 · 动爻 · 变卦</span>
            <span style={{ color: 'var(--ink-3)', fontSize: 11, letterSpacing: '0.22em', fontFamily: 'var(--mono)', textTransform: 'uppercase' }}>
              {yaoList.length}/6
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function yaoClass(v: YaoValue | null): string {
  if (v == null) return '';
  // 6: 老阴, 7: 少阳, 8: 少阴, 9: 老阳
  const isYang = v === 7 || v === 9;
  const isMoving = v === 6 || v === 9;
  return `filled ${isYang ? 'yang' : 'yin'} ${isMoving ? 'move' : ''}`.trim();
}

function hasAnyMoving(yaoList: YaoValue[]): boolean {
  return yaoList.some(v => v === 6 || v === 9);
}
