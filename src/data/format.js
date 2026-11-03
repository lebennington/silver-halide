// 把结构化数据渲染成展示字符串。原则：数据里不存拼接结果，拼接只在这里出现。

// 数组 → 中文名（如 "杜可风 / 李屏宾"）
export function namesZh(list) {
  return (list || []).map((p) => p.zh || p.en || '').join(' / ');
}

// 数组 → 英文名
export function namesEn(list) {
  return (list || []).map((p) => p.en || p.zh || '').join(' / ');
}

// 数组 → "中文 / English"
export function namesBilingual(list) {
  return `${namesZh(list)} / ${namesEn(list)}`;
}

// {zh, en} 对象 → "中文 / English"（如果中英文相同或缺其一，只显示一个）
export function bi(obj, sep = ' / ') {
  if (!obj) return '';
  if (!obj.en || obj.zh === obj.en) return obj.zh || '';
  if (!obj.zh) return obj.en;
  return `${obj.zh}${sep}${obj.en}`;
}

// 分钟数 → "98 分钟 / 98 MIN"
export function runtimeText(min) {
  return `${min} 分钟 / ${min} MIN`;
}

// 数字 5 → "★★★★★"，4.5 → "★★★★☆"
export function stars(n) {
  const full = Math.floor(n);
  const half = n - full >= 0.5;
  return '★'.repeat(full) + (half ? '☆' : '');
}

export function dateOnly(watchedDate) {
  return (watchedDate || '').slice(0, 10);
}