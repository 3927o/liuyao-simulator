import type { Metadata, Viewport } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "构建产品的人 · A Personal Dispatch",
  description: "工程师 / 产品判断 / 独立交付",
};

// viewport-fit=cover —— iOS Safari 计算 env(safe-area-inset-*) 的前提
// themeColor —— Safari 顶栏 / Android 状态栏跟随暗底
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0a0d12",
};

/**
 * 字体走 Google Fonts 直接 link —— 不用 next/font。
 *
 * 原因：DESIGN-NOTES §10.2 明确说 --serif-en (Instrument Serif italic) 必须 fallback
 * 到 --serif-cn (Noto Serif SC) 以避免中文字符渲染成缺字方框。next/font/google 对
 * CJK 字体的 subset 必须显式指定，且打包出来的字体文件不会自动按 unicode-range 懒
 * 加载——直接用 Google Fonts CDN 反而最干净，原 B-obsidian.html 也是这么做的。
 */
const FONT_HREF =
  "https://fonts.googleapis.com/css2?" +
  "family=Instrument+Serif:ital@0;1&" +
  "family=Noto+Serif+SC:wght@400;500;600;700;900&" +
  "family=IBM+Plex+Mono:wght@300;400;500;600&" +
  "family=Source+Serif+4:opsz,ital,wght@8..60,1,400;8..60,1,700&" +
  "display=swap";

export default function PagesLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="stylesheet" href={FONT_HREF} />
      {children}
    </>
  );
}
