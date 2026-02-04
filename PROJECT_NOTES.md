# 第二大脑 - 内容收藏与AI总结

## 项目概述

一个用于收藏网页内容并使用 AI 自动总结的 Web 应用，配合浏览器插件使用。

## 项目路径

```
C:\Users\lenovo\content-collector
```

## 技术栈

- **前端框架**: Next.js 16 + React
- **样式**: Tailwind CSS + next-themes（深色模式）
- **数据库**: Supabase（待配置用户系统）
- **AI**: DeepSeek API

## 当前已实现功能

### 1. 主题切换
- 支持日间/夜间/跟随系统三种模式
- 切换按钮位于右上角设置面板内

### 2. 设置面板
- 点击右上角头像 → "设置" 打开
- 右侧滑入式面板
- 包含：
  - 外观（主题切换）
  - AI 总结提示词（可自定义）
  - 预设示例（折叠展开）

### 3. 浏览器插件功能
- 内容提取（支持小红书、知乎、微信公众号等）
- OCR 图片文字识别（部分平台因 CSP 限制不可用）
- 自动保存到当前数据库

### 4. 页面布局
- 顶部导航：Logo + 右上角用户菜单
- 左侧边栏：搜索、标签筛选、统计
- 右侧：内容卡片列表

## 待实现功能

### 用户系统（高优先级）
- [ ] Supabase Auth 配置
- [ ] 邮箱验证码登录
- [ ] 用户数据隔离
- [ ] 登录/注册页面

### 其他
- [ ] 标签管理（增删改）
- [ ] 内容导出功能
- [ ] 数据备份/恢复

## 重要配置

### 环境变量 (.env.local)
```env
# DeepSeek API（已配置）
DEEPSEEK_API_KEY=your_api_key_here

# Supabase（待配置）
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 数据库表
- `contents` - 收藏内容表
- `user_settings` - 用户设置表（待扩展用户字段）

## 启动命令

```bash
cd C:\Users\lenovo\content-collector

# 开发模式
npm run dev

# 生产构建
npm run build
npm start
```

## 访问地址

- 本地开发: http://localhost:3000 或 http://localhost:3001
- 端口被占用时会自动切换

## 关键文件说明

```
src/
├── app/
│   ├── page.tsx              # 主页面
│   ├── layout.tsx            # 根布局（含 Providers）
│   ├── providers.tsx         # ThemeProvider
│   ├── globals.css           # 全局样式（深色模式）
│   ├── components/           # 页面组件
│   │   ├── ContentCard.tsx      # 内容卡片
│   │   ├── SearchBar.tsx        # 搜索框
│   │   ├── TagFilter.tsx        # 标签筛选
│   │   └── ExtractedContentModal.tsx  # 提取结果弹窗
│   └── api/                  # API 路由
│       ├── contents/         # 内容 CRUD
│       ├── summarize/        # AI 总结
│       └── settings/         # 设置
├── components/               # 共享组件
│   ├── Header.tsx            # 顶部导航
│   └── SettingsPanel.tsx     # 设置面板
└── lib/
    ├── deepseek.ts           # DeepSeek AI 调用
    └── supabase.ts           # Supabase 客户端
```

## 浏览器插件

```
extension/
├── manifest.json     # Manifest V3 配置
├── popup.html        # 弹窗界面
├── popup.js          # 弹窗逻辑
├── content.js        # 注入脚本（内容提取）
└── background.js     # 背景脚本
```

## 深色模式实现

使用 CSS 变量 + next-themes：

```css
:root {
  --background: #f9fafb;
  --foreground: #111827;
}

.dark {
  --background: #111827;
  --foreground: #f9fafb;
}
```

## 快速上手

1. 安装依赖: `npm install`
2. 配置 API Key: 编辑 `.env.local`
3. 启动开发: `npm run dev`
4. 打开浏览器访问显示的地址

## 注意事项

- 部分平台（如小红书、知乎）因 CSP 限制无法加载外部脚本，OCR 功能在这些平台上不可用
- 当前使用 localStorage 保存设置，配置 Supabase 后可实现跨设备同步
