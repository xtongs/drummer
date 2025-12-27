import puppeteer from 'puppeteer';


(async () => {
  try {
    console.log('正在启动浏览器...');
    const browser = await puppeteer.launch({
      headless: false, // 显示浏览器窗口
      slowMo: 100, // 减缓操作速度以便观察
    });

    console.log('创建新页面...');
    const page = await browser.newPage();

    // 设置页面尺寸
    await page.setViewport({ width: 1024, height: 768 });

    console.log('导航到本地开发服务器...');
    await page.goto('http://localhost:3000/drummer/', { waitUntil: 'networkidle0' });

    console.log('等待页面加载完成...');
    await page.waitForTimeout(2000);

    // 检查页面标题
    const title = await page.title();
    console.log(`页面标题: ${title}`);

    // 检查关键UI元素
    console.log('检查关键UI元素...');

    // 检查顶部栏
    const topBarExists = await page.$('.top-bar') !== null;
    console.log(`顶部栏存在: ${topBarExists}`);

    // 检查节拍指示器
    const beatIndicatorExists = await page.$('.beat-indicator') !== null;
    console.log(`节拍指示器存在: ${beatIndicatorExists}`);

    // 检查BPM速度
    const bpmValueExists = await page.$('.bpm-value') !== null;
    console.log(`BPM显示存在: ${bpmValueExists}`);

    // 检查时间签名选择器
    const timeSignatureExists = await page.$('.time-signature-select') !== null;
    console.log(`时间签名选择器存在: ${timeSignatureExists}`);

    // 检查速度控制区域
    const speedControlExists = await page.$('.speed-control') !== null;
    console.log(`速度控制区域存在: ${speedControlExists}`);

    // 检查BPM滑块
    const bpmSliderExists = await page.$('.bpm-slider') !== null;
    console.log(`BPM滑块存在: ${bpmSliderExists}`);

    // 检查BPM增减按钮
    const bpmButtonsExist = await page.$('.bpm-button') !== null;
    console.log(`BPM增减按钮存在: ${bpmButtonsExist}`);

    // 检查播放按钮
    const playButtonExists = await page.$('.play-button') !== null;
    console.log(`播放按钮存在: ${playButtonExists}`);

    // 检查终端风格元素
    const terminalTextExists = await page.$('.terminal-text') !== null;
    console.log(`终端风格元素存在: ${terminalTextExists}`);

    // 测试BPM调节功能
    console.log('\n测试BPM调节功能...');

    // 获取初始BPM值
    let bpmValue = await page.$eval('.bpm-value', el => el.textContent);
    console.log(`初始BPM值: ${bpmValue}`);

    // 增加BPM
    await page.click('.bpm-increase');
    await page.waitForTimeout(500);
    bpmValue = await page.$eval('.bpm-value', el => el.textContent);
    console.log(`增加后BPM值: ${bpmValue}`);

    // 减少BPM
    await page.click('.bpm-decrease');
    await page.waitForTimeout(500);
    bpmValue = await page.$eval('.bpm-value', el => el.textContent);
    console.log(`减少后BPM值: ${bpmValue}`);

    // 测试播放/暂停功能
    console.log('\n测试播放/暂停功能...');

    // 点击播放按钮
    await page.click('.play-button');
    await page.waitForTimeout(1000);

    // 检查播放状态
    const isPlaying = await page.$('.play-button.playing') !== null;
    console.log(`播放状态: ${isPlaying}`);

    // 再次点击暂停
    await page.click('.play-button');
    await page.waitForTimeout(500);

    const isPaused = await page.$('.play-button.playing') === null;
    console.log(`暂停状态: ${isPaused}`);

    // 测试时间签名切换
    console.log('\n测试时间签名切换...');

    // 选择3/4拍
    await page.select('.time-signature-select', '3');
    await page.waitForTimeout(500);

    const selectedTimeSignature = await page.$eval('.time-signature-select', el => el.value);
    console.log(`选中的时间签名: ${selectedTimeSignature}`);

    // 检查节拍点数量是否正确
    const beatDotsCount = await page.$$eval('.beat-dot', dots => dots.length);
    console.log(`节拍点数量: ${beatDotsCount}`);

    // 截图保存
    const screenshotPath = 'ui-screenshot.png';
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`\nUI截图已保存到: ${screenshotPath}`);

    // 等待一段时间以便手动观察
    console.log('\n等待10秒以便手动观察...');
    await page.waitForTimeout(10000);

    // 关闭浏览器
    console.log('关闭浏览器...');
    await browser.close();

    console.log('\nUI检查完成!');
  } catch (error) {
    console.error('发生错误:', error);
  }
})();
