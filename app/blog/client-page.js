'use client';

import { useState, useMemo } from 'react';
import { KeyboardControls } from '@react-three/drei'; // 引入这个
import WastelandScene from '@/components/canvas/WastelandScene';
import ReadingOverlay from '@/components/dom/ReadingOverlay';
import { getWastelandData } from '@/lib/utils';

export default function ClientPage({ posts: initialPosts }) { // 如果你用了JSON方案，这里可能不需要prop
  // 刚才的JSON方案代码...
  const posts = useMemo(() => getWastelandData(), []);
  const [selectedPost, setSelectedPost] = useState(null);

  // 定义按键映射
  const keyboardMap = [
    { name: 'forward', keys: ['ArrowUp', 'w', 'W'] },
    { name: 'backward', keys: ['ArrowDown', 's', 'S'] },
    { name: 'left', keys: ['ArrowLeft', 'a', 'A'] },
    { name: 'right', keys: ['ArrowRight', 'd', 'D'] },
    { name: 'run', keys: ['Shift'] },
  ];

  return (
    <KeyboardControls map={keyboardMap}> {/* 包裹整个场景 */}
        <main className="relative w-screen h-screen overflow-hidden bg-[#111]">
          
          <div className={`transition-opacity duration-500 w-full h-full ${selectedPost ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
            <WastelandScene 
                posts={posts} 
                onArtifactSelect={setSelectedPost} 
            />
          </div>

          <div className="absolute top-0 left-0 p-6 z-10 text-white/50 pointer-events-none select-none">
            <h1 className="text-xl font-bold tracking-widest uppercase">[The Spiritual Wasteland]</h1>
            <p className="text-xs mt-2">
                [WASD] to Move | [SHIFT] to Run | [DRAG] to Look
            </p>
          </div>

          {selectedPost && (
              <ReadingOverlay 
                  post={selectedPost} 
                  onClose={() => setSelectedPost(null)} 
              />
          )}
          
        </main>
    </KeyboardControls>
  );
}