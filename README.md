# 林方浩个人主页（可部署）

这是一个纯静态个人主页 + 个人博客项目，直接可部署到 GitHub Pages / Vercel / Netlify。

## 本地预览

直接打开 `index.html` 即可。

> 注意：文章和照片列表通过 `fetch` 读取 JSON，本地建议用静态服务器预览（避免部分浏览器 file:// 限制）。

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

### 发布照片

1. 把图片放到项目目录（建议放 `images/`）
2. 在 `data/photos.json` 添加：

```json
{
  "src": "./images/your-photo.jpg",
  "title": "图片标题",
  "description": "图片描述"
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

- 新增照片（自动写入 `data/photos.json`）

```bash
npm run new:photo -- --src "./images/photo-01.jpg" --title "黄昏街道" --description "下班路上拍到的一束光"
```

如果你不想用 npm，也可以直接：

```bash
python3 ./scripts/new_post.py --title "..." --summary "..." --tags "标签A" "标签B"
python3 ./scripts/new_photo.py --src "..." --title "..."
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

说明：

- `--summary` 可选，不填会自动从 Markdown 前文提取摘要
- `--date` 可选，默认当天
- `--slug` 可选，不填会按标题自动生成
- `--tags` 支持空格分隔，也支持逗号形式（例如 `"产品,工程"`）

当前已支持的 Markdown 语法（在文章详情页渲染）：

- 标题：`#` / `##` / `###`
- 段落、分割线 `---`
- 无序列表 / 有序列表
- 引用 `>`
- 行内代码 `` `code` ``
- 代码块 ````` ``` `````
- 粗体 `**text**`、斜体 `*text*`
- 链接 `[text](https://...)`

## 文章标签与搜索

- `posts.html` 已支持按关键词搜索（标题 / 摘要 / 正文 / 标签）
- `posts.html` 已支持标签筛选（可与搜索组合）
- `post.html` 会显示文章标签

## 页面结构

- `index.html`：个人主页（含证件照）
- `posts.html`：文章列表
- `post.html?slug=xxx`：文章详情页
- `photos.html`：照片墙（支持点击灯箱预览）
