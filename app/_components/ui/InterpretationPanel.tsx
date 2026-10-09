"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Loader2, Sparkles } from "lucide-react";
import type { Interpretation } from "@/lib/divinationHistory";

interface Props {
  module: "liuyao" | "meihua";
  payload: object;
  initialQuestion?: string;
  initialInterpretation?: Interpretation;
  onQuestionChange: (question: string) => void;
  onStart?: () => void;
  onComplete: (interpretation: Interpretation) => void;
}

/** Parent keys this panel by the chart, so old streams and answers never cross readings. */
export function InterpretationPanel({
  module,
  payload,
  initialQuestion = "",
  initialInterpretation,
  onQuestionChange,
  onStart,
  onComplete,
}: Props) {
  const [question, setQuestion] = useState(initialQuestion);
  const [answer, setAnswer] = useState<Interpretation | undefined>(
    initialInterpretation,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => () => abortRef.current?.abort(), []);

  async function interpret() {
    if (loading) return;
    const controller = new AbortController();
    abortRef.current = controller;
    const output: Interpretation = {
      question: question.trim(),
      summary: "",
      content: "",
      kind: question.trim() ? "question" : "diagnosis",
    };
    onStart?.();
    setLoading(true);
    setAnswer(undefined);
    setError("");
    try {
      const res = await fetch("/api/interpret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, module, question: output.question }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body)
        throw new Error((await res.text()) || `请求失败 (${res.status})`);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        const rows = buffer.split("\n");
        buffer = done ? "" : (rows.pop() ?? "");
        for (const row of rows) {
          if (!row.trim()) continue;
          const event = JSON.parse(row) as {
            summary?: string;
            content?: string;
          };
          if (event.summary) output.summary = event.summary;
          if (event.content) output.content += event.content;
        }
        if (controller.signal.aborted) return;
        setAnswer({ ...output });
        if (done) break;
      }
      if (!output.summary && !output.content)
        throw new Error("未收到解读内容，请重试");
      onComplete(output);
    } catch (err) {
      if (!controller.signal.aborted)
        setError(err instanceof Error ? err.message : "解读失败，请重试");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  return (
    <section className="space-y-4 rounded-2xl bg-white p-5 shadow-sm sm:p-6">
      <h2 className="flex items-center gap-2 text-base font-semibold">
        <Sparkles className="h-4 w-4 text-amber-500" />
        AI 解读
      </h2>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void interpret();
        }}
        className="flex flex-col gap-3 sm:flex-row"
      >
        <input
          aria-label="所问之事"
          value={question}
          disabled={loading}
          onChange={(event) => {
            setQuestion(event.target.value);
            onQuestionChange(event.target.value);
          }}
          placeholder="所问何事（选填），留空则分析当前状态"
          className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 disabled:opacity-60"
        />
        <button
          disabled={loading}
          className="flex shrink-0 items-center justify-center gap-2 rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              推演中
            </>
          ) : (
            "起卦解读"
          )}
        </button>
      </form>
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-600"
        >
          {error}
        </p>
      )}
      {loading && !answer && (
        <p className="animate-pulse text-sm text-gray-400">
          {module === "meihua"
            ? "正在分析体用关系与本、互、变卦…"
            : "正在分析世应关系与卦象结构…"}
        </p>
      )}
      {answer && (answer.summary || answer.content) && (
        <div className="overflow-hidden rounded-xl border border-gray-100">
          <div className="flex justify-between border-b border-gray-100 bg-gray-50 px-5 py-3 text-xs text-gray-500">
            <span>
              {answer.kind === "question" ? "针对所问之事" : "当前状态诊断"}
            </span>
            <span>{loading ? "生成中" : error ? "未完成" : "已完成"}</span>
          </div>
          {answer.question !== question.trim() && (
            <p className="px-5 pt-3 text-xs text-gray-400">
              本次解读对应：{answer.question || "未指定问题"}
            </p>
          )}
          {answer.summary && (
            <div className="border-b border-amber-100 bg-amber-50 px-5 py-5">
              <div className="mb-2 text-[11px] font-semibold tracking-widest text-amber-700">
                一句话结论
              </div>
              <p className="font-medium leading-7">{answer.summary}</p>
            </div>
          )}
          <div className="px-5 py-5 text-sm leading-7 text-gray-600 [&_h2]:mb-3 [&_h2]:mt-6 [&_h2]:border-l-2 [&_h2]:border-gray-900 [&_h2]:pl-3 [&_h2]:font-semibold [&_h2]:text-gray-900 [&_h2:first-child]:mt-0 [&_p]:my-2 [&_strong]:text-gray-900 [&_ul]:my-3 [&_ul]:space-y-2 [&_li]:border-l [&_li]:border-gray-200 [&_li]:pl-3 [&_ol]:list-decimal [&_ol]:pl-5">
            <ReactMarkdown>{answer.content}</ReactMarkdown>
          </div>
        </div>
      )}
    </section>
  );
}
