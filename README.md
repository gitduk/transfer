# 中英互译 - CN/EN Translator

Chrome 扩展，划词自动翻译中英文，基于 DeepL API。

## 功能

- 划词自动翻译：选中中文翻译为英文，选中英文翻译为中文
- 右键菜单翻译
- 快捷键 `Alt+T` 翻译选中文本
- 翻译结果一键复制

## 安装

1. 打开 `chrome://extensions/`
2. 开启右上角「开发者模式」
3. 点击「加载已解压的扩展程序」，选择本项目文件夹

## 配置

1. 注册 [DeepL API](https://www.deepl.com/pro-api)（Free 版每月 50 万字符免费）
2. 点击扩展图标，输入 API Key，保存

## 项目结构

```
├── manifest.json       # 扩展配置 (Manifest V3)
├── background.js       # Service Worker，处理 DeepL API 调用
├── content.js          # 内容脚本，划词检测与弹窗展示
├── popup/
│   ├── popup.html      # 设置页面
│   └── popup.js        # API Key 存储逻辑
└── icons/              # 扩展图标
```
