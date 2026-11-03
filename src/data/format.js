// 把结构化数据渲染成展示字符串。原则：数据里不存拼接结果，拼接只在这里出现。

// 数组 → 中文名（仅取中文，缺中文的项跳过，避免与英文行重复）
export function namesZh(list) {
  return (list || [])
    .map((p) => (p && p.zh) || '')
    .filter(Boolean)
    .join(' / ')
}

// 数组 → 英文名（仅取英文，缺英文的项跳过）
export function namesEn(list) {
  return (list || [])
    .map((p) => (p && p.en) || '')
    .filter(Boolean)
    .join(' / ')
}

// 数组 → "中文 / English"；某一侧为空时只显示另一侧
export function namesBilingual(list) {
  const zh = namesZh(list)
  const en = namesEn(list)
  if (!zh) return en
  if (!en) return zh
  return `${zh} / ${en}`
}

// {zh, en} 对象 → "中文 / English"（如果中英文相同或缺其一，只显示一个）
export function bi(obj, sep = ' / ') {
  if (!obj) return ''
  if (!obj.en || obj.zh === obj.en) return obj.zh || ''
  if (!obj.zh) return obj.en
  return `${obj.zh}${sep}${obj.en}`
}

// 分钟数 → "98 分钟 / 98 MIN"
export function runtimeText(min) {
  return `${min} 分钟 / ${min} MIN`
}

// 数字 5 → "★★★★★"，4.5 → "★★★★☆"
export function stars(n) {
  const full = Math.floor(n)
  const half = n - full >= 0.5
  return '★'.repeat(full) + (half ? '☆' : '')
}
