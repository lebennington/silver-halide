// scripts/add.mjs
// 新增一部电影：可选 TMDb 抓取双语字段 + 追问个人字段 + 自动写入 films.json。
// 用法：npm run add（可设环境变量 TMDB_API_KEY）
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import readline from 'node:readline/promises'
import { validateFilms, filmSlug } from '../src/data/validate.js'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const jsonPath = resolve(root, 'src/data/films.json')

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const ask = (q) => rl.question(q + ' ').then((s) => s.trim())
const askNum = async (q) => {
  const s = await ask(q)
  if (s === '') return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}
const parsePairs = (s) =>
  s
    .split(';')
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const i = p.indexOf('/')
      return i === -1 ? { zh: p, en: '' } : { zh: p.slice(0, i).trim(), en: p.slice(i + 1).trim() }
    })

// 观看日期归一化：支持 今天/昨天/前天（可带备注）与 YYYYMMDD → YYYY-MM-DD
const formatWatchedDate = (input) => {
  const rel = input.match(/^(今天|昨天|前天)(.*)$/)
  if (rel) {
    const d = new Date()
    d.setDate(d.getDate() + { 今天: 0, 昨天: -1, 前天: -2 }[rel[1]])
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}${rel[2]}`
  }
  const dm = input.match(/^(\d{4})(\d{2})(\d{2})(\s.*)?$/)
  if (dm) return `${dm[1]}-${dm[2]}-${dm[3]}${dm[4] || ''}`
  return input
}

// —— TMDb 抓取（中英双语）——
async function fetchTmdb(id, key) {
  const base = 'https://api.themoviedb.org/3'
  const get = async (lang) => {
    const r = await fetch(
      `${base}/movie/${id}?api_key=${key}&language=${lang}&append_to_response=credits,external_ids`
    )
    if (!r.ok) throw new Error(`TMDb HTTP ${r.status} (${lang})`)
    return r.json()
  }
  const [zh, en] = await Promise.all([get('zh-CN'), get('en-US')])
  const mergePeople = (z, e) => {
    const m = new Map()
    for (const p of z) m.set(p.id, { zh: p.name, en: '' })
    for (const p of e) {
      const x = m.get(p.id)
      if (x) x.en = p.name
      else m.set(p.id, { zh: p.name, en: p.name })
    }
    return [...m.values()]
  }
  const crew = (d) => d.credits?.crew || []
  const byJob = (l, jobs) => l.filter((c) => jobs.includes(c.job))
  const enTitle = en.title || en.original_title
  const orig = en.original_title
  return {
    titleCn: zh.title || zh.original_title,
    titleOrig: orig && orig !== enTitle ? `${orig} / ${enTitle}` : enTitle,
    year: en.release_date ? +en.release_date.slice(0, 4) : null,
    countries: (zh.production_countries || []).map((c) => ({
      zh: c.name,
      en: (en.production_countries || []).find((x) => x.iso_3166_1 === c.iso_3166_1)?.name || c.name
    })),
    runtimeMin: en.runtime || null,
    genres: (zh.genres || []).map((g) => ({
      zh: g.name,
      en: (en.genres || []).find((x) => x.id === g.id)?.name || g.name
    })),
    credits: {
      director: mergePeople(byJob(crew(zh), ['Director']), byJob(crew(en), ['Director'])),
      writer: mergePeople(
        crew(zh)
          .filter((c) => c.department === 'Writing')
          .slice(0, 3),
        crew(en)
          .filter((c) => c.department === 'Writing')
          .slice(0, 3)
      ),
      cinematographer: mergePeople(
        byJob(crew(zh), ['Director of Photography']),
        byJob(crew(en), ['Director of Photography'])
      ),
      cast: mergePeople((zh.credits?.cast || []).slice(0, 3), (en.credits?.cast || []).slice(0, 3))
    },
    urls: {
      imdb: en.external_ids?.imdb_id
        ? `https://www.imdb.com/title/${en.external_ids.imdb_id}/`
        : '',
      letterboxd: '',
      douban: ''
    },
    synopsis: { zh: zh.overview || '', en: en.overview || '' },
    vote: en.vote_average
  }
}

// —— 主流程 ——
const films = JSON.parse(readFileSync(jsonPath, 'utf-8'))
const nextId = films.reduce((m, f) => Math.max(m, f.id), 0) + 1
console.log(`\n新增电影 #${nextId}\n`)

