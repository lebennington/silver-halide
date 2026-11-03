<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { namesZh } from '../data/format.js'

const props = defineProps({
  films: {
    type: Array,
    required: true
  }
})

const emit = defineEmits(['select-film'])

// 1. 响应式状态变量
const viewportRef = ref(null)
const framesRowRef = ref(null)
const sliceRefs = ref([]) // 收集胶片的真实 DOM 节点
const isHoverPaused = ref(false) // 鼠标悬停时是否暂停
const hasMouseHover = ref(false) // 鼠标是否正指着某张海报
const isAutoPlaying = ref(true)
const isWheelScrolling = ref(false) // 是否正处于滚轮浏览模式
const currentGateFilmIdx = ref(0) // 当前位于屏幕中心片门(GATE)的电影序号
const currentPerfNum = ref(5) // 只有跨过齿孔时才更新（约每秒 1~2 次）

// 当前片门播放的胶片编号（如 01）
const activeFrameCode = computed(() => {
  return props.films[currentGateFilmIdx.value]?.frameCode || '01'
})

// 自动播放开关与平滑寻帧动画数据
let scrollOffset = 0 // 胶片滚动偏移量（0 = 第1帧居中）
let viewportWidth = 1280 // 视口宽度
let frameWidth = 288 // 单帧胶片宽度（桌面端 288px，移动端 248px）
let seekAnimation = null
let targetGateFilmIdx = null

// 2. 动画与拖拽内部变量
let animFrameId = null
let lastAnimTimestamp = null
const baseSpeed = 66 // 自动放映速度（像素/秒）
let wheelVelocity = 0
let isDragging = false
let dragStartX = 0
let dragMovedDistance = 0
let lastScrollOffset = NaN
let lastViewportWidth = NaN
let lastFrameWidth = NaN

// 测量当前屏幕宽度与单帧胶片宽度
function measureWidths() {
  if (!viewportRef.value || !framesRowRef.value) return
  viewportWidth = viewportRef.value.offsetWidth || window.innerWidth
  const firstFrame = framesRowRef.value.querySelector('.film-frame')
  if (firstFrame && firstFrame.offsetWidth > 0) {
    frameWidth = firstFrame.offsetWidth
  }
  syncReelDOM()
}

// 计算第 idx 张胶片距离屏幕正中心的环绕偏移量
function getWrappedDeltaFromCenter(idx) {
  const count = props.films.length
  const totalWidth = frameWidth * count
  const halfTotal = totalWidth * 0.5
  // 原始距离屏幕中心的偏移
  const rawDelta = idx * frameWidth + scrollOffset
  // 取余数：将偏移量限制在 [-halfTotal, +halfTotal) 之间（在屏幕外的盲区才发生换位）
  return ((((rawDelta + halfTotal) % totalWidth) + totalWidth) % totalWidth) - halfTotal
}

// 核心性能优化函数：直接更新 DOM 节点的 transform，仅在帧号或齿孔号真正变化时才通知 Vue
function syncReelDOM() {
  const count = props.films.length
  if (!count) return
  if (
    scrollOffset === lastScrollOffset &&
    viewportWidth === lastViewportWidth &&
    frameWidth === lastFrameWidth
  )
    return
  lastScrollOffset = scrollOffset
  lastViewportWidth = viewportWidth
  lastFrameWidth = frameWidth

  let closestIdx = 0
  let minDistance = Infinity
  const els = sliceRefs.value

  // 1. 直接操作 10 个胶片切片的原生 DOM style，0 虚拟 DOM 开销
  for (let i = 0; i < count; i++) {
    const wrappedDelta = getWrappedDeltaFromCenter(i)
    const dist = Math.abs(wrappedDelta)
    if (dist < minDistance) {
      minDistance = dist
      closestIdx = i
    }
    const el = els[i]
    if (el) {
      const targetScreenX = viewportWidth * 0.5 + wrappedDelta - frameWidth * 0.5
      const tx = targetScreenX - i * frameWidth
      el.style.transform = `translate3d(${tx.toFixed(2)}px, 0, 0)`
    }
  }

  // 2. 只有当中心片门的电影真正换了一部时，才触发 Vue 更新高亮
  if (closestIdx !== currentGateFilmIdx.value) {
    currentGateFilmIdx.value = closestIdx
  }

  // 3. 只有当准星下的齿孔号 (1~8) 真正跳到下一格时，才触发 Vue 更新数字
  const totalWidth = frameWidth * count
  const singlePerfWidth = frameWidth / 8
  const rawStripX = frameWidth * 0.5 - scrollOffset
  const normalizedX = ((rawStripX % totalWidth) + totalWidth) % totalWidth
  const totalPerfIdx = Math.floor(normalizedX / singlePerfWidth)
  const perfNum = (totalPerfIdx % 8) + 1

  if (perfNum !== currentPerfNum.value) {
    currentPerfNum.value = perfNum
  }
}

