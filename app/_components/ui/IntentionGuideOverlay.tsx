'use client';

interface IntentionGuideOverlayProps {
  onComplete: () => void | Promise<void>;
}

export function IntentionGuideOverlay({ onComplete }: IntentionGuideOverlayProps) {
  return (
    <div
      className="absolute inset-0 z-[60] flex cursor-pointer items-center justify-center bg-white/95 px-6 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="intention-guide-title"
      aria-describedby="intention-guide-description"
    >
      <button
        type="button"
        autoFocus
        onClick={onComplete}
        className="absolute inset-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gray-400"
        aria-label="点击开始起卦"
      />

      <div className="pointer-events-none relative w-full max-w-sm text-center">
        <div className="mb-3 text-xs font-medium tracking-[0.2em] text-gray-400">起卦之前</div>
        <h2 id="intention-guide-title" className="text-2xl font-semibold tracking-tight text-gray-900">
          先在心中默念所问之事
        </h2>
        <p id="intention-guide-description" className="mx-auto mt-4 max-w-xs text-sm leading-7 text-gray-500">
          一次只问一件事，问题越具体，卦象越容易回应。无需说出口，保持这个念头，摇动六次即可。
        </p>
        <p className="mt-4 hidden text-xs tracking-wide text-amber-700/70 [@media(pointer:fine)]:block">
          请在移动设备上体验
        </p>

        <div className="mt-9 text-sm text-gray-500">
          —— 点击开始起卦 ——
        </div>
      </div>
    </div>
  );
}
