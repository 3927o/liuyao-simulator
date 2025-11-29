import blogData from '@/data/blog_data.json';

export function getWastelandData() {
  // 1. 按时间倒序排序 (最新 -> 最旧)
  const sortedData = blogData.sort((a, b) => new Date(b.date) - new Date(a.date));

  const posts = [];
  const rings = []; // 存储年份边界圆的信息
  let currentYear = null;

  sortedData.forEach((post, index) => {
    // --- 螺旋算法 ---
    const angle = index * 137.5 * (Math.PI / 180); 
    const spreadFactor = 6; // 扩散系数，决定间距
    const radius = spreadFactor * Math.sqrt(index); 

    const x = radius * Math.cos(angle);
    const z = radius * Math.sin(angle);
    
    // 高度扰动
    const heightVariation = 2 + (index * 0.05); 
    const y = (Math.random() - 0.5) * heightVariation;

    // 扇区偏移 (微调)
    let typeOffset = [0, 0, 0];
    if (post.wasteland_type === 'Sector_C_Lost_Tech') typeOffset = [0, 2, 0];

    // --- 年份边界检测 ---
    const postYear = new Date(post.date).getFullYear();
    if (postYear !== currentYear) {
      // 这是一个新的一年的开始（也就是上一年的结束边界）
      // 我们记录这个半径，作为该年份的“外圈”
      rings.push({
        year: postYear,
        radius: radius, // 这个半径就是分界线
        label: postYear.toString()
      });
      currentYear = postYear;
    }

    posts.push({
      ...post,
      position: [x + typeOffset[0], y + typeOffset[1], z + typeOffset[2]],
      rotation: [0, -angle, 0],
      originalIndex: index
    });
  });

  return { posts, rings };
}