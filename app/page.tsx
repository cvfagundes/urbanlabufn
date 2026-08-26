'use client';

import { ChangeEvent, useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';

type BuildingGeometry = GeoJSON.Polygon | GeoJSON.MultiPolygon;
type EditedBuilding = GeoJSON.Feature<BuildingGeometry, { editorId: string; height: number }>;

const EMPTY_BUILDINGS: GeoJSON.FeatureCollection<BuildingGeometry, EditedBuilding['properties']> = { type: 'FeatureCollection', features: [] };
const STORAGE_KEY = 'urbanlabufn-building-scenario';

function buildingId(geometry: BuildingGeometry) {
  const value = JSON.stringify(geometry.coordinates);
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) hash = ((hash << 5) + hash) ^ value.charCodeAt(index);
  return `edificio-${(hash >>> 0).toString(36)}`;
}

export default function Home() {
  const [mode, setMode] = useState<'2D' | '3D'>('2D');
  const [terrainEnabled, setTerrainEnabled] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedBuildings, setEditedBuildings] = useState<EditedBuilding[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<EditedBuilding | null>(null);
  const [heightInput, setHeightInput] = useState('');
  const [editorMessage, setEditorMessage] = useState('Ative o modo de edição e clique em uma edificação.');
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const editModeRef = useRef(false);
  const editedBuildingsRef = useRef<EditedBuilding[]>([]);
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    let storedBuildings: EditedBuilding[] = [];
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) storedBuildings = JSON.parse(stored).features ?? [];
    } catch { /* Um cenário inválido não impede a abertura do mapa. */ }
    editedBuildingsRef.current = storedBuildings;
    setEditedBuildings(storedBuildings);
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
          geometry: { type: 'Polygon', coordinates: [[[-53.817325, -29.687575], [-53.810375, -29.687575], [-53.810375, -29.682325], [-53.817325, -29.682325], [-53.817325, -29.687575]]] },
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
      map.addSource('edited-buildings', {
        type: 'geojson',
        data: { ...EMPTY_BUILDINGS, features: storedBuildings },
      });
      map.addLayer({
        id: 'edited-buildings', type: 'fill-extrusion', source: 'edited-buildings',
        paint: {
          'fill-extrusion-color': '#e0924f',
          'fill-extrusion-height': ['get', 'height'],
          'fill-extrusion-base': 0,
          'fill-extrusion-opacity': 0.96,
        },
      });
      new maplibregl.Marker({ color: '#176b4a' })
        .setLngLat([-53.814122, -29.68493])
        .setPopup(new maplibregl.Popup({ offset: 20 }).setHTML('<strong>Centro da área de estudo</strong><br>-29.684930, -53.814122'))
        .addTo(map);
      setMapReady(true);
    });
    const selectBuilding = (event: maplibregl.MapMouseEvent) => {
      if (!editModeRef.current) return;
      const availableLayers = ['edited-buildings', 'urbanlab-3d-buildings'].filter((id) => map.getLayer(id));
      const feature = map.queryRenderedFeatures(event.point, { layers: availableLayers });
      const building = feature.find((item) => item.geometry.type === 'Polygon' || item.geometry.type === 'MultiPolygon');
      if (!building) {
        setEditorMessage('Nenhuma edificação foi encontrada nesse ponto. Tente clicar no centro de outro prédio.');
        return;
      }
      const geometry = JSON.parse(JSON.stringify(building.geometry)) as BuildingGeometry;
      const editorId = String(building.properties?.editorId ?? buildingId(geometry));
      const existing = editedBuildingsRef.current.find((item) => item.properties.editorId === editorId);
      const sourceHeight = Number(building.properties?.render_height ?? building.properties?.height ?? 9);
      const selected = existing ?? { type: 'Feature', geometry, properties: { editorId, height: Number.isFinite(sourceHeight) ? sourceHeight : 9 } };
      setSelectedBuilding(selected);
      setHeightInput(String(Math.round(selected.properties.height * 10) / 10));
      setEditorMessage('Edificação selecionada. Informe a altura desejada em metros.');
    };
    map.on('click', selectBuilding);
    map.on('mousemove', (event) => {
      if (!editModeRef.current) return;
      const layers = ['edited-buildings', 'urbanlab-3d-buildings'].filter((id) => map.getLayer(id));
      map.getCanvas().style.cursor = map.queryRenderedFeatures(event.point, { layers }).length ? 'pointer' : '';
    });
    map.on('error', (event) => { if (!event.error?.message?.includes('sprite')) setMapError(true); });
    return () => {
      canvas.removeEventListener('pointerdown', startOrbit);
      canvas.removeEventListener('pointermove', moveOrbit);
      canvas.removeEventListener('pointerup', stopOrbit);
      canvas.removeEventListener('pointercancel', stopOrbit);
      canvas.removeEventListener('contextmenu', preventMenu);
      map.off('click', selectBuilding);
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

  useEffect(() => {
    editModeRef.current = editMode;
    const map = mapRef.current;
    if (map) map.getCanvas().style.cursor = editMode ? 'crosshair' : '';
  }, [editMode]);

  const updateEditedBuildings = (features: EditedBuilding[]) => {
    editedBuildingsRef.current = features;
    setEditedBuildings(features);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...EMPTY_BUILDINGS, features }));
    const source = mapRef.current?.getSource('edited-buildings') as maplibregl.GeoJSONSource | undefined;
    source?.setData({ ...EMPTY_BUILDINGS, features });
  };

  const toggleEditor = () => {
    const next = !editMode;
    setEditMode(next);
    if (next) {
      setMode('3D');
      setEditorMessage('Clique em uma edificação dentro da área de estudo.');
    } else {
      setSelectedBuilding(null);
      setEditorMessage('Ative o modo de edição e clique em uma edificação.');
    }
  };

  const applyHeight = () => {
    if (!selectedBuilding) return;
    const height = Number(heightInput.replace(',', '.'));
    if (!Number.isFinite(height) || height < 1 || height > 500) {
      setEditorMessage('Informe uma altura entre 1 e 500 metros.');
      return;
    }
    const updated = { ...selectedBuilding, properties: { ...selectedBuilding.properties, height } };
    const remaining = editedBuildingsRef.current.filter((item) => item.properties.editorId !== updated.properties.editorId);
    updateEditedBuildings([...remaining, updated]);
    setSelectedBuilding(updated);
    setEditorMessage(`Altura aplicada: ${height} m. O cenário foi salvo neste navegador.`);
  };

  const removeSelectedEdit = () => {
    if (!selectedBuilding) return;
    updateEditedBuildings(editedBuildingsRef.current.filter((item) => item.properties.editorId !== selectedBuilding.properties.editorId));
    setSelectedBuilding(null);
    setHeightInput('');
    setEditorMessage('Alteração removida. O prédio voltou à altura do mapa-base.');
  };

  const exportScenario = () => {
    const data = JSON.stringify({ ...EMPTY_BUILDINGS, name: 'Cenário UrbanLabUFN', features: editedBuildingsRef.current }, null, 2);
    const url = URL.createObjectURL(new Blob([data], { type: 'application/geo+json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'urbanlabufn-cenario-edificacoes.geojson';
    link.click();
    URL.revokeObjectURL(url);
    setEditorMessage(`${editedBuildingsRef.current.length} edificação(ões) exportada(s).`);
  };

  const importScenario = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text()) as GeoJSON.FeatureCollection<BuildingGeometry, EditedBuilding['properties']>;
      if (data.type !== 'FeatureCollection' || !Array.isArray(data.features)) throw new Error('Formato inválido');
      const valid = data.features.filter((feature) =>
        (feature.geometry?.type === 'Polygon' || feature.geometry?.type === 'MultiPolygon') &&
        typeof feature.properties?.editorId === 'string' && Number.isFinite(Number(feature.properties?.height)),
      ).map((feature) => ({ ...feature, properties: { ...feature.properties, height: Number(feature.properties.height) } })) as EditedBuilding[];
      updateEditedBuildings(valid);
      setEditorMessage(`${valid.length} edificação(ões) importada(s) com sucesso.`);
    } catch {
      setEditorMessage('Não foi possível importar: selecione um cenário GeoJSON exportado pelo UrbanLabUFN.');
    }
    event.target.value = '';
  };

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
            <div><dt>Cenário local</dt><dd>{editedBuildings.length} edificação(ões) editada(s)</dd></div>
          </dl>
          <div className="professors"><small>COORDENADORES DO PROJETO</small><div><span>CF</span><p><strong>Cristian Fagundes</strong><em>Coordenador do projeto</em></p></div><div><span>MM</span><p><strong>Mirkos Martins</strong><em>Coordenador do projeto</em></p></div></div>
        </aside>

        <section className="map-stage">
          <div ref={mapContainer} className="real-map" aria-label="Mapa interativo de Santa Maria" />
          {!mapReady && !mapError && <div className="map-loading">Carregando mapa de Santa Maria…</div>}
          {mapError && <div className="map-error"><strong>Não foi possível carregar o mapa.</strong><span>Verifique sua conexão e tente novamente.</span></div>}
          <div className="location-chip"><b>Santa Maria · RS</b><span>-29.684930, -53.814122</span></div>
          <div className="map-controls"><div className="view-toggle"><button className={mode === '2D' ? 'active' : ''} onClick={() => setMode('2D')}>Mapa 2D</button><button className={mode === '3D' ? 'active' : ''} onClick={() => setMode('3D')}>Modelo 3D</button></div><button className={`terrain-toggle ${terrainEnabled ? 'active' : ''}`} onClick={() => setTerrainEnabled((value) => !value)} aria-pressed={terrainEnabled}>◒ Topografia</button><button className={`building-editor-toggle ${editMode ? 'active' : ''}`} onClick={toggleEditor} aria-pressed={editMode}>▥ Editar edificações</button></div>
          {mode === '3D' && <div className="orbit-hint">Botão direito ou Ctrl + arrastar para orbitar</div>}
          {editMode && <aside className="building-editor" aria-label="Editor de edificações">
            <div className="editor-heading"><div><small>CENÁRIO URBANO</small><h2>Altura das edificações</h2></div><button onClick={toggleEditor} aria-label="Fechar editor">×</button></div>
            <p className="editor-help">{editorMessage}</p>
            {selectedBuilding ? <>
              <div className="selected-building"><span>▥</span><div><small>EDIFICAÇÃO SELECIONADA</small><strong>{selectedBuilding.properties.editorId}</strong></div></div>
              <label className="height-field">Altura proposta<div><input type="text" inputMode="decimal" value={heightInput} onChange={(event) => setHeightInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') applyHeight(); }} aria-label="Altura proposta em metros"/><span>metros</span></div></label>
              <button className="apply-height" onClick={applyHeight}>Aplicar altura</button>
              {editedBuildings.some((item) => item.properties.editorId === selectedBuilding.properties.editorId) && <button className="remove-height" onClick={removeSelectedEdit}>Restaurar altura original</button>}
            </> : <div className="editor-empty"><span>＋</span><strong>Selecione um prédio</strong><p>Clique sobre o volume de uma edificação no mapa.</p></div>}
            <div className="scenario-actions"><button onClick={exportScenario} disabled={!editedBuildings.length}>Exportar GeoJSON</button><button onClick={() => importRef.current?.click()}>Importar cenário</button><input ref={importRef} type="file" accept=".geojson,.json,application/geo+json,application/json" onChange={importScenario}/></div>
            <small className="local-note">As alterações ficam salvas somente neste navegador. Exporte o arquivo para compartilhar com o grupo.</small>
          </aside>}
          <div className="coordinates">29°41&apos;05.7&quot;S · 53°48&apos;50.8&quot;W <span>{mode === '3D' ? 'perspectiva 3D' : 'mapa 2D'}</span></div>
        </section>
      </section>
    </main>
  );
}
