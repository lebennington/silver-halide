// src/data/validate.js
// 数据校验 + 共享解析工具：供浏览器(films.js)与 Node(check-films.mjs)共用。

export const ISO_DATE_RE = /^(\d{4}-\d{2}-\d{2})/

// 判断 YYYY-MM-DD 是否为真实日历日期
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
const isLeapYear = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0
export function isValidDate(dateStr) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr || '')
  if (!m) return false
  const year = Number(m[1])
  const month = Number(m[2])
  const day = Number(m[3])
  if (month < 1 || month > 12 || day < 1) return false
  const days = month === 2 && isLeapYear(year) ? 29 : DAYS_IN_MONTH[month - 1]
  return day <= days
}

// 提取 watchedDate 开头的 YYYY-MM-DD，非法日期返回 null
export const parseWatchedDate = (film) => {
  const m = ISO_DATE_RE.exec(film.watchedDate || '')
  const dateStr = m ? m[1] : null
  return dateStr && isValidDate(dateStr) ? dateStr : null
}
// —— 海报 slug 派生（posters/{slug}-{year}.jpg）——
const englishTitle = (titleOrig) => {
  const title = typeof titleOrig === 'string' ? titleOrig : ''
  const slashIdx = title.lastIndexOf(' / ')
  if (slashIdx !== -1) return title.slice(slashIdx + 3).trim()
  const parenMatch = title.match(/\(([^()]*)\)\s*$/)
  if (parenMatch) return parenMatch[1].trim()
  return title.trim()
}
const slugify = (s) =>
  s
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
// 无法自动处理的名字（带 ½ 等非 ASCII 码）
const SLUG_OVERRIDES = {
  '8½ (Otto e mezzo)': 'eight-and-a-half'
}
export const filmSlug = (titleOrig) => SLUG_OVERRIDES[titleOrig] || slugify(englishTitle(titleOrig))
// 海报相对路径：posters/{slug}-{year}.jpg
export const filmPoster = (film) => {
  const f = film || {}
  const year = Number.isInteger(f.year) ? f.year : ''
  return 'posters/' + filmSlug(f.titleOrig) + '-' + year + '.jpg'
}

// 各平台评分范围
const RATING_RANGES = { imdb: [1, 10], letterboxd: [0, 5], douban: [1, 10] }

export function validateFilms(films) {
  const errors = []
  const warnings = []
  const seenIds = new Set()
  const nonEmpty = (v) => typeof v === 'string' && v.trim() !== ''
  const hasBoth = (p) => p && nonEmpty(p.zh) && nonEmpty(p.en)

  films.forEach((film) => {
    const tag = `#${film.id} ${film.titleCn || '(无片名)'}`

    if (!Number.isInteger(film.id) || film.id <= 0) errors.push(`${tag}: id 必须是正整数`)
    if (seenIds.has(film.id)) errors.push(`${tag}: id 重复（${film.id}）`)
    seenIds.add(film.id)

    if (!nonEmpty(film.titleCn) || !nonEmpty(film.titleOrig))
      errors.push(`${tag}: titleCn / titleOrig 不能为空`)
    if (!parseWatchedDate(film))
      errors.push(`${tag}: watchedDate 必须以合法日期开头（YYYY-MM-DD，如 2026-02-28）`)
    if (!Number.isInteger(film.year)) errors.push(`${tag}: year 必须是整数`)
    if (!Number.isFinite(film.runtimeMin) || film.runtimeMin <= 0)
      errors.push(`${tag}: runtimeMin 必须是正数`)

    for (const key of ['countries', 'genres']) {
      const arr = film[key]
      if (!Array.isArray(arr) || arr.length === 0) errors.push(`${tag}: ${key} 必须是非空数组`)
      else if (!arr.every(hasBoth)) errors.push(`${tag}: ${key} 每项必须含非空 zh / en`)
    }

    const credits = film.credits
    if (!credits || typeof credits !== 'object') {
      errors.push(`${tag}: 缺少 credits 对象`)
    } else {
      // 主创（导演/编剧/摄影）：数组允许为空；非空时每项必须含非空 zh/en
      for (const role of ['director', 'writer', 'cinematographer']) {
        if (!Array.isArray(credits[role])) {
          errors.push(`${tag}: credits.${role} 必须是数组`)
        } else if (!credits[role].every(hasBoth)) {
          errors.push(`${tag}: credits.${role} 每项必须含非空 zh / en`)
        }
      }
      // 主演：数组必须非空；每位演员至少要有非空 zh 或 en 之一
      if (!Array.isArray(credits.cast) || credits.cast.length === 0) {
        errors.push(`${tag}: credits.cast 必须是非空数组`)
      } else {
        credits.cast.forEach((p, i) => {
          if (!p || (!nonEmpty(p.zh) && !nonEmpty(p.en))) {
            errors.push(`${tag}: credits.cast[${i}] 至少要有非空 zh 或 en`)
          } else if (!hasBoth(p)) {
            warnings.push(`${tag}: credits.cast[${i}] 缺中文或英文名（${p.zh || p.en}）`)
          }
        })
      }
    }

    const r = film.ratings
    if (!r || typeof r !== 'object') errors.push(`${tag}: 缺少 ratings 对象`)
    else
      Object.entries(RATING_RANGES).forEach(([k, [min, max]]) => {
        if (!Number.isFinite(r[k]) || r[k] < min || r[k] > max) {
          errors.push(`${tag}: ratings.${k} 必须是 ${min}-${max} 的数字`)
        }
      })

    if (!Number.isFinite(film.myRating) || film.myRating < 0 || film.myRating > 5) {
      errors.push(`${tag}: myRating 必须是 0-5 的数字`)
    }
    if (!film.medium || !nonEmpty(film.medium.zh)) errors.push(`${tag}: medium.zh 缺失或为空`)
    if (!film.synopsis || !nonEmpty(film.synopsis.zh)) errors.push(`${tag}: synopsis.zh 缺失或为空`)
  })

  return { errors, warnings }
}