// 每秒 60 帧的放映机马达
function stepAnimation(timestamp) {
  const now = typeof timestamp === 'number' ? timestamp : performance.now()
  const rawDtMs = lastAnimTimestamp !== null ? now - lastAnimTimestamp : 1000 / 60
  lastAnimTimestamp = now
  const dtMs = Math.min(Math.max(rawDtMs, 0), 64)
  const dtSec = dtMs / 1000
  const frameScale = dtMs / (1000 / 60)

  if (isDragging) {
    // 1. 按住拖拽期间：马达不额外移动胶片，保证胶片与鼠标指针 1:1 绝对跟手
    // 同时如果鼠标停住不动，让惯性速度快速衰减，方便拖到指定位置停稳松手
    wheelVelocity *= Math.pow(0.75, frameScale)
    if (Math.abs(wheelVelocity) <= 0.05) wheelVelocity = 0
  } else if (seekAnimation !== null) {
    // 处理点击“倒片/进片/微缩点”时的平滑寻帧动画
    const elapsed = now - seekAnimation.startTime
    const progress = Math.min(1, Math.max(0, elapsed / seekAnimation.duration))
    const eased = 1 - Math.pow(1 - progress, 3) // 立方缓出：先快后慢精准卡位
    scrollOffset = seekAnimation.startOffset + seekAnimation.targetDelta * eased
    if (progress >= 1) {
      seekAnimation = null
      targetGateFilmIdx = null
    }
  } else if (Math.abs(wheelVelocity) > 0.6) {
    // 2. 松开鼠标后（或拨动滚轮时）：才由飞轮惯性接管丝滑滑行
    scrollOffset += wheelVelocity * frameScale
    wheelVelocity *= Math.pow(0.9, frameScale)
    if (Math.abs(wheelVelocity) <= 0.6) {
      wheelVelocity = 0
    }
  } else if (isAutoPlaying.value && !isHoverPaused.value) {
    // 3. 既没拖拽、也没惯性、也没悬停时：匀速自动放映
    scrollOffset -= baseSpeed * dtSec
  }

  syncReelDOM()
  animFrameId = requestAnimationFrame(stepAnimation)
}

function onFrameMouseEnter() {
  isHoverPaused.value = true
  hasMouseHover.value = true
}

function onFrameMouseLeave() {
  if (isDragging) return
  isHoverPaused.value = false
  hasMouseHover.value = false
}

function onFrameClick(filmId) {
  if (dragMovedDistance > 4) return
  emit('select-film', filmId)
}

function onWheel(e) {
  seekAnimation = null
  const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
  // 兼容不同鼠标（按行滚动 vs 按像素滚动）
  const pixelDelta = e.deltaMode === 1 ? delta * 32 : delta
  // 把滚轮的力道累加到飞轮速度上，连续拨动会顺滑加速
  wheelVelocity -= pixelDelta * 0.14
  // 限制最高转速
  wheelVelocity = Math.max(-66, Math.min(66, wheelVelocity))
  // 只要拨动滚轮，立刻解除初始海报的粘滞点亮，把显影权交给光门
  isWheelScrolling.value = true
  hasMouseHover.value = false
  isHoverPaused.value = false
}

// 物理移动鼠标时，退出滚轮浏览模式，恢复指哪亮哪
function onViewportMouseMove() {
  if (isDragging) return
  if (isWheelScrolling.value) {
    isWheelScrolling.value = false
  }
}

function onPointerDown(e) {
  targetGateFilmIdx = null
  if (e.pointerType === 'mouse' && e.button !== 0) return
  isDragging = true
  wheelVelocity = 0
  dragStartX = e.clientX
  dragMovedDistance = 0
}

