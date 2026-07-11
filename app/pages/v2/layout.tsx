import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "把想法做成产品的工程师 · Richard",
  description: "工程师 / 产品判断 / 独立交付",
};

// 覆盖父 layout 的暗色 themeColor —— v2 是纯白页
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

/**
 * v2 字体：IBM Plex Sans（西文）+ Noto Sans SC（中文）。
 * 与父 layout 已加载的 IBM Plex Mono 同族——整页一套 Plex 字体系统。
 * 走 Google Fonts CDN 的原因同父 layout（CJK subset / unicode-range 懒加载）。
 */
const FONT_HREF =
  "https://fonts.googleapis.com/css2?" +
  "family=IBM+Plex+Sans:wght@400;500;600&" +
  "family=Noto+Sans+SC:wght@400;500;600;700&" +
  "display=swap";

export default function MinimalLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link rel="stylesheet" href={FONT_HREF} />
      {children}
    </>
  );
}
