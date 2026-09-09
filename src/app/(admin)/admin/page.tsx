"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ProductIcon } from "@/components/common/ProductUI";

type Appeal = { id: string; title: string; category: string; priority: "Срочно"|"Стандарт"|"Низкий"; status: string; age: string; crisis?: boolean };
const appeals: Appeal[] = [
 {id:"ОТК-7M4K-2P9Q",title:"Мне угрожают одноклассники",category:"Конфликт с одноклассниками",priority:"Срочно",status:"Новое",age:"12 мин",crisis:true},
 {id:"ОТК-3H8D-6L2A",title:"Не знаю, как это назвать",category:"Другое",priority:"Стандарт",status:"Новое",age:"34 мин"},
 {id:"ОТК-9Q1F-5V7C",title:"Проблема с учителем",category:"Конфликт с учителем",priority:"Низкий",status:"Ожидает",age:"1 ч"},
];

export default function AdminDashboard(){
 const [filter,setFilter]=useState("Все"); const [query,setQuery]=useState(""); const [selected,setSelected]=useState(appeals[0]); const [toast,setToast]=useState("");
 const filtered=useMemo(()=>appeals.filter((x)=> (filter==="Все"||x.priority===filter) && `${x.id} ${x.title} ${x.category}`.toLowerCase().includes(query.toLowerCase())),[filter,query]);
 const take=()=>{setToast("Обращение взято в работу"); window.setTimeout(()=>setToast(""),2200)};
 return <div className="ot-admin">
  <div className="ot-admin-top"><div><p className="ot-eyebrow">Среда оператора</p><h1>Рабочий стол</h1><p className="ot-admin-lead">Добрый день. Сегодня важно не пропустить ни одного обращения.</p></div><div className="ot-admin-actions"><Link href="/analytics" className="ot-admin-ghost"><ProductIcon name="chart"/>Аналитика</Link><Link href="/queue" className="ot-admin-primary"><ProductIcon name="arrow"/>Открыть очередь</Link></div></div>
  <div className="ot-admin-focus"><div><span className="ot-focus-kicker">Фокус на сейчас</span><strong>3 обращения требуют реакции</strong><p>Два из них отмечены как кризисные. Среднее время ожидания — 18 минут.</p></div><Link href="/queue" className="ot-admin-primary">Перейти к срочным <ProductIcon name="arrow"/></Link></div>
  <div className="ot-admin-stats">{[["В очереди","24","Нужно внимания","tone-brand","inbox"],["Кризисные","3","Требуют реакции","tone-danger","alert"],["В работе","11","У специалистов","tone-mint","check"],["Ответ сегодня","18","За последние 24 часа","tone-orange","clock"]].map(([label,value,note,tone,icon])=><div className={"ot-admin-stat "+tone} key={label}><span className="ot-stat-icon"><ProductIcon name={icon}/></span><div><span>{label}</span><strong>{value}</strong><small>{note}</small></div></div>)}</div>
  <div className="ot-admin-grid">
   <section className="ot-admin-card ot-admin-queue"><div className="ot-card-head"><div><p className="ot-card-kicker">Требуют внимания</p><h2>Последние обращения</h2></div><Link href="/queue" className="ot-admin-link">Все обращения <ProductIcon name="arrow"/></Link></div><div className="ot-filter-row">{["Все","Срочно","Стандарт","Низкий"].map((x)=><button key={x} onClick={()=>setFilter(x)} className={filter===x?"active":""}>{x}</button>)}</div><div className="ot-search"><ProductIcon name="search"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Поиск по обращениям"/></div><div className="ot-appeals">{filtered.map((item)=><button key={item.id} className={selected.id===item.id?"selected":""} onClick={()=>setSelected(item)}><div className="ot-appeal-meta"><span>{item.id}</span><div>{item.crisis&&<b className="ot-crisis-dot">кризис</b>}<b className={item.priority==="Срочно"?"ot-pill-danger":"ot-pill-brand"}>{item.priority}</b></div></div><strong>{item.title}</strong><small><span>{item.category}</span><span>{item.age}</span></small></button>)}</div></section>
   <section className="ot-admin-card ot-admin-detail"><div className="ot-card-head"><div><p className="ot-card-kicker">Выбранное обращение</p><h2>{selected.title}</h2><span className="ot-detail-id">{selected.id} · анонимно</span></div><span className="ot-pill-brand">{selected.status}</span></div><div className="ot-detail-status"><span className="ot-status-live"/><span>На контроле</span><span className="ot-detail-sep">•</span><span>обновлено только что</span></div><div className="ot-detail-body"><div className="ot-message-card"><p>Суть обращения</p><blockquote>«Мне сложно каждый день идти в школу. Ребята из класса пишут неприятные вещи и иногда поджидают после уроков. Я не знаю, кому об этом сказать.»</blockquote></div>{selected.crisis&&<div className="ot-crisis-card"><div><ProductIcon name="alert"/><div><strong>Кризисные маркеры</strong><p>Проверьте безопасность и откройте протокол помощи.</p></div></div><button>Протокол</button></div>}<div className="ot-detail-actions"><button className="ot-admin-primary" onClick={take}>Взять в работу <ProductIcon name="arrow"/></button><Link href="/queue" className="ot-admin-ghost">Открыть диалог</Link></div></div></section>
  </div>
  {toast&&<div className="ot-toast"><ProductIcon name="check"/>{toast}</div>}
 </div>;
}
