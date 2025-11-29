'use client'

import React, { useState, useMemo, useEffect } from 'react';
import { LiuYaoEngine, YaoValue } from '@/lib/LiuYaoEngine';
import { TimeBot } from '@/lib/TimeBot';
import { ArrowRight, RotateCw, Calendar, Disc, Clock, RefreshCw } from 'lucide-react';

// === 实例化工具类 ===
const engine = new LiuYaoEngine();
const timeBot = new TimeBot();

// === 辅助定义 ===
const YAO_OPTIONS: { value: YaoValue; label: string; symbol: string; color: string }[] = [
  { value: 8, label: '少阴 (静)', symbol: '- -', color: 'text-gray-400' },
  { value: 7, label: '少阳 (静)', symbol: '---', color: 'text-gray-200' },
  { value: 6, label: '老阴 (动)', symbol: '-X-', color: 'text-red-400' },
  { value: 9, label: '老阳 (动)', symbol: '-O-', color: 'text-yellow-400' },
];

// === 辅助函数：获取当前本地时间的拆分字符串 ===
const getNowParts = () => {
  const now = new Date();
  // 使用 en-CA 获取 YYYY-MM-DD 格式 (本地时间)
  const date = now.toLocaleDateString('en-CA');
  // 使用 en-GB 获取 HH:mm 格式 (24小时制)
  const time = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return { date, time };
};

