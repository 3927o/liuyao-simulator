'use client';

import React from 'react';

interface PermissionOverlayProps {
  onRequestPermission: () => void;
}

/**
 * 组件：权限请求覆盖层
 */
export function PermissionOverlay({ onRequestPermission }: PermissionOverlayProps) {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md">
      <button
        onClick={onRequestPermission}
        className="group relative px-8 py-3 bg-transparent overflow-hidden border border-cyan-700 text-cyan-500 font-bold tracking-widest transition-all hover:bg-cyan-900/30 hover:border-cyan-400 hover:text-cyan-200"
      >
        <span className="relative z-10">INITIALIZE</span>
        <div className="absolute inset-0 h-full w-full scale-0 transition-all duration-300 group-hover:scale-100 group-hover:bg-cyan-900/10"></div>
      </button>
    </div>
  );
}
