'use client';
import { useState } from 'react';

type Layer = { id:string; name:string; icon:string; color:string; count:string; group:string; status:'Publicado'|'Em revisão'|'Rascunho' };
const layers:Layer[] = [
  {id:'terrain',name:'Terreno',icon:'◒',color:'#d7b889',count:'DEM 10 m',group:'Grupo A',status:'Publicado'},
  {id:'buildings',name:'Edificações',icon:'▥',color:'#e76f51',count:'1.248',group:'Grupo B',status:'Em revisão'},
  {id:'streets',name:'Sistema viário',icon:'⌁',color:'#2563eb',count:'86,4 km',group:'Grupo C',status:'Publicado'},
  {id:'green',name:'Áreas verdes',icon:'♧',color:'#3a9d6f',count:'32',group:'Grupo E',status:'Rascunho'},
  {id:'equipment',name:'Equipamentos',icon:'◆',color:'#8b5cf6',count:'47',group:'Grupo D',status:'Em revisão'},
];
const buildings=[[15,16,11,15],[29,11,13,20],[45,17,10,13],[62,9,17,17],[81,18,10,14],[8,43,15,18],[28,39,11,13],[47,44,18,16],[72,39,12,19],[86,48,8,13],[16,70,12,16],[34,67,17,19],[58,72,11,14],[76,68,18,18]];

export default function Home(){
 const [visible,setVisible]=useState<Record<string,boolean>>({terrain:true,buildings:true,streets:true,green:true,equipment:true});
 const [selected,setSelected]=useState('buildings'); const [mode,setMode]=useState<'2D'|'3D'>('2D'); const [saved,setSaved]=useState(false); const [panel,setPanel]=useState(true);
 const active=layers.find(l=>l.id===selected)!;
 const statusClass=(s:string)=>`status status-${s.toLowerCase().replace(' ','-')}`;
 return <main className="app-shell">
  <header className="topbar">
   <div className="brand"><span className="brand-mark">U</span><span>UrbanLab</span><em>BETA</em></div>
   <div className="project-switcher"><span className="project-avatar">CP</span><div><small>PROJETO ATUAL</small><strong>Centro Expandido · Piracicaba</strong></div><button>⌄</button></div>
   <div className="header-actions"><div className="avatars"><span>MB</span><span>RL</span><span>+4</span></div><button className="icon-button">◎<b>3</b></button><button className="primary" onClick={()=>{setSaved(true);setTimeout(()=>setSaved(false),1800)}}>{saved?'Projeto salvo ✓':'Salvar projeto'}</button><button className="user">AS</button></div>
  </header>
  <section className="workspace">
   <aside className="layers-panel">
    <div className="panel-heading"><div><span>CAMADAS DO PROJETO</span><h1>Modelo urbano</h1></div><button>＋</button></div>
    <div className="study-card"><div className="study-icon">⌗</div><div><small>ÁREA DE ESTUDO</small><strong>Centro expandido</strong><span>3,42 km² · SIRGAS 2000 / UTM 23S</span></div><button>•••</button></div>
    <div className="layer-list">{layers.map(l=><div key={l.id} className={`layer-item ${selected===l.id?'selected':''}`} onClick={()=>{setSelected(l.id);setPanel(true)}}>
     <button className={`eye ${visible[l.id]?'on':''}`} onClick={e=>{e.stopPropagation();setVisible(v=>({...v,[l.id]:!v[l.id]}))}}>◉</button><span className="layer-symbol" style={{background:l.color}}>{l.icon}</span><div className="layer-copy"><strong>{l.name}</strong><span>{l.count} · {l.group}</span></div><span className={statusClass(l.status)}>{l.status}</span><button className="more">•••</button>
    </div>)}</div>
    <button className="add-layer">＋ Adicionar camada</button>
    <div className="team-progress"><div><span>Progresso do projeto</span><strong>68%</strong></div><div className="progress"><i/></div><p>4 de 6 grupos atualizaram suas camadas hoje</p></div>
   </aside>
   <section className={`map-stage ${mode==='3D'?'is-3d':''}`}>
    <div className="map-grid"/><div className="river"/>{visible.streets&&<><div className="road road-one"/><div className="road road-two"/><div className="road road-three"/><div className="road road-four"/></>}
    {visible.terrain&&<div className="contours"><i/><i/><i/><i/></div>}
    {visible.buildings&&<div className="buildings">{buildings.map(([left,top,width,height],i)=><i key={i} style={{left:`${left}%`,top:`${top}%`,width:`${width}%`,height:`${height}%`}}/>)}</div>}
    {visible.green&&<><div className="park park-one">PARQUE DO MIRANTE</div><div className="park park-two"/></>}
    {visible.equipment&&<><button className="pin pin-one">✦</button><button className="pin pin-two">✚</button><button className="pin pin-three">●</button></>}
    <div className="study-boundary"><span>Área de estudo · 3,42 km²</span></div>
    <div className="map-toolbar"><button>↖</button><button>✋</button><button>◇</button><button>⌖</button></div>
    <div className="view-toggle"><button className={mode==='2D'?'active':''} onClick={()=>setMode('2D')}>Mapa 2D</button><button className={mode==='3D'?'active':''} onClick={()=>setMode('3D')}>Modelo 3D</button></div>
    <div className="map-actions"><button>＋</button><button>−</button><button>⌖</button></div><div className="coordinates">22°43&apos;12.8&quot;S · 47°38&apos;56.2&quot;W <span>escala 1:8.500</span></div><button className="basemap">▦ <span>Mapa base</span></button>
    {panel&&<aside className="detail-panel"><button className="close" onClick={()=>setPanel(false)}>×</button><div className="detail-title"><span style={{background:active.color}}>{active.icon}</span><div><small>CAMADA SELECIONADA</small><h2>{active.name}</h2></div></div><div className="detail-status"><span className={statusClass(active.status)}>{active.status}</span><span>Atualizada há 18 min</span></div>
     <div className="mini-stats"><div><small>ELEMENTOS</small><strong>{active.count}</strong></div><div><small>RESPONSÁVEL</small><strong>{active.group}</strong></div></div>
     <label>Fonte dos dados<select defaultValue="osm"><option value="osm">OpenStreetMap</option><option>Importação GeoJSON</option><option>Levantamento local</option></select></label><label>Altura padrão<div className="input-unit"><input defaultValue="9,0"/><span>metros</span></div></label><label className="slider-label">Opacidade <span>86%</span><input type="range" defaultValue="86"/></label>
     <div className="validation"><span>✓</span><div><strong>Validação concluída</strong><p>1.236 geometrias válidas · 12 avisos</p></div><button>Ver</button></div><button className="wide-button">Editar atributos</button><div className="dual-buttons"><button>⇧ Importar</button><button>⇩ Exportar</button></div><div className="activity"><strong>ATIVIDADE RECENTE</strong><p><span>MB</span><b>Marina</b> ajustou 8 alturas <small>há 18 min</small></p></div>
    </aside>}
   </section>
  </section>
 </main>
}
