import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { Resvg } from '@resvg/resvg-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const svgPath = join(rootDir, 'icon.svg');
const outputSizes = [180, 512]; // iOS 需要 180x180，512x512 用于高质量显示

async function generateIcons() {
  try {
    const svgContent = readFileSync(svgPath, 'utf-8');
    
    for (const size of outputSizes) {
      const outputPath = join(rootDir, `icon-${size}.png`);
      
      // 使用 Resvg 渲染 SVG
      const resvg = new Resvg(svgContent, {
        fitTo: {
          mode: 'width',
          value: size,
        },
        background: '#282a36', // Dracula 背景色
      });
      
      const pngData = resvg.render();
      const pngBuffer = pngData.asPng();
      
      writeFileSync(outputPath, pngBuffer);
      console.log(`✓ 生成图标: ${outputPath} (${size}x${size})`);
    }
    
    console.log('\n✅ 所有图标生成完成！');
  } catch (error) {
    console.error('❌ 生成图标时出错:', error.message);
    process.exit(1);
  }
}

generateIcons();
