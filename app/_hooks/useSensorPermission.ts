import { useState, useCallback, useEffect } from 'react';

/**
 * Hook: 处理设备运动权限
 */
export function useSensorPermission() {
  const [granted, setGranted] = useState(false);
  const [showButton, setShowButton] = useState(false); // 默认不显示，按需显示

  // 检测是否需要权限请求
  useEffect(() => {
    const needsPermission = typeof DeviceMotionEvent !== 'undefined'
      && typeof (DeviceMotionEvent as any).requestPermission === 'function';

    if (needsPermission) {
      // iOS 13+ 需要用户点击触发
      setShowButton(true);
    } else {
      // 安卓等平台直接授权
      setGranted(true);
      setShowButton(false);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    // iOS 13+ 需要显式请求权限
    if (typeof DeviceMotionEvent !== 'undefined' && typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      try {
        const response = await (DeviceMotionEvent as any).requestPermission();
        if (response === 'granted') {
          setGranted(true);
          setShowButton(false);
        } else {
          alert('需要权限才能摇卦');
        }
      } catch (e) {
        console.error("Permission error:", e);
      }
    } else {
      // 非 iOS 13+ 或 Android 通常直接允许
      setGranted(true);
      setShowButton(false);
    }
  }, []);

  return { granted, showButton, requestPermission };
}
