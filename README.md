# SILVER HALIDE // 银盐手记

> 一个以「胶片放映机」为设计语言、数据驱动的个人观影档案（Cinephile Log）网站。

把每一部看过的电影当作一格胶片归档，用放映室、档案馆与详情页三块画面，复现迷影仪式感。

---

## 功能与特色

### 三块画面

| 画面       | 组件              | 说明                                                   |
| ---------- | ----------------- | ------------------------------------------------------ |
| **放映室** | `FilmReel.vue`    | 首页。最近观看的 10 部电影以胶片履带的形式自动循环放映 |
| **档案馆** | `FilmArchive.vue` | 完整观影档案，支持检索、分类、排序与双视图切换         |
| **详情页** | `FilmDetail.vue`  | 单部电影的完整档案：双语主创、平台评分、影评手记等     |

### 放映室（Home）

- **自动放映**：胶片以固定速度匀速滚动，模拟放映机马达动画（`requestAnimationFrame`）。
- **片门（GATE）与齿孔（PERF）读数**：屏幕正中央的片门高亮当前帧，顶部实时显示帧号 `FR xx` 与齿孔 `PERF n/8`。
- **多种交互**：
  - 鼠标**拖拽**胶片；
  - **滚轮**拨动触发带惯性的「飞轮」滑行；
  - 「倒片 / 进片」按钮与顶部微缩格点可**平滑寻帧**；
  - **悬停**任意海报即「定格」显影。
- **性能优化**：放映动画直接写入 DOM 节点的 `transform`，绕过 Vue 虚拟 DOM；仅在「换了一部电影」或「齿孔跳格」时才触发响应式更新，保证流畅。

### 档案馆（Index）

- **检索**：片名 / 导演 / 编剧 / 摄影 / 主演 / 年份 / 国家 / 类型，多关键词空格分隔。
- **分类筛选**：观影全记录 · 放映室展映 · 往期归档 · ★ 珍藏胶片。
- **多维排序**：按观影时间 / 上映年份 / 豆瓣评分，支持升/降序切换。
- **双视图**：
  - **档案卡片**：海报 + 双语片名 + 导演 + 三平台评分条；
  - **印相小样（Contact Sheet）**：黑白底片小样网格，悬停恢复彩色，带微型齿孔边。

### 详情页（Detail）

- **幻灯片装裱框**：KODAK 5222 边码 + 画幅比标注，支持**彩色 / 黑白银盐**一键切换。
- **双语演职员表**：导演、编剧、摄影、主演，中英文分列展示。
- **三平台评分徽章**：IMDb（/10）、Letterboxd（/5）、豆瓣（/10），点击直达对应电影主页。
- **内容区块**：台词金句、双语剧情梗概、个人迷影手记（影评）、镜头语言札记。
- **切帧导航**：上一帧 / 下一帧（带悬停预览气泡）、帧号指示器可一键跳往档案馆。

### 全局

- **胶片颗粒遮罩**：三档可调（强 / 弱 / 关），模拟银盐质感。
- **键盘快捷键**：`←` / `→` 切帧或进倒片，`ESC` 返回上一级画面。
- **回到顶部**按钮：滚动超过阈值后浮现。
- **双语设计**：全站中英双语，复古衬线（Noto Serif SC / Cormorant Garamond）搭配等宽代码字体（JetBrains Mono）。

---

## 架构

### 技术栈

- **Vue 3**（Composition API + `<script setup>` SFC）
- **Vite**（构建与开发服务器）
- **Tailwind CSS 4**（`@tailwindcss/vite` 插件）
- 纯前端静态站，无后端；数据以单一 JSON 文件承载。

### 目录结构

