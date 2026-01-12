import { useMemo } from 'react';
import * as THREE from 'three';

export interface WallConfig {
  position: [number, number, number];
  rotation: [number, number, number];
  args: [number, number, number];
}

export interface FrustumWallsOptions {
  cameraPosition: [number, number, number];
  cameraRotation: [number, number, number];
  fov: number;
  aspect?: number;
  wallThickness?: number;
  nearDistance?: number;
  farDistance?: number;
  wallMargin?: number;
  // 近远平面是否保持水平（默认 false）
  keepNearFarHorizontal?: boolean;
  ceilingY?: number;
  floorY?: number;
}

export function useFrustumWalls(options: FrustumWallsOptions): WallConfig[] {
  const {
    cameraPosition,
    cameraRotation,
    fov,
    aspect = 1,
    wallThickness = 10,
    nearDistance = 1,
    farDistance = 15,
    wallMargin = 5,
    keepNearFarHorizontal = false,
    ceilingY,
    floorY,
  } = options;

  return useMemo(() => {
    const halfVFov = THREE.MathUtils.degToRad(fov / 2);
    const halfHFov = Math.atan(Math.tan(halfVFov) * aspect);
    const halfThick = wallThickness / 2;

    const cameraObj = new THREE.Object3D();
    cameraObj.position.set(...cameraPosition);
    cameraObj.rotation.set(...cameraRotation);
    cameraObj.updateMatrixWorld();

    const refDist = (nearDistance + farDistance) / 2;
    const frustumHalfWidth = refDist * Math.tan(halfHFov);
    const frustumHalfHeight = refDist * Math.tan(halfVFov);
    const farHalfWidth = farDistance * Math.tan(halfHFov);
    const farHalfHeight = farDistance * Math.tan(halfVFov);
    const coverageLength = farDistance - nearDistance;

    const wallHalfLengthH = coverageLength / (2 * Math.cos(halfHFov)) + wallMargin;
    const wallHalfLengthV = coverageLength / (2 * Math.cos(halfVFov)) + wallMargin;
    const wallDepthH = farHalfHeight * 2 + wallMargin * 2;
    const wallDepthV = farHalfWidth * 2 + wallMargin * 2;

    const thickOffsetH = halfThick * Math.cos(halfHFov);
    const thickOffsetV = halfThick * Math.cos(halfVFov);
    const zOffsetH = halfThick * Math.sin(halfHFov);
    const zOffsetV = halfThick * Math.sin(halfVFov);

    const walls: WallConfig[] = [];

    function toWorld(localPos: [number, number, number], localRot: [number, number, number], args: [number, number, number]): WallConfig {
      const obj = new THREE.Object3D();
      obj.position.set(...localPos);
      obj.rotation.set(...localRot);
      cameraObj.add(obj);
      obj.updateMatrixWorld();

      const pos = new THREE.Vector3();
      const quat = new THREE.Quaternion();
      obj.getWorldPosition(pos);
      obj.getWorldQuaternion(quat);
      const rot = new THREE.Euler().setFromQuaternion(quat, 'XYZ');

      cameraObj.remove(obj);
      return { position: [pos.x, pos.y, pos.z], rotation: [rot.x, rot.y, rot.z], args };
    }

    // 四个侧面墙壁（始终跟随相机）
    walls.push(toWorld([frustumHalfWidth + thickOffsetH, 0, -(refDist - zOffsetH)], [0, -halfHFov, 0], [halfThick, wallDepthH / 2, wallHalfLengthH]));
    walls.push(toWorld([-(frustumHalfWidth + thickOffsetH), 0, -(refDist - zOffsetH)], [0, halfHFov, 0], [halfThick, wallDepthH / 2, wallHalfLengthH]));
    walls.push(toWorld([0, frustumHalfHeight + thickOffsetV, -(refDist - zOffsetV)], [halfVFov, 0, 0], [wallDepthV / 2, halfThick, wallHalfLengthV]));
    walls.push(toWorld([0, -(frustumHalfHeight + thickOffsetV), -(refDist - zOffsetV)], [-halfVFov, 0, 0], [wallDepthV / 2, halfThick, wallHalfLengthV]));

    if (keepNearFarHorizontal) {
      // 近远平面保持水平（作为天花板和地板）
      const [pitch, yaw] = [cameraRotation[0], cameraRotation[1]];
      const [cx, cy, cz] = cameraPosition;
      const sinYaw = Math.sin(yaw);
      const cosYaw = Math.cos(yaw);
      const cosPitch = Math.cos(pitch);

      // 水平投影距离
      const nearHDist = nearDistance * cosPitch;
      const farHDist = farDistance * cosPitch;

      // 平面中心位置（近端和远端的中点）
      const centerX = cx - sinYaw * (nearHDist + farHDist) / 2;
      const centerZ = cz - cosYaw * (nearHDist + farHDist) / 2;

      // 默认 Y 坐标：基于相机位置，而非视锥体范围
      const actualCeilingY = ceilingY ?? cy;
      const actualFloorY = floorY ?? -wallMargin;

      // 平面尺寸（不受 wallMargin 影响）
      const halfWidth = farHalfWidth + wallMargin;
      const halfDepth = (farHDist - nearHDist) / 2 + wallMargin;

      walls.push({ position: [centerX, actualCeilingY + halfThick, centerZ], rotation: [0, yaw, 0], args: [halfWidth, halfThick, halfDepth] });
      walls.push({ position: [centerX, actualFloorY - halfThick, centerZ], rotation: [0, yaw, 0], args: [halfWidth, halfThick, halfDepth] });
    } else {
      // 近远平面跟随相机
      const nearHW = nearDistance * Math.tan(halfHFov) + wallMargin;
      const nearHH = nearDistance * Math.tan(halfVFov) + wallMargin;
      walls.push(toWorld([0, 0, -(nearDistance - halfThick)], [0, 0, 0], [nearHW, nearHH, halfThick]));
      walls.push(toWorld([0, 0, -(farDistance + halfThick)], [0, 0, 0], [farHalfWidth + wallMargin, farHalfHeight + wallMargin, halfThick]));
    }

    return walls;
  }, [
    cameraPosition[0], cameraPosition[1], cameraPosition[2],
    cameraRotation[0], cameraRotation[1], cameraRotation[2],
    fov, aspect, wallThickness, nearDistance, farDistance, wallMargin,
    keepNearFarHorizontal, ceilingY, floorY
  ]);
}
