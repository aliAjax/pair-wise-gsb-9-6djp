import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { loadItems, saveItems } from './lib.js';
import ShareWizard from './ShareWizard.jsx';
import { ShareManage } from './ShareManage.jsx';
import PublicShare from './PublicShare.jsx';

function App() {
  const [route, setRoute] = useState(() => location.hash || '#/library');
  const [tick, setTick] = useState(Date.now());

  useEffect(() => {
    const onHash = () => setRoute(location.hash || '#/library');
    window.addEventListener('hashchange', onHash);
    const t = setInterval(() => setTick(Date.now()), 30000);
    return () => { window.removeEventListener('hashchange', onHash); clearInterval(t); };
  }, []);

  const goto = (r) => { location.hash = r; };
  const path = route.replace(/^#/, '') || '/library';

  // 外部合作者访问页：独立外壳，不带课题组侧边栏与文献库
  if (path.startsWith('/s/')) return <PublicShare token={path.slice(3)} tick={tick} />;

  return <>
    <LibraryView route={path} goto={goto} tick={tick} />
    {path === '/share/new' && <ShareWizard
      items={loadItems()}
      onClose={() => goto('/shares')}
      afterCreate={(pkg) => goto('/shares')} />}
  </>;
}

function LibraryView({ route, goto, tick }) {
  const page = route === '/shares' ? 'shares' : 'library';
  const [items, setItems] = useState(loadItems);
  const [selected, setSelected] = useState(1);
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState('全部');
  const [show, setShow] = useState(false);
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState({ title: '', authors: '', year: '2024', venue: '', abstract: '', tags: '' });

  useEffect(() => saveItems(items), [items]);

  const tags = ['全部', ...new Set(items.flatMap(x => x.tags))];
  const filtered = useMemo(() => items.filter(x =>
    (tag === '全部' || x.tags.includes(tag)) &&
    (`${x.title}${x.authors}${x.abstract}`.toLowerCase().includes(query.toLowerCase()))),
    [items, tag, query]);
  const cur = items.find(x => x.id === selected) || items[0];
  const update = (k, v) => setItems(items.map(x => x.id === cur.id ? { ...x, [k]: v } : x));

  const add = () => {
    if (!form.title) return;
    const p = { ...form, id: Date.now(), year: +form.year, tags: form.tags.split(',').map(x => x.trim()).filter(Boolean), status: '待读', cite: `${form.authors} (${form.year}). ${form.title}. ${form.venue}.` };
    setItems([...items, p]); setSelected(p.id);
    setForm({ title: '', authors: '', year: '2024', venue: '', abstract: '', tags: '' });
    setShow(false); setNotice('文献已加入研究库');
  };
  const bib = () => { navigator.clipboard?.writeText(cur.cite); setNotice('引用文本已复制'); };
  const download = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([items.map(x => x.cite).join('\n')], { type: 'text/plain' }));
    a.download = 'references.txt'; a.click();
    setNotice('引用列表已导出');
  };

  return <div className="app">
    <aside>
      <div className="logo"><span>∴</span> LITERATURE</div>
      <div className="library-head"><span>我的研究库</span><strong>{items.length}<small> 篇文献</small></strong></div>
      <nav>
        <button className={page === 'library' ? 'active' : ''} onClick={() => goto('/library')}>▤ <span>所有文献</span><b>{items.length}</b></button>
        <button>▥ <span>待读</span><b>{items.filter(x => x.status === '待读').length}</b></button>
        <button>✓ <span>已读</span></button>
        <button>☆ <span>收藏</span></button>
      </nav>
      <div className="side-tags">
        <small>对外协作</small>
        <button className={page === 'shares' ? 'active' : ''} onClick={() => goto('/shares')}>⇪ <span style={{ marginLeft: 6 }}>外发分享包</span></button>
        {page === 'library' && tags.slice(1, 5).map(t => <button key={t} onClick={() => setTag(t)}># {t}</button>)}
      </div>
      <div className="side-foot">
        <button>⚙ 偏好设置</button>
        <small>本地数据库 · 已同步</small>
      </div>
    </aside>

    {page === 'shares'
      ? <ShareManage goto={goto} tick={tick} />
      : <main>
        <header>
          <div><span className="crumb">RESEARCH / LIBRARY</span><h1>所有文献</h1></div>
          <div className="actions">
            <button className="outline" onClick={download}>↓ 导出引用</button>
            <button className="outline" onClick={() => goto('/share/new')}>⇪ 生成分享包</button>
            <button className="primary" onClick={() => setShow(true)}>＋ 添加文献</button>
          </div>
        </header>
        <div className="toolbar">
          <div className="search">⌕<input placeholder="搜索标题、作者或摘要…" value={query} onChange={e => setQuery(e.target.value)} />{query && <button onClick={() => setQuery('')}>×</button>}</div>
          <div className="tag-filter">{tags.map(t => <button className={tag === t ? 'on' : ''} onClick={() => setTag(t)} key={t}>{t}</button>)}</div>
        </div>
        <div className="body">
          <section className="paper-list">
            {filtered.map(p => <button className={'paper ' + (selected === p.id ? 'selected' : '')} onClick={() => setSelected(p.id)} key={p.id}>
              <div className="paper-year">{p.year}</div>
              <div className="paper-copy">
                <h3>{p.title}</h3>
                <p>{p.authors}</p>
                <div>{p.tags.map(t => <span key={t}>#{t}</span>)}</div>
              </div>
              <small className={'status ' + p.status}>{p.status}</small>
            </button>)}
            {!filtered.length && <div className="no-result">没有找到匹配的文献</div>}
          </section>
          <section className="detail">
            {cur && <>
              <div className="detail-top">
                <span className="status reading">{cur.status}</span>
                <button onClick={() => setNotice('已加入收藏')}>☆ 收藏</button>
              </div>
              <h2>{cur.title}</h2>
              <p className="authors">{cur.authors}</p>
              <div className="cite-actions">
                <button onClick={bib}>▣ 复制引用</button>
                <button onClick={() => update('status', cur.status === '已读' ? '待读' : '已读')}>{cur.status === '已读' ? '标记为待读' : '标记为已读'}</button>
              </div>
              <div className="detail-section"><h4>摘要 <span>ABSTRACT</span></h4><p>{cur.abstract}</p></div>
              <div className="detail-section"><h4>出版信息 <span>PUBLICATION</span></h4>
                <div className="pub-grid">
                  <div><small>出版物</small><strong>{cur.venue}</strong></div>
                  <div><small>年份</small><strong>{cur.year}</strong></div>
                </div>
              </div>
              <div className="detail-section"><h4>引用文本 <span>BIBTEX / TEXT</span></h4>
                <div className="cite-box">{cur.cite}<button onClick={bib}>复制</button></div>
              </div>
              <div className="detail-section">
                <h4>我的笔记 <span>PRIVATE · 永不外发</span></h4>
                <textarea className="notes" placeholder="记录你的阅读想法…个人笔记不会进入任何分享包" value={cur.notes || ''} onChange={e => update('notes', e.target.value)} />
              </div>
            </>}
          </section>
        </div>
      </main>}

    {show && <div className="modal-bg" onMouseDown={e => e.target === e.currentTarget && setShow(false)}>
      <div className="modal">
        <button className="close" onClick={() => setShow(false)}>×</button>
        <span className="crumb">NEW REFERENCE</span>
        <h2>添加一篇文献</h2>
        <label>标题<input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="论文或书籍标题" /></label>
        <label>作者<input value={form.authors} onChange={e => setForm({ ...form, authors: e.target.value })} /></label>
        <div className="two">
          <label>年份<input type="number" value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} /></label>
          <label>出版物<input value={form.venue} onChange={e => setForm({ ...form, venue: e.target.value })} /></label>
        </div>
        <label>关键词<input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="用逗号分隔" /></label>
        <label>摘要<textarea rows="3" value={form.abstract} onChange={e => setForm({ ...form, abstract: e.target.value })} /></label>
        <button className="primary full" onClick={add}>保存文献</button>
      </div>
    </div>}

    {notice && <div className="toast">{notice}</div>}
  </div>;
}

createRoot(document.getElementById('root')).render(<App />);
