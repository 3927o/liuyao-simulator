import { useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

export default function ReadingOverlay({ post, onClose }) {
  
  // --- 修复 1: 监听 ESC 键 ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    // 添加监听
    window.addEventListener('keydown', handleKeyDown);
    
    // 清理监听
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex justify-end pointer-events-none">
        
        {/* 遮罩层 */}
        <div 
            className="absolute inset-0 bg-black/80 pointer-events-auto backdrop-blur-md z-0" 
            onClick={onClose}
        ></div>
        
        {/* 内容层 */}
        <div className="relative z-10 w-full max-w-3xl h-full bg-[#0a0a0a] text-gray-300 p-8 overflow-y-auto shadow-2xl pointer-events-auto border-l border-gray-800 slide-in-right">
            
            <div className="flex justify-between items-start mb-8 border-b border-gray-800 pb-6 sticky top-0 bg-[#0a0a0a] z-20 pt-2">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">{post.title}</h1>
                    <div className="flex items-center gap-3 mt-3">
                        <span className="px-2 py-0.5 bg-white/10 text-white/70 text-xs rounded uppercase tracking-wider">
                            {post.wasteland_type}
                        </span>
                        <span className="text-sm font-mono text-gray-500">{post.date}</span>
                    </div>
                </div>
                <button 
                    onClick={onClose} 
                    className="group flex flex-col items-center justify-center w-10 h-10 border border-gray-700 rounded hover:bg-white hover:border-white transition-all"
                >
                    <span className="text-xl leading-none text-gray-400 group-hover:text-black">×</span>
                    <span className="text-[0.5rem] text-gray-600 group-hover:text-black uppercase">ESC</span>
                </button>
            </div>
            
            <article className="prose prose-invert prose-stone max-w-none prose-lg prose-headings:font-bold prose-headings:tracking-tight prose-p:leading-relaxed prose-a:text-blue-400">
                <ReactMarkdown>{post.content}</ReactMarkdown>
            </article>
            
            <div className="mt-20 pt-10 border-t border-dashed border-gray-800 text-center text-gray-600 text-sm font-mono">
                [ END OF RECORD ]
            </div>
        </div>
    </div>
  );
}