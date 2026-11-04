# SILVER HALIDE // 银盐手记

以「35mm 胶片放映机」为设计语言、数据驱动的个人观影档案（Cinephile Log）。纯前端 SPA，无后端。

## 功能

- **放映室 `/`**：最近 10 部电影以胶片履带自动放映，支持拖拽、滚轮惯性、倒片/进片、悬停定格，实时显示片门（GATE）与齿孔（PERF）读数。
- **档案馆 `/archive`**：全量档案，支持关键词检索、分类筛选（全记录/展映/归档/珍藏）、多维排序（观影时间/年份/豆瓣评分）与「档案卡片 / 印相小样」双视图。
- **详情页 `/films/:id`**：双语演职员表、平台评分（IMDb/Letterboxd/豆瓣）、台词金句、双语梗概、个人影评手记、镜头语言札记，支持彩色/黑白银盐切换。
- **全局**：可调胶片颗粒遮罩、键盘快捷键（`←/→` 切帧、`ESC` 返回）、回到顶部、中英双语。

## 技术栈与结构

Vue 3（`<script setup>`）+ Vue Router + Vite + Tailwind CSS 4，可一键部署到 Vercel。

```
src/
├── App.vue                # 根组件：路由视图、全局状态（颗粒/珍藏）
├── main.js                # 入口，挂载 router
├── components/            # AppHeader / AppFooter / FilmReel / FilmArchive / FilmDetail
└── data/
    ├── films.json         # 单一数据源
    ├── films.js           # 加载、排序、派生字段（frameCode/recent/poster/_searchPool）
    ├── validate.js        # schema 校验（浏览器与 Node 共用）
    └── format.js          # 结构化数据 → 展示字符串
router/index.js            # 路由：/ 、/archive、/films/:id 及 404 回退
scripts/                   # check-films.mjs 校验、add.mjs 交互式新增
public/posters/            # 海报（{slug}-{year}.jpg）
vercel.json                # SPA 回退配置
```

## 数据格式

影片数据集中在 `src/data/films.json`（电影对象数组），双语字段统一用 `{ "zh": "...", "en": "..." }` 表示。核心字段：`id`、`titleCn`、`titleOrig`、`year`、`countries`、`runtimeMin`、`genres`、`credits`（导演/编剧/摄影/主演）、`ratings`（imdb/letterboxd/douban）、`myRating`、`watchedDate`（须以 `YYYY-MM-DD` 开头）、`medium`、`synopsis`、`review`、`quote`、`cameraNote`、`urls`。

海报命名：`public/posters/{slug}-{year}.jpg`，`slug` 由原文片名自动生成（见 `validate.js` 的 `filmSlug`）。

## 运行

```bash
npm install        # 安装依赖
npm run dev        # 开发（http://localhost:5173）
npm run check      # 校验数据与海报
npm run add        # 交互式新增（可选 TMDB_API_KEY 抓取双语字段）
npm run build      # 校验 + 构建
npm run preview    # 预览产物
```

`npm run add` 支持 `TMDB_API_KEY` 环境变量，观影日期支持「今天/昨天/前天」与 `YYYYMMDD` 快捷写法。
