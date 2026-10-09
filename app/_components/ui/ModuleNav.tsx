"use client";

import Link from "next/link";
import { History } from "lucide-react";

export function ModuleNav({
  active,
}: {
  active: "liuyao" | "meihua" | "history";
}) {
  return (
    <nav
      aria-label="起卦模块"
      className="flex flex-wrap items-center gap-1 rounded-xl border border-gray-100 bg-white p-1 text-sm shadow-sm"
    >
      <Link
        href="/"
        aria-current={active === "liuyao" ? "page" : undefined}
        className={`rounded-lg px-3 py-2 transition-colors ${active === "liuyao" ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-50"}`}
      >
        六爻
      </Link>
      <Link
        href="/meihua"
        aria-current={active === "meihua" ? "page" : undefined}
        className={`rounded-lg px-3 py-2 transition-colors ${active === "meihua" ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-50"}`}
      >
        梅花易数
      </Link>
      <Link
        href="/history"
        aria-current={active === "history" ? "page" : undefined}
        className={`flex items-center gap-1.5 rounded-lg px-3 py-2 transition-colors ${active === "history" ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-50"}`}
      >
        <History className="h-3.5 w-3.5" />
        历史
      </Link>
    </nav>
  );
}
