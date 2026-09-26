import React,{useEffect,useMemo,useState} from 'react';
import{createRoot}from'react-dom/client';
import'./styles.css';

const seed=[{id:1,title:'The Extended Mind',authors:'Clark, A. & Chalmers, D.',year:1998,venue:'Analysis',tags:['具身认知','经典'],abstract:'本文提出心智延展论：当外部环境稳定地承担认知功能时，心智边界可以超越头脑与身体。',status:'阅读中',cite:'Clark, A. & Chalmers, D. (1998). The Extended Mind. Analysis.'},{id:2,title:'Situated Learning',authors:'Lave, J. & Wenger, E.',year:1991,venue:'Cambridge University Press',tags:['学习科学','社会'],abstract:'学习发生在真实情境的参与过程中，知识与共同体实践不可分割。',status:'待读',cite:'Lave, J. & Wenger, E. (1991). Situated Learning.'},{id:3,title:'Designing with Data',authors:'Miller, S.',year:2022,venue:'MIT Press',tags:['设计研究','方法'],abstract:'一套面向设计师的数据研究方法，讨论如何把定性洞察转化为可行动的设计决策。',status:'已读',cite:'Miller, S. (2022). Designing with Data.'}];

const read=()=>{try{return JSON.parse(localStorage.getItem('research-library'))||seed}catch{return seed}};
const readPacks=()=>{try{return JSON.parse(localStorage.getItem('research-library-shares'))||[]}catch{return[]}};

