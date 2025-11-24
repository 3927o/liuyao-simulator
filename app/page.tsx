'use client';

// 1. 导入 R3F 核心组件
// Canvas: 3D 世界的舞台
// useFrame: 这是一个 Hook，它会在每一帧（每秒约60次）被调用，相当于游戏循环
import { Canvas, useFrame } from '@react-three/fiber';

// 2. 导入 Drei 辅助工具
// OrbitControls: 允许你用鼠标旋转、缩放摄像机
// Environment: 提供真实感的环境光照（让金属看起来像金属）
import { OrbitControls, Environment, Html, PerspectiveCamera } from '@react-three/drei';

// 3. 导入 Rapier 物理引擎
// Physics: 物理世界容器，所有受重力影响的东西都要放在里面
// RigidBody: 刚体组件，给物体加上质量、摩擦力、弹性
// CuboidCollider: 立方体碰撞体（不可见，只用于计算碰撞）
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier';

import { Suspense, useRef, useState } from 'react';
import * as THREE from 'three'; // 导入 Three.js 原生库用于数学计算

/**
 * 组件：智能铜钱 (Smart Coin)
 * 增加了：正反面材质区分 + 实时状态检测
 */
// 1. 定义临时向量（放在组件外面，避免每帧重复创建，节省内存）
const localY = new THREE.Vector3(0, 1, 0);
const worldUp = new THREE.Vector3(0, 1, 0);

function Coin({ position, id }: { position: [number, number, number], id: string }) {
  const [status, setStatus] = useState<string>('...'); // 初始状态显示省略号
  const [isSettled, setIsSettled] = useState(false);  // 记录是否已经静止
  
  // 分别获取 视觉Mesh 和 物理RigidBody 的引用
  const meshRef = useRef<THREE.Mesh>(null);
  const bodyRef = useRef<any>(null); // 使用 Rapier 的 API

  useFrame(() => {
    if (!meshRef.current || !bodyRef.current) return;

    // --- A. 速度检测 (判断有没有停下来) ---
    // linvel() 是线速度，angvel() 是角速度
    const vel = bodyRef.current.linvel();
    const ang = bodyRef.current.angvel();
    
    // 计算速度的大小 (x^2 + y^2 + z^2 开根号)
    const speed = Math.sqrt(vel.x ** 2 + vel.y ** 2 + vel.z ** 2);
    const rotationSpeed = Math.sqrt(ang.x ** 2 + ang.y ** 2 + ang.z ** 2);

    // 只有当移动非常慢，且旋转也非常慢的时候，才视为“静止”
    const isSleeping = speed < 0.1 && rotationSpeed < 0.5;

    if (!isSleeping) {
      if (isSettled) setIsSettled(false); // 如果动起来了，标记为未静止
      if (status !== '...') setStatus('...'); // 运动中不显示结果
      return;
    }

    // --- B. 阴阳检测 (只在静止时计算) ---
    if (!isSettled) {
      // 1. 获取物理刚体当前的旋转 (这是世界坐标下的真实旋转)
      // bodyRef.current.rotation() 返回的是 {x, y, z, w} 原始对象
      const rawRot = bodyRef.current.rotation();
      const bodyRotation = new THREE.Quaternion(rawRot.x, rawRot.y, rawRot.z, rawRot.w);

      // 2. 重置局部向量
      localY.set(0, 1, 0);
      
      // 3. 应用刚体的旋转，而不是 Mesh 的旋转
      localY.applyQuaternion(bodyRotation);

      const dot = localY.dot(worldUp);

      // 阈值判断 (保持不变)
      if (dot > 0.8) {
        setStatus('阳'); 
      } else if (dot < -0.8) {
        setStatus('阴'); 
      } else {
        setStatus('侧立');
      }
      
      setIsSettled(true);
    }
  });

  return (
    <RigidBody 
      ref={bodyRef} // 绑定物理引用
      position={position} 
      colliders="hull" 
      restitution={0.3} 
      friction={0.4} 
      ccd={true}
      // damping: 阻尼，让它停得稍微快一点，不至于在地上滑太久
      linearDamping={0.7} 
      angularDamping={0.7}
    >
      <mesh ref={meshRef} castShadow>
        <cylinderGeometry args={[0.4, 0.4, 0.05, 32]} />
        <meshStandardMaterial attach="material-0" color="#D4AF37" metalness={0.8} roughness={0.3} />
        {/* 红色 = 阳 */}
        <meshStandardMaterial attach="material-1" color="#d32f2f" metalness={0.4} roughness={0.5} />
        {/* 黑色 = 阴 */}
        <meshStandardMaterial attach="material-2" color="#111111" metalness={0.4} roughness={0.5} />

        <Html position={[0, 0.8, 0]} center>
          <div 
            className={`px-2 py-0.5 rounded text-[10px] font-bold pointer-events-none select-none whitespace-nowrap transition-colors duration-200
              ${status === '阳' ? 'bg-red-100 text-red-600 border border-red-200' : ''}
              ${status === '阴' ? 'bg-slate-800 text-white border border-slate-600' : ''}
              ${status === '...' ? 'opacity-0' : 'opacity-100'} 
            `}
          >
             {id}: {status}
          </div>
        </Html>
      </mesh>
    </RigidBody>
  );
}

