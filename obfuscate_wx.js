const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');

// 构建目录
const buildDir = path.resolve(__dirname, 'build', 'wechatgame');

// 要混淆的文件列表（3.8.8 微信小游戏）
const filesToObfuscate = [
    path.join(buildDir, 'game.js'),
    path.join(buildDir, 'application.js'),
    path.join(buildDir, 'src', 'chunks', 'bundle.js'),
    // 可选：引擎代码（不建议开启，可能报错）
    // path.join(buildDir, 'src', 'system.bundle.js'),
];

// 混淆配置（适合小游戏，平衡安全与性能）
const obfuscatorOptions = {
    compact: true,
    controlFlowFlattening: false, // 引擎代码建议关闭，否则性能下降
    controlFlowFlatteningThreshold: 0.5,
    stringArray: true,
    stringArrayEncoding: ['base64'],
    stringArrayThreshold: 0.8,
    rotateStringArray: true,
    shuffleStringArray: true,
    splitStrings: true,
    splitStringsChunkLength: 10,
    debugProtection: false,
    disableConsoleOutput: false,
    renameGlobals: true,
    reservedNames: ['cc', 'window', 'wx', 'globalThis'], // 保留引擎/平台全局变量
    sourceMap: false,
    selfDefending: false, // 引擎代码建议关闭
};

// 执行混淆
async function obfuscate() {
    for (const file of filesToObfuscate) {
        if (!fs.existsSync(file)) {
            console.warn(`文件不存在，跳过：${file}`);
            continue;
        }
        console.log(`正在混淆：${file}`);
        const code = fs.readFileSync(file, 'utf8');
        const obfuscated = JavaScriptObfuscator.obfuscate(code, obfuscatorOptions).getObfuscatedCode();
        fs.writeFileSync(file, obfuscated, 'utf8');
    }
    console.log('✅ 3.8.8 微信小游戏代码混淆完成！');
}

obfuscate().catch(console.error);