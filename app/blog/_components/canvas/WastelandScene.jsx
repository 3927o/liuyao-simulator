import { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, FogExp2, Sparkles, MeshReflectorMaterial } from '@react-three/drei';
import { EffectComposer, Bloom, Noise, Vignette } from '@react-three/postprocessing';
import Artifact from './Artifact';
import PlayerController from './PlayerController';

export default function WastelandScene({ posts, onArtifactSelect }) {
  const controlsRef = useRef();

  return (
    <div className="h-full w-full bg-black">
      <Canvas 
        camera={{ position: [0, 8, 25], fov: 45 }}
        gl={{ antialias: false }} // 关闭默认抗锯齿，交给后处理，性能更好
        dpr={[1, 2]} // 适配高分屏
      >
        {/* 1. 氛围基调：漆黑 + 浓雾 */}
        <color attach="background" args={['#050505']} />
        <fogExp2 attach="fog" args={['#050505', 0.02]} /> 

        {/* 2. 灯光：戏剧性打光 */}
        <ambientLight intensity={0.1} /> {/* 环境光很暗 */}
        {/* 主光源：冷色调 */}
        <spotLight position={[50, 50, -50]} angle={0.3} penumbra={1} intensity={2} color="#00ffff" castShadow />
        {/* 补光：暖色调，形成冷暖对比 */}
        <pointLight position={[-10, -10, -10]} intensity={2} color="#ff0055" />

        {/* 3. 地面：无尽镜面 */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]}>
            <planeGeometry args={[500, 500]} />
            <MeshReflectorMaterial
                blur={[300, 100]} // 模糊反射
                resolution={1024}
                mixBlur={1}
                mixStrength={40} // 反射强度
                roughness={1}
                depthScale={1.2}
                minDepthThreshold={0.4}
                maxDepthThreshold={1.4}
                color="#101010"
                metalness={0.5}
            />
        </mesh>

        {/* 4. 粒子：漂浮的数据尘埃 */}
        <Sparkles 
            count={2000} 
            scale={[100, 50, 100]} 
            size={4} 
            speed={0.4} 
            opacity={0.5} 
            color="#ffffff" 
        />

        {/* 5. 造物 */}
        {posts.map((post) => (
          <Artifact key={post.id} data={post} onSelect={onArtifactSelect} />
        ))}

        {/* 6. 后处理特效：这是震撼感的来源 */}
        <EffectComposer disableNormalPass>
            {/* Bloom: 让 emissive 材质发光 */}
            <Bloom luminanceThreshold={0.5} mipmapBlur intensity={1.5} radius={0.4} />
            {/* Noise: 胶片颗粒感 */}
            <Noise opacity={0.05} />
            {/* Vignette: 暗角，聚焦中心 */}
            <Vignette eskil={false} offset={0.1} darkness={1.1} />
        </EffectComposer>

        {/* 控制器 */}
        <OrbitControls 
            ref={controlsRef}
            enableDamping
            maxPolarAngle={Math.PI / 2 - 0.05} 
            maxDistance={150}
        />
        <PlayerController controlsRef={controlsRef} />

      </Canvas>
    </div>
  );
}