import React, { useMemo, useState } from 'react';
import { loadShares, saveShares, rid, newToken, OWNER_KEY } from './lib.js';

const PRESETS = [
  { label: '7 天', days: 7 },
  { label: '30 天', days: 30 },
  { label: '90 天', days: 90 },
  { label: '永久', days: 0 }
];

export default function ShareWizard({ items, onClose, afterCreate }) {
  const [step, setStep] = useState(1);
  const [query, setQuery] = useState('');
  const [chosen, setChosen] = useState({}); // id -> { abstract, cite }
  const [owner, setOwner] = useState(() => localStorage.getItem(OWNER_KEY) || '');
  const [days, setDays] = useState(30);
  const [custom, setCustom] = useState('');
  const [err, setErr] = useState('');

  const filtered = useMemo(() =>
    items.filter(x => `${x.title}${x.authors}`.toLowerCase().includes(query.toLowerCase())),
    [items, query]);
  const picked = items.filter(x => chosen[x.id]);
  const nAbs = picked.filter(x => chosen[x.id].abstract).length;
  const nCite = picked.filter(x => chosen[x.id].cite).length;

  const togglePaper = (id) => setChosen(c => c[id]
    ? Object.fromEntries(Object.entries(c).filter(([k]) => +k !== id))
    : { ...c, [id]: { abstract: false, cite: false } });
  const toggleField = (id, f) => setChosen(c => ({ ...c, [id]: { ...c[id], [f]: !c[id][f] } }));
  const allField = (f, val) => setChosen(c => {
    const next = { ...c };
    Object.keys(next).forEach(k => { next[k] = { ...next[k], [f]: val }; });
    return next;
  });

  const create = () => {
    if (!owner.trim()) { setErr('请填写负责人，方便日后按人追溯'); return; }
    let expiresAt = 0;
    if (days === -1) {
      const t = new Date(custom).getTime();
      if (!custom || isNaN(t) || t <= Date.now()) { setErr('请选择一个未来的失效时间'); return; }
      expiresAt = t;
    } else if (days > 0) {
      expiresAt = Date.now() + days * 864e5;
    }
    // 快照：只固化勾选过的外发字段，个人笔记（notes）有意排除
    const entries = picked.map(x => ({
      refId: x.id,
      title: x.title,
      authors: x.authors,
      year: x.year,
      venue: x.venue,
      abstract: chosen[x.id].abstract ? x.abstract : '',
      cite: chosen[x.id].cite ? x.cite : ''
    }));
    const now = Date.now();
    const pkg = {
      id: rid(),
      token: newToken(),
      name: `${owner.trim()} 的分享包 · ${new Date(now).toLocaleDateString('zh-CN')}`,
      owner: owner.trim(),
      createdAt: now,
      expiresAt,
      revokedAt: 0,
      entries,
      log: [{ id: rid(), ts: now, action: 'created', detail: `共 ${entries.length} 篇；摘要 ${entries.filter(e => e.abstract).length} 段；引用 ${entries.filter(e => e.cite).length} 条` }]
    };
    saveShares([...loadShares(), pkg]);
    localStorage.setItem(OWNER_KEY, owner.trim());
    afterCreate(pkg);
  };

  return <div className="modal-bg" onMouseDown={e => e.target === e.currentTarget && onClose()}>
    <div className="modal wide">
      <button className="close" onClick={onClose}>×</button>
      <span className="crumb">SHARE PACKAGE / STEP {step} OF 3</span>
      <h2>{['挑选要外发的文献', '勾选愿意外发的字段', '确认外发内容并生成'][step - 1]}</h2>
      <div className="steps"><i className={step >= 1 ? 'on' : ''}/><i className={step >= 2 ? 'on' : ''}/><i className={step >= 3 ? 'on' : ''}/></div>

      {step === 1 && <>
        <div className="search" style={{ width: '100%' }}>⌕<input placeholder="搜索标题或作者…" value={query} onChange={e => setQuery(e.target.value)} /></div>
        <div className="pick-list">
          {filtered.map(p => <label className={'pick-row' + (chosen[p.id] ? ' on' : '')} key={p.id}>
            <input type="checkbox" checked={!!chosen[p.id]} onChange={() => togglePaper(p.id)} />
            <div><h4>{p.title}</h4><p>{p.authors} · {p.year}</p></div>
            {p.notes && <span className="priv-hint" title="个人笔记不会进入分享包">含私人笔记 · 留库</span>}
          </label>)}
          {!filtered.length && <div className="no-result">没有匹配的文献</div>}
        </div>
        <div className="wizard-foot">
          <small>已选 <b>{picked.length}</b> 篇</small>
          <div><button className="outline" onClick={onClose}>取消</button>
            <button className="primary" disabled={!picked.length} onClick={() => setStep(2)}>下一步</button></div>
        </div>
      </>}

      {step === 2 && <>
        <p className="hint-line">基础书目信息（标题、作者、年份、出版物）默认随包发送；摘要与引用文字需逐篇确认。</p>
        <div className="field-batch">
          <span>批量：</span>
          <button className="mini" onClick={() => allField('abstract', true)}>全选摘要</button>
          <button className="mini" onClick={() => allField('abstract', false)}>清空摘要</button>
          <button className="mini" onClick={() => allField('cite', true)}>全选引用</button>
          <button className="mini" onClick={() => allField('cite', false)}>清空引用</button>
        </div>
        <div className="pick-list">
          {picked.map(p => <div className="field-row" key={p.id}>
            <div className="field-row-head"><h4>{p.title}</h4><p>{p.authors}</p></div>
            <label className={chosen[p.id].abstract ? 'chk on' : 'chk'}>
              <input type="checkbox" checked={chosen[p.id].abstract} onChange={() => toggleField(p.id, 'abstract')} />
              摘要
            </label>
            <label className={chosen[p.id].cite ? 'chk on' : 'chk'}>
              <input type="checkbox" checked={chosen[p.id].cite} onChange={() => toggleField(p.id, 'cite')} />
              引用文字
            </label>
            <span className="priv-hint static">笔记 ✕ 不外发</span>
          </div>)}
        </div>
        <div className="wizard-foot">
          <small>摘要 <b>{nAbs}</b> 段 · 引用 <b>{nCite}</b> 条 · 笔记 <b>0</b></small>
          <div><button className="outline" onClick={() => setStep(1)}>上一步</button>
            <button className="primary" onClick={() => setStep(3)}>下一步</button></div>
        </div>
      </>}

      {step === 3 && <>
        <div className="confirm-grid">
          <label>负责人<input value={owner} onChange={e => { setOwner(e.target.value); setErr(''); }} placeholder="例如：王老师 / 课题组成员姓名" /></label>
          <label>失效时间
            <div className="presets">
              {PRESETS.map(p => <button type="button" key={p.label}
                className={'mini' + (days === p.days ? ' on' : '')}
                onClick={() => { setDays(p.days); setCustom(''); setErr(''); }}>{p.label}</button>)}
              <button type="button" className={'mini' + (days === -1 ? ' on' : '')}
                onClick={() => setDays(-1)}>自定义</button>
            </div>
            {days === -1 && <input type="datetime-local" value={custom}
              onChange={e => { setCustom(e.target.value); setErr(''); }} style={{ marginTop: 8 }} />}
          </label>
        </div>
        <div className="confirm-box">
          <div className="confirm-box-head"><h4>外发内容清单（快照，{picked.length} 篇）</h4>
            <span>生成后与原条目脱钩，库里再改不影响这一包</span></div>
          {picked.map(p => <div className="confirm-item" key={p.id}>
            <strong>{p.title}</strong>
            <div className="chips">
              <span className="chip always">书目信息</span>
              <span className={chosen[p.id].abstract ? 'chip yes' : 'chip no'}>摘要 {chosen[p.id].abstract ? '✓' : '✕'}</span>
              <span className={chosen[p.id].cite ? 'chip yes' : 'chip no'}>引用 {chosen[p.id].cite ? '✓' : '✕'}</span>
              <span className="chip lock">个人笔记 ✕ 留库</span>
            </div>
          </div>)}
        </div>
        {err && <p className="form-err">{err}</p>}
        <div className="wizard-foot">
          <small>请确认上面的字段与实际外发内容一致</small>
          <div><button className="outline" onClick={() => setStep(2)}>上一步</button>
            <button className="primary" onClick={create}>确认外发字段并生成</button></div>
        </div>
      </>}
    </div>
  </div>;
}
