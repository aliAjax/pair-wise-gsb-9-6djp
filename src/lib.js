// 本地存储与分享包领域逻辑
export const LIB_KEY = 'research-library';
export const SHARE_KEY = 'research-shares';
export const OWNER_KEY = 'research-share-owner';
export const VISITOR_KEY = 'research-share-visitor';

export const seed = [
  { id: 1, title: 'The Extended Mind', authors: 'Clark, A. & Chalmers, D.', year: 1998, venue: 'Analysis', tags: ['具身认知', '经典'], abstract: '本文提出心智延展论：当外部环境稳定地承担认知功能时，心智边界可以超越头脑与身体。', status: '阅读中', cite: 'Clark, A. & Chalmers, D. (1998). The Extended Mind. Analysis.' },
  { id: 2, title: 'Situated Learning', authors: 'Lave, J. & Wenger, E.', year: 1991, venue: 'Cambridge University Press', tags: ['学习科学', '社会'], abstract: '学习发生在真实情境的参与过程中，知识与共同体实践不可分割。', status: '待读', cite: 'Lave, J. & Wenger, E. (1991). Situated Learning.' },
  { id: 3, title: 'Designing with Data', authors: 'Miller, S.', year: 2022, venue: 'MIT Press', tags: ['设计研究', '方法'], abstract: '一套面向设计师的数据研究方法，讨论如何把定性洞察转化为可行动的设计决策。', status: '已读', cite: 'Miller, S. (2022). Designing with Data.' }
];

export function loadItems() {
  try {
    const raw = localStorage.getItem(LIB_KEY);
    return raw ? JSON.parse(raw) : seed;
  } catch { return seed; }
}
export function saveItems(v) {
  localStorage.setItem(LIB_KEY, JSON.stringify(v));
}
export function loadShares() {
  try { return JSON.parse(localStorage.getItem(SHARE_KEY)) || []; }
  catch { return []; }
}
export function saveShares(v) {
  localStorage.setItem(SHARE_KEY, JSON.stringify(v));
}

export const rid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
export const newToken = () => Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);

// 生效状态：撤回为永久性的显式状态；过期按失效时间即时计算
export function statusOf(p, now = Date.now()) {
  if (p.revokedAt) return 'revoked';
  if (p.expiresAt && p.expiresAt <= now) return 'expired';
  return 'active';
}
export const STATUS_TEXT = { active: '生效中', expired: '已失效', revoked: '已撤回' };

export const LOG_TEXT = {
  created: '分享包已生成',
  sent: '外发链接被复制',
  viewed: '合作者打开查看',
  blocked: '新访问被拦截',
  revoked: '负责人撤回分享包'
};

// 追加一条留痕（基于最新存储写入，避免覆盖并发记录）
export function appendLog(pkgId, action, detail = '') {
  const all = loadShares();
  const next = all.map(p => p.id === pkgId
    ? { ...p, log: [...(p.log || []), { id: rid(), ts: Date.now(), action, detail }] }
    : p);
  saveShares(next);
  return next;
}

export function fmtTime(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}
export function fmtFull(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}
export function remainText(expiresAt, now = Date.now()) {
  if (!expiresAt) return '永久有效';
  const ms = expiresAt - now;
  if (ms <= 0) return '已过期';
  const d = Math.floor(ms / 864e5);
  if (d >= 1) return `剩余 ${d} 天`;
  const h = Math.floor(ms / 36e5);
  return `剩余 ${Math.max(1, h)} 小时`;
}
