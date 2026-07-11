import { ArrowRight } from 'lucide-react';
import type { LineResult } from '@/lib/LiuYaoEngine';

interface HexagramDiagramProps {
  name: string;
  changedName?: string;
  lines: LineResult[];
  changedLines: LineResult[];
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

export function HexagramDiagram({ name, changedName, lines, changedLines }: HexagramDiagramProps) {
  const movingCount = lines.filter((line) => line.isMoving).length;

  return (
    <figure className="bg-gray-50/70 px-5 py-7 sm:px-8">
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
    </figure>
  );
}
