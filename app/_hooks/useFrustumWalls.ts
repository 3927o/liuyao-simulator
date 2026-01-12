import { useMemo } from 'react';
import * as THREE from 'three';

export interface WallConfig {
  position: [number, number, number];
  rotation: [number, number, number];
  args: [number, number, number]; // CuboidCollider 半尺寸 [halfX, halfY, halfZ]
}

export interface FrustumWallsOptions {
  // 相机在 RigidBody 本地坐标系中的位置
  cameraPosition: [number, number, number];
  // 相机在 RigidBody 本地坐标系中的旋转 (Euler XYZ)
  cameraRotation: [number, number, number];
  // 相机垂直视野角度 (度)
  fov: number;
  // 宽高比 (默认 1)
  aspect?: number;
  // 墙壁厚度 (默认 10)
  wallThickness?: number;
  // 视锥体覆盖的近距离 (从相机出发，默认 1)
  nearDistance?: number;
  // 视锥体覆盖的远距离 (从相机出发，默认 15)
  farDistance?: number;
  // 墙壁额外边距 (默认 5)
  wallMargin?: number;
}

/**
 * 通用视锥体墙壁计算 Hook
 *
 * 无论相机在什么位置、什么朝向、什么 FOV，
 * 都能自动计算出贴合视锥体边界的墙壁配置。
 *
 * 原理：
 * 1. 在相机本地坐标系中定义墙壁（视锥体的4个侧面 + 远近平面）
 * 2. 利用 Three.js Object3D 层级关系，将本地坐标转换为 RigidBody 坐标
 */
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
  } = options;

  return useMemo(() => {
    // 计算半视野角
    const halfVFov = THREE.MathUtils.degToRad(fov / 2);
    const halfHFov = Math.atan(Math.tan(halfVFov) * aspect);

    // 创建虚拟相机对象（用于坐标变换）
    const cameraObj = new THREE.Object3D();
    cameraObj.position.set(...cameraPosition);
    cameraObj.rotation.set(...cameraRotation);
    cameraObj.updateMatrixWorld();

    // 参考距离：墙壁中心所在的距离
    const refDist = (nearDistance + farDistance) / 2;

    // 在参考距离处的视锥体半尺寸
    const frustumHalfWidth = refDist * Math.tan(halfHFov);
    const frustumHalfHeight = refDist * Math.tan(halfVFov);

    // 在远平面处的视锥体半尺寸（用于墙壁深度）
    const farHalfWidth = farDistance * Math.tan(halfHFov);
    const farHalfHeight = farDistance * Math.tan(halfVFov);

    // 墙壁覆盖长度
    const coverageLength = farDistance - nearDistance;

    // 沿斜面的墙壁半长度（加余量确保完全覆盖）
    const wallHalfLengthH = coverageLength / (2 * Math.cos(halfHFov)) + wallMargin;
    const wallHalfLengthV = coverageLength / (2 * Math.cos(halfVFov)) + wallMargin;

    // 墙壁深度：需要覆盖视锥体横截面
    const wallDepthH = farHalfHeight * 2 + wallMargin * 2;
    const wallDepthV = farHalfWidth * 2 + wallMargin * 2;

    // 厚度偏移量（使墙壁内表面对齐视锥体边界）
    const thickOffsetH = (wallThickness / 2) * Math.cos(halfHFov);
    const thickOffsetV = (wallThickness / 2) * Math.cos(halfVFov);
    // 由于倾斜，墙壁中心在Z方向的偏移
    const zOffsetH = (wallThickness / 2) * Math.sin(halfHFov);
    const zOffsetV = (wallThickness / 2) * Math.sin(halfVFov);

    const walls: WallConfig[] = [];

    /**
     * 辅助函数：在相机本地坐标系中创建墙壁，返回 RigidBody 坐标系中的配置
     */
    function createWallInCameraSpace(
      localPos: [number, number, number],
      localRot: [number, number, number],
      halfExtents: [number, number, number]
    ): WallConfig {
      const wallObj = new THREE.Object3D();
      wallObj.position.set(...localPos);
      wallObj.rotation.set(...localRot);

      cameraObj.add(wallObj);
      wallObj.updateMatrixWorld();

      // 获取世界（RigidBody）坐标
      const worldPos = new THREE.Vector3();
      const worldQuat = new THREE.Quaternion();
      wallObj.getWorldPosition(worldPos);
      wallObj.getWorldQuaternion(worldQuat);

      const worldRot = new THREE.Euler().setFromQuaternion(worldQuat, 'XYZ');

      cameraObj.remove(wallObj);

      return {
        position: [worldPos.x, worldPos.y, worldPos.z],
        rotation: [worldRot.x, worldRot.y, worldRot.z],
        args: halfExtents,
      };
    }

    // ========== 四个侧面墙壁 ==========

    // 右墙壁 (+X 方向)
    // 在相机本地坐标系中，墙壁在 +X 侧，绕 Y 轴旋转使其平行于右侧视锥体面
    walls.push(createWallInCameraSpace(
      [frustumHalfWidth + thickOffsetH, 0, -(refDist - zOffsetH)],
      [0, -halfHFov, 0],
      [wallThickness / 2, wallDepthH / 2, wallHalfLengthH]
    ));

    // 左墙壁 (-X 方向)
    walls.push(createWallInCameraSpace(
      [-(frustumHalfWidth + thickOffsetH), 0, -(refDist - zOffsetH)],
      [0, halfHFov, 0],
      [wallThickness / 2, wallDepthH / 2, wallHalfLengthH]
    ));

    // 上墙壁 (+Y 方向，相机本地坐标系中的"上"）
    walls.push(createWallInCameraSpace(
      [0, frustumHalfHeight + thickOffsetV, -(refDist - zOffsetV)],
      [halfVFov, 0, 0],
      [wallDepthV / 2, wallThickness / 2, wallHalfLengthV]
    ));

    // 下墙壁 (-Y 方向)
    walls.push(createWallInCameraSpace(
      [0, -(frustumHalfHeight + thickOffsetV), -(refDist - zOffsetV)],
      [-halfVFov, 0, 0],
      [wallDepthV / 2, wallThickness / 2, wallHalfLengthV]
    ));

    // ========== 近远平面 ==========

    // 近平面在视锥体近端的尺寸
    const nearHalfWidth = nearDistance * Math.tan(halfHFov) + wallMargin;
    const nearHalfHeight = nearDistance * Math.tan(halfVFov) + wallMargin;

    // 近平面
    walls.push(createWallInCameraSpace(
      [0, 0, -(nearDistance - wallThickness / 2)],
      [0, 0, 0],
      [nearHalfWidth, nearHalfHeight, wallThickness / 2]
    ));

    // 远平面
    walls.push(createWallInCameraSpace(
      [0, 0, -(farDistance + wallThickness / 2)],
      [0, 0, 0],
      [farHalfWidth + wallMargin, farHalfHeight + wallMargin, wallThickness / 2]
    ));

    return walls;
  }, [
    cameraPosition[0], cameraPosition[1], cameraPosition[2],
    cameraRotation[0], cameraRotation[1], cameraRotation[2],
    fov, aspect, wallThickness, nearDistance, farDistance, wallMargin
  ]);
}
