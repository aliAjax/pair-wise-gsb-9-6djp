import React, { useEffect, useMemo, useState } from 'react';
import { loadShares, saveShares, appendLog, statusOf, STATUS_TEXT, LOG_TEXT, fmtTime, fmtFull, remainText } from './lib.js';

export function ShareManage({ goto, tick }) {
  const [shares, setShares] = useState(loadShares);
  const [openId, setOpenId] = useState(0);
  const [ownerQ, setOwnerQ] = useState('全部');
  const [statusQ, setStatusQ] = useState('all');
  const [q, setQ] = useState('');
  const [notice, setNotice] = useState('');

  const owners = ['全部', ...new Set(shares.map(p => p.owner))];
  const list = useMemo(() => shares
    .filter(p => (ownerQ === '全部' || p.owner === ownerQ))
    .filter(p => statusQ === 'all' || statusOf(p, tick) === statusQ)
    .filter(p => `${p.name}${p.owner}${p.entries.map(e => e.title).join('')}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.createdAt - a.createdAt),
    [shares, ownerQ, statusQ, q, tick]);

  const open = shares.find(p => p.id === openId);

  const refresh = () => setShares(loadShares());
  const copyLink = (p) => {
    const url = `${location.origin}${location.pathname}#/s/${p.token}`;
    navigator.clipboard?.writeText(url).catch(() => {});
    setShares(appendLog(p.id, 'sent', '复制外发链接'));
    setNotice('外发链接已复制');
  };
  const revoke = (p) => {
    if (!window.confirm('撤回后该链接的新访问将立即被拦截；已发生的发出与查看记录会保留。确定撤回？')) return;
    const next = loadShares().map(x => x.id === p.id
      ? { ...x, revokedAt: Date.now(), log: [...x.log, { id: Date.now().toString(36), ts: Date.now(), action: 'revoked', detail: '负责人执行撤回' }] }
      : x);
    saveShares(next);
    setShares(next);
    setNotice('分享包已撤回');
  };

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(''), 2200);
    return () => clearTimeout(t);
  }, [notice]);

  if (open) return <ShareDetail pkg={open} tick={tick}
    back={() => { setOpenId(0); refresh(); }} copyLink={copyLink} revoke={revoke} />;

  return <div className="share-page">
    <header>
      <div><span className="crumb">RESEARCH / SHARE PACKAGES</span><h1>外发分享包</h1></div>
      <div className="actions">
        <button className="outline" onClick={() => goto('/library')}>← 返回文献库</button>
        <button className="primary" onClick={() => goto('/share/new')}>＋ 生成分享包</button>
      </div>
    </header>
    <div className="toolbar share-toolbar">
      <div className="search">⌕<input placeholder="搜索包名、负责人或文献标题…" value={q} onChange={e => setQ(e.target.value)} /></div>
      <select value={ownerQ} onChange={e => setOwnerQ(e.target.value)} title="按负责人筛选">
        {owners.map(o => <option key={o}>{o}</option>)}
      </select>
      <div className="status-filters">
        {[['all', `全部 ${shares.length}`], ['active', '生效中'], ['expired', '已失效'], ['revoked', '已撤回']]
          .map(([k, t]) => <button key={k} className={statusQ === k ? 'on' : ''} onClick={() => setStatusQ(k)}>{t}</button>)}
      </div>
    </div>
    <div className="share-list">
      {list.map(p => {
        const st = statusOf(p, tick);
        const views = p.log.filter(l => l.action === 'viewed').length;
        return <button className="share-card" key={p.id} onClick={() => setOpenId(p.id)}>
          <div className="share-card-top">
            <span className={'badge ' + st}>{STATUS_TEXT[st]}</span>
            <small>{remainText(p.expiresAt, tick)}</small>
          </div>
          <h3>{p.name}</h3>
          <p>{p.entries.length} 篇 · 负责人 {p.owner}</p>
          <div className="share-card-meta">
            <span>生成于 {fmtTime(p.createdAt)}</span>
            <span>{views} 次查看</span>
          </div>
        </button>;
      })}
      {!list.length && <div className="no-result">没有匹配的分享包，换个负责人或状态试试</div>}
    </div>
    {notice && <div className="toast">{notice}</div>}
  </div>;
}

function ShareDetail({ pkg, tick, back, copyLink, revoke }) {
  const st = statusOf(pkg, tick);
  const blocked = st !== 'active';
  const log = [...pkg.log].sort((a, b) => b.ts - a.ts);

  return <div className="share-page">
    <header>
      <div><span className="crumb" onClick={back} style={{ cursor: 'pointer' }}>SHARE PACKAGES /</span><h1>{pkg.name}</h1></div>
      <div className="actions">
        <button className="outline" onClick={back}>← 返回列表</button>
        {!blocked && <button className="danger" onClick={() => revoke(pkg)}>撤回分享包</button>}
        {!blocked && <button className="primary" onClick={() => copyLink(pkg)}>⧉ 复制外发链接</button>}
      </div>
    </header>

    <div className="detail-grid">
      <section className="snapshot-panel">
        <div className="panel-head">
          <span className={'badge ' + st}>{STATUS_TEXT[st]}</span>
          {blocked
            ? <small>新访问已被拦截；下方历史记录保留可查</small>
            : <small>{remainText(pkg.expiresAt, tick)} · 到期后自动拦截</small>}
        </div>
        <div className="meta-grid">
          <div><small>负责人</small><strong>{pkg.owner}</strong></div>
          <div><small>生成时间</small><strong>{fmtFull(pkg.createdAt)}</strong></div>
          <div><small>失效时间</small><strong>{pkg.expiresAt ? fmtFull(pkg.expiresAt) : '永久有效'}</strong></div>
          {pkg.revokedAt && <div><small>撤回时间</small><strong>{fmtFull(pkg.revokedAt)}</strong></div>}
        </div>

        <h4 className="panel-title">快照内容（{pkg.entries.length} 篇，与文献库已脱钩）</h4>
        <p className="snapshot-note">库里的原条目可以继续修改，已发出的这一包保持生成时的内容，不会跟着变。</p>
        {pkg.entries.map(e => <div className="snap-entry" key={e.refId}>
          <h5>{e.title}</h5>
          <p className="snap-authors">{e.authors} · {e.year} · {e.venue}</p>
          {e.abstract
            ? <div className="snap-field"><small>摘要 ABSTRACT</small><p>{e.abstract}</p></div>
            : <div className="snap-field off"><small>摘要 — 未外发</small></div>}
          {e.cite
            ? <div className="snap-field"><small>引用文本 CITE</small><p className="mono">{e.cite}</p></div>
            : <div className="snap-field off"><small>引用文本 — 未外发</small></div>}
          <div className="snap-field off"><small>个人笔记 — 始终留在库里，未进入本包</small></div>
        </div>)}
      </section>

      <aside className="log-panel">
        <h4 className="panel-title">发出与查看记录</h4>
        <p className="snapshot-note">撤回或失效只拦截新访问，不改写历史。</p>
        <ul className="log-list">
          {log.map(l => <li key={l.id}>
            <span className={'log-dot ' + l.action} />
            <div><strong>{LOG_TEXT[l.action] || l.action}</strong>
              {l.detail && <p>{l.detail}</p>}
              <small>{fmtFull(l.ts)}</small>
            </div>
          </li>)}
        </ul>
      </aside>
    </div>
  </div>;
}