const EXPIRES=[['永不失效',0],['24 小时后',1],['7 天后',7],['30 天后',30]];
const LOG_TEXT={created:'创建分享包',viewed:'接收方打开查看',blocked:'拦截一次新访问',revoked:'负责人撤回'};
const packStatus=p=>p.revokedAt?'已撤回':p.expiresAt&&Date.now()>p.expiresAt?'已过期':'有效';
const fmt=t=>new Date(t).toLocaleString('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});
const linkOf=p=>`${location.origin}${location.pathname}#share/${p.token}`;

/* 新建分享包：第一步挑文献、逐条勾外发字段；第二步确认外发内容后生成快照 */
function ShareModal({items,onClose,onCreate}){
  const[sel,setSel]=useState({});
  const[owner,setOwner]=useState(localStorage.getItem('research-library-owner')||'');
  const[expire,setExpire]=useState(2);
  const[step,setStep]=useState(1);
  const chosen=items.filter(x=>sel[x.id]);
  const toggle=id=>setSel(s=>{const n={...s};if(n[id])delete n[id];else n[id]={abs:true,cite:true};return n});
  const field=(id,k)=>setSel(s=>({...s,[id]:{...s[id],[k]:!s[id][k]}}));
  const create=()=>{
    const days=EXPIRES[expire][1];
    const pack={id:Date.now(),token:Math.random().toString(36).slice(2,8)+Date.now().toString(36).slice(-3),
      owner:owner.trim()||'未署名',createdAt:Date.now(),expiresAt:days?Date.now()+days*864e5:null,revokedAt:null,
      items:chosen.map(x=>({id:x.id,title:x.title,authors:x.authors,year:x.year,venue:x.venue,
        ...(sel[x.id].abs&&{abstract:x.abstract}),...(sel[x.id].cite&&{cite:x.cite})})),
      log:[{at:Date.now(),type:'created'}]};
    localStorage.setItem('research-library-owner',pack.owner);
    onCreate(pack);
  };
  return <div className="modal-bg"><div className="modal wide">
    <button className="close" onClick={onClose}>×</button>
    <span className="crumb">SHARE PACKAGE · {step===1?'STEP 1/2 选择':'STEP 2/2 确认'}</span>
    <h2>{step===1?'挑选文献与外发字段':'确认外发内容'}</h2>
    {step===1&&<>
      <p className="hint">勾选要分享的文献，逐条决定摘要、引用文字是否外发；标签与个人笔记始终留在库中。</p>
      <div className="pick-list">
        {items.map(x=>{const on=!!sel[x.id];return <div className={'pick '+(on?'on':'')} key={x.id}>
          <label className="pick-main"><input type="checkbox" checked={on} onChange={()=>toggle(x.id)}/>
            <span><strong>{x.title}</strong><small>{x.authors} · {x.year} · {x.venue}</small></span></label>
          {on&&<span className="chips">
            <button className={'chip '+(sel[x.id].abs?'on':'')} onClick={()=>field(x.id,'abs')}>摘要</button>
            <button className={'chip '+(sel[x.id].cite?'on':'')} onClick={()=>field(x.id,'cite')}>引用文字</button>
            <em>🔒 笔记不外发</em>
          </span>}
        </div>})}
      </div>
      <div className="two">
        <label>负责人<input value={owner} onChange={e=>setOwner(e.target.value)} placeholder="对外联系人姓名"/></label>
        <label>失效时间<select value={expire} onChange={e=>setExpire(+e.target.value)}>{EXPIRES.map((o,i)=><option value={i} key={o[0]}>{o[0]}</option>)}</select></label>
      </div>
      <button className="primary full" disabled={!chosen.length} onClick={()=>setStep(2)}>下一步：预览外发字段（{chosen.length} 篇）</button>
    </>}
    {step===2&&<>
      <p className="hint">请确认以下字段将发给外部合作者。生成后为快照：原条目可继续修改，本包不跟着变。</p>
      <div className="pv-meta"><span>负责人 <strong>{owner.trim()||'未署名'}</strong></span><span>失效时间 <strong>{EXPIRES[expire][0]}</strong></span><span>文献 <strong>{chosen.length} 篇</strong></span></div>
      <div className="pick-list">
        {chosen.map(x=><div className="pv-item" key={x.id}>
          <strong>{x.title}</strong>
          <div className="flds">
            <span className="fld">标题</span><span className="fld">作者</span><span className="fld">年份</span><span className="fld">出版物</span>
            <span className={sel[x.id].abs?'fld':'fld off'}>摘要{sel[x.id].abs?'':' · 不外发'}</span>
            <span className={sel[x.id].cite?'fld':'fld off'}>引用文字{sel[x.id].cite?'':' · 不外发'}</span>
            <span className="fld never">标签、个人笔记 · 留在库中</span>
          </div>
        </div>)}
      </div>
      <div className="row"><button className="outline" onClick={()=>setStep(1)}>← 返回修改</button><button className="primary grow" onClick={create}>确认生成分享包</button></div>
    </>}
  </div></div>;
}

/* 分享包管理：按负责人、状态筛选；可复制链接、撤回、查看访问记录 */
function Shares({packs,setPacks,setNotice,onNew}){
  const[owner,setOwner]=useState('全部');
  const[status,setStatus]=useState('全部');
  const[logOpen,setLogOpen]=useState(null);
  const owners=['全部',...new Set(packs.map(p=>p.owner))];
  const shown=packs.filter(p=>(owner==='全部'||p.owner===owner)&&(status==='全部'||packStatus(p)===status)).sort((a,b)=>b.createdAt-a.createdAt);
  const copy=p=>{navigator.clipboard?.writeText(linkOf(p));setNotice('分享链接已复制')};
  const revoke=p=>{setPacks(ps=>ps.map(x=>x.id===p.id?{...x,revokedAt:Date.now(),log:[...x.log,{at:Date.now(),type:'revoked'}]}:x));setNotice('分享包已撤回：新访问将被拦截，历史记录保留')};
  return <main>
    <header><div><span className="crumb">RESEARCH / SHARES</span><h1>外发分享包</h1></div>
      <div className="actions"><button className="primary" onClick={onNew}>⇪ 新建分享包</button></div></header>
    <div className="toolbar">
      <div className="filter"><small>负责人</small>{owners.map(o=><button key={o} className={owner===o?'on':''} onClick={()=>setOwner(o)}>{o}</button>)}</div>
      <div className="filter"><small>状态</small>{['全部','有效','已过期','已撤回'].map(s=><button key={s} className={status===s?'on':''} onClick={()=>setStatus(s)}>{s}</button>)}</div>
    </div>
    <div className="packs">
      {shown.map(p=>{const st=packStatus(p);const abs=p.items.filter(i=>i.abstract).length,cite=p.items.filter(i=>i.cite).length;
        return <div className="pack" key={p.id}>
        <div className="pack-top">
          <div>
            <h3>{p.items[0]?.title}{p.items.length>1&&` 等 ${p.items.length} 篇`}</h3>
            <p className="pack-meta">负责人 {p.owner} · 创建于 {fmt(p.createdAt)} · {p.expiresAt?`失效于 ${fmt(p.expiresAt)}`:'永不失效'} · 快照不随原条目更新</p>
            <p className="pack-meta">外发字段：基础信息 {p.items.length} 篇 · 摘要 {abs} 篇 · 引用文字 {cite} 篇 · 笔记 0 篇</p>
          </div>
          <span className={'status '+st}>{st}</span>
        </div>
        <div className="pack-actions">
          <button onClick={()=>copy(p)}>▣ 复制链接</button>
          <button onClick={()=>window.open(linkOf(p),'_blank')}>↗ 打开接收方视图</button>
          <button onClick={()=>setLogOpen(logOpen===p.id?null:p.id)}>☰ 访问记录（{p.log.length}）</button>
          {st==='有效'&&<button className="danger" onClick={()=>revoke(p)}>⊘ 撤回</button>}
        </div>
        {logOpen===p.id&&<div className="log">{p.log.slice().reverse().map((e,i)=><div key={i}><span>{fmt(e.at)}</span>{LOG_TEXT[e.type]}</div>)}</div>}
      </div>})}
      {!shown.length&&<div className="no-result">没有匹配的分享包</div>}
    </div>
  </main>;
}

/* 接收方视图：有效则展示快照并记录查看；撤回/过期则拦截并记录 */
function ShareView({packs,setPacks,token}){
  const pack=packs.find(p=>p.token===token);
  const st=pack?packStatus(pack):null;
  useEffect(()=>{if(!pack)return;setPacks(ps=>ps.map(p=>p.token===token?{...p,log:[...p.log,{at:Date.now(),type:packStatus(p)==='有效'?'viewed':'blocked'}]}:p))},[token]);
  return <div className="share-page"><div className="share-sheet">
    <span className="crumb">EXTERNAL SHARE · 外部分享</span>
    {!pack&&<><h1>链接无效</h1><p className="share-note">该分享包不存在，或链接已损坏。</p></>}
    {pack&&st!=='有效'&&<><h1>访问已被拦截</h1><p className="share-note">该分享包{st==='已撤回'?'已被负责人撤回':'已过失效时间'}，不再对外开放。本次拦截已记录在案，如有需要请联系 {pack.owner}。</p></>}
    {pack&&st==='有效'&&<>
      <h1>{pack.owner} 分享的文献</h1>
      <p className="share-note">共 {pack.items.length} 篇 · 生成于 {fmt(pack.createdAt)} · {pack.expiresAt?`失效于 ${fmt(pack.expiresAt)}`:'长期有效'} · 此为生成时的快照，原研究库后续修改不影响本页内容</p>
      {pack.items.map(it=><div className="share-item" key={it.id}>
        <h3>{it.title}</h3>
        <p className="share-auth">{it.authors} · {it.venue} · {it.year}</p>
        {it.abstract&&<div className="share-sec"><small>摘要 ABSTRACT</small><p>{it.abstract}</p></div>}
        {it.cite&&<div className="share-sec"><small>引用文字 CITATION</small><div className="cite-box">{it.cite}</div></div>}
      </div>)}
    </>}
  </div></div>;
}

function App(){
  const[items,setItems]=useState(read);
  const[packs,setPacks]=useState(readPacks);
  const[view,setView]=useState('library');
  const[selected,setSelected]=useState(1);
  const[query,setQuery]=useState('');
  const[tag,setTag]=useState('全部');
  const[show,setShow]=useState(false);
  const[shareOpen,setShareOpen]=useState(false);
  const[notice,setNotice]=useState('');
  const[hash,setHash]=useState(location.hash);
  const[form,setForm]=useState({title:'',authors:'',year:'2024',venue:'',abstract:'',tags:''});
  useEffect(()=>localStorage.setItem('research-library',JSON.stringify(items)),[items]);
  useEffect(()=>localStorage.setItem('research-library-shares',JSON.stringify(packs)),[packs]);
  useEffect(()=>{const f=()=>setHash(location.hash);addEventListener('hashchange',f);return()=>removeEventListener('hashchange',f)},[]);
  useEffect(()=>{if(!notice)return;const t=setTimeout(()=>setNotice(''),3000);return()=>clearTimeout(t)},[notice]);
  const tags=['全部',...new Set(items.flatMap(x=>x.tags))];
  const filtered=useMemo(()=>items.filter(x=>(tag==='全部'||x.tags.includes(tag))&&(`${x.title}${x.authors}${x.abstract}`.toLowerCase().includes(query.toLowerCase()))),[items,tag,query]);
  const cur=items.find(x=>x.id===selected)||items[0];
  const update=(k,v)=>setItems(items.map(x=>x.id===cur.id?{...x,[k]:v}:x));
  const add=()=>{if(!form.title)return;const p={...form,id:Date.now(),year:+form.year,tags:form.tags.split(',').map(x=>x.trim()).filter(Boolean),status:'待读',cite:`${form.authors} (${form.year}). ${form.title}. ${form.venue}.`};setItems([...items,p]);setSelected(p.id);setForm({title:'',authors:'',year:'2024',venue:'',abstract:'',tags:''});setShow(false);setNotice('文献已加入研究库')};
  const bib=()=>{navigator.clipboard?.writeText(cur.cite);setNotice('引用文本已复制')};
  const download=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([items.map(x=>x.cite).join('\n')],{type:'text/plain'}));a.download='references.txt';a.click();setNotice('引用列表已导出')};
  const createPack=pack=>{setPacks(ps=>[...ps,pack]);setShareOpen(false);setView('shares');navigator.clipboard?.writeText(linkOf(pack));setNotice('分享包已生成，链接已复制；原条目可继续修改，本包不受影响')};
  const token=(hash.match(/^#share\/([a-z0-9]+)/i)||[])[1];
  if(token)return <ShareView packs={packs} setPacks={setPacks} token={token}/>;
  return <div className="app">
    <aside>
      <div className="logo"><span>∴</span> LITERATURE</div>
      <div className="library-head"><span>我的研究库</span><strong>{items.length}<small> 篇文献</small></strong></div>
      <nav>
        <button className={view==='library'?'active':''} onClick={()=>setView('library')}>▤ <span>所有文献</span><b>{items.length}</b></button>
        <button className={view==='shares'?'active':''} onClick={()=>setView('shares')}>⇪ <span>分享包</span><b>{packs.length}</b></button>
        <button>▥ <span>待读</span><b>{items.filter(x=>x.status==='待读').length}</b></button>
        <button>✓ <span>已读</span></button>
        <button>☆ <span>收藏</span></button>
      </nav>
      <div className="side-tags"><small>标签</small>{tags.slice(1,5).map(t=><button onClick={()=>{setTag(t);setView('library')}} key={t}># {t}</button>)}</div>
      <div className="side-foot"><button>⚙ 偏好设置</button><small>本地数据库 · 已同步</small></div>
    </aside>
    {view==='shares'?<Shares packs={packs} setPacks={setPacks} setNotice={setNotice} onNew={()=>setShareOpen(true)}/>:
    <main>
      <header><div><span className="crumb">RESEARCH / LIBRARY</span><h1>所有文献</h1></div>
        <div className="actions"><button className="outline" onClick={download}>↓ 导出引用</button><button className="outline" onClick={()=>setShareOpen(true)}>⇪ 新建分享包</button><button className="primary" onClick={()=>setShow(true)}>＋ 添加文献</button></div></header>
      <div className="toolbar"><div className="search">⌕<input placeholder="搜索标题、作者或摘要…" value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<button onClick={()=>setQuery('')}>×</button>}</div>
        <div className="tag-filter">{tags.map(t=><button className={tag===t?'on':''} onClick={()=>setTag(t)} key={t}>{t}</button>)}</div></div>
      <div className="body">
        <section className="paper-list">{filtered.map(p=><button className={'paper '+(selected===p.id?'selected':'')} onClick={()=>setSelected(p.id)} key={p.id}><div className="paper-year">{p.year}</div><div className="paper-copy"><h3>{p.title}</h3><p>{p.authors}</p><div>{p.tags.map(t=><span key={t}>#{t}</span>)}</div></div><small className={'status '+p.status}>{p.status}</small></button>)}{!filtered.length&&<div className="no-result">没有找到匹配的文献</div>}</section>
        <section className="detail">{cur&&<><div className="detail-top"><span className="status reading">{cur.status}</span><button onClick={()=>setNotice('已加入收藏')}>☆ 收藏</button></div>
          <h2>{cur.title}</h2><p className="authors">{cur.authors}</p>
          <div className="cite-actions"><button onClick={bib}>▣ 复制引用</button><button onClick={()=>update('status',cur.status==='已读'?'待读':'已读')}>{cur.status==='已读'?'标记为待读':'标记为已读'}</button></div>
          <div className="detail-section"><h4>摘要 <span>ABSTRACT</span></h4><p>{cur.abstract}</p></div>
          <div className="detail-section"><h4>出版信息 <span>PUBLICATION</span></h4><div className="pub-grid"><div><small>出版物</small><strong>{cur.venue}</strong></div><div><small>年份</small><strong>{cur.year}</strong></div></div></div>
          <div className="detail-section"><h4>引用文本 <span>BIBTEX / TEXT</span></h4><div className="cite-box">{cur.cite}<button onClick={bib}>复制</button></div></div>
          <div className="detail-section"><h4>我的笔记 <span>PRIVATE · 不随分享包外发</span></h4><textarea className="notes" placeholder="记录你的阅读想法…" value={cur.notes||''} onChange={e=>update('notes',e.target.value)}/></div>
        </>}</section>
      </div>
    </main>}
    {show&&<div className="modal-bg"><div className="modal"><button className="close" onClick={()=>setShow(false)}>×</button><span className="crumb">NEW REFERENCE</span><h2>添加一篇文献</h2><label>标题<input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="论文或书籍标题"/></label><label>作者<input value={form.authors} onChange={e=>setForm({...form,authors:e.target.value})}/></label><div className="two"><label>年份<input type="number" value={form.year} onChange={e=>setForm({...form,year:e.target.value})}/></label><label>出版物<input value={form.venue} onChange={e=>setForm({...form,venue:e.target.value})}/></label></div><label>关键词<input value={form.tags} onChange={e=>setForm({...form,tags:e.target.value})} placeholder="用逗号分隔"/></label><label>摘要<textarea rows="3" value={form.abstract} onChange={e=>setForm({...form,abstract:e.target.value})}/></label><button className="primary full" onClick={add}>保存文献</button></div></div>}
    {shareOpen&&<ShareModal items={items} onClose={()=>setShareOpen(false)} onCreate={createPack}/>}
    {notice&&<div className="toast">{notice}</div>}
  </div>;
}
createRoot(document.getElementById('root')).render(<App/>);