```
silver-halide/
├── index.html              # 应用外壳（Google Fonts、#app 挂载点）
├── vite.config.js          # Vite + Vue + Tailwind 配置（base: './'）
├── package.json
├── public/
│   ├── favicon.svg
│   └── posters/            # 海报文件（命名规则见「数据格式」）
├── scripts/
│   ├── check-films.mjs     # 构建前校验：schema + 海报存在性
│   └── add.mjs             # 交互式新增电影（可选 TMDb 抓取）
└── src/
    ├── main.js             # 应用入口，createApp(App).mount('#app')
    ├── App.vue             # 总控：页面状态、颗粒、收藏、全局快捷键
    ├── style.css           # Tailwind 入口 + 自定义胶片颗粒/齿孔样式
    ├── components/
    │   ├── AppHeader.vue   # 顶部导航：Logo、放映室/档案馆、颗粒切换
    │   ├── AppFooter.vue   # 底部状态栏 + 快捷键提示
    │   ├── FilmReel.vue    # 放映室：35mm 胶片履带 + 放映机动画
    │   ├── FilmArchive.vue # 档案馆：检索/筛选/排序/双视图
    │   └── FilmDetail.vue  # 详情页：档案卡 + 评分 + 影评手记
    └── data/
        ├── films.json      # 单一数据源（全部观影记录）
        ├── films.js        # 加载、排序、派生字段（frameCode/recent/poster/_searchPool）
        ├── validate.js     # schema 校验 + 日期/海报 slug 解析（浏览器与 Node 共用）
        └── format.js       # 结构化数据 → 展示字符串（纯函数）
```

### 组件与数据流

```
films.json ──▶ validate.js（校验/解析）
                   │
                   ▼
films.js ──▶ 排序 + 派生字段（frameCode / recent / poster / _searchPool）
                   │
        FILMS / RECENT_FILMS
                   │
                   ▼
              App.vue（总控状态）
        ┌──────────┼──────────────┐
        ▼          ▼              ▼
   AppHeader   FilmReel     FilmArchive    FilmDetail
  AppFooter    (放映室)      (档案馆)       (详情页)
```

- **App.vue** 是唯一的状态持有者：`activeView`（当前画面）、`grainIntensity`（颗粒）、`favoritesMap`（珍藏）、`currentDetailFilmId`（详情页当前电影）。子组件通过 `props` 接收数据、通过 `emits` 回传事件，保持单向数据流。
- **`validate.js` 被浏览器与 Node 双向复用**：`films.js` 在开发环境打印校验结果，`scripts/check-films.mjs` 在构建前跑同样的校验，保证数据与脚本共用一套规则。
- **`format.js`** 遵循「数据里不存拼接结果，拼接只在渲染层出现」的原则，把 `{ zh, en }` 结构转成展示字符串。

---

## 数据格式

所有观影记录集中在单一文件 [`src/data/films.json`](src/data/films.json)，是一个**电影对象数组**。中文/英文并存的字段统一用 `{ "zh": "...", "en": "..." }` 表示。

### 单条记录字段

| 字段                                            | 类型        | 必填 | 说明                                                                                    |
| ----------------------------------------------- | ----------- | ---- | --------------------------------------------------------------------------------------- |
| `id`                                            | `number`    | ✅   | 正整数，全局唯一                                                                        |
| `titleCn`                                       | `string`    | ✅   | 中文片名                                                                                |
| `titleOrig`                                     | `string`    | ✅   | 原文片名，可含 `原名 / 英文名`                                                          |
| `year`                                          | `number`    | ✅   | 上映年份（整数）                                                                        |
| `countries`                                     | `{zh,en}[]` | ✅   | 制片国家/地区，非空数组                                                                 |
| `runtimeMin`                                    | `number`    | ✅   | 片长（分钟，正数）                                                                      |
| `aspectRatio`                                   | `string`    | ❌   | 画幅比（如 `1.66:1`）                                                                   |
| `genres`                                        | `{zh,en}[]` | ✅   | 类型标签，非空数组                                                                      |
| `credits.director`                              | `{zh,en}[]` | ✅   | 导演（可为空数组）                                                                      |
| `credits.writer`                                | `{zh,en}[]` | ✅   | 编剧                                                                                    |
| `credits.cinematographer`                       | `{zh,en}[]` | ✅   | 摄影                                                                                    |
| `credits.cast`                                  | `{zh,en}[]` | ✅   | 主演（非空数组，每项至少含 zh 或 en）                                                   |
| `urls.imdb` / `urls.letterboxd` / `urls.douban` | `string`    | ❌   | 各平台主页链接                                                                          |
| `watchedDate`                                   | `string`    | ✅   | 观影日期，**必须以 `YYYY-MM-DD` 开头**（后可跟备注，如 `2026-10-24 夜场 / Late Night`） |
| `medium`                                        | `{zh,en}`   | ✅   | 放映介质（`zh` 必填，如「4K Criterion 胶片修复版」）                                    |
| `specs`                                         | `string`    | ❌   | 格式备注（如 `35mm 彩色 · Color · 1.66:1`）                                             |
| `myRating`                                      | `number`    | ✅   | 私人评分，`0–5`（可带 `.5`）                                                            |
| `ratings.imdb`                                  | `number`    | ✅   | IMDb 评分，`1–10`                                                                       |
| `ratings.letterboxd`                            | `number`    | ✅   | Letterboxd 评分，`0–5`                                                                  |
| `ratings.douban`                                | `number`    | ✅   | 豆瓣评分，`1–10`                                                                        |
| `quote`                                         | `string`    | ❌   | 台词金句                                                                                |
| `synopsis`                                      | `{zh,en}`   | ✅   | 剧情梗概（`zh` 必填）                                                                   |
| `review.title`                                  | `string`    | ❌   | 影评标题                                                                                |
| `review.paragraphs`                             | `string[]`  | ❌   | 影评正文段落                                                                            |
| `cameraNote`                                    | `string`    | ❌   | 镜头语言札记                                                                            |

