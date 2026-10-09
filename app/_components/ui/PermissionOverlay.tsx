'use client';

import React from 'react';
import { ModuleNav } from './ModuleNav';

interface PermissionOverlayProps {
  onRequestPermission: () => void;
}

/**
 * 组件：权限请求覆盖层
 */
export function PermissionOverlay({ onRequestPermission }: PermissionOverlayProps) {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/95 backdrop-blur-sm">
      <div className="absolute top-4 left-4"><ModuleNav active="liuyao" /></div>
      <div className="text-center space-y-6">
        <div className="text-gray-400 text-sm">需要传感器权限以开始摇卦</div>
        <button
          onClick={onRequestPermission}
          className="px-8 py-3 bg-gray-900 text-white rounded-full text-sm font-medium transition-all hover:bg-gray-800 hover:scale-105 active:scale-95"
        >
          开始
        </button>
      </div>
    </div>
  );
}
