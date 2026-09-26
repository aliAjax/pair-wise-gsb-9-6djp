import React, { useEffect, useState } from 'react';
import { loadShares, appendLog, statusOf, STATUS_TEXT, fmtFull, remainText, VISITOR_KEY } from './lib.js';

export default function PublicShare({ token, tick }) {
  const [pkg, setPkg] = useState(() => loadShares().find(p => p.token === token));
  const [name, setName] = useState(() => localStorage.getItem(VISITOR_KEY) || '');

  // 每次打开都按最新状态判定：生效则记一次"查看"，否则记一次"拦截"
  useEffect(() => {
    const fresh = loadShares().find(p => p.token === token);
    setPkg(fresh);
    if (!fresh) return;
    const st = statusOf(fresh);
    const who = (localStorage.getItem(VISITOR_KEY) || '').trim();
    if (st === 'active') {
      const next = appendLog(fresh.id, 'viewed', who ? `访客：${who}` : '外部合作者打开链接');
      setPkg(next.find(p => p.token === token));
    } else {
      const next = appendLog(fresh.id, 'blocked',
        st === 'revoked' ? '撤回后尝试访问，已拦截' : '失效后尝试访问，已拦截');
      setPkg(next.find(p => p.token === token));
    }
    // 只在 token 变化（重新打开）时留痕一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (!pkg) return <Shell>
    <div className="block-card">
      <span className="block-ico">🔒</span>
      <h1>链接不存在</h1>
      <p>找不到对应的分享包，可能链接已复制错误或包已被删除。</p>
      <small>本次访问未通过，无法看到任何文献内容。</small>
    </div>
  </Shell>;

  const st = statusOf(pkg, tick);

  if (st !== 'active') return <Shell>
    <div className="block-card">
      <span className="block-ico">{st === 'revoked' ? '⛔' : '⏳'}</span>
      <h1>{st === 'revoked' ? '该分享包已被撤回' : '该分享包已过失效时间'}</h1>
      <p>{st === 'revoked'
        ? '负责人已撤回此包，新的访问一律被拦截。'
        : `失效时间为 ${fmtFull(pkg.expiresAt)}，之后的新访问不再开放。`}</p>
      <small>你此前的查看与对方的发出记录仍由课题组保留；本次新访问已被拦截并留痕。</small>
    </div>
  </Shell>;

  const saveName = (v) => { setName(v); localStorage.setItem(VISITOR_KEY, v); };

  return <Shell>
    <div className="pub-head">
      <div>
        <span className="crumb">EXTERNAL ACCESS · 仅含被授权的字段</span>
        <h1>{pkg.name}</h1>
        <p className="pub-meta">负责人 {pkg.owner} · {pkg.entries.length} 篇 · {remainText(pkg.expiresAt, tick)}</p>
        <p className="pub-expire">失效时间：{pkg.expiresAt ? fmtFull(pkg.expiresAt) : '永久有效'}</p>
      </div>
      <label className="visitor-name">我是（可选，便于对方记录）
        <input value={name} onChange={e => saveName(e.target.value)} placeholder="合作者姓名 / 单位" />
      </label>
    </div>

    <div className="pub-list">
      {pkg.entries.map((e, i) => <article className="pub-entry" key={e.refId}>
        <span className="pub-no">{String(i + 1).padStart(2, '0')}</span>
        <div>
          <h2>{e.title}</h2>
          <p className="snap-authors">{e.authors} · {e.year} · {e.venue}</p>
          {e.abstract
            ? <div className="snap-field"><small>摘要 ABSTRACT</small><p>{e.abstract}</p></div>
            : <div className="snap-field off"><small>该篇摘要未授权外发</small></div>}
          {e.cite
            ? <div className="snap-field"><small>引用文本 CITE</small><p className="mono">{e.cite}</p></div>
            : <div className="snap-field off"><small>该篇引用文字未授权外发</small></div>}
        </div>
      </article>)}
    </div>
    <p className="pub-foot">本页内容为分享包生成时的快照，不包含课题组的个人笔记。</p>
  </Shell>;
}

function Shell({ children }) {
  return <div className="public-shell">
    <div className="public-bar"><span>∴</span> RESEARCH SHARE <small>只读 · 外部访问</small></div>
    <div className="public-body">{children}</div>
  </div>;
}
