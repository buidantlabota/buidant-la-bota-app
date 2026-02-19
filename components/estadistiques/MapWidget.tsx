'use client';

import { MapContainer, TileLayer, CircleMarker, Tooltip, Popup, useMap, useMapEvents, Marker } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { BarChart3, Euro, Flame, Map as MapIcon, ZoomIn, Info } from 'lucide-react';

// Fix Leaflet default icons
const DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41], iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// ── Types & Plugin Extension ──────────────────────────────
interface MapData {
    municipi: string;
    lat: number;
    lng: number;
    total_bolos: number;
    total_ingressos: number;
}

interface MapWidgetProps {
    data: MapData[];
    initialMode?: 'bolos' | 'ingressos' | 'heat';
}

// Extend Leaflet for heatLayer
declare module 'leaflet' {
    function heatLayer(
        latlngs: Array<[number, number, number]>,
        options?: any
    ): any;
}

// ── Heatmap layer ──────────────────────────────────────────
function HeatmapLayer({ points }: { points: [number, number, number][] }) {
    const map = useMap();
    const layerRef = useRef<any>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        // Safe load of leaflet.heat
        if (typeof window !== 'undefined' && !('heatLayer' in L)) {
            // @ts-ignore
            import('leaflet.heat').then(() => {
                setIsLoaded(true);
            }).catch(err => console.error("Failed to load leaflet.heat", err));
        } else {
            setIsLoaded(true);
        }
    }, []);

    useEffect(() => {
        if (!map || !isLoaded || points.length === 0) return;

        // Ensure we cleanup previous layer
        if (layerRef.current) {
            map.removeLayer(layerRef.current);
            layerRef.current = null;
        }

        try {
            // @ts-ignore
            layerRef.current = L.heatLayer(points, {
                radius: 25,
                blur: 15,
                maxZoom: 10,
                max: 1.0,
                gradient: {
                    0.2: '#3b82f6', // Blau (poc)
                    0.4: '#10b981', // Verd
                    0.6: '#fbbf24', // Groc
                    0.8: '#f97316', // Taronja
                    1.0: '#ef4444'  // Vermell (molt)
                }
            }).addTo(map);
        } catch (e) {
            console.error("Error creating heatLayer:", e);
        }

        return () => {
            if (layerRef.current && map) {
                map.removeLayer(layerRef.current);
                layerRef.current = null;
            }
        };
    }, [map, points, isLoaded]);

    return null;
}

// ── Zoom tracker: returns current zoom ────────────────────
function ZoomWatcher({ onZoom }: { onZoom: (z: number) => void }) {
    const map = useMapEvents({
        zoom: () => onZoom(map.getZoom()),
        zoomend: () => onZoom(map.getZoom()),
    });
    return null;
}

// ── Invalidate size on mount ──────────────────────────────
function MapResizer() {
    const map = useMap();
    useEffect(() => {
        const timer = setTimeout(() => map.invalidateSize(), 500);
        return () => clearTimeout(timer);
    }, [map]);
    return null;
}

// ── Color and Style by value ──────────────────────────────
function getMarkerStyle(val: number, mode: string, zoom: number) {
    if (mode === 'heat') return { radius: 10, color: '#000' };

    // Progressive radius: 
    // - Low zoom (Catalonia view, z7-8): markers large enough to see (size 10-12)
    // - Medium zoom (z9-10): size 12-14
    // - High zoom (z11+): size 16-20 for clear detail
    let radius = 10; // Default base
    if (zoom <= 8) radius = 10;
    else if (zoom <= 10) radius = 14;
    else radius = 18;

    if (mode === 'bolos') {
        if (val >= 10) return { radius: radius + 4, color: '#7c1c1c', isPremium: true };
        if (val >= 7) return { radius, color: '#ef4444' };
        if (val >= 4) return { radius, color: '#f97316' };
        if (val >= 2) return { radius, color: '#fbbf24' };
        return { radius: radius - 2, color: '#10b981' };
    } else {
        if (val >= 5000) return { radius: radius + 4, color: '#1e3a8a', isPremium: val >= 7000 };
        if (val >= 2000) return { radius, color: '#2563eb' };
        if (val >= 1000) return { radius, color: '#60a5fa' };
        if (val >= 500) return { radius, color: '#93c5fd' };
        return { radius: radius - 2, color: '#dbeafe' };
    }
}

// ── Custom Boot Icon for 10+ bolos ───────────────────────
const createBootIcon = (color: string, size: number) => {
    return L.divIcon({
        html: `<div style="
            display: flex; 
            align-items: center; 
            justify-content: center; 
            background: ${color}; 
            width: ${size}px; 
            height: ${size}px; 
            border-radius: 50%; 
            border: 2px solid white; 
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            font-size: ${size * 0.6}px;
            cursor: pointer;
        ">🥾</div>`,
        className: '',
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
    });
};

