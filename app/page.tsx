'use client';

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';

export default function Home() {
  const [mode, setMode] = useState<'2D' | '3D'>('2D');
  const [terrainEnabled, setTerrainEnabled] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: [-53.814122, -29.68493],
      zoom: 15.2,
      pitch: 0,
      bearing: 0,
      attributionControl: false,
    });
    mapRef.current = map;
    map.dragRotate.disable();
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');
    const canvas = map.getCanvas();
    let orbit: { x: number; y: number; bearing: number; pitch: number; pointerId: number } | null = null;
    const startOrbit = (event: PointerEvent) => {
      if (event.button !== 2 && !(event.button === 0 && event.ctrlKey)) return;
      event.preventDefault();
      orbit = { x: event.clientX, y: event.clientY, bearing: map.getBearing(), pitch: map.getPitch(), pointerId: event.pointerId };
      canvas.setPointerCapture(event.pointerId);
      canvas.classList.add('is-orbiting');
    };
    const moveOrbit = (event: PointerEvent) => {
      if (!orbit) return;
      event.preventDefault();
      const horizontalSensitivity = 0.12;
      const verticalSensitivity = 0.08;
      map.setBearing(orbit.bearing + (event.clientX - orbit.x) * horizontalSensitivity);
      map.setPitch(Math.max(10, Math.min(80, orbit.pitch - (event.clientY - orbit.y) * verticalSensitivity)));
    };
    const stopOrbit = () => { orbit = null; canvas.classList.remove('is-orbiting'); };
    const preventMenu = (event: MouseEvent) => event.preventDefault();
    canvas.addEventListener('pointerdown', startOrbit);
    canvas.addEventListener('pointermove', moveOrbit);
    canvas.addEventListener('pointerup', stopOrbit);
    canvas.addEventListener('pointercancel', stopOrbit);
    canvas.addEventListener('contextmenu', preventMenu);
    map.on('load', () => {
      map.addSource('terrain-dem', { type: 'raster-dem', url: 'https://tiles.mapterhorn.com/tilejson.json', tileSize: 512 });
      map.addLayer({ id: 'terrain-hillshade', type: 'hillshade', source: 'terrain-dem', paint: { 'hillshade-method': 'standard', 'hillshade-shadow-color': '#514837', 'hillshade-highlight-color': '#f3efe5', 'hillshade-accent-color': '#786b53', 'hillshade-exaggeration': 0.38 } });
      map.setTerrain({ source: 'terrain-dem', exaggeration: 1.35 });
      map.addSource('study-area', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: { name: 'Área de estudo' },
          geometry: { type: 'Polygon', coordinates: [[[-53.8208, -29.6902], [-53.8069, -29.6902], [-53.8069, -29.6797], [-53.8208, -29.6797], [-53.8208, -29.6902]]] },
        },
      });
      map.addLayer({ id: 'study-area-fill', type: 'fill', source: 'study-area', paint: { 'fill-color': '#176b4a', 'fill-opacity': 0.06 } });
      map.addLayer({ id: 'study-area-line', type: 'line', source: 'study-area', paint: { 'line-color': '#176b4a', 'line-width': 3, 'line-dasharray': [2, 1] } });
      const style = map.getStyle();
      const vectorSource = Object.keys(style.sources || {}).find((key) => (style.sources[key] as { type?: string }).type === 'vector');
      if (vectorSource) {
        try {
          map.addLayer({
            id: 'urbanlab-3d-buildings', type: 'fill-extrusion', source: vectorSource, 'source-layer': 'building', minzoom: 14,
            layout: { visibility: 'none' },
            paint: {
              'fill-extrusion-color': ['interpolate', ['linear'], ['get', 'render_height'], 0, '#dcc8b0', 35, '#d8785d', 90, '#98503f'],
              'fill-extrusion-height': ['coalesce', ['get', 'render_height'], ['get', 'height'], 9],
              'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
              'fill-extrusion-opacity': 0.88,
            },
          });
        } catch { /* Mantém o mapa operacional em estilos sem edificações. */ }
      }
      new maplibregl.Marker({ color: '#176b4a' })
        .setLngLat([-53.814122, -29.68493])
        .setPopup(new maplibregl.Popup({ offset: 20 }).setHTML('<strong>Centro da área de estudo</strong><br>-29.684930, -53.814122'))
        .addTo(map);
      setMapReady(true);
    });
    map.on('error', (event) => { if (!event.error?.message?.includes('sprite')) setMapError(true); });
    return () => {
      canvas.removeEventListener('pointerdown', startOrbit);
      canvas.removeEventListener('pointermove', moveOrbit);
      canvas.removeEventListener('pointerup', stopOrbit);
      canvas.removeEventListener('pointercancel', stopOrbit);
      canvas.removeEventListener('contextmenu', preventMenu);
      map.remove(); mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    map.easeTo({ pitch: mode === '3D' ? 58 : 0, bearing: mode === '3D' ? -20 : 0, zoom: mode === '3D' ? 15.8 : 15.2, duration: 1100 });
    if (map.getLayer('urbanlab-3d-buildings')) map.setLayoutProperty('urbanlab-3d-buildings', 'visibility', mode === '3D' ? 'visible' : 'none');
  }, [mode, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    map.setTerrain(terrainEnabled ? { source: 'terrain-dem', exaggeration: 1.35 } : null);
    if (map.getLayer('terrain-hillshade')) map.setLayoutProperty('terrain-hillshade', 'visibility', terrainEnabled ? 'visible' : 'none');
  }, [terrainEnabled, mapReady]);

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark">U</span><span>UrbanLabUFN</span><em>BETA</em></div>
        <div className="project-switcher"><span className="project-avatar">SM</span><div><small>PROJETO ATUAL</small><strong>Área de Estudo · Santa Maria</strong></div></div>
      </header>

      <section className="workspace workspace-clean">
        <aside className="project-panel">
          <div className="study-card"><div className="study-icon">⌗</div><div><small>LOCALIZAÇÃO</small><strong>Santa Maria · RS</strong><span>-29.684930, -53.814122</span></div></div>
          <dl className="project-facts">
            <div><dt>Referência espacial</dt><dd>SIRGAS 2000</dd></div>
            <div><dt>Visualização</dt><dd>Mapa vetorial interativo</dd></div>
            <div><dt>Fonte cartográfica</dt><dd>OpenStreetMap</dd></div>
          </dl>
          <div className="professors"><small>COORDENADORES DO PROJETO</small><div><span>CF</span><p><strong>Cristian Fagundes</strong><em>Coordenador do projeto</em></p></div><div><span>MM</span><p><strong>Mirkos Martins</strong><em>Coordenador do projeto</em></p></div></div>
        </aside>

        <section className="map-stage">
          <div ref={mapContainer} className="real-map" aria-label="Mapa interativo de Santa Maria" />
          {!mapReady && !mapError && <div className="map-loading">Carregando mapa de Santa Maria…</div>}
          {mapError && <div className="map-error"><strong>Não foi possível carregar o mapa.</strong><span>Verifique sua conexão e tente novamente.</span></div>}
          <div className="location-chip"><b>Santa Maria · RS</b><span>-29.684930, -53.814122</span></div>
          <div className="map-controls"><div className="view-toggle"><button className={mode === '2D' ? 'active' : ''} onClick={() => setMode('2D')}>Mapa 2D</button><button className={mode === '3D' ? 'active' : ''} onClick={() => setMode('3D')}>Modelo 3D</button></div><button className={`terrain-toggle ${terrainEnabled ? 'active' : ''}`} onClick={() => setTerrainEnabled((value) => !value)} aria-pressed={terrainEnabled}>◒ Topografia</button></div>
          {mode === '3D' && <div className="orbit-hint">Botão direito ou Ctrl + arrastar para orbitar</div>}
          <div className="coordinates">29°41&apos;05.7&quot;S · 53°48&apos;50.8&quot;W <span>{mode === '3D' ? 'perspectiva 3D' : 'mapa 2D'}</span></div>
        </section>
      </section>
    </main>
  );
}