// 1) 尝试 TMDb
let f = null
const tmdbId = await ask('TMDb 电影 ID（回车跳过，纯手填）:')
if (tmdbId) {
  const key = process.env.TMDB_API_KEY || (await ask('TMDb API Key:'))
  if (key) {
    try {
      f = await fetchTmdb(tmdbId, key)
      console.log(
        `✅ TMDb 已抓取：《${f.titleCn}》(${f.year})，TMDb 评分 ${f.vote ? f.vote.toFixed(1) : '—'}\n`
      )
    } catch (e) {
      console.warn(`⚠️  抓取失败（${e.message}），改用纯手填。\n`)
    }
  }
}

// 2) 缺失字段追问（TMDb 已有的直接跳过）
const titleCn = f?.titleCn || (await ask('中文片名 titleCn:'))
const titleOrig = f?.titleOrig || (await ask('原文片名 titleOrig:'))
const year = f?.year ?? (await askNum('年份 year:'))
const runtimeMin = f?.runtimeMin ?? (await askNum('时长（分钟）runtimeMin:'))
const countries = f?.countries?.length
  ? f.countries
  : parsePairs(await ask('国家（格式 法国 / France; 波兰 / Poland）:'))
const genres = f?.genres?.length
  ? f.genres
  : parsePairs(await ask('类型（格式 剧情 / Drama; 爱情 / Romance）:'))
const director = f?.credits?.director?.length ? f.credits.director : parsePairs(await ask('导演:'))
const writer = f?.credits?.writer?.length ? f.credits.writer : parsePairs(await ask('编剧:'))
const cinematographer = f?.credits?.cinematographer?.length
  ? f.credits.cinematographer
  : parsePairs(await ask('摄影:'))
const cast = f?.credits?.cast?.length
  ? f.credits.cast
  : parsePairs(await ask('主演（多人用 ; 分隔）:'))
const synopsisZh = f?.synopsis?.zh || (await ask('中文简介 synopsis.zh:'))
const synopsisEn = f?.synopsis?.en || ''

// 3) 个人字段（TMDb 给不了，一律追问）
const watchedDate = formatWatchedDate(
  await ask('观看日期 watchedDate（今天 / 昨天 / 前天，或 YYYYMMDD，用空格分隔备注）:')
)
const myRating = await askNum('个人评分 myRating（0–5，可带 .5）:')
const imdb = await askNum('IMDb 评分（0–10）:')
const letterboxd = await askNum('Letterboxd 评分（0–5）:')
const douban = await askNum('豆瓣评分（0–10）:')
const mediumZh = await ask('观看介质 medium.zh:')

// 4) 可选字段（回车跳过）
const quote = await ask('台词 quote（回车跳过）:')
const cameraNote = await ask('摄影笔记 cameraNote（回车跳过）:')
const specs = await ask('格式备注 specs（回车跳过）:')
const reviewTitle = await ask('影评标题（回车跳过）:')

rl.close()

const entry = {
  id: nextId,
  titleCn,
  titleOrig,
  year,
  countries,
  runtimeMin,
  aspectRatio: '',
  genres,
  credits: { director, writer, cinematographer, cast },
  urls: f?.urls || { imdb: '', letterboxd: '', douban: '' },
  watchedDate,
  medium: { zh: mediumZh, en: '' },
  specs,
  myRating,
  ratings: { imdb, letterboxd, douban },
  quote,
  synopsis: { zh: synopsisZh, en: synopsisEn },
  review: { title: reviewTitle, paragraphs: [] },
  cameraNote
}

// 5) 校验 + 写入
const { errors, warnings } = validateFilms([entry])
for (const w of warnings) console.warn('⚠️  ' + w)
if (errors.length) {
  console.error('\n❌ 校验未通过，未写入：')
  for (const e of errors) console.error('  ' + e)
  process.exit(1)
}

films.push(entry)
writeFileSync(jsonPath, JSON.stringify(films, null, 2) + '\n', 'utf-8')

console.log(`\n✅ 已写入 #${nextId} 《${titleCn}》。`)
console.log(`🖼️  海报文件请命名: public/posters/${filmSlug(titleOrig)}-${year}.jpg`)
console.log('📝 若还需补 douban/letterboxd 链接或影评正文，进 films.json 编辑。')
