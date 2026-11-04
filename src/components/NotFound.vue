<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <section class="flex-1 flex items-center justify-center py-16 sm:py-24 view-shutter-enter">
    <div class="max-w-xl w-full mx-auto px-4 sm:px-6 text-center">
      <p class="font-mono-code text-[11px] text-neutral-400 tracking-[0.35em] uppercase block mb-4">
        SILVER HALIDE // ERROR
      </p>

      <h1 class="font-serif-cn text-6xl sm:text-8xl text-white font-semibold leading-none">404</h1>

      <h2 class="font-serif-cn text-xl sm:text-2xl text-white mt-4 font-medium tracking-wide">
        胶片遗失 // FRAME NOT FOUND
      </h2>

      <p class="font-mono-code text-xs sm:text-sm text-neutral-400 mt-4 leading-relaxed">
        你试图查看的胶片不存在，或已被档案馆撤下。<br class="hidden sm:block" />
        或许片名拼写有误，或许它从未被冲印。
      </p>

      <div class="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
        <button
          type="button"
          @click="router.push({ name: 'home' })"
          class="w-full sm:w-auto px-6 py-2.5 rounded-xs bg-white text-black font-mono-code text-xs hover:bg-amber-200 transition-colors cursor-pointer"
        >
          返回放映室 →
        </button>
        <button
          type="button"
          @click="router.push({ name: 'archive' })"
          class="w-full sm:w-auto px-6 py-2.5 rounded-xs border border-neutral-700 bg-neutral-950 text-neutral-200 font-mono-code text-xs hover:border-amber-400/80 hover:text-white transition-colors cursor-pointer"
        >
          前往档案馆
        </button>
      </div>
    </div>
  </section>
</template>
