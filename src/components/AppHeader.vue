<script setup>
// defineProps 用来接收“总控室(App.vue)”传过来的数据
defineProps({
  activeView: String, // 当前页面：'home' | 'index' | 'detail'
  totalCount: Number, // 电影总数
  grainIntensity: String // 当前颗粒粗糙度：'strong' | 'subtle' | 'off'
})

// defineEmits 用来向“总控室(App.vue)”发送点击信号
const emit = defineEmits(['navigate', 'toggle-grain'])

// 根据颗粒状态显示对应的中文文字
const grainLabelMap = {
  strong: '颗粒: 强',
  subtle: '颗粒: 弱',
  off: '颗粒: 关'
}
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-neutral-800/80 bg-black/85 backdrop-blur-md">
    <div
      class="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2"
    >
      <!-- 左侧：Logo 与标题（点击返回放映室） -->
      <button
        @click="emit('navigate', 'home')"
        type="button"
        class="group flex items-center gap-2 sm:gap-3 text-left focus:outline-none shrink-0"
      >
        <div
          class="w-8 h-8 sm:w-9 sm:h-9 rounded-sm border border-neutral-600 flex items-center justify-center bg-neutral-950 group-hover:border-white transition-colors shrink-0"
        >
          <!-- 35mm 胶片盘 SVG 图标 -->
          <svg
            class="w-4 h-4 sm:w-5 sm:h-5 text-neutral-200 group-hover:rotate-45 transition-transform duration-500"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
          >
            <circle cx="12" cy="12" r="9" />
            <circle cx="12" cy="12" r="2.5" />
            <circle cx="12" cy="6.5" r="1.2" fill="currentColor" />
            <circle cx="12" cy="17.5" r="1.2" fill="currentColor" />
            <circle cx="6.5" cy="12" r="1.2" fill="currentColor" />
            <circle cx="17.5" cy="12" r="1.2" fill="currentColor" />
          </svg>
        </div>
        <div class="min-w-0">
          <div class="hidden sm:flex items-center gap-2">
            <span class="font-mono-code text-[11px] tracking-[0.25em] text-neutral-400"
              >35MM ARCHIVE</span
            >
            <span
              class="inline-block w-1.5 h-1.5 rounded-full bg-neutral-400 animate-pulse-slow"
            ></span>
          </div>
          <h1
            class="font-serif-cn text-base sm:text-xl font-semibold tracking-wider text-white leading-none whitespace-nowrap"
          >
            银盐手记
            <span
              class="hidden md:inline text-xs font-mono-code font-normal text-neutral-500 tracking-widest ml-1"
              >CINEPHILE LOG</span
            >
          </h1>
        </div>
      </button>

      <!-- 右侧：导航按钮与颗粒粗糙度切换 -->
      <div class="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        <!-- 放映室按钮（根据 activeView 动态切换高亮边框） -->
        <button
          @click="emit('navigate', 'home')"
          type="button"
          class="h-7 sm:h-8 px-2.5 sm:px-3 inline-flex items-center justify-center text-[11px] sm:text-xs font-mono-code tracking-wider uppercase rounded border transition-colors whitespace-nowrap"
          :class="
            activeView === 'home'
              ? 'border-neutral-600 bg-neutral-900 text-white'
              : 'border-neutral-800 bg-neutral-950/80 text-neutral-300 hover:text-white hover:border-neutral-600'
          "
        >
          放映室
        </button>

        <!-- 档案馆按钮 -->
        <button
          @click="emit('navigate', 'index')"
          type="button"
          class="h-7 sm:h-8 px-2.5 sm:px-3 inline-flex items-center justify-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs font-mono-code tracking-wider uppercase rounded border transition-colors whitespace-nowrap"
          :class="
            activeView === 'index'
              ? 'border-neutral-600 bg-neutral-900 text-white'
              : 'border-neutral-800 bg-neutral-950/80 text-neutral-300 hover:text-white hover:border-neutral-600'
          "
        >
          <span>档案馆</span>
          <span class="text-[10px] px-1.5 py-0.5 bg-neutral-800 text-neutral-300 rounded-sm">{{
            totalCount
          }}</span>
        </button>

        <!-- 胶片颗粒粗糙度按钮 -->
        <button
          @click="emit('toggle-grain')"
          type="button"
          title="切换胶片颗粒粗糙度"
          class="h-7 sm:h-8 px-2 sm:px-2.5 inline-flex items-center justify-center rounded border border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white hover:border-neutral-600 transition-colors text-[11px] sm:text-xs font-mono-code whitespace-nowrap"
        >
          {{ grainLabelMap[grainIntensity] }}
        </button>
      </div>
    </div>
  </header>
</template>