function onWindowPointerMove(e) {
  if (!isDragging) return
  const dx = e.clientX - dragStartX
  dragStartX = e.clientX
  dragMovedDistance += Math.abs(dx)
  scrollOffset += dx
  wheelVelocity = dx * 0.35
  // 一旦按住拖拽超过 4 像素，解除当前海报的点亮，优先触发光门显影
  if (dragMovedDistance > 4) {
    isWheelScrolling.value = true
    hasMouseHover.value = false
  }
}

function onWindowPointerUp() {
  if (!isDragging) return
  isDragging = false
  // 如果是拖拽后松手，保持光门显影并恢复胶卷流动
  if (dragMovedDistance > 4) {
    isHoverPaused.value = false
    hasMouseHover.value = false
  } else if (!framesRowRef.value?.querySelector('.film-poster-wrap:hover')) {
    isHoverPaused.value = false
    hasMouseHover.value = false
  }
}

// 切换 播放 / 暂停
function togglePlay() {
  isAutoPlaying.value = !isAutoPlaying.value
}

// 启动平滑寻帧动画
function startSmoothSeek(targetDelta, targetIdx, duration = 300) {
  wheelVelocity = 0
  targetGateFilmIdx = targetIdx
  seekAnimation = {
    startOffset: scrollOffset,
    targetDelta,
    startTime: performance.now(),
    duration
  }
}

// 点击顶部第 index 个微缩格点：直接算出它离中心的偏差，平滑移过来
function scrollToReelFrameIndex(index) {
  const count = props.films.length
  if (index < 0 || index >= count) return
  const delta = -getWrappedDeltaFromCenter(index)
  startSmoothSeek(delta, index, 320)
}

// 点击「← 倒片 (-1)」或「进片 → (+1)」
function smoothStepReel(direction) {
  const count = props.films.length
  if (!count) return
  const totalWidth = frameWidth * count
  const baseIdx =
    seekAnimation !== null && targetGateFilmIdx !== null
      ? targetGateFilmIdx
      : currentGateFilmIdx.value
  const nextIdx = (baseIdx + direction + count) % count
  let delta = -getWrappedDeltaFromCenter(nextIdx)

  if (direction > 0 && delta > 0) delta -= totalWidth
  if (direction < 0 && delta < 0) delta += totalWidth

  startSmoothSeek(delta, nextIdx, 280)
}

defineExpose({
  smoothStepReel
})

onMounted(() => {
  measureWidths()
  animFrameId = requestAnimationFrame(stepAnimation)
  window.addEventListener('resize', measureWidths)
  window.addEventListener('pointermove', onWindowPointerMove)
  window.addEventListener('pointerup', onWindowPointerUp)
  window.addEventListener('pointercancel', onWindowPointerUp)
})

onUnmounted(() => {
  if (animFrameId !== null) cancelAnimationFrame(animFrameId)
  window.removeEventListener('resize', measureWidths)
  window.removeEventListener('pointermove', onWindowPointerMove)
  window.removeEventListener('pointerup', onWindowPointerUp)
  window.removeEventListener('pointercancel', onWindowPointerUp)
})
</script>

