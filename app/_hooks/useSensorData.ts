import { useRef, useEffect } from 'react';

export interface SensorData {
  beta: number;
  gamma: number;
  accX: number;
  accY: number;
}

/**
 * Hook: 处理传感器数据监听
 * 返回一个 ref 对象，包含当前的姿态(beta, gamma)和加速度(accX, accY)
 */
export function useSensorData(isEnabled: boolean) {
  const sensorData = useRef<SensorData>({ beta: 0, gamma: 0, accX: 0, accY: 0 });
  const calibration = useRef({ beta: 0, gamma: 0, isSet: false });

  useEffect(() => {
    if (!isEnabled) return;

    const handleOrientation = (e: DeviceOrientationEvent) => {
      const rawBeta = e.beta || 0;
      const rawGamma = e.gamma || 0;
      
      // 初始校准：以当前手持角度为归零点
      if (!calibration.current.isSet) {
        calibration.current.beta = rawBeta;
        calibration.current.gamma = rawGamma;
        calibration.current.isSet = true;
      }
      sensorData.current.beta = rawBeta - calibration.current.beta;
      sensorData.current.gamma = rawGamma - calibration.current.gamma;
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
      calibration.current.isSet = false;
    };
  }, [isEnabled]);

  return sensorData;
}
