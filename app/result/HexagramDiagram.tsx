'use client';

import { useMemo, useState } from 'react';
import { ArrowRight, CalendarDays, GitBranch, MousePointer2 } from 'lucide-react';
import type { LineResult } from '@/lib/LiuYaoEngine';
import type { TimeInfo } from '@/lib/TimeBot';
import {
  getLineRelationMarks,
  getReturnRelationMarks,
  getTimeRelationMarks,
  type RelationMark,
} from '@/lib/LiuYaoRelations';

interface HexagramDiagramProps {
  name: string;
  changedName?: string;
  lines: LineResult[];
  changedLines: LineResult[];
  time: TimeInfo;
}

const YAO_NAMES = ['初', '二', '三', '四', '五', '上'];
const DISPLAY_ORDER = [5, 4, 3, 2, 1, 0];

function YaoMark({ isYang, tone }: { isYang: boolean; tone: 'default' | 'moving' | 'changed' }) {
  const color = {
    default: 'bg-gray-800',
    moving: 'bg-rose-500',
    changed: 'bg-amber-500',
  }[tone];

  return isYang ? (
    <span className={`block h-2.5 w-full rounded-[2px] ${color}`} aria-hidden="true" />
  ) : (
    <span className="flex w-full gap-3" aria-hidden="true">
      <span className={`h-2.5 flex-1 rounded-[2px] ${color}`} />
      <span className={`h-2.5 flex-1 rounded-[2px] ${color}`} />
    </span>
  );
}

