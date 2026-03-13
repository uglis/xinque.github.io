# 林方浩个人主页（可部署）

这是一个纯静态个人主页 + 个人博客项目，直接可部署到 GitHub Pages / Vercel / Netlify。

## 本地预览

直接打开 `index.html` 即可。

> 注意：文章和动态列表通过 `fetch` 读取 JSON，本地建议用静态服务器预览（避免部分浏览器 file:// 限制）。

例如：

```bash
python3 -m http.server 8080
```

然后访问 `http://localhost:8080`。

## 一键部署（推荐：GitHub Pages）

1. 新建 GitHub 仓库（例如 `linfanghao-homepage`）
2. 上传本目录全部文件
3. 进入仓库 `Settings` → `Pages`
4. `Source` 选择 `Deploy from a branch`
5. 分支选择 `main`，目录选择 `/ (root)`
6. 保存后等待 1-2 分钟即可获得线上链接

## Vercel / Netlify

- Vercel: Import 项目后直接 Deploy（无需额外配置）
- Netlify: New site from Git，选择该仓库直接部署

## 博客内容维护

### 发布文章

编辑 `data/posts.json`，每篇文章一条：

```json
{
  "title": "文章标题",
  "date": "2026-03-12",
  "summary": "摘要",
  "tags": ["产品", "工程"],
  "content": ["第一段", "第二段"],
  "cover": "封面图地址（可选）"
}
```

## 快速个性化

- 姓名：`index.html` 中 `.logo`、标题和页脚
- 联系方式：`#contact` 区域
- 项目内容：`#projects` 三个 `article.project-card`
- 首页证件照：`index.html` 中 `portrait-image`
- 视觉参数：`styles.css` 顶部 `:root` 颜色变量

## 新增内容一键命令（你要的自动化）

项目提供了两个脚本：

- 新增文章（自动写入 `data/posts.json`）

```bash
npm run new:post -- --title "今天的思考" --summary "一句话摘要" --content "第一段" "第二段" --cover "./images/cover.jpg"

# 带标签
npm run new:post -- --title "今天的思考" --summary "一句话摘要" --tags "产品" "工程" --content "第一段" "第二段"
```

- 新增动态 moments（自动写入 `data/moments.json`）

```bash
npm run new:moment -- \
  --text "晚自习后听到这首歌，想分享给你" \
  --music-platform "Apple Music" \
  --music-title "Song Name" \
  --music-url "https://music.apple.com/..." \
  --photo "./photos/your-photo.jpg" \
  --photo-alt "校园夜色"
```

- 交互式新增动态（一步步提问，更省心）

```bash
npm run new:moment:interactive
```

运行后会依次询问：

- 动态内容
- 日期（默认今天）
- 是否添加音乐（平台 / 标题 / 链接）
- 是否添加照片（路径 / 描述）

最后自动写入 `data/moments.json`。

如果你不想用 npm，也可以直接：

```bash
python3 ./scripts/new_post.py --title "..." --summary "..." --tags "标签A" "标签B"
python3 ./scripts/new_moment.py --text "..." --music-url "..."
python3 ./scripts/new_moment_interactive.py
```

### 用 Markdown 发布文章（推荐）

1. 新建 Markdown 文件（例如 `posts/my-first-post.md`）
2. 执行：

```bash
npm run publish:md -- \
  --file "posts/my-first-post.md" \
  --title "我的 Markdown 文章" \
  --tags "产品" "工程" \
  --cover "./images/cover.jpg"
```

你也可以把元信息直接写到 Markdown 头部（frontmatter），然后用最短命令发布：

```md
---
title: 我的 Markdown 文章
date: 2026-03-12
summary: 一句话摘要
slug: my-markdown-post
cover: ./images/cover.jpg
tags:
  - 产品
  - 工程
---

# 正文标题

这是正文第一段。
```

```bash
npm run publish:md -- --file "posts/my-first-post.md"
```

说明：

- `--summary` 可选，不填会自动从 Markdown 前文提取摘要
- `--date` 可选，优先使用命令参数，其次 frontmatter，最后默认当天
- `--slug` 可选，不填时优先 frontmatter，再按标题自动生成
- `--tags` 可选：命令参数与 frontmatter 会合并去重

当前已支持的 Markdown 语法（在文章详情页渲染）：

- 标题：`#` / `##` / `###`
- 段落、分割线 `---`
- 无序列表 / 有序列表
- 引用 `>`
- 行内代码 `` `code` ``
- 代码块 ````` ``` `````
- 粗体 `**text**`、斜体 `*text*`
- 链接 `[text](https://...)`
- 图片 `![alt](src)`（支持点击查看原图）
- 无序/有序列表支持缩进层级显示（按 2 空格或 1 个 tab 作为一级）

## 网页内编辑与发布（仅你本人）

你现在可以用 `admin.html` 在浏览器编辑 Markdown 并发布，但发布权限由本地令牌控制。

1. 启动静态页面：

```bash
python3 -m http.server 8080
```

2. 启动受保护发布服务（新终端执行）：

```bash
export ADMIN_PUBLISH_TOKEN="换成一个你自己的强密码令牌"
python3 ./scripts/admin_publish_server.py
```

3. 打开管理页：

```text
http://127.0.0.1:8080/admin.html
```

4. 输入：

- 文件路径（必须以 `posts/` 开头）
- 管理员令牌（即 `ADMIN_PUBLISH_TOKEN`）
- Markdown 内容

然后点击“发布文章”。

### 安全说明（务必看）

- 该发布服务默认只监听 `127.0.0.1:8787`，仅本机可访问
- 不要把 `ADMIN_PUBLISH_TOKEN` 写进仓库或前端代码
- 若你将站点部署为纯静态托管，`admin.html` 仍可打开，但没有本地发布服务就无法发布

## 文章标签与搜索

- `posts.html` 已支持按关键词搜索（标题 / 摘要 / 正文 / 标签）
- `posts.html` 已支持标签筛选（可与搜索组合）
- `post.html` 会显示文章标签

## 页面结构

- `index.html`：个人主页（含证件照）
- `moments.html`：完整动态时间线（音乐/照片）
- `posts.html`：文章列表
- `post.html?slug=xxx`：文章详情页

## Moments 展示策略

- 首页 `index.html` 仅展示少量动态预览（降低信息密度）
- 点击“查看全部动态”进入 `moments.html` 看完整时间线
