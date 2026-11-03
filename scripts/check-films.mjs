// scripts/check-films.mjs
// 构建前校验：读 films.json 做 schema 校验 + 检查海报文件是否存在。
import { readFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateFilms, filmPoster } from '../src/data/validate.js'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')

const films = JSON.parse(readFileSync(resolve(root, 'src/data/films.json'), 'utf-8'))

const { errors, warnings } = validateFilms(films)
let failed = false

for (const e of errors) {
  failed = true
  console.error('❌ ' + e)
}
for (const w of warnings) console.warn('⚠️  ' + w)

for (const film of films) {
  const poster = filmPoster(film)
  if (!existsSync(resolve(root, 'public', poster))) {
    failed = true
    console.error(`❌ 海报文件缺失: public/${poster}  (${film.titleCn})`)
  }
}

if (failed) {
  console.error('\n校验未通过，请修复后重试。')
  process.exit(1)
}
console.log(`✅ 校验通过：${films.length} 部电影，数据及海报齐全。`)
