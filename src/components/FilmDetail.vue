<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { RECENT_COUNT } from '../data/films.js'
import { namesZh, namesEn, namesBilingual, bi, runtimeText, stars } from '../data/format.js'

const props = defineProps({
  films: {
    type: Array,
    required: true
  },
  filmId: {
    type: Number,
    required: true
  },
  sourceView: {
    type: String,
    default: 'home' // 记录用户是从 'home'(放映室) 还是 'index'(档案馆) 点进来的
  },
  favoritesMap: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['back', 'select-film', 'toggle-favorite', 'open-archive'])

// 控制详情页海报是“原始彩色 (true)”还是“黑白银盐 (false)”
const isColorMode = ref(true)

// 1. 找到当前正在查看的这部电影及其在数组中的位置序号
const currentIndex = computed(() => {
  const idx = props.films.findIndex((f) => f.id === props.filmId)
  return idx !== -1 ? idx : 0
})

const film = computed(() => props.films[currentIndex.value])

// 2. 计算“上一帧”和“下一帧”是哪部电影（用于切帧按钮和悬停预览小气泡）
const prevFilm = computed(() => {
  const len = props.films.length
  return props.films[(currentIndex.value - 1 + len) % len]
})

const nextFilm = computed(() => {
  const len = props.films.length
  return props.films[(currentIndex.value + 1) % len]
})

// 3. 顶部帧号指示器文字（如 RECENT 01 / 10 或 ARCHIVE 11 / 16）
const frameIndicatorText = computed(() => {
  const posStr = String(currentIndex.value + 1).padStart(2, '0')
  const tag = film.value.recent ? 'RECENT' : 'ARCHIVE'
  const denom = film.value.recent
    ? String(RECENT_COUNT).padStart(2, '0')
    : String(props.films.length).padStart(2, '0')
  return `${tag} ${posStr} / ${denom}`
})

// 4. 当前电影是否已珍藏
const isFavorite = computed(() => !!props.favoritesMap[film.value.id])

// 5. 2x2 双语主创人员列表配置（方便用 v-for 循环渲染）
const creditRoles = computed(() => [
  { zhLabel: '导演', enLabel: 'DIRECTOR', list: film.value.credits?.director },
  { zhLabel: '编剧', enLabel: 'SCREENPLAY', list: film.value.credits?.writer },
  { zhLabel: '摄影', enLabel: 'CINEMATOGRAPHY', list: film.value.credits?.cinematographer },
  { zhLabel: '主演', enLabel: 'STARRING CAST', list: film.value.credits?.cast }
])

// 监测详情页主标题是否已经滚出屏幕上方
const titleHeadingRef = ref(null)
const showMiniTitle = ref(false)

function checkHeadingScroll() {
  if (titleHeadingRef.value) {
    // 当主标题底部滚到距离屏幕顶端不足 108px（即被吸顶栏遮住）时，显示迷你片名
    const rect = titleHeadingRef.value.getBoundingClientRect()
    showMiniTitle.value = rect.bottom < 108
  } else {
    showMiniTitle.value = window.scrollY > 140
  }
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(() => {
  window.addEventListener('scroll', checkHeadingScroll, { passive: true })
  checkHeadingScroll()
})

onUnmounted(() => {
  window.removeEventListener('scroll', checkHeadingScroll)
})
</script>

<template>
  <section class="flex-1 pt-2.5 pb-6 sm:pt-4 sm:pb-8 view-shutter-enter">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- 顶部吸顶导航栏：左侧返回来源页 + 右侧上下切帧器（含悬停预览气泡） -->
      <div
        class="sticky top-[calc(4.125rem+1px)] sm:top-[calc(5rem+1px)] z-40 flex items-center justify-between gap-2 pointer-events-none mb-3.5 sm:mb-4"
      >
        <!-- 左侧：返回按钮 -->
        <div
          class="pointer-events-auto inline-flex items-center gap-1.5 sm:gap-2 p-1 sm:p-1.5 bg-[#0a0a0a]/95 backdrop-blur-md border border-neutral-700/90 rounded-xs font-mono-code text-[11px] sm:text-xs shadow-2xl min-w-0 max-w-[54%] sm:max-w-[60%]"
        >
          <button
            type="button"
            @click="emit('back')"
            class="px-2 sm:px-3 py-1 sm:py-1.5 rounded-xs border border-neutral-800 bg-neutral-900/90 text-neutral-200 hover:text-white hover:border-neutral-500 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span class="text-amber-400/90 leading-none">←</span>
            <span>{{ sourceView === 'index' ? '返回档案馆' : '返回放映室' }}</span>
          </button>
          <button
            v-show="showMiniTitle"
            type="button"
            title="点击回到页面顶部"
            @click="scrollToTop"
            class="inline-flex items-center gap-1.5 pl-1.5 sm:pl-2 pr-1.5 py-0.5 border-l border-neutral-700/90 text-left min-w-0 transition-all duration-200 hover:text-amber-300 cursor-pointer"
          >
            <span class="font-serif-cn text-xs sm:text-sm font-semibold text-white truncate">{{
              film.titleCn
            }}</span>
            <span class="hidden md:inline font-mono-code text-[11px] text-neutral-400 shrink-0"
              >({{ film.year }})</span
            >
          </button>
        </div>

        <!-- 右侧：上一帧 / 帧号指示器 / 下一帧 -->
        <div
          class="pointer-events-auto inline-flex items-center gap-1 sm:gap-2 p-1 sm:p-1.5 bg-[#0a0a0a]/95 backdrop-blur-md border border-neutral-700/90 rounded-xs font-mono-code text-[11px] sm:text-xs shadow-2xl shrink-0"
        >
          <!-- 上一帧按钮 + 悬停预览气泡 -->
          <div class="relative group">
            <button
              type="button"
              @click="emit('select-film', prevFilm.id)"
              class="px-2 sm:px-3 py-1 sm:py-1.5 rounded-xs border border-neutral-800 bg-neutral-900/90 text-neutral-300 hover:text-white hover:border-neutral-500 transition-colors whitespace-nowrap cursor-pointer"
            >
              ◁ <span class="hidden sm:inline">上一帧</span>
            </button>
            <div
              class="pointer-events-none absolute left-0 sm:left-auto sm:right-0 top-full mt-2 w-48 sm:w-56 p-2.5 rounded-xs bg-[#0c0c0c]/95 backdrop-blur-md border border-neutral-600/90 shadow-2xl opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 z-50 text-left"
            >
              <div
                class="flex items-center justify-between text-[10px] font-mono-code text-amber-400/95 mb-1"
              >
                <span>◁ PREV FRAME</span>
                <span> #{{ prevFilm.frameCode }}</span>
              </div>
              <div class="font-serif-cn text-sm font-semibold text-white truncate">
                {{ prevFilm.titleCn }} ({{ prevFilm.year }})
              </div>
              <div class="font-mono-code text-[10px] text-neutral-400 truncate mt-0.5">
                {{ namesZh(prevFilm.credits?.director) }}
              </div>
            </div>
          </div>

          <!-- 当前帧号指示器（点击可跳往档案馆） -->
          <button
            type="button"
            title="点击前往档案馆"
            @click="emit('open-archive')"
            class="px-2 sm:px-3 py-1 sm:py-1.5 rounded-xs bg-neutral-900/70 border border-neutral-800/90 text-amber-400/95 hover:border-neutral-500 transition-colors text-center font-medium whitespace-nowrap tabular-nums cursor-pointer"
          >
            {{ frameIndicatorText }}
          </button>

          <!-- 下一帧按钮 + 悬停预览气泡 -->
          <div class="relative group">
            <button
              type="button"
              @click="emit('select-film', nextFilm.id)"
              class="px-2 sm:px-3 py-1 sm:py-1.5 rounded-xs border border-neutral-800 bg-neutral-900/90 text-neutral-300 hover:text-white hover:border-neutral-500 transition-colors whitespace-nowrap cursor-pointer"
            >
              <span class="hidden sm:inline">下一帧</span> ▷
            </button>
            <div
              class="pointer-events-none absolute right-0 top-full mt-2 w-48 sm:w-56 p-2.5 rounded-xs bg-[#0c0c0c]/95 backdrop-blur-md border border-neutral-600/90 shadow-2xl opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 z-50 text-left"
            >
              <div
                class="flex items-center justify-between text-[10px] font-mono-code text-amber-400/95 mb-1"
              >
                <span>NEXT FRAME ▷</span>
                <span> #{{ nextFilm.frameCode }}</span>
              </div>
              <div class="font-serif-cn text-sm font-semibold text-white truncate">
                {{ nextFilm.titleCn }} ({{ nextFilm.year }})
              </div>
              <div class="font-mono-code text-[10px] text-neutral-400 truncate mt-0.5">
                {{ namesZh(nextFilm.credits?.director) }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 主体双栏网格 -->
      <div class="grid grid-cols-1 md:grid-cols-12 gap-5 lg:gap-8 items-start">
        <!-- 左栏（占 4 列）：35mm 幻灯片装裱框海报 + 观影档案卡 -->
        <div
          class="md:col-span-4 lg:col-span-4 min-w-0 self-start grid grid-cols-[142px_1fr] sm:grid-cols-[176px_1fr] md:grid-cols-1 gap-2.5 sm:gap-3.5 md:gap-4 items-start"
        >
          <!-- 1. 35mm 幻灯片装裱框 (Slide Mount) -->
          <div
            class="col-span-1 min-w-0 p-2 sm:p-2.5 md:p-3.5 rounded-xs shadow-2xl relative flex flex-col justify-between"
          >
            <!-- 氛围柔光 -->
            <div
              class="pointer-events-none absolute -inset-3 sm:-inset-5 z-0 opacity-58 transition-all duration-700"
            >
              <img
                :src="film.poster"
                alt=""
                aria-hidden="true"
                class="w-full h-full object-cover scale-105 transition-[filter] duration-500"
                :style="{
                  filter: isColorMode
                    ? 'blur(38px) saturate(1.9) brightness(1.4)'
                    : 'blur(38px) grayscale(100%) brightness(1.6)'
                }"
              />
            </div>

            <!-- 遮罩层（挡住正中间的强光，让柔光从四周边框和底部自然溢出） -->
            <div
              class="pointer-events-none absolute inset-0 bg-[#121212]/90 border border-neutral-700/80 rounded-xs z-[1]"
            ></div>

            <!-- 幻灯片框顶部边码与画幅比 -->
            <div
              class="relative z-10 flex items-center justify-between text-[9px] sm:text-[10px] md:text-[11px] font-mono-code text-neutral-400 mb-1.5 md:mb-2 px-0.5 whitespace-nowrap overflow-hidden"
            >
              <span class="truncate">KODAK 5222 · {{ film.frameCode }}</span>
              <span class="shrink-0 ml-1">{{ film.aspectRatio }}</span>
            </div>

            <!-- 海报本体 -->
            <div
              class="relative z-10 aspect-[2/3] w-full overflow-hidden bg-[#080808] border border-neutral-700/70"
            >
              <img
                :src="film.poster"
                :alt="film.titleCn"
                decoding="async"
                class="w-full h-full object-cover transition-[filter] duration-300"
                :style="{
                  filter: isColorMode
                    ? 'grayscale(0%) contrast(1.04) saturate(1.08)'
                    : 'grayscale(100%) contrast(1.22) brightness(0.9)'
                }"
              />
              <div
                class="poster-grain-layer transition-opacity duration-300"
                :style="{ opacity: isColorMode ? 0.15 : 0.45 }"
              ></div>
            </div>

            <!-- 幻灯片框底部按钮：彩色/黑白切换 + 珍藏切换 -->
            <div
              class="relative z-10 mt-2 md:mt-2.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-1.5 pt-2 border-t border-neutral-800/80"
            >
              <button
                type="button"
                @click="isColorMode = !isColorMode"
                class="text-[10px] md:text-[11px] font-mono-code px-1.5 md:px-2.5 py-1 rounded bg-neutral-900 border border-neutral-700 text-neutral-200 hover:border-neutral-400 transition-colors text-center whitespace-nowrap cursor-pointer"
              >
                {{ isColorMode ? '色彩: 原始彩色' : '色彩: 黑白银盐' }}
              </button>
              <button
                type="button"
                @click="emit('toggle-favorite', film.id)"
                class="text-[10px] md:text-[11px] font-mono-code px-1.5 md:px-2.5 py-1 rounded bg-neutral-950 border transition-colors flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer"
                :class="
                  isFavorite
                    ? 'border-amber-500/50 text-white'
                    : 'border-neutral-800 text-neutral-300 hover:border-neutral-500'
                "
              >
                <span :class="isFavorite ? 'text-amber-400' : 'text-neutral-400'">{{
                  isFavorite ? '★' : '☆'
                }}</span>
                <span>{{ isFavorite ? '已珍藏胶片' : '珍藏胶片' }}</span>
              </button>
            </div>
          </div>

          <!-- 2. 观影档案卡 (Screening Archive Card) -->
          <div
            class="col-span-1 min-w-0 overflow-hidden p-2.5 sm:p-3.5 md:p-4 bg-neutral-950/95 border border-neutral-800/90 rounded-xs font-mono-code text-xs flex flex-col justify-between space-y-2 sm:space-y-2.5"
          >
            <div class="detail-section-title border-b border-neutral-800 pb-1.5">
              SCREENING ARCHIVE // 观影档案卡
            </div>
            <div class="flex flex-col gap-0.5 border-b border-neutral-900 pb-1.5 min-w-0">
              <span class="text-neutral-400 text-[9.5px] sm:text-[10px]"
                >观影日期 / WATCHED DATE</span
              >
              <span
                class="text-white font-medium text-[11px] md:text-xs leading-snug break-words"
                >{{ film.watchedDate }}</span
              >
            </div>
            <div class="flex flex-col gap-0.5 border-b border-neutral-900 pb-1.5 min-w-0">
              <span class="text-neutral-400 text-[9.5px] sm:text-[10px]"
                >放映介质 / SCREENING MEDIUM</span
              >
              <span
                class="text-white font-medium text-[11px] md:text-xs leading-snug break-words"
                >{{ bi(film.medium) }}</span
              >
            </div>
            <div class="flex items-center justify-between pt-0.5 min-w-0">
              <span class="text-neutral-400 text-[9.5px] sm:text-[10px] truncate mr-1.5"
                >私人评分 / RATING</span
              >
              <span class="text-amber-400 tracking-widest text-[11px] sm:text-xs shrink-0">{{
                stars(film.myRating)
              }}</span>
            </div>
          </div>
        </div>

        <!-- 右栏（占 8 列）：片名、标签胶囊、双语主创表（下半部分影评将在下一步接入） -->
        <div class="md:col-span-8 lg:col-span-8 min-w-0 flex flex-col gap-7">
          <div class="border-b border-neutral-800 pb-7">
            <!-- 中外文片名 -->
            <div class="min-w-0 pt-0">
              <h2
                ref="titleHeadingRef"
                class="font-serif-cn text-2xl sm:text-4xl lg:text-5xl font-semibold text-white tracking-wide leading-tight break-words m-0"
              >
                {{ film.titleCn }}
              </h2>
              <p
                class="font-serif-cn italic text-base sm:text-lg lg:text-xl text-neutral-300 mt-1.5 sm:mt-2 leading-snug break-words"
              >
                {{ film.titleOrig }}
              </p>
            </div>

            <!-- 电影年代、国家、时长、类型胶囊 -->
            <div
              class="flex flex-col gap-2 font-mono-code text-[11px] sm:text-xs text-neutral-300 mt-4 pt-1"
            >
              <div class="flex flex-wrap items-center gap-1.5 sm:gap-2 min-h-[2rem]">
                <span class="px-2.5 py-1 bg-white text-black font-semibold rounded-xs shrink-0">{{
                  film.year
                }}</span>
                <span class="hidden sm:inline text-neutral-600">·</span>
                <span
                  class="px-2.5 py-1 bg-neutral-900 border border-neutral-700 text-neutral-100 rounded-xs leading-snug break-words"
                >
                  {{ namesBilingual(film.countries) }}
                </span>
                <span class="hidden sm:inline text-neutral-600">·</span>
                <span
                  class="px-2.5 py-1 bg-neutral-900 border border-neutral-700 text-neutral-100 rounded-xs shrink-0"
                >
                  {{ runtimeText(film.runtimeMin) }}
                </span>
              </div>
              <div class="flex flex-wrap items-center gap-1.5 sm:gap-2 min-h-[2rem]">
                <span
                  class="px-2.5 py-1 bg-neutral-900 border border-neutral-700 text-neutral-200 rounded-xs leading-snug break-words"
                >
                  {{ namesBilingual(film.genres) }}
                </span>
              </div>
            </div>

            <!-- 2x2 双语核心演职员表 -->
            <div
              class="grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch mt-6 pt-6 border-t border-neutral-800"
            >
              <div
                v-for="role in creditRoles"
                :key="role.enLabel"
                class="p-4 rounded-xs bg-neutral-900/90 border border-neutral-700/80 min-h-[108px] h-full min-w-0 flex flex-col justify-between"
              >
                <div
                  class="flex items-center justify-between border-b border-neutral-800 pb-2 mb-2.5"
                >
                  <span class="text-sm font-semibold text-white tracking-widest">{{
                    role.zhLabel
                  }}</span>
                  <span
                    class="font-mono-code text-[11px] font-medium uppercase tracking-widest text-amber-400/90"
                    >{{ role.enLabel }}</span
                  >
                </div>
                <div class="min-w-0">
                  <div class="text-white font-semibold text-base leading-snug break-words">
                    {{ namesZh(role.list) }}
                  </div>
                  <div
                    class="font-mono-code text-xs text-neutral-300 mt-1.5 leading-relaxed break-words"
                  >
                    {{ namesEn(role.list) }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 1. 三大平台评分徽章（点击可跳转对应电影主页） -->
          <div>
            <div class="mb-3.5">
              <div class="detail-section-title">CRITICAL CONSENSUS // 平台评价</div>
            </div>

            <div class="grid grid-cols-3 gap-2.5 sm:gap-5">
              <!-- IMDb 徽章 -->
              <a
                :href="film.urls?.imdb"
                target="_blank"
                rel="noopener noreferrer"
                class="logo-badge-card group rounded-xs p-2.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3.5 cursor-pointer min-w-0"
                aria-label="前往 IMDb 查看评分"
              >
                <div
                  class="flex items-center justify-between sm:justify-start w-full sm:w-auto shrink-0"
                >
                  <div
                    class="w-9 h-9 sm:w-12 sm:h-12 rounded-md bg-[#F5C518] flex items-center justify-center shrink-0 shadow-md border border-amber-300/40 group-hover:scale-105 transition-transform"
                  >
                    <svg
                      class="w-5 h-5 sm:w-7 sm:h-7 text-black"
                      viewBox="0 0 32 32"
                      fill="currentColor"
                    >
                      <path
                        d="M4 6a2 2 0 0 1 2-2h20a2 2 0 0 1 2 2v20a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6zm3 1v3h2V7H7zm16 0v3h2V7h-2zM7 14v4h2v-4H7zm16 0v4h2v-4h-2zM7 22v3h2v-3H7zm16 0v3h2v-3h-2z"
                      />
                      <path
                        d="M16 9.5l1.95 3.95 4.36.63-3.15 3.07.74 4.35L16 19.45l-3.9 2.05.74-4.35-3.15-3.07 4.36-.63L16 9.5z"
                      />
                    </svg>
                  </div>
                  <span
                    class="sm:hidden font-mono-code text-[11px] text-neutral-500 group-hover:text-white transition-colors"
                    >↗</span
                  >
                </div>
                <div class="w-full sm:flex-1 min-w-0">
                  <div class="flex items-baseline gap-0.5 sm:gap-1">
                    <span
                      class="font-mono-code text-base sm:text-xl lg:text-2xl font-bold text-white tabular-nums"
                    >
                      {{ film.ratings.imdb.toFixed(1) }}
                    </span>
                    <span class="font-mono-code text-[10px] sm:text-xs text-neutral-400">/10</span>
                  </div>
                  <div
                    class="mt-1 sm:mt-1.5 w-full bg-neutral-800 h-1 sm:h-1.5 rounded-full overflow-hidden"
                  >
                    <div
                      class="bg-[#F5C518] h-full rounded-full transition-all duration-500"
                      :style="{ width: `${Math.round(film.ratings.imdb * 10)}%` }"
                    ></div>
                  </div>
                </div>
                <span
                  class="hidden sm:inline font-mono-code text-xs text-neutral-500 group-hover:text-white transition-colors shrink-0"
                  >↗</span
                >
              </a>

              <!-- Letterboxd 徽章 -->
              <a
                :href="film.urls?.letterboxd"
                target="_blank"
                rel="noopener noreferrer"
                class="logo-badge-card group rounded-xs p-2.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3.5 cursor-pointer min-w-0"
                aria-label="前往 Letterboxd 查看评分"
              >
                <div
                  class="flex items-center justify-between sm:justify-start w-full sm:w-auto shrink-0"
                >
                  <div
                    class="w-9 h-9 sm:w-12 sm:h-12 rounded-md bg-[#14181C] flex items-center justify-center shrink-0 shadow-md border border-neutral-700 group-hover:scale-105 transition-transform"
                  >
                    <svg class="w-7 h-7 sm:w-9 sm:h-9" viewBox="0 0 36 36" fill="none">
                      <circle cx="11" cy="18" r="5.2" fill="#FF8000" />
                      <circle
                        cx="18"
                        cy="18"
                        r="5.2"
                        fill="#00E054"
                        style="mix-blend-mode: screen"
                      />
                      <circle
                        cx="25"
                        cy="18"
                        r="5.2"
                        fill="#40BCF4"
                        style="mix-blend-mode: screen"
                      />
                      <circle cx="11" cy="18" r="5.2" fill="#FF8000" fill-opacity="0.85" />
                      <circle cx="18" cy="18" r="5.2" fill="#00E054" fill-opacity="0.85" />
                      <circle cx="25" cy="18" r="5.2" fill="#40BCF4" fill-opacity="0.85" />
                    </svg>
                  </div>
                  <span
                    class="sm:hidden font-mono-code text-[11px] text-neutral-500 group-hover:text-white transition-colors"
                    >↗</span
                  >
                </div>
                <div class="w-full sm:flex-1 min-w-0">
                  <div class="flex items-baseline gap-0.5 sm:gap-1">
                    <span
                      class="font-mono-code text-base sm:text-xl lg:text-2xl font-bold text-white tabular-nums"
                    >
                      {{ film.ratings.letterboxd.toFixed(1) }}
                    </span>
                    <span class="font-mono-code text-[10px] sm:text-xs text-neutral-400">/5.0</span>
                  </div>
                  <div
                    class="mt-1 sm:mt-1.5 w-full bg-neutral-800 h-1 sm:h-1.5 rounded-full overflow-hidden"
                  >
                    <div
                      class="bg-[#00E054] h-full rounded-full transition-all duration-500"
                      :style="{ width: `${Math.round((film.ratings.letterboxd / 5) * 100)}%` }"
                    ></div>
                  </div>
                </div>
                <span
                  class="hidden sm:inline font-mono-code text-xs text-neutral-500 group-hover:text-white transition-colors shrink-0"
                  >↗</span
                >
              </a>

              <!-- 豆瓣徽章 -->
              <a
                :href="film.urls?.douban"
                target="_blank"
                rel="noopener noreferrer"
                class="logo-badge-card group rounded-xs p-2.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3.5 cursor-pointer min-w-0"
                aria-label="前往 豆瓣 查看评分"
              >
                <div
                  class="flex items-center justify-between sm:justify-start w-full sm:w-auto shrink-0"
                >
                  <div
                    class="w-9 h-9 sm:w-12 sm:h-12 rounded-md bg-[#007722] flex items-center justify-center shrink-0 shadow-md border border-emerald-500/30 group-hover:scale-105 transition-transform"
                  >
                    <svg
                      class="w-5 h-5 sm:w-7 sm:h-7 text-white"
                      viewBox="0 0 32 32"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.4"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <line x1="6" y1="7" x2="26" y2="7" />
                      <rect x="8.5" y="11" width="15" height="7" rx="1.5" />
                      <path d="M11.5 18l2 5.5" />
                      <path d="M20.5 18l-2 5.5" />
                      <line x1="5" y1="25" x2="27" y2="25" />
                    </svg>
                  </div>
                  <span
                    class="sm:hidden font-mono-code text-[11px] text-neutral-500 group-hover:text-white transition-colors"
                    >↗</span
                  >
                </div>
                <div class="w-full sm:flex-1 min-w-0">
                  <div class="flex items-baseline gap-0.5 sm:gap-1">
                    <span
                      class="font-mono-code text-base sm:text-xl lg:text-2xl font-bold text-white tabular-nums"
                    >
                      {{ film.ratings.douban.toFixed(1) }}
                    </span>
                    <span class="font-mono-code text-[10px] sm:text-xs text-neutral-400">/10</span>
                  </div>
                  <div
                    class="mt-1 sm:mt-1.5 w-full bg-neutral-800 h-1 sm:h-1.5 rounded-full overflow-hidden"
                  >
                    <div
                      class="bg-[#00b51d] h-full rounded-full transition-all duration-500"
                      :style="{ width: `${Math.round(film.ratings.douban * 10)}%` }"
                    ></div>
                  </div>
                </div>
                <span
                  class="hidden sm:inline font-mono-code text-xs text-neutral-500 group-hover:text-white transition-colors shrink-0"
                  >↗</span
                >
              </a>
            </div>
          </div>

          <!-- 2. 经典台词金句卡片（带背景巨型引号水印） -->
          <div
            class="relative p-6 sm:p-7 bg-[#0d0d0d] border border-neutral-800/80 rounded-xs shadow-lg overflow-hidden my-1"
          >
            <span
              class="pointer-events-none absolute -top-3 -left-1 font-serif-cn text-7xl sm:text-8xl text-neutral-800/50 select-none leading-none"
              aria-hidden="true"
              >“</span
            >
            <p
              class="relative z-10 font-serif-cn italic text-base sm:text-xl text-amber-200/95 leading-relaxed tracking-wide"
            >
              {{ film.quote }}
            </p>
          </div>

          <!-- 3. 双语剧情梗概 -->
          <div
            class="p-4 sm:p-5 bg-neutral-950/90 border-l-2 border-neutral-600 rounded-r-xs space-y-2"
          >
            <div class="detail-section-title">SYNOPSIS // 剧情梗概</div>
            <p class="text-xs sm:text-sm text-neutral-200 leading-relaxed">
              {{ film.synopsis?.zh }}
            </p>
            <p class="font-mono-code text-[11px] sm:text-xs text-neutral-400 leading-relaxed">
              {{ film.synopsis?.en }}
            </p>
          </div>

          <!-- 4. 个人迷影手记  -->
          <article
            class="bg-[#0e0e0e] border border-neutral-800/90 rounded-xs p-5 sm:p-7 space-y-4 shadow-xl"
          >
            <div
              class="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-800 pb-3"
            >
              <div>
                <div class="detail-section-title">CRITIQUE // 个人手记</div>
                <h3 class="font-serif-cn text-xl sm:text-2xl text-white font-medium mt-1.5">
                  {{ film.review?.title }}
                </h3>
              </div>
              <span class="font-mono-code text-xs text-neutral-500"
                >归档于 {{ film.watchedDate }}</span
              >
            </div>

            <div class="space-y-5 text-sm sm:text-base text-neutral-300 leading-7 font-light">
              <p
                v-for="(paragraph, pIdx) in film.review?.paragraphs"
                :key="pIdx"
                :class="{ 'review-drop-cap': pIdx === 0 }"
              >
                {{ paragraph }}
              </p>
            </div>

            <!-- 底部：镜头语言札记 -->
            <div
              class="mt-6 pt-4 border-t border-neutral-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-neutral-400"
            >
              <div>
                <span class="font-mono-code uppercase text-neutral-500 mr-2">镜头语言札记:</span>
                <span class="text-neutral-300">{{ film.cameraNote }}</span>
              </div>
            </div>
          </article>

          <!-- 👇 下一步我们将在这里插入最后一个互动模块：VIEWING NOTES // 重看批注 -->
        </div>
      </div>
    </div>
  </section>
</template>
