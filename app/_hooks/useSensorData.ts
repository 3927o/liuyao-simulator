import { useRef, useEffect } from 'react';

export interface SensorData {
  beta: number;
  gamma: number;
  accX: number;
  accY: number;
}

export function useSensorData(isEnabled: boolean) {
  // 初始化为 0
  const sensorData = useRef<SensorData>({ beta: 0, gamma: 0, accX: 0, accY: 0 });

  useEffect(() => {
    if (!isEnabled) return;

    const handleOrientation = (e: DeviceOrientationEvent) => {
      // 修改点：不再进行任何减法校准，直接返回传感器原始值
      sensorData.current.beta = e.beta || 0;
      sensorData.current.gamma = e.gamma || 0;
    };

    const handleMotion = (e: DeviceMotionEvent) => {
      if (e.acceleration) {
        sensorData.current.accX = e.acceleration.x || 0;
        sensorData.current.accY = e.acceleration.y || 0;
      }
    };

    window.addEventListener('deviceorientation', handleOrientation);
    window.addEventListener('devicemotion', handleMotion);

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
      window.removeEventListener('devicemotion', handleMotion);
    };
  }, [isEnabled]);

  return sensorData;
}