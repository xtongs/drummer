# iOS 图标设置说明

## 问题

iOS Safari 浏览器在将页面添加到主屏幕时，不支持 SVG 格式的图标，需要使用 PNG 格式。

## 解决方案

### 方法 1：使用命令行工具（推荐）✨

使用项目自带的命令行工具一键生成 PNG 图标：

```bash
npm run generate-icons
```

这个命令会自动从 `icon.svg` 生成以下尺寸的 PNG 图标：

- `icon-180.png` (180x180 像素) - iOS 主屏幕图标
- `icon-512.png` (512x512 像素) - 高质量显示

### 方法 2：使用在线工具

1. 访问在线 SVG 转 PNG 工具，例如：
   - https://svgtopng.com/
   - https://convertio.co/zh/svg-png/
2. 上传 `icon.svg` 文件
3. 生成以下尺寸的 PNG 图标：
   - `icon-180.png` (180x180 像素) - iOS 主屏幕图标
   - `icon-512.png` (512x512 像素) - 高质量显示
4. 将生成的 PNG 文件保存到项目根目录

### 方法 3：使用浏览器工具

1. 在浏览器中打开 `scripts/generate-icons-simple.html`
2. 点击按钮生成所需尺寸的图标
3. 下载生成的 PNG 文件到项目根目录

### 方法 4：使用图像编辑软件

1. 使用 Photoshop、GIMP 或其他图像编辑软件打开 `icon.svg`
2. 导出为 PNG 格式，尺寸分别为 180x180 和 512x512
3. 保存为 `icon-180.png` 和 `icon-512.png` 到项目根目录

## 验证

生成 PNG 图标后，重新构建项目：

```bash
npm run build
```

然后在 iOS Safari 中测试添加到主屏幕功能，图标应该能正常显示了。
