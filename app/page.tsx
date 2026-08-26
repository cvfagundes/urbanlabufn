'use client';
import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';

type Layer = { id:string; name:string; icon:string; color:string; count:string; group:string; status:'Publicado'|'Em revisão'|'Rascunho' };
const layers:Layer[] = [
  {id:'terrain',name:'Terreno',icon:'◒',color:'#d7b889',count:'DEM 10 m',group:'Grupo A',status:'Publicado'},
  {id:'buildings',name:'Edificações',icon:'▥',color:'#e76f51',count:'1.248',group:'Grupo B',status:'Em revisão'},
  {id:'streets',name:'Sistema viário',icon:'⌁',color:'#2563eb',count:'86,4 km',group:'Grupo C',status:'Publicado'},
  {id:'green',name:'Áreas verdes',icon:'♧',color:'#3a9d6f',count:'32',group:'Grupo E',status:'Rascunho'},
  {id:'equipment',name:'Equipamentos',icon:'◆',color:'#8b5cf6',count:'47',group:'Grupo D',status:'Em revisão'},
];
export default function Home(){
 const [visible,setVisible]=useState<Record<string,boolean>>({terrain:true,buildings:true,streets:true,green:true,equipment:true});
 const [selected,setSelected]=useState('buildings'); const [mode,setMode]=useState<'2D'|'3D'>('2D'); const [saved,setSaved]=useState(false); const [panel,setPanel]=useState(true);
 const [mapReady,setMapReady]=useState(false); const [mapError,setMapError]=useState(false);
 const mapContainer=useRef<HTMLDivElement>(null); const mapRef=useRef<maplibregl.Map|null>(null);
 const active=layers.find(l=>l.id===selected)!;
 const statusClass=(s:string)=>`status status-${s.toLowerCase().replace(' ','-')}`;

 useEffect(()=>{
  if(!mapContainer.current||mapRef.current)return;
  const map=new maplibregl.Map({container:mapContainer.current,style:'https://tiles.openfreemap.org/styles/liberty',center:[-53.814122,-29.684930],zoom:15.2,pitch:0,bearing:0,attributionControl:false});
  mapRef.current=map;
  map.addControl(new maplibregl.NavigationControl({visualizePitch:true}),'bottom-right');
  map.addControl(new maplibregl.AttributionControl({compact:true}),'bottom-left');
  map.on('load',()=>{
   map.addSource('study-area',{type:'geojson',data:{type:'Feature',properties:{name:'Área de estudo'},geometry:{type:'Polygon',coordinates:[[[-53.8208,-29.6902],[-53.8069,-29.6902],[-53.8069,-29.6797],[-53.8208,-29.6797],[-53.8208,-29.6902]]]}}});
   map.addLayer({id:'study-area-fill',type:'fill',source:'study-area',paint:{'fill-color':'#176b4a','fill-opacity':0.06}});
   map.addLayer({id:'study-area-line',type:'line',source:'study-area',paint:{'line-color':'#176b4a','line-width':3,'line-dasharray':[2,1]}});
   const style=map.getStyle(); const vectorSource=Object.keys(style.sources||{}).find(key=>(style.sources[key] as {type?:string}).type==='vector');
   if(vectorSource){
    try{map.addLayer({id:'urbanlab-3d-buildings',type:'fill-extrusion',source:vectorSource,'source-layer':'building',minzoom:14,layout:{visibility:'none'},paint:{'fill-extrusion-color':['interpolate',['linear'],['get','render_height'],0,'#dcc8b0',35,'#d8785d',90,'#98503f'],'fill-extrusion-height':['coalesce',['get','render_height'],['get','height'],9],'fill-extrusion-base':['coalesce',['get','render_min_height'],0],'fill-extrusion-opacity':0.88}})}catch{/* O mapa continua funcional mesmo se o estilo não trouxer edifícios. */}
   }
   new maplibregl.Marker({color:'#176b4a'}).setLngLat([-53.814122,-29.684930]).setPopup(new maplibregl.Popup({offset:20}).setHTML('<strong>Centro da área de estudo</strong><br>-29.684930, -53.814122')).addTo(map);
   setMapReady(true);
  });
  map.on('error',event=>{if(!event.error?.message?.includes('sprite'))setMapError(true)});
  return()=>{map.remove();mapRef.current=null};
 },[]);

 useEffect(()=>{
  const map=mapRef.current;if(!map||!mapReady)return;
  map.easeTo({pitch:mode==='3D'?58:0,bearing:mode==='3D'?-20:0,zoom:mode==='3D'?15.8:15.2,duration:1100});
  if(map.getLayer('urbanlab-3d-buildings'))map.setLayoutProperty('urbanlab-3d-buildings','visibility',mode==='3D'&&visible.buildings?'visible':'none');
 },[mode,visible.buildings,mapReady]);
 return <main className="app-shell">
  <header className="topbar">
   <div className="brand"><span className="brand-mark">U</span><span>UrbanLabUFN</span><em>BETA</em></div>
   <div className="project-switcher"><span className="project-avatar">SM</span><div><small>PROJETO ATUAL</small><strong>Área de Estudo · Santa Maria</strong></div><button>⌄</button></div>
   <div className="header-actions"><div className="avatars"><span>MB</span><span>RL</span><span>+4</span></div><button className="icon-button">◎<b>3</b></button><button className="primary" onClick={()=>{setSaved(true);setTimeout(()=>setSaved(false),1800)}}>{saved?'Projeto salvo ✓':'Salvar projeto'}</button><button className="user">AS</button></div>
  </header>
  <section className="workspace">
   <aside className="layers-panel">
    <div className="panel-heading"><div><span>CAMADAS DO PROJETO</span><h1>Modelo urbano</h1></div><button>＋</button></div>
    <div className="study-card"><div className="study-icon">⌗</div><div><small>ÁREA DE ESTUDO</small><strong>Santa Maria · RS</strong><span>-29.684930, -53.814122 · SIRGAS 2000</span></div><button>•••</button></div>
    <div className="layer-list">{layers.map(l=><div key={l.id} className={`layer-item ${selected===l.id?'selected':''}`} onClick={()=>{setSelected(l.id);setPanel(true)}}>
     <button className={`eye ${visible[l.id]?'on':''}`} onClick={e=>{e.stopPropagation();setVisible(v=>({...v,[l.id]:!v[l.id]}))}}>◉</button><span className="layer-symbol" style={{background:l.color}}>{l.icon}</span><div className="layer-copy"><strong>{l.name}</strong><span>{l.count} · {l.group}</span></div><span className={statusClass(l.status)}>{l.status}</span><button className="more">•••</button>
    </div>)}</div>
    <button className="add-layer">＋ Adicionar camada</button>
    <div className="professors"><small>COORDENADORES DO PROJETO</small><div><span>CF</span><p><strong>Cristian Fagundes</strong><em>Coordenador do projeto</em></p></div><div><span>MM</span><p><strong>Mirkos Martins</strong><em>Coordenador do projeto</em></p></div></div>
   </aside>
   <section className="map-stage">
    <div ref={mapContainer} className="real-map" aria-label="Mapa interativo de Santa Maria"/>
    {!mapReady&&!mapError&&<div className="map-loading">Carregando mapa de Santa Maria…</div>}
    {mapError&&<div className="map-error"><strong>Não foi possível carregar o mapa.</strong><span>Verifique sua conexão e tente novamente.</span></div>}
    <div className="location-chip"><b>Santa Maria · RS</b><span>-29.684930, -53.814122</span></div>
    <div className="view-toggle"><button className={mode==='2D'?'active':''} onClick={()=>setMode('2D')}>Mapa 2D</button><button className={mode==='3D'?'active':''} onClick={()=>setMode('3D')}>Modelo 3D</button></div>
    <div className="coordinates">29°41&apos;05.7&quot;S · 53°48&apos;50.8&quot;W <span>{mode==='3D'?'perspectiva 3D':'mapa 2D'}</span></div>
    {panel&&<aside className="detail-panel"><button className="close" onClick={()=>setPanel(false)}>×</button><div className="detail-title"><span style={{background:active.color}}>{active.icon}</span><div><small>CAMADA SELECIONADA</small><h2>{active.name}</h2></div></div><div className="detail-status"><span className={statusClass(active.status)}>{active.status}</span><span>Atualizada há 18 min</span></div>
     <div className="mini-stats"><div><small>ELEMENTOS</small><strong>{active.count}</strong></div><div><small>RESPONSÁVEL</small><strong>{active.group}</strong></div></div>
     <label>Fonte dos dados<select defaultValue="osm"><option value="osm">OpenStreetMap</option><option>Importação GeoJSON</option><option>Levantamento local</option></select></label><label>Altura padrão<div className="input-unit"><input defaultValue="9,0"/><span>metros</span></div></label><label className="slider-label">Opacidade <span>86%</span><input type="range" defaultValue="86"/></label>
     <div className="validation"><span>✓</span><div><strong>Validação concluída</strong><p>1.236 geometrias válidas · 12 avisos</p></div><button>Ver</button></div><button className="wide-button">Editar atributos</button><div className="dual-buttons"><button>⇧ Importar</button><button>⇩ Exportar</button></div><div className="activity"><strong>ATIVIDADE RECENTE</strong><p><span>MB</span><b>Marina</b> ajustou 8 alturas <small>há 18 min</small></p></div>
    </aside>}
   </section>
  </section>
 </main>
}