export default function DivinationPage() {
  // 1. 状态管理 (拆分日期和时间，避免时区混乱)
  const [datePart, setDatePart] = useState<string>("");
  const [timePart, setTimePart] = useState<string>("");

  // 初始化设置时间 (Client-side only to avoid hydration mismatch if using Next.js)
  useEffect(() => {
    const { date, time } = getNowParts();
    setDatePart(date);
    setTimePart(time);
  }, []);
  
  // 默认卦象：地天泰
  const [lines, setLines] = useState<YaoValue[]>([9, 7, 7, 8, 8, 6]);

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
    <div className="h-screen w-full overflow-y-auto overflow-x-hidden bg-neutral-950 text-neutral-300 p-4 md:p-8 font-mono selection:bg-neutral-700 selection:text-white">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* === Header === */}
        <header className="border-b border-neutral-800 pb-4 flex justify-between items-end">
          <h1 className="text-2xl font-bold text-neutral-100 flex items-center gap-2">
            <Disc className="w-6 h-6 text-neutral-500" />
            CYBER_LIUYAO <span className="text-xs bg-neutral-800 px-2 py-0.5 rounded text-neutral-400">v2.2</span>
          </h1>
        </header>

        {/* === Input Section === */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* 左侧：时间设定 (Split Date & Time Picker) */}
          <div className="space-y-4 bg-neutral-900/50 p-6 rounded-lg border border-neutral-800 flex flex-col">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-semibold text-neutral-500 flex items-center gap-2">
                <Calendar className="w-4 h-4" /> TIME_ANCHOR
              </h2>
              <button 
                onClick={handleResetTime}
                className="text-xs flex items-center gap-1 text-neutral-600 hover:text-green-400 transition-colors"
                title="Reset to Now"
              >
                <RefreshCw className="w-3 h-3" /> NOW
              </button>
            </div>

            {/* Date & Time Pickers */}
            <div className="grid grid-cols-2 gap-2">
              <div className="relative group">
                <div className="absolute inset-y-0 left-2 flex items-center pointer-events-none">
                  <Calendar className="w-3 h-3 text-neutral-500 group-focus-within:text-neutral-300" />
                </div>
                <input
                  type="date"
                  value={datePart}
                  onChange={(e) => setDatePart(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded pl-7 pr-2 py-2 text-sm focus:outline-none focus:border-neutral-500 transition-colors text-neutral-300 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:w-full"
                />
              </div>
              
              <div className="relative group">
                <div className="absolute inset-y-0 left-2 flex items-center pointer-events-none">
                  <Clock className="w-3 h-3 text-neutral-500 group-focus-within:text-neutral-300" />
                </div>
                <input
                  type="time"
                  value={timePart}
                  onChange={(e) => setTimePart(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded pl-7 pr-2 py-2 text-sm focus:outline-none focus:border-neutral-500 transition-colors text-neutral-300 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:w-full"
                />
              </div>
            </div>
            
            {/* 干支显示 (如果result存在) */}
            {result && (
              <>
                <div className="space-y-2 pt-4 border-t border-neutral-800 text-xs flex-1">
                  <div className="grid grid-cols-4 gap-2 text-center text-neutral-400">
                    <div>年</div><div>月</div><div>日</div><div>时</div>
                    <div className="text-neutral-200 font-bold">{result.time.year}</div>
                    <div className="text-neutral-200 font-bold">{result.time.month}</div>
                    <div className="text-neutral-200 font-bold">{result.time.day}</div>
                    <div className="text-neutral-200 font-bold">{result.time.hour}</div>
                  </div>
                  <div className="flex justify-between text-neutral-500 pt-3">
                    <span>空亡: <span className="text-neutral-300">{result.time.kongWang}</span></span>
                    <span>日干: <span className="text-neutral-300">{result.time.dayStem}</span></span>
                  </div>
                </div>

                {/* 神煞显示 */}
                <div className="text-xs text-neutral-500 space-y-1 pt-2 border-t border-neutral-800">
                    <div className="flex justify-between">
                      <span>驿马: <span className="text-neutral-400">{result.time.shenSha.yiMa}</span></span>
                      <span>桃花: <span className="text-neutral-400">{result.time.shenSha.taoHua}</span></span>
                    </div>
                    <div className="flex justify-between">
                      <span>禄神: <span className="text-neutral-400">{result.time.shenSha.luShen}</span></span>
                      <span>贵人: <span className="text-neutral-400">{result.time.shenSha.guiRen.join(',')}</span></span>
                    </div>
                </div>
              </>
            )}
          </div>

          {/* 右侧：摇卦输入 */}
          <div className="md:col-span-2 space-y-4 bg-neutral-900/50 p-6 rounded-lg border border-neutral-800">
            <h2 className="text-sm font-semibold text-neutral-500 flex items-center gap-2">
              <RotateCw className="w-4 h-4" /> HEXAGRAM_INPUT
            </h2>
            <div className="space-y-2">
              {renderOrder.map((logicalIndex) => {
                const val = lines[logicalIndex];
                return (
                  <div key={logicalIndex} className="flex items-center gap-4">
                    <span className="text-xs text-neutral-600 w-8 text-right font-bold">
                      {logicalIndex === 5 ? '上爻' : logicalIndex === 0 ? '初爻' : `${logicalIndex + 1}爻`}
                    </span>
                    <div className="flex-1 grid grid-cols-4 gap-2">
                      {YAO_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => handleLineChange(logicalIndex, opt.value)}
                          className={`
                            text-xs py-2 rounded border transition-all relative
                            ${val === opt.value 
                              ? `${opt.color} border-neutral-600 bg-neutral-800 font-bold ring-1 ring-neutral-700` 
                              : 'text-neutral-600 border-transparent hover:bg-neutral-800 hover:text-neutral-400'
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
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden shadow-2xl">
            <div className="bg-neutral-800/50 px-6 py-3 border-b border-neutral-700 flex justify-between items-center">
              <div className="flex gap-4 items-center">
                  <div className="text-lg font-bold text-neutral-200">
                    <span className="text-neutral-500 text-sm mr-2">{result.hex.palace}宫</span> 
                    {result.hex.name}
                  </div>
                  {result.hex.changedName && (
                    <div className="text-lg font-bold text-neutral-400 flex items-center gap-2">
                      <ArrowRight className="w-4 h-4 text-neutral-600" /> 
                      {result.hex.changedName}
                    </div>
                  )}
              </div>
              <div className="text-xs text-neutral-500 uppercase tracking-wider">
                  System Output
              </div>
            </div>

            <div className="p-6 overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="text-neutral-500 text-xs border-b border-neutral-800">
                    <th className="pb-2 w-16">六神</th>
                    <th className="pb-2 w-24">伏神</th>
                    <th className="pb-2 text-center w-32">【本卦】</th>
                    <th className="pb-2 w-16 text-center">世应</th>
                    <th className="pb-2 w-12 text-center">动静</th>
                    <th className="pb-2 text-center w-32">【变卦】</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {renderOrder.map((logicalIndex) => {
                    const line = result.hex.lines[logicalIndex];
                    const changedLine = result.hex.changedLines[logicalIndex];

                    return (
                      <tr key={logicalIndex} className="border-b border-neutral-800/50 hover:bg-neutral-800/30 transition-colors">
                        <td className="py-3 text-neutral-400">{line.beast}</td>
                        <td className="py-3 text-neutral-500 text-xs">
                          {line.hidden ? (
                            <span className="bg-neutral-800 px-1 rounded text-neutral-400">
                              {line.hidden.relation}{line.hidden.gan}{line.hidden.zhi}{line.hidden.wuXing}
                            </span>
                          ) : null}
                        </td>
                        <td className="py-3 text-center">
                          <span className="text-neutral-300 font-medium">{line.relation}</span>
                          <span className="text-neutral-600 mx-0.5 text-xs">{line.gan}</span>
                          <span className={getColorByElement(line.wuXing)}>{line.zhi}{line.wuXing}</span>
                        </td>
                        <td className="py-3 text-center text-xs text-neutral-500">
                          {line.isShi && <span className="text-yellow-500 border border-yellow-500/20 bg-yellow-500/10 px-1.5 py-0.5 rounded">世</span>}
                          {line.isYing && <span className="text-blue-500 border border-blue-500/20 bg-blue-500/10 px-1.5 py-0.5 rounded">应</span>}
                        </td>
                        <td className="py-3 text-center font-bold">
                          {line.isMoving ? (
                            line.isYang ? <span className="text-red-500 text-xs">O &rarr;</span> : <span className="text-red-500 text-xs">X &rarr;</span>
                          ) : (
                            <span className="text-neutral-800 text-xs">-</span>
                          )}
                        </td>
                        <td className="py-3 text-center opacity-80">
                          <span className="text-neutral-400">{changedLine.relation}</span>
                          <span className="text-neutral-600 mx-0.5 text-xs">{changedLine.gan}</span>
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
          <div className="text-center text-neutral-500 py-12">
            等待数据输入...
          </div>
        )}
      </div>
    </div>
  );
}

function getColorByElement(wuxing: string) {
  switch (wuxing) {
    case '金': return 'text-yellow-200';
    case '木': return 'text-green-400';
    case '水': return 'text-blue-400';
    case '火': return 'text-red-400';
    case '土': return 'text-orange-300';
    default: return 'text-neutral-400';
  }
}