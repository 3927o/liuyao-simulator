'use client'

import React, { useState, useMemo, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { LiuYaoEngine, YaoValue } from '@/lib/LiuYaoEngine';
import type { HexagramResult } from '@/lib/LiuYaoEngine';
import { TimeBot } from '@/lib/TimeBot';
import { ChevronDown, RotateCcw } from 'lucide-react';
import { HexagramDiagram } from './HexagramDiagram';
import { getNowParts } from '@/lib/calendar';
import { saveHistory, isYaoList, type DivinationRecord, type Interpretation } from '@/lib/divinationHistory';
import { InterpretationPanel } from '../_components/ui/InterpretationPanel';
import { ModuleNav } from '../_components/ui/ModuleNav';
import { useHistoryRecords } from '../_hooks/useHistoryRecords';

// === 实例化工具类 ===
const engine = new LiuYaoEngine();
const timeBot = new TimeBot();

// === 辅助定义 ===
const YAO_OPTIONS: { value: YaoValue; label: string; symbol: string }[] = [
  { value: 8, label: '少阴', symbol: '- -' },
  { value: 7, label: '少阳', symbol: '---' },
  { value: 6, label: '老阴', symbol: '-X-' },
  { value: 9, label: '老阳', symbol: '-O-' },
];

function DivinationContent({ record, initialLines, initialParts, unsaved }: {
  record?: DivinationRecord;
  initialLines?: YaoValue[];
  initialParts?: { date: string; time: string };
  unsaved: boolean;
}) {
  const [parts, setParts] = useState(() => record ? { date: record.datePart, time: record.timePart } : initialParts ?? getNowParts());
  const datePart = parts.date;
  const timePart = parts.time;
  const [lines, setLines] = useState<YaoValue[]>(() => record?.module === 'liuyao' ? record.lines : initialLines ?? [9, 7, 7, 8, 8, 6]);
  const [saved, setSaved] = useState(record);
  const savedIdRef = useRef(record?.id);
  const [question, setQuestion] = useState(record?.question ?? '');
  const [interpretation, setInterpretation] = useState(record?.interpretation);
  const [historyMessage, setHistoryMessage] = useState(record ? '历史记录已恢复' : '');
  const [historyError, setHistoryError] = useState(unsaved ? '自动保存失败，请点击保存记录重试' : '');

  // 2. 实时计算
  const result = useMemo(() => {
    try {
      if (!datePart || !timePart) return null;
      
      const timeInfo = timeBot.getTimeForParts(datePart, timePart);
      // 获取排盘
      const hexInfo = engine.process(lines, timeInfo.dayStem);
      
      return { time: timeInfo, hex: hexInfo };
    } catch (e) {
      console.error(e);
      return null;
    }
  }, [datePart, timePart, lines]);

  function persist(answer?: Interpretation) {
    if (!result) return;
    if (answer) setInterpretation(answer);
    try {
      const next = saveHistory({ module: 'liuyao', datePart, timePart, lines },
        { id: savedIdRef.current, question, interpretation: answer ?? interpretation });
      savedIdRef.current = next.id;
      setSaved(next); setHistoryMessage('已保存到历史'); setHistoryError('');
    } catch (error) { setHistoryError(error instanceof Error ? error.message : '保存失败'); }
  }

  function detachReading() {
    savedIdRef.current = undefined;
    setSaved(undefined); setInterpretation(undefined); setHistoryMessage('盘面已调整，保存为新记录'); setHistoryError('');
  }
  const handleResetTime = () => { detachReading(); setParts(getNowParts()); };
  const handleLineChange = (index: number, value: YaoValue) => {
    detachReading(); setLines(lines.map((line, i) => i === index ? value : line));
  };

  // 渲染顺序倒序
  const renderOrder = [5, 4, 3, 2, 1, 0];

  return (
    <div className="fixed inset-0 overflow-y-auto overflow-x-hidden bg-gray-50 text-gray-800 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* === Header === */}
        <header className="flex justify-between items-center">
          <h1 className="text-xl font-semibold text-gray-800">
            六爻排盘
          </h1>
          <Link href="/" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
            重新起卦
          </Link>
        </header>

        <ModuleNav active="liuyao" />
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-gray-400">
          <span>起卦时间：{datePart} {timePart} · 北京时间</span>
          <div className="flex items-center gap-3"><span role="status">{historyMessage || (saved ? '已保存到历史' : '')}</span><button onClick={() => persist()} disabled={!result} className="rounded-lg bg-white px-3 py-2 text-gray-600 shadow-sm hover:text-gray-900 disabled:opacity-50">保存记录</button></div>
        </div>
        {historyError && <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-600">{historyError}</p>}

        {/* === 次要操作：调整排盘 === */}
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl bg-white px-5 py-3.5 text-sm text-gray-500 shadow-sm transition-colors hover:bg-gray-50 [&::-webkit-details-marker]:hidden">
            <span>
              <span className="font-medium text-gray-700">调整排盘</span>
              {datePart && timePart && <span className="ml-2 text-xs text-gray-400">{datePart} · {timePart}</span>}
            </span>
            <ChevronDown className="h-4 w-4 text-gray-400 transition-transform group-open:rotate-180" />
          </summary>

          <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-3">

          {/* 左侧：时间设定 */}
          <div className="space-y-4 bg-white p-6 rounded-2xl shadow-sm">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-medium text-gray-500">起卦时间</h2>
              <button
                onClick={handleResetTime}
                className="text-xs flex items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors"
                title="重置为当前时间"
              >
                <RotateCcw className="w-3 h-3" /> 现在
              </button>
            </div>

            {/* Date & Time Pickers */}
            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                value={datePart}
                onChange={(e) => { detachReading(); setParts({ ...parts, date: e.target.value }); }}
                aria-label="起卦日期" min="1900-01-01" max="2100-12-31"
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all"
              />
              <input
                type="time"
                value={timePart}
                onChange={(e) => { detachReading(); setParts({ ...parts, time: e.target.value }); }}
                aria-label="起卦时间"
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all"
              />
            </div>

            {/* 干支显示 */}
            {result && (
              <>
                <div className="space-y-3 pt-4 border-t border-gray-100 text-sm">
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="text-gray-400 text-xs">年</div>
                    <div className="text-gray-400 text-xs">月</div>
                    <div className="text-gray-400 text-xs">日</div>
                    <div className="text-gray-400 text-xs">时</div>
                    <div className="font-medium">{result.time.year}</div>
                    <div className="font-medium">{result.time.month}</div>
                    <div className="font-medium">{result.time.day}</div>
                    <div className="font-medium">{result.time.hour}</div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 pt-2">
                    <span>空亡: <span className="text-gray-700">{result.time.kongWang}</span></span>
                    <span>日干: <span className="text-gray-700">{result.time.dayStem}</span></span>
                  </div>
                </div>

                {/* 神煞显示 */}
                <div className="text-xs text-gray-500 space-y-1 pt-3 border-t border-gray-100">
                  <div className="flex justify-between">
                    <span>驿马: <span className="text-gray-600">{result.time.shenSha.yiMa}</span></span>
                    <span>桃花: <span className="text-gray-600">{result.time.shenSha.taoHua}</span></span>
                  </div>
                  <div className="flex justify-between">
                    <span>禄神: <span className="text-gray-600">{result.time.shenSha.luShen}</span></span>
                    <span>贵人: <span className="text-gray-600">{result.time.shenSha.guiRen.join(',')}</span></span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* 右侧：摇卦输入 */}
          <div className="md:col-span-2 space-y-4 bg-white p-6 rounded-2xl shadow-sm">
            <h2 className="text-sm font-medium text-gray-500">卦象输入</h2>
            <div className="space-y-2">
              {renderOrder.map((logicalIndex) => {
                const val = lines[logicalIndex];
                return (
                  <div key={logicalIndex} className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-10 text-right">
                      {logicalIndex === 5 ? '上爻' : logicalIndex === 0 ? '初爻' : `${logicalIndex + 1}爻`}
                    </span>
                    <div className="flex-1 grid grid-cols-4 gap-2">
                      {YAO_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => handleLineChange(logicalIndex, opt.value)}
                          className={`
                            text-xs py-2.5 rounded-lg transition-all
                            ${val === opt.value
                              ? 'bg-gray-900 text-white font-medium'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }
                          `}
                        >
                          {opt.symbol}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          </div>
        </details>

        {/* === Result Section === */}
        {result ? (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="text-sm font-medium text-gray-500">卦象</h2>
              <span className="text-xs text-gray-400">{result.hex.palace}宫</span>
            </div>

            <HexagramDiagram
              name={result.hex.name}
              changedName={result.hex.changedName}
              lines={result.hex.lines}
              changedLines={result.hex.changedLines}
              time={result.time}
            />
          </div>
        ) : (
          <div className="text-center text-gray-400 py-16 bg-white rounded-2xl">
            等待数据输入...
          </div>
        )}

        {result && <InterpretationPanel key={`${datePart}-${timePart}-${lines.join(',')}`} module="liuyao"
          payload={{ time: result.time, hex: result.hex }} initialQuestion={question} initialInterpretation={interpretation}
          onQuestionChange={setQuestion} onStart={() => persist()} onComplete={persist} />}

        {/* === 次要信息：完整排盘 === */}
        {result && (
          <details className="group overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-4 text-sm text-gray-500 transition-colors hover:bg-gray-50 [&::-webkit-details-marker]:hidden">
              <span>
                <span className="font-medium text-gray-700">完整排盘</span>
                <span className="ml-2 text-xs text-gray-400">六神、伏神、六亲与变爻</span>
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 text-gray-400 transition-transform group-open:rotate-180" />
            </summary>
            <div className="overflow-x-auto border-t border-gray-100 p-6">
              <DetailedHexagramTable hex={result.hex} />
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

function DivinationLoader() {
  const searchParams = useSearchParams();
  const { records, ready, error } = useHistoryRecords();
  const id = searchParams.get('record');
  const record = id ? records.find((item) => item.id === id && item.module === 'liuyao') : undefined;
  const rawLines = searchParams.get('lines');
  const parsed = rawLines?.split(',').map(Number);
  const date = searchParams.get('date');
  const time = searchParams.get('time');
  if (!ready) return <div className="p-8 text-gray-400">加载中…</div>;
  if ((id && !record) || (rawLines && !isYaoList(parsed))) return <main className="fixed inset-0 space-y-6 bg-gray-50 p-8"><ModuleNav active="liuyao" /><p role="alert" className="text-sm text-rose-600">{id ? error || '这条六爻记录不存在，可能已被删除或保存在其他浏览器。' : '卦象参数无效，请重新起卦。'}</p></main>;
  return <DivinationContent key={id ?? searchParams.toString()} record={record} initialLines={isYaoList(parsed) ? parsed : undefined} initialParts={date && time ? { date, time } : undefined} unsaved={searchParams.get('unsaved') === '1'} />;
}

export default function DivinationPage() {
  return (
    <Suspense fallback={<div className="bg-gray-50 text-gray-400 h-screen flex items-center justify-center">加载中...</div>}>
      <DivinationLoader />
    </Suspense>
  );
}

function DetailedHexagramTable({ hex }: { hex: HexagramResult }) {
  const displayOrder = [5, 4, 3, 2, 1, 0];

  return (
    <table className="w-full whitespace-nowrap text-left text-sm">
      <thead>
        <tr className="border-b border-gray-100 text-xs text-gray-400">
          <th className="w-16 pb-3 font-medium">六神</th>
          <th className="w-24 pb-3 font-medium">伏神</th>
          <th className="w-32 pb-3 text-center font-medium">本卦</th>
          <th className="w-16 pb-3 text-center font-medium">世应</th>
          <th className="w-12 pb-3 text-center font-medium">动静</th>
          <th className="w-32 pb-3 text-center font-medium">变卦</th>
        </tr>
      </thead>
      <tbody>
        {displayOrder.map((logicalIndex) => {
          const line = hex.lines[logicalIndex];
          const changedLine = hex.changedLines[logicalIndex];

          return (
            <tr key={logicalIndex} className="border-b border-gray-50 transition-colors hover:bg-gray-50">
              <td className="py-3 text-gray-500">{line.beast}</td>
              <td className="py-3 text-xs">
                {line.hidden && (
                  <span className="rounded bg-gray-100 px-2 py-1 text-gray-600">
                    {line.hidden.relation}{line.hidden.gan}{line.hidden.zhi}{line.hidden.wuXing}
                  </span>
                )}
              </td>
              <td className="py-3 text-center">
                <span className="font-medium text-gray-700">{line.relation}</span>
                <span className="mx-0.5 text-xs text-gray-400">{line.gan}</span>
                <span className={getColorByElement(line.wuXing)}>{line.zhi}{line.wuXing}</span>
              </td>
              <td className="py-3 text-center text-xs">
                {line.isShi && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-600">世</span>}
                {line.isYing && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-600">应</span>}
              </td>
              <td className="py-3 text-center">
                {line.isMoving ? (
                  <span className="text-xs text-rose-500">{line.isYang ? 'O →' : 'X →'}</span>
                ) : (
                  <span className="text-gray-200">-</span>
                )}
              </td>
              <td className="py-3 text-center">
                <span className="text-gray-500">{changedLine.relation}</span>
                <span className="mx-0.5 text-xs text-gray-400">{changedLine.gan}</span>
                <span className={getColorByElement(changedLine.wuXing)}>{changedLine.zhi}{changedLine.wuXing}</span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function getColorByElement(wuxing: string) {
  switch (wuxing) {
    case '金': return 'text-amber-500';
    case '木': return 'text-emerald-500';
    case '水': return 'text-blue-500';
    case '火': return 'text-rose-500';
    case '土': return 'text-orange-400';
    default: return 'text-gray-500';
  }
}
