"use client";

import { Suspense, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Clock3, RotateCcw } from "lucide-react";
import {
  castMeihua,
  type MeihuaHexagram,
  type MeihuaResult,
} from "@/lib/MeihuaEngine";
import { getNowParts } from "@/lib/calendar";
import {
  saveHistory,
  type DivinationRecord,
  type Interpretation,
} from "@/lib/divinationHistory";
import { ModuleNav } from "../_components/ui/ModuleNav";
import { InterpretationPanel } from "../_components/ui/InterpretationPanel";
import { useHistoryRecords } from "../_hooks/useHistoryRecords";
import { MeihuaRelationsPanel } from "./MeihuaRelationsPanel";

const LINE_NAMES = ["初爻", "二爻", "三爻", "四爻", "五爻", "上爻"];

function HexagramCard({
  label,
  hex,
  movingLine,
  bodyPosition,
}: {
  label: string;
  hex: MeihuaHexagram;
  movingLine?: number;
  bodyPosition?: "upper" | "lower";
}) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white px-2 py-5 shadow-sm sm:px-4 sm:py-6">
      <p className="text-center text-xs text-gray-400">{label}</p>
      <h3 className="mt-2 text-center text-sm font-semibold sm:text-lg">
        {hex.name}
      </h3>
      <div className="mx-auto mt-5 max-w-56 space-y-3">
        {(["upper", "lower"] as const).map((position) => {
          const trigram = hex[position];
          const role = bodyPosition
            ? position === bodyPosition
              ? "体"
              : "用"
            : undefined;
          const indexes = position === "upper" ? [5, 4, 3] : [2, 1, 0];
          return (
            <div
              key={position}
              aria-label={`${position === "upper" ? "上卦" : "下卦"}${trigram.name}，五行${trigram.element}${role ? `，${role}卦` : ""}`}
              className={`rounded-lg border px-1.5 py-3 sm:px-3 ${role === "体" ? "border-amber-200 bg-amber-50/40" : "border-gray-100 bg-gray-50/70"}`}
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-1 text-[10px] sm:text-xs">
                <span className="text-gray-400">
                  {position === "upper" ? "上卦" : "下卦"}
                </span>
                <span className="font-medium text-gray-600">
                  {trigram.name}·{trigram.element}
                  {role && <span className="ml-1 text-amber-700">{role}</span>}
                </span>
              </div>
              <div className="space-y-2.5">
                {indexes.map((index) => (
                  <div
                    key={index}
                    className="flex items-center gap-1.5 sm:gap-2"
                    aria-label={`${LINE_NAMES[index]}，${hex.bits[index] ? "阳" : "阴"}${movingLine === index + 1 ? "，动爻" : ""}`}
                  >
                    <span className="hidden w-6 shrink-0 text-[10px] text-gray-400 sm:block">
                      {index === 5 ? "上" : index === 0 ? "初" : `${index + 1}`}
                    </span>
                    <div className="flex h-2 flex-1 gap-1.5 sm:h-2.5 sm:gap-2">
                      <span
                        className={`flex-1 rounded-sm ${movingLine === index + 1 ? "bg-rose-500" : "bg-gray-800"}`}
                      />
                      {!hex.bits[index] && (
                        <span
                          className={`flex-1 rounded-sm ${movingLine === index + 1 ? "bg-rose-500" : "bg-gray-800"}`}
                        />
                      )}
                    </div>
                    <span className="w-2.5 shrink-0 text-[9px] text-rose-500 sm:w-3 sm:text-[10px]">
                      {movingLine === index + 1 ? "动" : ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function MeihuaContent({ record }: { record?: DivinationRecord }) {
  const [parts, setParts] = useState(() =>
    record ? { date: record.datePart, time: record.timePart } : getNowParts(),
  );
  const [result, setResult] = useState<MeihuaResult | null>(() =>
    record ? castMeihua(record.datePart, record.timePart) : null,
  );
  const [saved, setSaved] = useState(record);
  const savedIdRef = useRef(record?.id);
  const [question, setQuestion] = useState(record?.question ?? "");
  const [interpretation, setInterpretation] = useState(record?.interpretation);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [readingNumber, setReadingNumber] = useState(0);
  const lunarPreview = (() => {
    try {
      return castMeihua(parts.date, parts.time).lunar;
    } catch {
      return null;
    }
  })();

  function cast() {
    let next: MeihuaResult;
    try {
      next = castMeihua(parts.date, parts.time);
    } catch (err) {
      setError(err instanceof Error ? err.message : "起卦失败");
      return;
    }
    savedIdRef.current = undefined;
    setResult(next);
    setSaved(undefined);
    setInterpretation(undefined);
    setReadingNumber((value) => value + 1);
    setError("");
    setNotice("");
    try {
      const record = saveHistory(
        {
          module: "meihua",
          method: "lunar-time",
          datePart: parts.date,
          timePart: parts.time,
        },
        { question },
      );
      savedIdRef.current = record.id;
      setSaved(record);
      setNotice("已自动保存到历史");
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    }
  }

  function persist(answer?: Interpretation) {
    if (!result) return;
    if (answer) setInterpretation(answer);
    try {
      const next = saveHistory(
        {
          module: "meihua",
          method: "lunar-time",
          datePart: result.datePart,
          timePart: result.timePart,
        },
        {
          id: savedIdRef.current,
          question,
          interpretation: answer ?? interpretation,
        },
      );
      savedIdRef.current = next.id;
      setSaved(next);
      setNotice("已保存到历史");
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    }
  }

  return (
    <main className="fixed inset-0 overflow-y-auto bg-gray-50 p-4 text-gray-800 sm:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-xl font-semibold">梅花易数</h1>
          <ModuleNav active="meihua" />
        </header>
        <section className="space-y-5 rounded-2xl bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-medium">
              <Clock3 className="h-4 w-4 text-gray-400" />
              农历时间起卦
            </h2>
            <button
              onClick={() => setParts(getNowParts())}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900"
            >
              <RotateCcw className="h-3 w-3" />
              使用现在
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <label className="text-xs text-gray-500">
              公历日期 · 北京时间
              <input
                type="date"
                min="1900-01-01"
                max="2100-12-31"
                value={parts.date}
                onChange={(event) =>
                  setParts({ ...parts, date: event.target.value })
                }
                className="mt-2 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800"
              />
            </label>
            <label className="text-xs text-gray-500">
              时间
              <input
                type="time"
                value={parts.time}
                onChange={(event) =>
                  setParts({ ...parts, time: event.target.value })
                }
                className="mt-2 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800"
              />
            </label>
            <button
              onClick={cast}
              className="col-span-2 self-end rounded-lg bg-gray-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-700 sm:col-span-1"
            >
              {result ? "重新起卦" : "时间起卦"}
            </button>
          </div>
          {lunarPreview && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-amber-50 px-4 py-3">
              <p className="text-sm text-amber-900">
                {lunarPreview.yearGanZhi}年 · {lunarPreview.monthText}月
                {lunarPreview.dayText} · {lunarPreview.hourBranch}时
              </p>
              <span className="text-xs text-amber-700">
                年 {lunarPreview.yearNumber} / 月 {lunarPreview.month} / 日{" "}
                {lunarPreview.day} / 时 {lunarPreview.hourNumber}
              </span>
            </div>
          )}
          <p className="text-xs leading-6 text-gray-400">
            年、时取地支序数，月、日取农历数。北京时间 23
            点换日，闰月沿用月数。日期输入后自动换算农历。
          </p>
        </section>
        {error && (
          <p
            role="alert"
            className="rounded-xl bg-rose-50 p-4 text-sm text-rose-600"
          >
            {error}
          </p>
        )}
        {result ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-400">
              <span>
                本次起卦：{result.datePart} {result.timePart} · 北京时间
              </span>
              <div className="flex items-center gap-3">
                <span role="status">
                  {notice || (saved ? "历史记录" : "尚未保存")}
                </span>
                <button
                  onClick={() => persist()}
                  className="text-gray-600 hover:text-gray-900"
                >
                  保存记录
                </button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              <HexagramCard
                label="本卦"
                hex={result.original}
                movingLine={result.movingLine}
                bodyPosition={result.bodyPosition}
              />
              <HexagramCard label="互卦" hex={result.mutual} />
              <HexagramCard label="变卦" hex={result.changed} />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-200 px-4 py-3 text-xs text-gray-500">
              <span>
                动爻：{LINE_NAMES[result.movingLine - 1]} · 动爻所在卦为用
              </span>
              <span>
                体卦固定为{result.body.name}（{result.body.element}）
              </span>
            </div>
            <MeihuaRelationsPanel
              key={`${result.datePart}-${result.timePart}-${readingNumber}`}
              result={result}
            />
            <InterpretationPanel
              key={`${result.datePart}-${result.timePart}-${readingNumber}`}
              module="meihua"
              payload={{
                meihua: {
                  datePart: result.datePart,
                  timePart: result.timePart,
                },
              }}
              initialQuestion={question}
              initialInterpretation={interpretation}
              onQuestionChange={setQuestion}
              onStart={() => persist()}
              onComplete={persist}
            />
            <details className="rounded-2xl bg-white p-5 text-sm shadow-sm">
              <summary className="cursor-pointer font-medium text-gray-600">
                查看取数过程
              </summary>
              <div className="mt-4 space-y-3 text-gray-500">
                <p>
                  上卦：{result.lunar.yearNumber} + {result.lunar.month} +{" "}
                  {result.lunar.day} = {result.sums.upper}；除 8 余{" "}
                  {result.sums.upper % 8} → {result.original.upper.number}（
                  {result.original.upper.name}）
                </p>
                <p>
                  下卦：{result.sums.upper} + {result.lunar.hourNumber} ={" "}
                  {result.sums.lower}；除 8 余 {result.sums.lower % 8} →{" "}
                  {result.original.lower.number}（{result.original.lower.name}）
                </p>
                <p>
                  动爻：{result.sums.lower} 除 6 余 {result.sums.lower % 6} →{" "}
                  {LINE_NAMES[result.movingLine - 1]}
                </p>
                <p className="border-t border-gray-100 pt-3 text-xs leading-6 text-gray-400">
                  卦序：乾 1、兑 2、离 3、震 4、巽 5、坎 6、艮 7、坤 8。余 0 取
                  8 卦或第 6
                  爻；爻位自下而上。互卦下卦取二、三、四爻，上卦取三、四、五爻。
                </p>
              </div>
            </details>
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-200 px-6 py-14 text-center text-sm leading-7 text-gray-400">
            时间已就绪，点击「时间起卦」。
            <br />
            起卦后自动保存本卦、互卦与变卦。
          </div>
        )}
      </div>
    </main>
  );
}

function MeihuaLoader() {
  const params = useSearchParams();
  const { records, ready, error } = useHistoryRecords();
  const id = params.get("record");
  const record = id
    ? records.find((item) => item.id === id && item.module === "meihua")
    : undefined;
  if (!ready) return <div className="p-8 text-gray-400">加载中…</div>;
  if (id && !record)
    return (
      <main className="fixed inset-0 space-y-6 bg-gray-50 p-8">
        <ModuleNav active="meihua" />
        <p role="alert" className="text-sm text-rose-600">
          {error || "这条梅花记录不存在，可能已被删除或保存在其他浏览器。"}
        </p>
      </main>
    );
  return <MeihuaContent key={id ?? "new"} record={record} />;
}

export default function MeihuaPage() {
  return (
    <Suspense fallback={<div className="p-8 text-gray-400">加载中…</div>}>
      <MeihuaLoader />
    </Suspense>
  );
}
