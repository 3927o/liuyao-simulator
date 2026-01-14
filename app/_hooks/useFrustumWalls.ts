import { useMemo } from 'react';
import * as THREE from 'three';

type Vec3 = [number, number, number];

export interface WallConfig {
  position: Vec3;
  rotation: Vec3;
  args: Vec3;
}

export interface FrustumWallsOptions {
  camera: { position: Vec3; rotation: Vec3; fov: number };
  aspect?: number;
  near?: number;
  far?: number;
  thickness?: number;
  margin?: number;
  ceiling: number;
  floor: number;
}

export function useFrustumWalls(options: FrustumWallsOptions): WallConfig[] {
  const {
    camera,
    aspect = 1,
    near = 1,
    far = 15,
    thickness = 10,
    margin = 5,
    ceiling,
    floor,
  } = options;

  const { position: camPos, rotation: camRot, fov } = camera;

  return useMemo(() => {
    const halfVFov = THREE.MathUtils.degToRad(fov / 2);
    const halfHFov = Math.atan(aspect * Math.tan(halfVFov));
    const halfThick = thickness / 2;

    const cameraObj = new THREE.Object3D();
    cameraObj.position.set(...camPos);
    cameraObj.rotation.set(...camRot);
    cameraObj.updateMatrixWorld();

    const refDist = (near + far) / 2;
    const frustumHalfWidth = refDist * Math.tan(halfHFov);
    const frustumHalfHeight = refDist * Math.tan(halfVFov);
    const farHalfWidth = far * Math.tan(halfHFov);
    const farHalfHeight = far * Math.tan(halfVFov);
    const coverage = far - near;

    const wallHalfLengthH = coverage / (2 * Math.cos(halfHFov)) + margin;
    const wallHalfLengthV = coverage / (2 * Math.cos(halfVFov)) + margin;
    const wallDepthH = farHalfHeight * 2 + margin * 2;
    const wallDepthV = farHalfWidth * 2 + margin * 2;

    const thickOffsetH = halfThick * Math.cos(halfHFov);
    const thickOffsetV = halfThick * Math.cos(halfVFov);
    const zOffsetH = halfThick * Math.sin(halfHFov);
    const zOffsetV = halfThick * Math.sin(halfVFov);

    const walls: WallConfig[] = [];

    function toWorld(localPos: Vec3, localRot: Vec3, args: Vec3): WallConfig {
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

    // 四个侧面墙壁
    walls.push(toWorld([frustumHalfWidth + thickOffsetH, 0, -(refDist - zOffsetH)], [0, -halfHFov, 0], [halfThick, wallDepthH / 2, wallHalfLengthH]));
    walls.push(toWorld([-(frustumHalfWidth + thickOffsetH), 0, -(refDist - zOffsetH)], [0, halfHFov, 0], [halfThick, wallDepthH / 2, wallHalfLengthH]));
    walls.push(toWorld([0, frustumHalfHeight + thickOffsetV, -(refDist - zOffsetV)], [halfVFov, 0, 0], [wallDepthV / 2, halfThick, wallHalfLengthV]));
    walls.push(toWorld([0, -(frustumHalfHeight + thickOffsetV), -(refDist - zOffsetV)], [-halfVFov, 0, 0], [wallDepthV / 2, halfThick, wallHalfLengthV]));

    // 水平天花板和地板
    const [pitch, yaw] = [camRot[0], camRot[1]];
    const [cx, , cz] = camPos;
    const sinYaw = Math.sin(yaw);
    const cosYaw = Math.cos(yaw);
    const cosPitch = Math.cos(pitch);

    const nearHDist = near * cosPitch;
    const farHDist = far * cosPitch;
    const centerX = cx - sinYaw * (nearHDist + farHDist) / 2;
    const centerZ = cz - cosYaw * (nearHDist + farHDist) / 2;

    const halfWidth = farHalfWidth + margin;
    const halfDepth = (farHDist - nearHDist) / 2 + margin;

    walls.push({ position: [centerX, ceiling + halfThick, centerZ], rotation: [0, yaw, 0], args: [halfWidth, halfThick, halfDepth] });
    walls.push({ position: [centerX, floor - halfThick, centerZ], rotation: [0, yaw, 0], args: [halfWidth, halfThick, halfDepth] });

    return walls;
  }, [camPos[0], camPos[1], camPos[2], camRot[0], camRot[1], camRot[2], fov, aspect, thickness, near, far, margin, ceiling, floor]);
}
