// src/data/validate.js
// 数据校验 + 共享解析工具：供浏览器(films.js)与 Node(check-films.mjs)共用。

export const ISO_DATE_RE = /^(\d{4}-\d{2}-\d{2})/
export const parseWatchedDate = (film) => {
  const m = ISO_DATE_RE.exec(film.watchedDate || '')
  return m ? m[1] : null
}
// —— 海报 slug 派生（posters/{slug}-{year}.jpg）——
const englishTitle = (titleOrig) => {
  const slashIdx = titleOrig.lastIndexOf(' / ')
  if (slashIdx !== -1) return titleOrig.slice(slashIdx + 3).trim()
  const parenMatch = titleOrig.match(/\(([^()]*)\)\s*$/)
  if (parenMatch) return parenMatch[1].trim()
  return titleOrig.trim()
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
export const filmPoster = (film) => 'posters/' + filmSlug(film.titleOrig) + '-' + film.year + '.jpg'

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
    if (!ISO_DATE_RE.test(film.watchedDate || ''))
      errors.push(`${tag}: watchedDate 必须以 YYYY-MM-DD 开头`)
    if (typeof film.year !== 'number') errors.push(`${tag}: year 必须是数字`)
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
      for (const role of ['director', 'writer', 'cinematographer']) {
        if (!Array.isArray(credits[role]) || !credits[role].every(hasBoth)) {
          errors.push(`${tag}: credits.${role} 必须是含非空 zh/en 的数组`)
        }
      }
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
      ['imdb', 'letterboxd', 'douban'].forEach((k) => {
        if (typeof r[k] !== 'number') errors.push(`${tag}: ratings.${k} 必须是数字`)
      })

    if (!Number.isFinite(film.myRating) || film.myRating < 0 || film.myRating > 5) {
      errors.push(`${tag}: myRating 必须是 0-5 的数字`)
    }
    if (!film.medium || !nonEmpty(film.medium.zh)) errors.push(`${tag}: medium.zh 缺失或为空`)
    if (!film.synopsis || !nonEmpty(film.synopsis.zh)) errors.push(`${tag}: synopsis.zh 缺失或为空`)
  })

  return { errors, warnings }
}
