'use client';

import { useEffect, useMemo, useState } from 'react';
import type { HexagramResult, LineResult } from '../../../../lib/LiuYaoEngine';
import { getInterpretation } from './interpretations';

interface AIReadingProps {
  hexagram: HexagramResult | null;
  yaoCount: number;
}

/**
 * §04 FIG·03：AI 解读视图（模拟）。
 *
 * 6 爻未满 → STAND BY + 8-frame spinner + 短横线占位
 * 6 爻刚满 → §04.AI · DRAFTING（约 600ms）→ typewriter 逐字打出解读
 * 完成 → 末尾 FILED · timestamp
 *
 * 不接真实 LLM；文本来自 interpretations.ts 的卦象映射 + 上下文拼接。
 */
export function AIReading({ hexagram, yaoCount }: AIReadingProps) {
  const [phase, setPhase] = useState<'standby' | 'drafting' | 'typing' | 'done'>('standby');
  const [typed, setTyped] = useState('');
  const [filedAt, setFiledAt] = useState('');

  // 计算用神 + 完整文本
  const fullText = useMemo(() => {
    if (!hexagram) return '';
    const yongShenLine = pickYongShen(hexagram);
    const shiLine = hexagram.lines.find(l => l.isShi);
    const yingLine = hexagram.lines.find(l => l.isYing);
    const hasMoving = hexagram.lines.some(l => l.isMoving);
    return getInterpretation({
      hexName: hexagram.name,
      changedName: hexagram.changedName,
      palace: hexagram.palace,
      palaceElement: hexagram.palaceElement,
      yongShen: yongShenLine?.relation,
      shi: shiLine?.index,
      ying: yingLine?.index,
      hasMoving,
    });
  }, [hexagram]);

  // 6 爻 → 进入 drafting → typing
  useEffect(() => {
    if (yaoCount < 6 || !hexagram) {
      setPhase('standby');
      setTyped('');
      setFiledAt('');
      return;
    }
    setPhase('drafting');
    const t1 = setTimeout(() => setPhase('typing'), 700);
    return () => clearTimeout(t1);
  }, [yaoCount, hexagram]);

  // typewriter
  useEffect(() => {
    if (phase !== 'typing' || !fullText) return;
    let i = 0;
    const totalChars = fullText.length;
    const stepDelay = Math.max(14, Math.min(28, 5000 / totalChars));
    const tick = () => {
      i++;
      setTyped(fullText.slice(0, i));
      if (i < totalChars) {
        timer = setTimeout(tick, stepDelay);
      } else {
        setPhase('done');
        setFiledAt(formatNow());
      }
    };
    let timer = setTimeout(tick, stepDelay);
    return () => clearTimeout(timer);
  }, [phase, fullText]);

  return (
    <div className="cell placeholder">
      <span className="corner">FIG · 03</span>

      <div className="reading">
        <div className="head">
          <span>用神</span>
          <span className="sep">·</span>
          <span>世应</span>
          <span className="sep">·</span>
          <span>AI</span>
        </div>

        {phase === 'standby' && (
          /* 与设计 .reading 占位 sketch 一致：spinner 标签 + full/short/hi 几根线条，
             其中 .l.hi 是 acid 实色高亮短横（DESIGN-NOTES §6.5 visual-grid placeholder 语言） */
          <div className="standby">
            <span>
              <span className="spinner">
                {Array.from({ length: 8 }).map((_, i) => <i key={i} />)}
              </span>
              STAND BY · 等待 {6 - yaoCount} 爻
            </span>
            <div className="l full" />
            <div className="l m" />
            <div className="l hi" />
            <div className="l full" />
            <div className="l s" />
            <div className="l m" />
          </div>
        )}

        {phase === 'drafting' && (
          <div className="drafting">§04.AI · DRAFTING</div>
        )}

        {(phase === 'typing' || phase === 'done') && (
          <>
            <div className="drafting">§04.AI · {phase === 'typing' ? 'DRAFTING' : 'FILED'}</div>
            <div className="text" style={{ whiteSpace: 'pre-wrap' }}>
              {typed}
              {phase === 'typing' && <span className="cursor" />}
            </div>
            {phase === 'done' && (
              <div className="filed">FILED · {filedAt}</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * 简化用神选择：取本卦中"妻财"作为问财的默认用神；
 * 若无妻财，回退到"官鬼"（问事 / 求职常用）；都无则取世爻六亲。
 */
function pickYongShen(hex: HexagramResult): LineResult | undefined {
  return hex.lines.find(l => l.relation === '妻财')
    ?? hex.lines.find(l => l.relation === '官鬼')
    ?? hex.lines.find(l => l.isShi);
}

function formatNow(): string {
  const d = new Date();
  const Y = d.getFullYear();
  const M = String(d.getMonth() + 1).padStart(2, '0');
  const D = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${Y}.${M}.${D} ${h}:${m}`;
}
