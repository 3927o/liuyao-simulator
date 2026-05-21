'use client';

/**
 * §01 Hero — "构建产品的人。"
 * 字符 brushStroke stagger / acid 下划线 drawStroke + nudge / spotlight 跟随鼠标。
 * stagger 的不等距 delay 在 styles.css 中按位置写死（DESIGN-NOTES §8.2）。
 */
export function Hero() {
  return (
    <section id="hero" className="hero" data-section="§01 — POSITION STATEMENT" data-read="01 MIN">
      <div className="spotlight" />
      <div className="watermark"><span className="it">Constructor</span></div>

      <div>
        <div className="kicker">
          <span className="label">POSITION STATEMENT</span>
          <span className="sq xs" />
          <span>No. 01 / 2026.05</span>
        </div>
      </div>

      <div>
        <h1 aria-label="构建产品的人。">
          <span className="char">构</span>
          <span className="char">建</span>
          <span className="stroke-wrap">
            <span className="char acid">产</span>
            <span className="char acid">品</span>
          </span>
          <span className="char">的</span>
          <span className="char">人</span>
          <span className="char dot" />
        </h1>
      </div>

      <div className="sub">
        <div className="one">
          探索个人 <em>Agent</em> 架构、数据主权、AI 时代的硬件范式，以及连接这一切的产品设计。
        </div>
        <div className="meta">
          <div className="row"><span className="sq" /><span>工程师 / 产品判断 / 独立交付</span></div>
          <div className="row"><span className="sq" /><span>个人项目都来自真实问题</span></div>
          <div className="row"><span className="sq" /><span>问题先于功能</span></div>
          <div className="row"><span className="sq" /><span>拒绝表演性忙碌</span></div>
        </div>
      </div>
    </section>
  );
}
