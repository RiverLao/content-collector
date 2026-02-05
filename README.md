# 第二大脑 - 内容收藏与AI总结应用

一个帮助用户收集各平台（小红书、YouTube、微信公众号等）高质量内容，并通过AI自动总结核心要点的网页应用。

## 功能特性

- **多平台内容提取**：支持小红书、YouTube、微信公众号、知乎、掘金、Medium等平台
- **AI智能总结**：使用 DeepSeek API 自动总结内容核心要点
- **自定义提示词**：支持预设模板和自定义AI总结规则
- **标签管理**：为收藏内容添加自定义标签
- **搜索筛选**：按标题、总结内容或标签搜索
- **响应式设计**：适配桌面和移动设备

## 技术栈

- **前端框架**：Next.js 16 + React
- **样式**：Tailwind CSS
- **数据库**：Supabase
- **AI模型**：DeepSeek Chat
- **内容提取**：Jina Reader API + 自定义提取器

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.local.example` 为 `.env.local` 并填写配置：

```env
# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# DeepSeek API
DEEPSEEK_API_KEY=your_deepseek_api_key

# Jina AI API (可选，用于通用内容提取)
JINA_API_KEY=your_jina_api_key

# 小红书 Cookie (用户输入)
XIAOHONGSHU_COOKIE=
```

### 3. 设置数据库

在 Supabase 控制台执行 `supabase/schema.sql` 中的 SQL 语句创建表。

### 4. 启动开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000)

## 使用说明

1. **添加内容**：在输入框粘贴链接，支持小红书、YouTube、微信公众号等
2. **AI总结**：点击"生成总结"使用 DeepSeek 自动总结内容
3. **标签管理**：为内容添加/删除标签进行分类
4. **搜索筛选**：使用搜索框或标签筛选查找内容

## 部署

### Vercel 部署

1. 将项目推送到 GitHub
2. 在 Vercel 中导入项目
3. 配置环境变量
4. 部署

## 获取 API Key

- **DeepSeek API**: https://platform.deepseek.com/
- **Supabase**: https://supabase.com/
- **Jina AI**: https://jina.ai/

## 注意事项

1. 小红书内容提取需要登录 Cookie
2. 微信文章建议使用 Jina API 提取
3. 请确保 API Key 安全性，不要提交到代码仓库