### 派生字段（由 `films.js` 运行时生成）

| 字段          | 来源                         | 说明                                     |
| ------------- | ---------------------------- | ---------------------------------------- |
| `frameCode`   | 排序后的序号                 | 两位编号 `01`、`02`…                     |
| `recent`      | 序号是否 < `RECENT_COUNT`    | 是否在放映室展映                         |
| `poster`      | `filmSlug(titleOrig) + year` | 海报相对路径 `posters/{slug}-{year}.jpg` |
| `_searchPool` | 多字段拼接转小写             | 预计算的检索文本池                       |

### 海报命名规则

海报文件放在 [`public/posters/`](public/posters/)，命名为 `{slug}-{year}.jpg`，其中 `slug` 由原文片名经 `filmSlug()` 生成（去重音、转小写、非 ASCII 替换为连字符）。例如：

- 《花样年华》`In the Mood for Love` → `posters/in-the-mood-for-love-2000.jpg`
- 《八部半》`8½ (Otto e mezzo)` → `posters/eight-and-a-half-1963.jpg`（含特殊字符时走 `SLUG_OVERRIDES` 白名单）

---

## 运行方式

### 环境要求

- Node.js ≥ 18
- 包管理器：`pnpm` / `npm` / `yarn` 均可（下文以 `npm` 为例）

### 安装依赖

```bash
npm install
```

### 开发

```bash
npm run dev
```

启动 Vite 开发服务器，默认访问 `http://localhost:5173`。开发模式下，`films.js` 会把数据校验的 `errors` / `warnings` 打印到浏览器控制台。

### 构建与预览

```bash
npm run build     # 先跑 check 校验，再执行 vite build
npm run preview   # 预览构建产物
```

### 数据校验

```bash
npm run check
```

读取 `src/data/films.json`，执行 schema 校验并检查每部电影的海报文件是否存在；任一失败会以非零状态退出（`build` 因此会中断）。

### 新增一部电影

```bash
npm run add
```

交互式引导录入一部新电影：可选通过 TMDb 抓取双语字段（片名、导演、演职员、简介等），再追问个人字段（观影日期、评分、介质等），最后自动校验并追加到 `films.json`。

- 可选设置环境变量 `TMDB_API_KEY` 以跳过密钥追问：

  ```bash
  # Windows (PowerShell)
  $env:TMDB_API_KEY="你的密钥"; npm run add

  # macOS / Linux
  TMDB_API_KEY=你的密钥 npm run add
  ```

- 观影日期支持「今天 / 昨天 / 前天」与 `YYYYMMDD` 的快捷写法，会自动归一化为 `YYYY-MM-DD`。
- 完成后脚本会提示对应的海报文件命名，将海报放入 `public/posters/` 即可。
