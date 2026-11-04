import { createRouter, createWebHistory } from 'vue-router'
import { FILMS } from '../src/data/films.js'

const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('../src/components/FilmReel.vue')
  },
  {
    path: '/archive',
    name: 'archive',
    component: () => import('../src/components/FilmArchive.vue')
  },
  {
    path: '/films/:slug',
    name: 'film-detail',
    component: () => import('../src/components/FilmDetail.vue'),

    // 防止访问不存在的影片 ID
    beforeEnter: (to) => {
      const id = Number(to.params.id)

      if (!FILMS.some((film) => film.slug === to.params.slug)) {
        return { name: 'not-found' }
      }
    }
  },
  {
    path: '/404',
    name: 'not-found',
    component: () => import('../src/components/NotFound.vue')
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: { name: 'not-found' }
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,

  // 路由切换时回到顶部；浏览器前进后退时恢复原位置
  scrollBehavior(to, from, savedPosition) {
    return savedPosition || { top: 0 }
  }
})

export default router
