'use client'

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { LiuYaoEngine, YaoValue } from '@/lib/LiuYaoEngine';
import { TimeBot } from '@/lib/TimeBot';
import { ArrowRight, RotateCcw } from 'lucide-react';

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

// === 辅助函数：获取当前本地时间的拆分字符串 ===
const getNowParts = () => {
  const now = new Date();
  const date = now.toLocaleDateString('en-CA');
  const time = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return { date, time };
};

function DivinationContent() {
  const searchParams = useSearchParams();

  // 1. 状态管理 (拆分日期和时间，避免时区混乱)
  const [datePart, setDatePart] = useState<string>("");
  const [timePart, setTimePart] = useState<string>("");
  const [lines, setLines] = useState<YaoValue[]>([9, 7, 7, 8, 8, 6]);

  // 初始化设置时间 (Client-side only)
  useEffect(() => {
    const { date, time } = getNowParts();
    setDatePart(date);
    setTimePart(time);

    // 从 URL 读取卦象 (格式: ?lines=6,7,8,9,7,8)
    const linesParam = searchParams.get('lines');
    if (linesParam) {
      try {
        const parsed = linesParam.split(',').map(v => parseInt(v) as YaoValue);
        if (parsed.length === 6 && parsed.every(v => [6,7,8,9].includes(v))) {
          setLines(parsed);
        }
      } catch (e) {
        console.error("Failed to parse lines param", e);
      }
    }
  }, [searchParams]);
  
  // 2. 实时计算
  const result = useMemo(() => {
    try {
      if (!datePart || !timePart) return null;
      
      // 拼接标准 ISO 格式: YYYY-MM-DD + T + HH:mm
      const fullDateStr = `${datePart}T${timePart}`;
      const targetDate = new Date(fullDateStr);

      // 获取天时
      const timeInfo = timeBot.getTime(targetDate);
      // 获取排盘
      const hexInfo = engine.process(lines, timeInfo.dayStem);
      
      return { time: timeInfo, hex: hexInfo };
    } catch (e) {
      console.error(e);
      return null;
    }
  }, [datePart, timePart, lines]);

  // 重置时间为当前
  const handleResetTime = () => {
    const { date, time } = getNowParts();
    setDatePart(date);
    setTimePart(time);
  };

  // 3. 交互处理
  const handleLineChange = (index: number, val: YaoValue) => {
    const newLines = [...lines];
    newLines[index] = val;
    setLines(newLines);
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
          <a href="/" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
            重新起卦
          </a>
        </header>

        {/* === Input Section === */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

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
                onChange={(e) => setDatePart(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all"
              />
              <input
                type="time"
                value={timePart}
                onChange={(e) => setTimePart(e.target.value)}
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

        {/* === Result Section === */}
        {result ? (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <div className="flex gap-4 items-center">
                <div className="text-lg font-semibold text-gray-800">
                  <span className="text-gray-400 text-sm mr-2">{result.hex.palace}宫</span>
                  {result.hex.name}
                </div>
                {result.hex.changedName && (
                  <div className="text-lg font-medium text-gray-500 flex items-center gap-2">
                    <ArrowRight className="w-4 h-4 text-gray-300" />
                    {result.hex.changedName}
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="text-gray-400 text-xs border-b border-gray-100">
                    <th className="pb-3 w-16 font-medium">六神</th>
                    <th className="pb-3 w-24 font-medium">伏神</th>
                    <th className="pb-3 text-center w-32 font-medium">本卦</th>
                    <th className="pb-3 w-16 text-center font-medium">世应</th>
                    <th className="pb-3 w-12 text-center font-medium">动静</th>
                    <th className="pb-3 text-center w-32 font-medium">变卦</th>
                  </tr>
                </thead>
                <tbody>
                  {renderOrder.map((logicalIndex) => {
                    const line = result.hex.lines[logicalIndex];
                    const changedLine = result.hex.changedLines[logicalIndex];

                    return (
                      <tr key={logicalIndex} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="py-3 text-gray-500">{line.beast}</td>
                        <td className="py-3 text-xs">
                          {line.hidden ? (
                            <span className="bg-gray-100 px-2 py-1 rounded text-gray-600">
                              {line.hidden.relation}{line.hidden.gan}{line.hidden.zhi}{line.hidden.wuXing}
                            </span>
                          ) : null}
                        </td>
                        <td className="py-3 text-center">
                          <span className="text-gray-700 font-medium">{line.relation}</span>
                          <span className="text-gray-400 mx-0.5 text-xs">{line.gan}</span>
                          <span className={getColorByElement(line.wuXing)}>{line.zhi}{line.wuXing}</span>
                        </td>
                        <td className="py-3 text-center text-xs">
                          {line.isShi && <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">世</span>}
                          {line.isYing && <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">应</span>}
                        </td>
                        <td className="py-3 text-center">
                          {line.isMoving ? (
                            line.isYang ? <span className="text-rose-500 text-xs">O →</span> : <span className="text-rose-500 text-xs">X →</span>
                          ) : (
                            <span className="text-gray-200">-</span>
                          )}
                        </td>
                        <td className="py-3 text-center">
                          <span className="text-gray-500">{changedLine.relation}</span>
                          <span className="text-gray-400 mx-0.5 text-xs">{changedLine.gan}</span>
                          <span className={getColorByElement(changedLine.wuXing)}>{changedLine.zhi}{changedLine.wuXing}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-400 py-16 bg-white rounded-2xl">
            等待数据输入...
          </div>
        )}
      </div>
    </div>
  );
}

export default function DivinationPage() {
  return (
    <Suspense fallback={<div className="bg-gray-50 text-gray-400 h-screen flex items-center justify-center">加载中...</div>}>
      <DivinationContent />
    </Suspense>
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