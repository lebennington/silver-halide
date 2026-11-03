<script setup>
import { ref, computed } from 'vue'
import { RECENT_COUNT } from '../data/films.js'
import { namesZh, dateOnly } from '../data/format.js'

const viewMode = ref('card') // 视图模式 'card'(档案卡片) | 'contact'(印相小样)

const props = defineProps({
  films: {
    type: Array,
    required: true
  },
  favoritesMap: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['select-film'])

// 1. 筛选、搜索、排序的响应式状态
const currentFilter = ref('all') // 当前选中的分类：'all' | 'recent' | 'archive' | 'fav'
const searchQuery = ref('') // 搜索框输入的文字
const sortField = ref('watched') // 排序依据：'watched'(观影时间) | 'year'(上映年份) | 'douban'(豆瓣评分)
const sortOrder = ref('desc') // 排序方向：'desc'(降序：新→旧 / 高→低) | 'asc'(升序：旧→新 / 低→高)

// 2. 四个分类标签按钮的数据（自动计算每个分类下的电影数量）
const filterTabs = computed(() => {
  const total = props.films.length
  const recent = props.films.filter((f) => f.recent).length
  const archive = props.films.filter((f) => !f.recent).length
  const fav = props.films.filter((f) => !!props.favoritesMap[f.id]).length

  return [
    { key: 'all', label: `观影全记录 (${total})` },
    { key: 'recent', label: `放映室展映 (${recent})` },
    { key: 'archive', label: `往期归档 (${archive})` },
    { key: 'fav', label: `★ 珍藏胶片 (${fav})` }
  ]
})

// 3. ⭐ 核心“全自动漏斗”：根据分类、搜索词、排序规则，实时算出要展示的电影列表
const filteredFilms = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()

  // 第一层 + 第二层漏斗：分类与关键词过滤
  const list = props.films.filter((film) => {
    if (currentFilter.value === 'recent' && !film.recent) return false
    if (currentFilter.value === 'archive' && film.recent) return false
    if (currentFilter.value === 'fav' && !props.favoritesMap[film.id]) return false

    if (q && !film._searchPool.includes(q)) return false
    return true
  })

  // 第三层漏斗：多维度排序
  const dir = sortOrder.value === 'desc' ? 1 : -1
  return [...list].sort((a, b) => {
    if (sortField.value === 'year') {
      const diff = b.year - a.year
      return (diff !== 0 ? diff : b.id - a.id) * dir
    } else if (sortField.value === 'douban') {
      const diff = (b.ratings?.douban || 0) - (a.ratings?.douban || 0)
      return (diff !== 0 ? diff : b.id - a.id) * dir
    } else {
      // 默认按观影日期 YYYY-MM-DD 排序
      const cmp = dateOnly(b.watchedDate).localeCompare(dateOnly(a.watchedDate))
      return (cmp !== 0 ? cmp : b.id - a.id) * dir
    }
  })
})

// 切换排序分类时，默认重置为降序（最新/最高在前）
function onSortFieldChange() {
  sortOrder.value = 'desc'
}

// 反转排序方向
function toggleSortOrder() {
  sortOrder.value = sortOrder.value === 'desc' ? 'asc' : 'desc'
}

// 一键重置所有筛选条件
function resetFilters() {
  currentFilter.value = 'all'
  searchQuery.value = ''
  sortField.value = 'watched'
  sortOrder.value = 'desc'
}
</script>