/**
 * 组件：摇晃的盒子 (ShakingBox)
 * 这是一个由鼠标/传感器控制的“运动学”物体
 */
function ShakingBox() {
  const api = useRef<any>(null);
  
  // 记录当前物理盒子的位置和旋转
  const currentPos = useRef(new THREE.Vector3(0, 0, 0));
  const currentRot = useRef(new THREE.Quaternion());

  useFrame((state) => {
    if (!api.current) return;

    // --- A. 位置平滑与限速 ---
    const targetX = state.pointer.x * 3; 
    const targetY = state.pointer.y * 3; 
    let deltaX = targetX - currentPos.current.x;
    let deltaY = targetY - currentPos.current.y;
    const distance = Math.sqrt(deltaX ** 2 + deltaY ** 2);
    // 限速步长
    const MAX_STEP = 0.15; 
    if (distance > MAX_STEP) {
      const ratio = MAX_STEP / distance;
      deltaX *= ratio;
      deltaY *= ratio;
    }
    // 应用平滑移动 (Lerp)
    currentPos.current.x += deltaX;
    currentPos.current.y += deltaY;

    // --- B. 旋转平滑 (Slerp) ---
    // 限制倾斜角度
    const tiltX = Math.max(Math.min(currentPos.current.y * 0.5, 0.4), -0.4);
    const tiltZ = Math.max(Math.min(-currentPos.current.x * 0.5, 0.4), -0.4);
    const targetQuaternion = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(tiltX, 0, tiltZ)
    );
    // 核心：球面插值平滑旋转，防止边缘速度过快
    currentRot.current.slerp(targetQuaternion, 0.05);

    // --- C. 提交给物理引擎 ---
    api.current.setNextKinematicTranslation({ 
      x: currentPos.current.x, 
      y: currentPos.current.y, 
      z: 0 
    });
    api.current.setNextKinematicRotation(currentRot.current);
  });

  return (
    <RigidBody ref={api} type="kinematicPosition" friction={0.5} colliders={false}>

      {/* 📷 核心修改：把摄像机焊死在盒子上！
         makeDefault: 设为默认摄像机，接管 Canvas 的视角
         position: [0, 8, 0] -> 位于盒子中心正上方 8 米处
         rotation: [-Math.PI / 2, 0, 0] -> 垂直向下看 (俯视)
         fov: 45 -> 视野角度，这个值决定了能看到多宽的范围
      */}
      <PerspectiveCamera 
        makeDefault 
        position={[0, 7, 0]} 
        rotation={[-Math.PI / 2, 0, 0]} 
        fov={45}
      />
      
      {/* --- 🛡️ 物理部分：六面埋伏，超大重叠 --- */}
      {/* 想象一下，这是6块厚度为5的巨大板子，围成了一个空心结构 */}
      
      {/* 1. 地板 (底部封口) */}
      {/* 位置 Y = -1 (内表面) - 2.5 (半厚度) = -3.5 */}
      <CuboidCollider args={[5, 2.5, 5]} position={[0, -3.5, 0]} /> 

      {/* 2. 天花板 (顶部封口) - 新增！ */}
      {/* 位置 Y = +1 (内表面) + 2.5 (半厚度) = +3.5 */}
      <CuboidCollider args={[5, 2.5, 5]} position={[0, 3.5, 0]} /> 
      
      {/* 3. 前后墙 */}
      <CuboidCollider args={[8, 6, 2.5]} position={[0, 0, 5.5]} />   {/* 前 */}
      <CuboidCollider args={[8, 6, 2.5]} position={[0, 0, -5.5]} />  {/* 后 */}
      
      {/* 4. 左右墙 */}
      <CuboidCollider args={[2.5, 6, 5]} position={[5.5, 0, 0]} />   {/* 右 */}
      <CuboidCollider args={[2.5, 6, 5]} position={[-5.5, 0, 0]} />  {/* 左 */}


      {/* --- 🎨 视觉部分：一个漂亮的玻璃盒子 --- */}
      {/* 我们用一个完整的盒子代替原来的散件，它的大小刚好填满物理碰撞体中间的空隙 */}
      <mesh castShadow receiveShadow>
        {/* 盒子大小：宽6，高2，深6 */}
        <boxGeometry args={[6, 2, 6]} />
        {/* MeshPhysicalMaterial 是用来模拟玻璃、水等高级材质的 */}
        <meshPhysicalMaterial
          color="white"       // 基础色
          transmission={0.95} // 透光率 (非常透)
          opacity={1}         // 必须为1，transmission 才能生效
          transparent         // 开启透明计算
          roughness={0.1}     // 光滑度 (越小越像玻璃，越大越像磨砂)
          metalness={0}       // 非金属
          reflectivity={0.5}  // 反射率
          thickness={0.5}     // 模拟厚度，用于计算折射效果
          ior={1.5}           // 折射率 (Index of Refraction), 玻璃大约是 1.5
        />
      </mesh>

    </RigidBody>
  );
}

