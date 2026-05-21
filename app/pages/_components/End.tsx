'use client';

/**
 * §08 FIN — signoff + 信纸格式 letterhead，最末一行 mono fin。
 */
export function End() {
  return (
    <section className="end" data-section="§08 — FIN" data-read="01 MIN">
      <div className="frame">
        <div className="signoff">
          <span className="cn">读到这里，我们应该已经互相<em>筛选</em>过一轮了。如愿继续，请来信。</span>
          <span>If still willing, write a letter.</span>
        </div>
        <div className="letterhead">
          <div className="row">
            <div className="k">TO</div>
            <div className="v"><a href="mailto:Richardo">Richardo</a></div>
          </div>
          <div className="row">
            <div className="k">FROM</div>
            <div className="v"><span className="pen">— 写信的人 —</span></div>
          </div>
          <div className="row">
            <div className="k">RE</div>
            <div className="v">值得做的东西</div>
          </div>
        </div>
      </div>
      <div className="fin">
        <span className="sq" />FIN<span className="sq" />A PERSONAL DISPATCH<span className="sq" />2026
      </div>
    </section>
  );
}
