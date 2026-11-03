import rawFilms from './films.json'
import { validateFilms, parseWatchedDate, filmPoster } from './validate.js'
import { namesBilingual } from './format.js'

// 放映室展映数量
export const RECENT_COUNT = 10

// 按观看日期倒序（新的在前）
rawFilms.sort((a, b) => (parseWatchedDate(b) || '').localeCompare(parseWatchedDate(a) || ''))

// 派生 frameCode（排序后的位置）、recent（是否在放映室展映）、poster 路径与 _searchPool 预计算
rawFilms.forEach((film, idx) => {
  film.frameCode = String(idx + 1).padStart(2, '0')
  film.recent = idx < RECENT_COUNT
  film.poster = filmPoster(film)
  film._searchPool = [
    film.titleCn,
    film.titleOrig,
    namesBilingual(film.credits?.director),
    namesBilingual(film.credits?.writer),
    namesBilingual(film.credits?.cinematographer),
    namesBilingual(film.credits?.cast),
    film.year,
    namesBilingual(film.countries),
    namesBilingual(film.genres)
  ]
    .join(' ')
    .toLowerCase()
})

// 筛选“最近放映的10部电影”并导出
export const FILMS = rawFilms
export const RECENT_FILMS = FILMS.slice(0, RECENT_COUNT)

// 开发模式下一次性打印到控制台；生产构建与 Node 脚本中不输出
if (import.meta.env?.DEV) {
  const { errors, warnings } = validateFilms(FILMS)
  errors.forEach((e) => console.error('[films] ' + e))
  warnings.forEach((w) => console.warn('[films] ' + w))
}