<template>
  <section class="flex-1 py-6 sm:py-10 view-shutter-enter">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- 顶部标题与搜索框 -->
      <div
        class="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 mb-6 border-b border-neutral-800"
      >
        <div>
          <span
            class="font-mono-code text-[11px] text-neutral-400 tracking-[0.25em] uppercase block mb-1"
          >
            ARCHIVE // 观影档案
          </span>
          <h2 class="font-serif-cn text-2xl sm:text-4xl text-white font-normal tracking-wide">
            个人观影全档案
          </h2>
          <p class="font-mono-code text-xs text-neutral-400 mt-1.5">
            放映室仅展映最近观看的
            <span class="text-neutral-200">{{ RECENT_COUNT }}</span> 部作品，本档案馆完整收录全部
            <span class="text-white">{{ films.length }}</span> 部观影记录
          </p>
        </div>
        <!-- 右侧：视图切换按钮 + 搜索框 -->
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <!-- 视图切换：档案卡片 vs 印相小样 -->
          <div
            class="flex items-center gap-1 p-0.5 bg-neutral-900 border border-neutral-800 rounded-xs font-mono-code text-xs shrink-0"
          >
            <button
              type="button"
              @click="viewMode = 'card'"
              class="px-2.5 py-1 rounded-xs transition-colors"
              :class="
                viewMode === 'card'
                  ? 'bg-neutral-800 text-white font-medium'
                  : 'text-neutral-400 hover:text-white'
              "
            >
              档案卡片
            </button>
            <button
              type="button"
              @click="viewMode = 'contact'"
              class="px-2.5 py-1 rounded-xs transition-colors"
              :class="
                viewMode === 'contact'
                  ? 'bg-neutral-800 text-white font-medium'
                  : 'text-neutral-400 hover:text-white'
              "
            >
              印相小样
            </button>
          </div>

          <!-- 搜索输入框 -->
          <div class="w-full sm:w-80">
            <input
              v-model="searchQuery"
              type="search"
              placeholder="检索片名 / 导演 / 演职员 / 年份 / 国家..."
              class="w-full bg-neutral-950 border border-neutral-800 focus:border-neutral-400 rounded-xs px-3.5 py-2 text-xs text-white placeholder-neutral-500 font-mono-code focus:outline-none transition-colors"
            />
          </div>
        </div>
      </div>

      <!-- 分类筛选标签 & 排序控制栏 -->
      <div class="flex flex-wrap items-center justify-between gap-3 mb-6">
        <!-- 左侧：4 个分类筛选按钮 -->
        <div class="flex flex-wrap items-center gap-2 font-mono-code text-xs">
          <button
            v-for="tab in filterTabs"
            :key="tab.key"
            type="button"
            @click="currentFilter = tab.key"
            class="px-3.5 py-1.5 rounded-xs border transition-colors"
            :class="
              currentFilter === tab.key
                ? 'border-neutral-500 bg-white text-black font-medium'
                : 'border-neutral-800 bg-neutral-950 text-neutral-300 hover:border-neutral-600 hover:text-white'
            "
          >
            {{ tab.label }}
          </button>
        </div>

        <!-- 右侧：多维排序下拉框 + 方向反转按钮 -->
        <div class="flex items-center gap-1.5 font-mono-code text-xs">
          <span class="text-neutral-500 whitespace-nowrap">排序:</span>
          <select
            v-model="sortField"
            @change="onSortFieldChange"
            aria-label="档案馆排序分类"
            class="bg-neutral-900 border border-neutral-700 text-neutral-200 rounded-xs px-2.5 py-1 text-xs focus:outline-none focus:border-amber-400/80 transition-colors cursor-pointer"
          >
            <option value="watched">观影时间</option>
            <option value="year">上映年份</option>
            <option value="douban">豆瓣评分</option>
          </select>
          <button
            type="button"
            @click="toggleSortOrder"
            title="反转当前排序方向"
            class="px-2 py-1 rounded-xs border border-neutral-700 bg-neutral-900 text-neutral-300 hover:text-amber-300 hover:border-amber-400/60 transition-colors inline-flex items-center gap-1 whitespace-nowrap cursor-pointer"
          >
            <span class="text-amber-400/90 leading-none">{{
              sortOrder === 'desc' ? '↓' : '↑'
            }}</span>
            <span>
              {{
                sortField === 'douban'
                  ? sortOrder === 'desc'
                    ? '高 → 低'
                    : '低 → 高'
                  : sortOrder === 'desc'
                    ? '新 → 旧'
                    : '旧 → 新'
              }}
            </span>
          </button>
        </div>
      </div>

      <!-- 空状态提示（当搜索不到任何电影时显示） -->
      <div
        v-if="filteredFilms.length === 0"
        class="py-16 text-center border border-neutral-800/80 bg-neutral-950/60 rounded-xs space-y-3"
      >
        <p class="font-serif-cn text-base text-neutral-300">未检索到匹配的观影记录</p>
        <p class="font-mono-code text-xs text-neutral-500">
          当前筛选或搜索条件下无对应胶片档案，可尝试重置条件
        </p>
        <div class="pt-2">
          <button
            type="button"
            @click="resetFilters"
            class="px-4 py-1.5 bg-neutral-900 border border-neutral-700 text-xs font-mono-code text-neutral-200 hover:text-white hover:border-amber-400/80 rounded-xs transition-colors inline-flex items-center gap-1.5"
          >
            <span class="text-amber-400">↺</span>
            <span>重置筛选条件</span>
          </button>
        </div>
      </div>

      <!-- 模式 A：印相小样 (Contact Sheet) 网格 -->
      <div v-else-if="viewMode === 'contact'" class="contact-sheet-board rounded-xs">
        <div
          v-for="film in filteredFilms"
          :key="`contact-${film.id}`"
          role="button"
          tabindex="0"
          @click="emit('select-film', film.id)"
          @keydown.enter.prevent="emit('select-film', film.id)"
          @keydown.space.prevent="emit('select-film', film.id)"
          class="contact-proof-card group focus:outline-none focus:border-amber-400"
        >
          <!-- 上排 8 个微型齿孔 -->
          <div class="contact-sprocket-row" aria-hidden="true">
            <div v-for="n in 8" :key="`ct-${n}`" class="contact-sprocket-hole"></div>
          </div>

          <!-- 底片小样图 + 珍藏标记 -->
          <div
            class="relative aspect-[2/3] w-full overflow-hidden bg-black border border-neutral-800"
          >
            <img
              :src="film.poster"
              :alt="film.titleCn"
              loading="lazy"
              decoding="async"
              class="w-full h-full object-cover grayscale contrast-125 group-hover:grayscale-0 group-hover:contrast-100 transition-[filter] duration-300"
            />
            <div class="poster-grain-layer opacity-40"></div>
            <span
              class="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-black/85 border border-neutral-700 font-mono-code text-[10px] text-neutral-200"
            >
              #{{ film.id }}
            </span>

            <!-- 珍藏胶片画上 SVG -->
            <div
              v-if="favoritesMap[film.id]"
              class="pointer-events-none absolute inset-0 z-20 border border-amber-400/60 shadow-[inset_0_0_12px_rgba(212,175,55,0.2)]"
            >
              <span
                class="absolute top-1.5 right-1.5 flex items-center gap-0.5 bg-black/90 border border-amber-400/80 text-amber-300 font-mono-code text-[8px] font-medium tracking-wider px-1.5 py-0.5 rounded-[1px] shadow-lg leading-none"
              >
                <span>★</span>
                <span>SELECT</span>
              </span>
            </div>
          </div>

          <!-- 底部片名与年份 -->
          <div
            class="mt-1.5 flex items-center justify-between text-[10px] font-mono-code text-neutral-400 px-0.5"
          >
            <span
              class="truncate text-white font-medium group-hover:text-amber-300 transition-colors"
              >{{ film.titleCn }}</span
            >
            <span class="shrink-0 text-neutral-500 ml-1">{{ film.year }}</span>
          </div>

          <!-- 下排 8 个微型齿孔 -->
          <div class="contact-sprocket-row" aria-hidden="true">
            <div v-for="n in 8" :key="`cb-${n}`" class="contact-sprocket-hole"></div>
          </div>
        </div>
      </div>

      <!-- 模式 B：标准档案卡片网格 (保持原有的 v-else 不变) -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        <article
          v-for="film in filteredFilms"
          :key="film.id"
          role="button"
          tabindex="0"
          @click="emit('select-film', film.id)"
          @keydown.enter.prevent="emit('select-film', film.id)"
          @keydown.space.prevent="emit('select-film', film.id)"
          class="flex gap-4 p-3.5 rounded-xs border border-neutral-800/90 bg-[#0d0d0d] hover:bg-neutral-900/90 hover:border-neutral-500 transition-all text-left group cursor-pointer shadow-lg"
        >
          <!-- 左侧缩略海报 -->
          <div
            class="relative w-24 sm:w-28 aspect-[2/3] shrink-0 overflow-hidden bg-[#080808] border border-neutral-700/80"
          >
            <img
              :src="film.poster"
              :alt="film.titleCn"
              loading="lazy"
              decoding="async"
              class="index-card-poster w-full h-full object-cover grayscale group-hover:grayscale-0 transition-[filter] duration-300"
            />
            <div
              class="poster-grain-layer opacity-30 group-hover:opacity-0 transition-opacity"
            ></div>
            <span
              class="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-black/85 border border-neutral-700 font-mono-code text-[10px] text-neutral-200"
            >
              #{{ film.id }}
            </span>
          </div>

          <!-- 右侧电影档案信息 -->
          <div class="min-w-0 flex-1 flex flex-col justify-between py-0.5">
            <div>
              <div class="flex items-center justify-between gap-2 mb-1.5">
                <span
                  class="font-mono-code text-[10px] px-1.5 py-0.5 rounded-xs border"
                  :class="
                    film.recent
                      ? 'bg-neutral-800 text-neutral-200 border-neutral-600'
                      : 'bg-neutral-950 text-neutral-400 border-neutral-800'
                  "
                >
                  {{ film.recent ? `RECENT ${RECENT_COUNT} · 展映` : 'ARCHIVE · 归档' }}
                </span>
                <span class="font-mono-code text-xs text-amber-400">
                  {{ favoritesMap[film.id] ? '★ 珍藏' : '' }}
                </span>
              </div>

              <h3
                class="font-serif-cn text-lg sm:text-xl text-white font-semibold truncate group-hover:text-neutral-100"
              >
                {{ film.titleCn }}
              </h3>
              <p class="font-serif-cn italic text-xs text-neutral-400 truncate">
                {{ film.titleOrig }}
              </p>

              <div class="font-mono-code text-[11px] text-neutral-400 mt-2 space-y-0.5">
                <div class="truncate">{{ film.year }} · {{ film.countries?.[0]?.zh || '' }}</div>
                <div class="text-neutral-300 truncate">
                  导演: {{ namesZh(film.credits?.director) }}
                </div>
                <div class="text-neutral-500 truncate">
                  观影: {{ (film.watchedDate || '').split('/')[0].trim() }}
                </div>
              </div>
            </div>

            <!-- 底部三平台评分条 -->
            <div
              class="pt-2.5 mt-2.5 border-t border-neutral-800/80 flex items-center justify-between text-xs font-mono-code"
            >
              <div class="flex items-center gap-3">
                <span class="inline-flex items-center gap-1 text-neutral-200" title="IMDb">
                  <span class="w-2.5 h-2.5 rounded-[2px] bg-[#F5C518] inline-block"></span>
                  <span>{{ film.ratings.imdb.toFixed(1) }}</span>
                </span>
                <span class="inline-flex items-center gap-1 text-neutral-200" title="Letterboxd">
                  <span class="w-2.5 h-2.5 rounded-full bg-[#00E054] inline-block"></span>
                  <span>{{ film.ratings.letterboxd.toFixed(1) }}</span>
                </span>
                <span class="inline-flex items-center gap-1 text-neutral-200" title="豆瓣">
                  <span class="w-2.5 h-2.5 rounded-[2px] bg-[#007722] inline-block"></span>
                  <span>{{ film.ratings.douban.toFixed(1) }}</span>
                </span>
              </div>
              <span class="text-neutral-400 group-hover:text-white transition-colors text-[11px]"
                >详情 →</span
              >
            </div>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>
