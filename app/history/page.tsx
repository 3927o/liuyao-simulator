"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Search, Trash2 } from "lucide-react";
import { ModuleNav } from "../_components/ui/ModuleNav";
import { useHistoryRecords } from "../_hooks/useHistoryRecords";
import { deleteHistory, historyHref } from "@/lib/divinationHistory";

export default function HistoryPage() {
  const { records, error, ready } = useHistoryRecords();
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const filtered = records.filter(
    (record) =>
      (filter === "all" || record.module === filter) &&
      `${record.name} ${record.changedName} ${record.question} ${record.datePart} ${record.interpretation?.summary ?? ""}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );

  function remove(id: string) {
    try {
      deleteHistory(id);
      setPendingDelete(null);
      setActionError("");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "删除失败");
    }
  }

  return (
    <main className="fixed inset-0 overflow-y-auto bg-gray-50 p-4 text-gray-800 sm:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-xl font-semibold">起卦历史</h1>
          <ModuleNav active="history" />
        </header>
        <p className="text-sm leading-6 text-gray-500">
          保存在当前浏览器，打开记录可恢复当时的时间、卦象与解读。清除浏览器数据会移除这些记录。
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div
            className="flex rounded-xl bg-white p-1 shadow-sm"
            role="group"
            aria-label="筛选模块"
          >
            {[
              ["all", "全部"],
              ["liuyao", "六爻"],
              ["meihua", "梅花易数"],
            ].map(([value, label]) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                aria-pressed={filter === value}
                className={`rounded-lg px-4 py-2 text-sm ${filter === value ? "bg-gray-900 text-white" : "text-gray-500"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3">
            <Search className="h-4 w-4 shrink-0 text-gray-400" />
            <input
              aria-label="搜索历史"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索问题、卦名、日期"
              className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none"
            />
          </label>
        </div>
        {(error || actionError) && (
          <p
            role="alert"
            className="rounded-xl bg-rose-50 p-4 text-sm text-rose-600"
          >
            {error || actionError}
          </p>
        )}
        {!ready && (
          <p className="py-12 text-center text-sm text-gray-400">加载记录中…</p>
        )}
        {ready && !error && filtered.length === 0 && (
          <div className="space-y-4 rounded-2xl bg-white px-6 py-16 text-center shadow-sm">
            <p className="text-gray-500">
              {records.length ? "没有符合条件的记录" : "还没有起卦记录"}
            </p>
            <Link
              href="/meihua"
              className="inline-block rounded-lg bg-gray-900 px-5 py-2.5 text-sm text-white"
            >
              以当前时间起一卦
            </Link>
          </div>
        )}
        <div className="space-y-3">
          {filtered.map((record) => (
            <article
              key={record.id}
              className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-gray-400">
                    <span className="rounded bg-gray-100 px-2 py-1 text-gray-600">
                      {record.module === "meihua"
                        ? "梅花易数 · 时间起卦"
                        : "六爻"}
                    </span>
                    <time>
                      {record.datePart} {record.timePart} · 北京时间
                    </time>
                  </div>
                  <Link
                    href={historyHref(record)}
                    className="inline-flex flex-wrap items-center gap-2 text-base font-semibold hover:text-amber-700"
                  >
                    {record.name}
                    {record.changedName !== record.name && (
                      <span className="text-sm font-normal text-gray-400">
                        → {record.changedName}
                      </span>
                    )}
                    <ArrowUpRight className="h-4 w-4 text-gray-400" />
                  </Link>
                </div>
                <button
                  onClick={() => setPendingDelete(record.id)}
                  aria-label={`删除 ${record.name} 记录`}
                  className="rounded-lg p-2 text-gray-400 hover:bg-rose-50 hover:text-rose-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              {record.question && (
                <p className="mt-3 break-words text-sm text-gray-600">
                  {record.question}
                </p>
              )}
              {record.interpretation?.summary && (
                <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm leading-6 text-gray-700">
                  {record.interpretation.summary}
                </p>
              )}
              {pendingDelete === record.id && (
                <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-4 text-sm">
                  <span className="text-gray-500">删除这条记录？</span>
                  <button
                    onClick={() => remove(record.id)}
                    className="rounded-lg bg-rose-600 px-3 py-1.5 text-white"
                  >
                    确认删除
                  </button>
                  <button
                    onClick={() => setPendingDelete(null)}
                    className="px-2 py-1.5 text-gray-500"
                  >
                    取消
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