/**
 * 主页面
 */
export default function Home() {
  return (
    <main className="h-[100vmin] w-[100vmin] bg-slate-900">
      {/* shadows: 开启阴影计算 */}
      <Canvas shadows>
        <Suspense fallback={null}>
        
        {/* 1. 环境设置 */}
        {/* preset="city": 使用预设的城市环境光贴图，金属感必备 */}
        {/* <Environment preset="city" /> */}
        {/* 这一盏灯负责产生阴影 */}
        <directionalLight 
            position={[5, 10, 5]} 
            intensity={2} 
            castShadow 
        />
        <ambientLight intensity={1.5} />

        {/* 2. 物理世界 */}
        {/* debug={true}: 开启调试模式！你会看到绿色的线框，这是物理引擎的“天眼” */}
        {/* gravity={[0, -9.8, 0]}: 设置重力方向向下 */}
        <Physics debug={false} gravity={[0, -20, 0]} timeStep={1/120}> {/* 重力设大一点，掉落感更强 */}
          
          {/* 放入我们的主角 */}
          <ShakingBox />
          
          {/* 放入三枚铜钱，位置稍微错开一点，防止开局重叠炸开 */}
          <Coin id="coin1" position={[0, 0, 0]} />
          <Coin id="coin2" position={[0.2, 0.5, 0.2]} />
          <Coin id="coin3" position={[-0.2, 1, -0.2]} />
          
        </Physics>

        {/* 3. 辅助工具 */}
        {/* <OrbitControls /> */}
        </Suspense>
      </Canvas>
    </main>
  );
}