function HexagramGlyph({
  label,
  name,
  lines,
  movingSource,
  variant,
}: {
  label: string;
  name: string;
  lines: LineResult[];
  movingSource: LineResult[];
  variant: 'original' | 'changed';
}) {
  return (
    <div className="mx-auto w-full max-w-xs">
      <div className="mb-5 text-center">
        <div className="text-[11px] font-medium tracking-[0.16em] text-gray-400">{label}</div>
        <div className="mt-1 text-base font-semibold text-gray-800">{name}</div>
      </div>

      <div className="space-y-2.5">
        {DISPLAY_ORDER.map((index) => {
          const line = lines[index];
          const sourceIsMoving = movingSource[index].isMoving;
          const tone = sourceIsMoving
            ? variant === 'original' ? 'moving' : 'changed'
            : 'default';
          const position = `${YAO_NAMES[index]}爻`;
          const yinYang = line.isYang ? '阳爻' : '阴爻';

          return (
            <div
              key={index}
              className="grid grid-cols-[1.75rem_minmax(7rem,1fr)_3.5rem] items-center gap-2"
              aria-label={`${position}，${yinYang}${sourceIsMoving ? '，动爻' : ''}`}
            >
              <span className="text-right text-[11px] text-gray-400">{YAO_NAMES[index]}</span>
              <YaoMark isYang={line.isYang} tone={tone} />
              <span className="flex items-center gap-1 text-[11px]">
                {variant === 'original' && line.isShi && (
                  <span className="rounded bg-amber-50 px-1.5 py-0.5 text-amber-700">世</span>
                )}
                {variant === 'original' && line.isYing && (
                  <span className="rounded bg-blue-50 px-1.5 py-0.5 text-blue-700">应</span>
                )}
                {variant === 'original' && sourceIsMoving && (
                  <span className="font-medium text-rose-500">{line.isYang ? '○' : '×'}</span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RelationBadge({ mark }: { mark: RelationMark }) {
  const toneClass = {
    strong: 'border-rose-200 bg-rose-50 text-rose-700',
    support: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    warning: 'border-amber-200 bg-amber-50 text-amber-700',
    muted: 'border-dashed border-gray-300 bg-gray-50 text-gray-500',
  }[mark.tone];

  return (
    <span
      className={`inline-flex h-6 items-center rounded-md border px-2 text-[11px] font-medium ${toneClass}`}
      title={mark.detail}
    >
      {mark.label}
    </span>
  );
}

function LensToggle({
  active,
  label,
  count,
  icon,
  disabled,
  onClick,
}: {
  active: boolean;
  label: string;
  count?: number;
  icon: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? 'border-gray-800 bg-gray-800 text-white'
          : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-700'
      }`}
    >
      {icon}
      {label}
      {typeof count === 'number' && (
        <span className={active ? 'text-white/60' : 'text-gray-300'}>{count}</span>
      )}
    </button>
  );
}

function lineTitle(index: number) {
  return `${YAO_NAMES[index]}爻`;
}

function elementColor(element: string) {
  switch (element) {
    case '金': return 'text-amber-600';
    case '木': return 'text-emerald-600';
    case '水': return 'text-blue-600';
    case '火': return 'text-rose-600';
    case '土': return 'text-orange-500';
    default: return 'text-gray-600';
  }
}

function RelationshipLens({
  lines,
  changedLines,
  time,
}: {
  lines: LineResult[];
  changedLines: LineResult[];
  time: TimeInfo;
}) {
  const [showTime, setShowTime] = useState(true);
  const [showReturn, setShowReturn] = useState(true);
  const [showBetween, setShowBetween] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const timeMarks = useMemo(
    () => lines.map((line) => getTimeRelationMarks(line, time)),
    [lines, time],
  );
  const returnMarks = useMemo(
    () => lines.map((line, index) => getReturnRelationMarks(line, changedLines[index])),
    [lines, changedLines],
  );
  const selectedRelations = useMemo(() => {
    if (selectedIndex === null) return [];
    return lines.flatMap((line, index) => (
      index === selectedIndex ? [] : getLineRelationMarks(lines[selectedIndex], line)
    ));
  }, [lines, selectedIndex]);

  const relationByTarget = useMemo(() => {
    return selectedRelations.reduce<Map<number, RelationMark[]>>((map, mark) => {
      const current = map.get(mark.targetIndex) ?? [];
      current.push(mark);
      map.set(mark.targetIndex, current);
      return map;
    }, new Map());
  }, [selectedRelations]);

  const timeCount = timeMarks.reduce((sum, marks) => sum + marks.length, 0);
  const returnCount = returnMarks.reduce((sum, marks) => sum + marks.length, 0);
  const defaultSelected = Math.max(0, lines.findIndex((line) => line.isShi));

  const toggleBetween = () => {
    if (showBetween) {
      setShowBetween(false);
      setSelectedIndex(null);
      return;
    }
    setShowBetween(true);
    setSelectedIndex(defaultSelected);
  };

  const selectLine = (index: number) => {
    if (showBetween && selectedIndex === index) {
      setSelectedIndex(null);
      setShowBetween(false);
      return;
    }
    setSelectedIndex(index);
    setShowBetween(true);
  };

  return (
    <section className="border-t border-gray-200 bg-white" aria-label="六爻关系标注">
      <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">关系标注</h3>
          <p className="mt-0.5 text-[11px] text-gray-400">
            月建 {time.monthBranch} · 日辰 {time.dayBranch} · 旬空 {time.kongWang}
          </p>
        </div>
        <div className="flex flex-wrap gap-2" aria-label="关系标注筛选">
          <LensToggle
            active={showTime}
            label="天时"
            count={timeCount}
            icon={<CalendarDays className="h-3.5 w-3.5" />}
            onClick={() => setShowTime((value) => !value)}
          />
          <LensToggle
            active={showReturn}
            label="回头"
            count={returnCount}
            icon={<GitBranch className="h-3.5 w-3.5" />}
            disabled={returnCount === 0}
            onClick={() => setShowReturn((value) => !value)}
          />
          <LensToggle
            active={showBetween}
            label="爻间"
            icon={<MousePointer2 className="h-3.5 w-3.5" />}
            onClick={toggleBetween}
          />
        </div>
      </div>

      <div className="px-3 py-3 sm:px-6 sm:py-5">
        <div className="space-y-1.5">
          {DISPLAY_ORDER.map((index) => {
            const line = lines[index];
            const changed = changedLines[index];
            const isSelected = selectedIndex === index;
            const betweenMarks = showBetween ? (relationByTarget.get(index) ?? []) : [];
            const visibleMarks = [
              ...(showTime ? timeMarks[index] : []),
              ...(showReturn ? returnMarks[index] : []),
            ];

            return (
              <button
                key={index}
                type="button"
                aria-pressed={isSelected}
                aria-label={`查看${lineTitle(index)}与其余各爻的关系`}
                onClick={() => selectLine(index)}
                className={`grid w-full grid-cols-[2.5rem_minmax(0,1fr)] gap-2 rounded-xl border px-3 py-3 text-left transition-all sm:grid-cols-[3rem_12rem_minmax(0,1fr)] sm:items-center sm:px-4 ${
                  isSelected
                    ? 'border-gray-800 bg-gray-900 text-white shadow-sm'
                    : betweenMarks.length > 0
                      ? 'border-rose-200 bg-rose-50/40'
                      : 'border-transparent hover:border-gray-200 hover:bg-gray-50'
                }`}
              >
                <span className={`pt-0.5 text-xs font-medium sm:pt-0 ${isSelected ? 'text-white/50' : 'text-gray-400'}`}>
                  {lineTitle(index)}
                </span>

                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                    <span className={`text-sm font-semibold ${isSelected ? 'text-white' : 'text-gray-800'}`}>
                      {line.relation}
                    </span>
                    <span className={`text-xs ${isSelected ? 'text-white/55' : 'text-gray-400'}`}>{line.gan}</span>
                    <span className={`text-sm font-semibold ${isSelected ? 'text-white' : elementColor(line.wuXing)}`}>
                      {line.zhi}{line.wuXing}
                    </span>
                    {line.isShi && <span className={`rounded px-1.5 py-0.5 text-[10px] ${isSelected ? 'bg-white/15 text-white' : 'bg-amber-50 text-amber-700'}`}>世</span>}
                    {line.isYing && <span className={`rounded px-1.5 py-0.5 text-[10px] ${isSelected ? 'bg-white/15 text-white' : 'bg-blue-50 text-blue-700'}`}>应</span>}
                  </span>

                  {line.isMoving && (
                    <span className={`mt-1 flex items-center gap-1 text-[11px] ${isSelected ? 'text-white/55' : 'text-gray-400'}`}>
                      <span className={isSelected ? 'text-white/70' : 'text-rose-500'}>{line.isYang ? '○' : '×'}</span>
                      <ArrowRight className="h-3 w-3" />
                      <span>{changed.relation}{changed.gan}</span>
                      <span className={isSelected ? 'text-white/80' : elementColor(changed.wuXing)}>{changed.zhi}{changed.wuXing}</span>
                    </span>
                  )}
                </span>

                <span className="col-start-2 flex min-w-0 flex-wrap items-center gap-1.5 sm:col-start-3">
                  {isSelected ? (
                    <span className="text-[11px] text-white/55">已选中 · 再点一次收起</span>
                  ) : betweenMarks.length > 0 ? (
                    betweenMarks.map((mark, markIndex) => (
                      <RelationBadge key={`between-${mark.label}-${markIndex}`} mark={mark} />
                    ))
                  ) : visibleMarks.length > 0 ? (
                    visibleMarks.map((mark, markIndex) => (
                      <RelationBadge key={`${mark.label}-${markIndex}`} mark={mark} />
                    ))
                  ) : (
                    <span className="text-[11px] text-gray-300">—</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        {showBetween && selectedIndex !== null && (
          <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3" aria-live="polite">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-gray-500">
                <span className="font-semibold text-gray-800">
                  {lineTitle(selectedIndex)} {lines[selectedIndex].zhi}{lines[selectedIndex].wuXing}
                </span>
                <span className="mx-1.5 text-gray-300">/</span>
                与其余五爻的刑、冲、克、害
              </p>
              {selectedRelations.length === 0 && (
                <span className="text-[11px] text-gray-400">未见直接作用</span>
              )}
            </div>
            {selectedRelations.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {Array.from(relationByTarget.entries()).map(([targetIndex, marks]) => (
                  <span key={targetIndex} className="inline-flex items-center gap-1 rounded-lg border border-white bg-white px-2.5 py-1.5 text-[11px] text-gray-500 shadow-sm">
                    <span>{lineTitle(targetIndex)} {lines[targetIndex].zhi}{lines[targetIndex].wuXing}</span>
                    <span className="text-gray-300">·</span>
                    <span className="font-semibold text-rose-600">{marks.map((mark) => mark.label).join('、')}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {!showBetween && (
          <button
            type="button"
            onClick={toggleBetween}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-200 py-2.5 text-[11px] text-gray-400 transition-colors hover:border-gray-300 hover:text-gray-600"
          >
            <MousePointer2 className="h-3.5 w-3.5" />
            点选任一爻，查看它与其余五爻的作用关系
          </button>
        )}

        <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[10px] text-gray-400">
          <span><i className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-rose-400" />强作用</span>
          <span><i className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />扶助 / 相合</span>
          <span><i className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />牵制 / 消耗</span>
          <span><i className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-gray-300" />旬空 / 伏吟</span>
        </div>
      </div>
    </section>
  );
}

export function HexagramDiagram({ name, changedName, lines, changedLines, time }: HexagramDiagramProps) {
  const movingCount = lines.filter((line) => line.isMoving).length;

  return (
    <figure>
      <div className="bg-gray-50/70 px-5 py-7 sm:px-8">
        <div className={movingCount > 0 ? 'grid items-center gap-7 sm:grid-cols-[1fr_auto_1fr]' : ''}>
          <HexagramGlyph
            label={movingCount > 0 ? '本卦' : '卦象'}
            name={name}
            lines={lines}
            movingSource={lines}
            variant="original"
          />

          {movingCount > 0 && (
            <>
              <div className="flex items-center justify-center text-gray-300">
                <ArrowRight className="h-5 w-5 rotate-90 sm:rotate-0" aria-hidden="true" />
                <span className="sr-only">变为</span>
              </div>
              <HexagramGlyph
                label="变卦"
                name={changedName ?? '变卦'}
                lines={changedLines}
                movingSource={lines}
                variant="changed"
              />
            </>
          )}
        </div>

        <figcaption className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-[11px] text-gray-400">
          <span className="flex items-center gap-1.5"><i className="h-1.5 w-5 rounded-sm bg-gray-800" />阳爻</span>
          <span className="flex items-center gap-1.5"><i className="flex w-5 gap-1"><i className="h-1.5 flex-1 rounded-sm bg-gray-800" /><i className="h-1.5 flex-1 rounded-sm bg-gray-800" /></i>阴爻</span>
          {movingCount > 0 && (
            <>
              <span className="flex items-center gap-1.5"><i className="h-1.5 w-5 rounded-sm bg-rose-500" />动爻</span>
              <span>{movingCount} 个动爻</span>
            </>
          )}
        </figcaption>
      </div>

      <RelationshipLens lines={lines} changedLines={changedLines} time={time} />
    </figure>
  );
}