<template>
  <section class="flex-1 flex flex-col justify-center py-6 sm:py-10 view-shutter-enter">
    <!-- 顶部胶卷放映控制栏 -->
    <div class="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 mb-5">
      <div
        class="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 px-3.5 sm:px-4 py-2.5 rounded-xs bg-neutral-950/95 border border-neutral-800/90 shadow-lg"
      >
        <!-- 1. 左侧：放映机状态指示灯 -->
        <div
          class="flex items-center gap-2 sm:gap-2.5 font-mono-code text-[11px] sm:text-xs w-52 sm:w-56 shrink-0"
        >
          <span
            class="inline-block w-2 h-2 rounded-full shrink-0"
            :class="
              !isAutoPlaying ? 'bg-amber-400' : isHoverPaused ? 'bg-amber-300' : 'bg-emerald-400'
            "
          ></span>
          <span class="text-neutral-200 tracking-wider inline-flex items-center whitespace-nowrap">
            <span class="inline-block w-[100px] sm:w-[110px] text-left">
              {{
                !isAutoPlaying ? 'REEL PAUSED' : isHoverPaused ? 'FRAME INSPECT' : 'REEL PLAYING'
              }}
            </span>
            <span class="text-neutral-600 mr-1.5">//</span>
            <span>
              {{ !isAutoPlaying ? '胶卷已暂停' : isHoverPaused ? '悬停定格' : '胶卷放映中' }}
            </span>
          </span>
        </div>

        <!-- 2. 中间：10帧微缩胶片定位格 + 当前片门帧号 + 齿孔读数 -->
        <div
          class="flex items-center gap-1.5 px-2.5 py-1.5 bg-black/70 border border-neutral-800/90 rounded-xs font-mono-code text-[10px] sm:text-[11px]"
        >
          <!-- <span class="text-neutral-500 mr-0.5 hidden sm:inline">GATE:</span> -->
          <!-- 10个微缩胶片格 -->
          <div class="flex items-center gap-1 sm:gap-1.5">
            <button
              v-for="(f, i) in films"
              :key="f.id"
              type="button"
              :title="`${f.titleCn} (${f.frameCode})`"
              @click="scrollToReelFrameIndex(i)"
              class="w-2.5 h-3.5 rounded-[1px] border transition-all cursor-pointer"
              :class="
                i === currentGateFilmIdx
                  ? 'border-amber-300 bg-amber-400 scale-110 shadow-[0_0_8px_rgba(212,175,55,0.7)]'
                  : 'border-neutral-700 bg-neutral-800 hover:border-amber-400/70'
              "
            ></button>
          </div>
          <!-- 分割线与整合读数 -->
          <span class="text-neutral-700 mx-1">|</span>
          <span class="text-neutral-300 tabular-nums">FR</span>
          <span class="text-amber-400 font-semibold tabular-nums"> {{ activeFrameCode }}</span>
          <span class="text-neutral-600">·</span>
          <span class="text-neutral-300 tabular-nums w-16 text-right"
            >PERF {{ currentPerfNum }}/8</span
          >
        </div>

        <!-- 3. 右侧：倒片 / 暂停 / 进片 按钮 -->
        <div
          class="grid grid-cols-3 sm:flex items-center gap-2 w-full sm:w-auto font-mono-code text-xs"
        >
          <button
            @click="smoothStepReel(-1)"
            type="button"
            class="w-full sm:w-24 justify-center py-1.5 rounded-xs border border-neutral-700 bg-neutral-900 text-neutral-200 hover:text-white hover:border-neutral-500 transition-colors inline-flex items-center"
          >
            ← 倒片
          </button>
          <button
            @click="togglePlay"
            type="button"
            class="w-full sm:w-24 justify-center py-1.5 rounded-xs border transition-colors inline-flex items-center gap-1.5"
            :class="
              !isAutoPlaying
                ? 'border-neutral-500 bg-neutral-800 text-white hover:border-neutral-400'
                : 'border-neutral-700 bg-neutral-900 text-neutral-200 hover:text-white hover:border-neutral-500'
            "
          >
            <span class="inline-flex items-center justify-center w-3.5 text-center leading-none">{{
              isAutoPlaying ? '⏸' : '▷'
            }}</span>
            <span>{{ isAutoPlaying ? '暂停' : '播放' }}</span>
          </button>
          <button
            @click="smoothStepReel(1)"
            type="button"
            class="w-full sm:w-24 justify-center py-1.5 rounded-xs border border-neutral-700 bg-neutral-900 text-neutral-200 hover:text-white hover:border-neutral-500 transition-colors inline-flex items-center"
          >
            进片 →
          </button>
        </div>
      </div>
    </div>

    <!-- 35MM 胶片外壳 (用 ref="viewportRef" 绑定以便测量宽度) -->
    <div
      ref="viewportRef"
      @wheel.prevent="onWheel"
      @pointerdown="onPointerDown"
      @mousemove="onViewportMouseMove"
      class="film-strip-shell relative w-full overflow-hidden cursor-grab active:cursor-grabbing"
    >
      <!-- 左右两侧边缘暗角渐变遮罩，让胶片进出屏幕更自然 -->
      <div
        class="pointer-events-none absolute inset-y-0 left-0 w-8 sm:w-24 bg-linear-to-r from-[#070707] to-transparent z-20"
      ></div>
      <div
        class="pointer-events-none absolute inset-y-0 right-0 w-8 sm:w-24 bg-linear-to-l from-[#070707] to-transparent z-20"
      ></div>

      <!-- 屏幕正中央的片门聚光灯 (GATE) 与上下金色准星 -->
      <div class="pointer-events-none absolute inset-0 projector-gate-beam z-10"></div>
      <div
        class="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center"
      >
        <div
          class="w-12 sm:w-16 h-[2px] bg-linear-to-r from-transparent via-amber-400/70 to-transparent"
        ></div>
        <span
          class="text-[8px] font-mono-code tracking-[0.2em] text-amber-400/60 mt-0.5 leading-none"
          >GATE ▼</span
        >
      </div>
      <div
        class="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center"
      >
        <span
          class="text-[8px] font-mono-code tracking-[0.2em] text-amber-400/60 mb-0.5 leading-none"
          >▲ GATE</span
        >
        <div
          class="w-12 sm:w-16 h-[2px] bg-linear-to-r from-transparent via-amber-400/70 to-transparent"
        ></div>
      </div>

      <!-- 履带容器：让 10 块胶片各自按履带坐标站位 -->
      <div
        id="framesRow"
        ref="framesRowRef"
        class="flex items-center w-full"
        :class="{ 'has-mouse-hover': hasMouseHover }"
      >
        <!-- 循环 10 部电影，每块包含：上齿孔 + 海报画格 + 下齿孔 -->
        <div
          v-for="(film, idx) in films"
          :key="film.id"
          :ref="(el) => (sliceRefs[idx] = el)"
          class="flex flex-col shrink-0 will-change-transform"
        >
          <!-- 1. 该帧顶部 8 个齿孔 -->
          <div class="frame-sprocket-group py-3 border-b border-neutral-800/80">
            <div v-for="h in 8" :key="`top-${h}`" class="sprocket-hole"></div>
          </div>

          <!-- 2. 该帧中间海报画格 -->
          <div class="py-3">
            <article
              class="film-frame group"
              :class="{ 'is-gate-active': idx === currentGateFilmIdx }"
            >
              <!-- 胶片上边缘 -->
              <div
                class="flex items-center justify-between text-[10px] font-mono-code text-neutral-500 mb-1.5 px-0.5"
              >
                <span>◁ KODAK 5222</span>
                <span>{{ film.frameCode }}</span>
              </div>

              <!-- 海报画框 -->
              <div
                class="film-poster-wrap"
                :class="{ 'pointer-events-none': isWheelScrolling }"
                @mouseenter="onFrameMouseEnter"
                @mouseleave="onFrameMouseLeave"
                @click="onFrameClick(film.id)"
              >
                <img
                  :src="film.poster"
                  :alt="film.titleCn"
                  class="film-poster-img"
                  draggable="false"
                />
                <div class="poster-grain-layer"></div>
                <div class="poster-scratches"></div>

                <!-- 底部片名与评分浮层 -->
                <div class="poster-caption-overlay">
                  <div
                    class="flex items-center justify-between text-[10px] font-mono-code text-neutral-300 mb-1"
                  >
                    <span>{{ film.year }} · {{ namesZh(film.credits.director) }}</span>
                    <span class="text-amber-400">{{ film.ratings.douban.toFixed(1) }}</span>
                  </div>
                  <h3
                    class="font-serif-cn text-lg sm:text-xl font-semibold text-white leading-snug"
                  >
                    {{ film.titleCn }}
                  </h3>
                  <p class="font-serif-cn italic text-xs text-neutral-300 truncate">
                    {{ film.titleOrig }}
                  </p>
                </div>
              </div>

              <!-- 胶片下边缘 -->
              <div
                class="flex items-center justify-between text-[10px] font-mono-code text-neutral-500 mt-1.5 px-0.5"
              >
                <span>SAFETY FILM</span>
                <span>FRAME #{{ String(film.id).padStart(2, '0') }}</span>
              </div>
            </article>
          </div>

          <!-- 3. 该帧底部 8 个齿孔 -->
          <div class="frame-sprocket-group py-3 border-t border-neutral-800/80">
            <div v-for="h in 8" :key="`bot-${h}`" class="sprocket-hole"></div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