// ── Main component ────────────────────────────────────────
export default function MapWidget({ data, initialMode = 'bolos' }: MapWidgetProps) {
    const [mode, setMode] = useState<'bolos' | 'ingressos' | 'heat'>(initialMode);
    const [zoom, setZoom] = useState(8);
    const [useClusters, setUseClusters] = useState(true);
    const cataloniaCenter: [number, number] = [41.7, 1.8];

    const maxBolos = useMemo(() => Math.max(...data.map(d => d.total_bolos), 1), [data]);
    const maxIngressos = useMemo(() => Math.max(...data.map(d => d.total_ingressos), 1), [data]);

    const heatPoints = useMemo(() =>
        data.map(d => [d.lat, d.lng, Math.min(1, d.total_bolos / (maxBolos * 0.7))] as [number, number, number]),
        [data, maxBolos]);

    const handleZoom = useCallback((z: number) => setZoom(z), []);

    return (
        <div className="bg-white p-6 md:p-10 rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden h-full flex flex-col transition-all duration-500">
            {/* Header */}
            <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h3 className="text-2xl font-black text-gray-900 tracking-tight">Geolocalització d'Actuacions</h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Impacte territorial a Catalunya</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Mode selector */}
                    <div className="bg-gray-100/50 p-1.5 rounded-2xl flex gap-1">
                        {([
                            { key: 'bolos', icon: BarChart3, label: 'Bolos' },
                            { key: 'ingressos', icon: Euro, label: 'Import' },
                            { key: 'heat', icon: Flame, label: 'Calor' },
                        ] as const).map(({ key, icon: Icon, label }) => (
                            <button key={key} onClick={() => setMode(key)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === key ? 'bg-white text-primary shadow-sm' : 'text-gray-400 hover:text-gray-600'
                                    }`}>
                                <Icon size={12} />{label}
                            </button>
                        ))}
                    </div>

                    {/* Cluster toggle (only in circle modes) */}
                    {mode !== 'heat' && (
                        <button
                            onClick={() => setUseClusters(c => !c)}
                            title={useClusters ? 'Desactivar agrupació' : 'Activar agrupació'}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${useClusters
                                ? 'bg-primary/10 text-primary border-primary/20'
                                : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                                }`}
                        >
                            <ZoomIn size={12} />
                            {useClusters ? 'Clústers ON' : 'Clústers OFF'}
                        </button>
                    )}
                </div>
            </div>

            {/* Map */}
            <div className="flex-1 min-h-[450px] md:min-h-[550px] rounded-[2rem] overflow-hidden border border-gray-100 shadow-inner relative z-10">
                <MapContainer
                    center={cataloniaCenter}
                    zoom={8}
                    style={{ height: '100%', width: '100%' }}
                    scrollWheelZoom={true}
                    zoomControl={true}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <MapResizer />
                    <ZoomWatcher onZoom={handleZoom} />

                    {mode === 'heat' ? (
                        <HeatmapLayer points={heatPoints} />
                    ) : (
                        <MarkerClusterGroup
                            chunkedLoading
                            maxClusterRadius={useClusters ? 30 : 0}
                            showCoverageOnHover={false}
                            key={useClusters ? 'clustered' : 'not-clustered'}
                        >
                            {data.map((item, idx) => {
                                const val = mode === 'bolos' ? item.total_bolos : item.total_ingressos;
                                const style = getMarkerStyle(val, mode, zoom);

                                if (style.isPremium) {
                                    return (
                                        <Marker
                                            key={`${item.municipi}-${idx}-${mode}`}
                                            position={[item.lat, item.lng]}
                                            icon={createBootIcon(style.color, style.radius * 2.5)}
                                        >
                                            <Tooltip direction="top" offset={[0, -10]} opacity={1} sticky={false}>
                                                <MarkerTooltip item={item} />
                                            </Tooltip>
                                            <Popup>
                                                <MarkerPopup item={item} />
                                            </Popup>
                                        </Marker>
                                    );
                                }

                                return (
                                    <CircleMarker
                                        key={`${item.municipi}-${idx}-${mode}`}
                                        center={[item.lat, item.lng]}
                                        radius={style.radius}
                                        pathOptions={{ fillColor: style.color, fillOpacity: 0.85, color: 'white', weight: 2 }}
                                    >
                                        <Tooltip direction="top" offset={[0, -5]} opacity={1} sticky={false}>
                                            <MarkerTooltip item={item} />
                                        </Tooltip>
                                        <Popup>
                                            <MarkerPopup item={item} />
                                        </Popup>
                                    </CircleMarker>
                                );
                            })}
                        </MarkerClusterGroup>
                    )}
                </MapContainer>

                {/* Legend/Info Overlay for Heatmap or Circles */}
                {mode === 'heat' ? (
                    <div className="absolute bottom-6 right-6 z-[1000] bg-white/90 backdrop-blur-md p-4 rounded-3xl border border-gray-100 shadow-xl max-w-[200px] animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center gap-2 mb-3">
                            <Flame size={14} className="text-orange-500" />
                            <span className="text-[10px] font-black uppercase tracking-wider text-gray-700">Densitat de Treball</span>
                        </div>
                        <div className="h-2 w-full bg-gradient-to-r from-blue-500 via-green-500 via-yellow-500 via-orange-500 to-red-500 rounded-full mb-2" />
                        <div className="flex justify-between text-[8px] font-bold text-gray-400 uppercase tracking-tighter">
                            <span>Baixa</span>
                            <span>Crítica</span>
                        </div>
                    </div>
                ) : (
                    <div className="absolute bottom-6 right-6 z-[1000] bg-white/90 backdrop-blur-md p-5 rounded-3xl border border-gray-100 shadow-xl min-w-[180px] animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-2">
                            <MapIcon size={14} className="text-primary" />
                            <span className="text-[10px] font-black uppercase tracking-wider text-gray-700">Llegenda {mode === 'bolos' ? 'Bolos' : 'Import'}</span>
                        </div>
                        <div className="space-y-2.5">
                            {mode === 'bolos' ? [
                                { label: '1 bolo', color: '#10b981' },
                                { label: '2-3 bolos', color: '#fbbf24' },
                                { label: '4-6 bolos', color: '#f97316' },
                                { label: '7-9 bolos', color: '#ef4444' },
                                { label: '10+ bolos', color: '#7c1c1c', icon: '🥾' },
                            ].map(item => (
                                <div key={item.label} className="flex items-center gap-3">
                                    <div className="w-4 h-4 rounded-full shrink-0 border border-white shadow-sm flex items-center justify-center text-[8px]" style={{ backgroundColor: item.color }}>
                                        {item.icon}
                                    </div>
                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">{item.label}</span>
                                </div>
                            )) : [
                                { label: '< 500€', color: '#dbeafe' },
                                { label: '500-1k€', color: '#93c5fd' },
                                { label: '1k-2k€', color: '#60a5fa' },
                                { label: '2k-5k€', color: '#2563eb' },
                                { label: '5k+ €', color: '#1e3a8a', icon: '🥾' },
                            ].map(item => (
                                <div key={item.label} className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full shrink-0 border border-white shadow-sm" style={{ backgroundColor: item.color }} />
                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">{item.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Summary row */}
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Municipis', value: data.length },
                    { label: 'Màx. actuacions', value: `${maxBolos} bolos` },
                    { label: 'Tipus de mapa', value: mode === 'heat' ? 'Calor' : mode === 'bolos' ? 'Densitat' : 'Volum €' },
                    { label: 'Zoom actual', value: `${zoom}x` },
                ].map(({ label, value }) => (
                    <div key={label} className="p-4 bg-gray-50/50 rounded-3xl border border-gray-100 hover:bg-white hover:shadow-md transition-all">
                        <p className="text-[9px] font-black text-gray-400 uppercase leading-none mb-1">{label}</p>
                        <p className="text-lg font-black text-gray-900">{value}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Tooltip & Popup subcomponents ──
function MarkerTooltip({ item }: { item: MapData }) {
    return (
        <div className="p-2 min-w-[130px]">
            <p className="font-black text-xs uppercase text-gray-900 mb-1.5 border-b border-gray-100 pb-1">{item.municipi}</p>
            <div className="space-y-1">
                <div className="flex justify-between text-[9px]">
                    <span className="font-bold text-gray-400 uppercase">Bolos</span>
                    <span className="font-black">{item.total_bolos}</span>
                </div>
                <div className="flex justify-between text-[9px]">
                    <span className="font-bold text-gray-400 uppercase">Total</span>
                    <span className="font-black">{Math.round(item.total_ingressos)}€</span>
                </div>
                <div className="flex justify-between text-[9px]">
                    <span className="font-bold text-gray-400 uppercase">Mitjana</span>
                    <span className="font-black">{Math.round(item.total_ingressos / item.total_bolos)}€</span>
                </div>
            </div>
        </div>
    );
}

function MarkerPopup({ item }: { item: MapData }) {
    return (
        <div className="p-2 min-w-[170px]">
            <p className="font-black text-sm uppercase text-gray-900 mb-2">{item.municipi}</p>
            <div className="space-y-1.5">
                <div className="flex justify-between items-center bg-primary/5 p-2 rounded-xl">
                    <span className="text-[10px] font-bold text-primary/70 uppercase">Actuacions</span>
                    <span className="text-base font-black text-primary">{item.total_bolos}</span>
                </div>
                <div className="flex justify-between items-center bg-gray-50 p-2 rounded-xl">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Ingressos</span>
                    <span className="text-sm font-black text-gray-900">{Math.round(item.total_ingressos)}€</span>
                </div>
                <div className="flex justify-between items-center bg-gray-50 p-2 rounded-xl">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Mitjana</span>
                    <span className="text-sm font-black text-gray-900">{Math.round(item.total_ingressos / item.total_bolos)}€</span>
                </div>
            </div>
        </div>
    );
}
