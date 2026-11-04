<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { FILMS, RECENT_FILMS } from './data/films.js'
import AppHeader from './components/AppHeader.vue'
import AppFooter from './components/AppFooter.vue'
import FilmReel from './components/FilmReel.vue'
import FilmArchive from './components/FilmArchive.vue'
import FilmDetail from './components/FilmDetail.vue'

// 1. 当前显示的页面状态：'home' (放映室) | 'index' (档案馆) | 'detail' (详情页)
const activeView = ref('home')
const detailSourceView = ref('home')

// 2. 当前选中的电影 ID（用于详情页）
const currentDetailFilmId = ref(FILMS[0].id)

// 3. 全局暗房胶片颗粒粗糙度：'strong' | 'subtle' | 'off'
const grainIntensity = ref('subtle')

// 珍藏胶片状态表（默认珍藏 id 为 1, 2, 7 的三部电影）
const favoritesMap = ref({ 1: true, 2: true, 7: true })

// 根据颗粒状态自动计算透明度 (computed 是计算属性，依赖的变量一变它就自动重算)
const grainOpacity = computed(() => {
  if (grainIntensity.value === 'strong') return 0.12
  if (grainIntensity.value === 'subtle') return 0.06
  return 0
})

// 切换颗粒粗糙度的函数
function toggleGrain() {
  if (grainIntensity.value === 'strong') {
    grainIntensity.value = 'subtle'
  } else if (grainIntensity.value === 'subtle') {
    grainIntensity.value = 'off'
  } else {
    grainIntensity.value = 'strong'
  }
}

// 切换页面的函数
function navigateTo(view) {
  activeView.value = view
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// 打开某部电影的详情页
function openFilmDetail(filmId, source = activeView.value) {
  if (source === 'home' || source === 'index') {
    detailSourceView.value = source
  }
  currentDetailFilmId.value = filmId
  activeView.value = 'detail'
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function toggleFavorite(filmId) {
  favoritesMap.value[filmId] = !favoritesMap.value[filmId]
}

// 控制右下角「回到顶部」按钮是否显示
const showBackToTop = ref(false)

// 监听网页滚动：在详情页或档案馆向下滚动超过 200px 时，浮现「回到顶部」按钮
function onWindowScroll() {
  const scrollTop = window.scrollY || document.documentElement.scrollTop || 0
  showBackToTop.value = activeView.value !== 'home' && scrollTop > 200
}

// 点击平滑滚回页面顶部
function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const filmReelRef = ref(null) //  用于拿到 FilmReel 子组件的实例
// 全局键盘快捷键：[←/→] 切帧，[ESC] 返回
function onGlobalKeyDown(e) {
  // 如果用户正在搜索框里打字，不触发快捷键
  if (
    e.target.tagName === 'INPUT' ||
    e.target.tagName === 'TEXTAREA' ||
    e.target.tagName === 'SELECT'
  )
    return

  if (activeView.value === 'detail') {
    if (e.key === 'Escape') {
      activeView.value = detailSourceView.value
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      const idx = FILMS.findIndex((f) => f.id === currentDetailFilmId.value)
      const prevIdx = (idx - 1 + FILMS.length) % FILMS.length
      openFilmDetail(FILMS[prevIdx].id, detailSourceView.value)
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      const idx = FILMS.findIndex((f) => f.id === currentDetailFilmId.value)
      const nextIdx = (idx + 1) % FILMS.length
      openFilmDetail(FILMS[nextIdx].id, detailSourceView.value)
    }
  } else if (activeView.value === 'index') {
    if (e.key === 'Escape') {
      activeView.value = 'home'
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  } else if (activeView.value === 'home') {
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      filmReelRef.value?.smoothStepReel(-1)
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      filmReelRef.value?.smoothStepReel(1)
    }
  }
}

onMounted(() => {
  window.addEventListener('scroll', onWindowScroll, { passive: true })
  window.addEventListener('keydown', onGlobalKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('scroll', onWindowScroll)
  window.removeEventListener('keydown', onGlobalKeyDown)
})
</script>

<template>
  <!-- 全局静态胶片颗粒遮罩层 -->
  <div
    id="globalGrain"
    class="fixed inset-0 pointer-events-none z-50 transition-opacity duration-300"
    :style="{ opacity: grainOpacity }"
  ></div>

  <!-- 顶部导航栏组件 -->
  <AppHeader
    :activeView="activeView"
    :totalCount="FILMS.length"
    :grainIntensity="grainIntensity"
    @navigate="navigateTo"
    @toggle-grain="toggleGrain"
  />

  <!-- 主内容区（根据 activeView，用 v-if 切换显示画面） -->
  <main id="appMain" class="flex-1 flex flex-col">
    <!-- 画面 1：放映室 (Home) -->
    <FilmReel
      v-if="activeView === 'home'"
      ref="filmReelRef"
      :films="RECENT_FILMS"
      @select-film="openFilmDetail"
    />
    <!-- 画面 2：档案馆 (Index) -->
    <KeepAlive>
      <FilmArchive
        v-if="activeView === 'index'"
        :films="FILMS"
        :favorites-map="favoritesMap"
        @select-film="openFilmDetail"
      />
    </KeepAlive>

    <!-- 画面 3：电影详情页 (Detail) -->
    <FilmDetail
      v-if="activeView === 'detail'"
      :films="FILMS"
      :film-id="currentDetailFilmId"
      :source-view="detailSourceView"
      :favorites-map="favoritesMap"
      @back="activeView = detailSourceView"
      @select-film="(id) => openFilmDetail(id, detailSourceView)"
      @toggle-favorite="toggleFavorite"
      @open-archive="activeView = 'index'"
    />
  </main>

  <button
    type="button"
    aria-label="回到顶部"
    @click="scrollToTop"
    class="fixed bottom-6 right-5 sm:bottom-8 sm:right-8 z-40 px-3 py-2 rounded-xs bg-neutral-900/95 backdrop-blur-md border border-neutral-600 text-neutral-200 hover:text-white hover:border-amber-400/80 shadow-2xl font-mono-code text-xs flex items-center gap-1.5 transition-all duration-300 cursor-pointer"
    :class="
      showBackToTop
        ? 'opacity-100 translate-y-0 pointer-events-auto'
        : 'opacity-0 translate-y-3 pointer-events-none'
    "
  >
    <span class="text-amber-400 text-sm leading-none">↑</span>
    <span>TOP // 顶部</span>
  </button>

  <!-- 底部状态栏组件 -->
  <AppFooter />
</template>
