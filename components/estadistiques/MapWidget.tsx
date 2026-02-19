'use client';

import { MapContainer, TileLayer, CircleMarker, Tooltip, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import { useState, useEffect, useMemo } from 'react';
import { BarChart3, Euro, Flame, Map as MapIcon } from 'lucide-react';

// Fix for default marker icons in Leaflet
const DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

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

// Custom component for the heatmap layer
function HeatmapLayer({ points }: { points: [number, number, number][] }) {
    const map = useMap();

    useEffect(() => {
        if (!map) return;

        // @ts-ignore - leaflet.heat is not in the standard leaflet types
        const heatLayer = L.heatLayer(points, {
            radius: 25,
            blur: 15,
            maxZoom: 10,
            gradient: { 0.4: 'blue', 0.6: 'cyan', 0.7: 'lime', 0.8: 'yellow', 1.0: 'red' }
        }).addTo(map);

        return () => {
            map.removeLayer(heatLayer);
        };
    }, [map, points]);

    return null;
}

function MapResizer() {
    const map = useMap();
    useEffect(() => {
        setTimeout(() => {
            map.invalidateSize();
        }, 100);
    }, [map]);
    return null;
}

export default function MapWidget({ data, initialMode = 'bolos' }: MapWidgetProps) {
    const [mode, setMode] = useState<'bolos' | 'ingressos' | 'heat'>(initialMode);
    const cataloniaCenter: [number, number] = [41.7, 1.8]; // Central point of Catalonia

    const getRadius = (item: MapData) => {
        const val = mode === 'bolos' ? item.total_bolos : item.total_ingressos / 1000;
        return Math.min(Math.max(val * 4, 8), 45);
    };

    const getColor = (item: MapData) => {
        const val = mode === 'bolos' ? item.total_bolos : item.total_ingressos;
        if (mode === 'bolos') {
            if (val > 10) return '#7c1c1c';
            if (val > 5) return '#b91c1c';
            if (val > 2) return '#ef4444';
            return '#f87171';
        } else {
            if (val > 5000) return '#7c1c1c';
            if (val > 2000) return '#b91c1c';
            if (val > 500) return '#ef4444';
            return '#f87171';
        }
    };

    // Prepare heatmap points: [lat, lng, intensity]
    const heatPoints = useMemo(() => {
        return data.map(d => [d.lat, d.lng, d.total_bolos] as [number, number, number]);
    }, [data]);

    return (
        <div className="bg-white p-6 md:p-10 rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden h-full flex flex-col transition-all duration-500">
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h3 className="text-2xl font-black text-gray-900 tracking-tight">Geolocalització d'Actuacions</h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Impacte territorial a Catalunya</p>
                </div>
                <div className="bg-gray-100/50 p-1.5 rounded-2xl flex flex-wrap gap-1 self-start">
                    <button
                        onClick={() => setMode('bolos')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${mode === 'bolos'
                                ? 'bg-white text-primary shadow-sm'
                                : 'text-gray-400 hover:text-gray-600'
                            }`}
                    >
                        <BarChart3 size={14} />
                        Densitat Bolos
                    </button>
                    <button
                        onClick={() => setMode('ingressos')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${mode === 'ingressos'
                                ? 'bg-white text-primary shadow-sm'
                                : 'text-gray-400 hover:text-gray-600'
                            }`}
                    >
                        <Euro size={14} />
                        Volum Facturat
                    </button>
                    <button
                        onClick={() => setMode('heat')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${mode === 'heat'
                                ? 'bg-white text-primary shadow-sm'
                                : 'text-gray-400 hover:text-gray-600'
                            }`}
                    >
                        <Flame size={14} />
                        Mapa Calor
                    </button>
                </div>
            </div>

            <div className="flex-1 min-h-[450px] md:min-h-[550px] rounded-[2rem] overflow-hidden border border-gray-100 shadow-inner relative z-10">
                <MapContainer
                    center={cataloniaCenter}
                    zoom={8}
                    style={{ height: '100%', width: '100%' }}
                    scrollWheelZoom={false}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <MapResizer />

                    {mode === 'heat' ? (
                        <HeatmapLayer points={heatPoints} />
                    ) : (
                        data.map((item, idx) => (
                            <CircleMarker
                                key={`${item.municipi}-${idx}-${mode}`}
                                center={[item.lat, item.lng]}
                                radius={getRadius(item)}
                                pathOptions={{
                                    fillColor: getColor(item),
                                    fillOpacity: 0.7,
                                    color: 'white',
                                    weight: 2
                                }}
                            >
                                <Tooltip direction="top" offset={[0, -5]} opacity={1}>
                                    <div className="p-3 min-w-[140px]">
                                        <p className="font-black text-xs uppercase tracking-tight text-gray-900 mb-2 border-b border-gray-100 pb-1">{item.municipi}</p>
                                        <div className="space-y-1.5">
                                            <div className="flex justify-between items-baseline">
                                                <span className="text-[9px] font-bold text-gray-400 uppercase">Actuacions</span>
                                                <span className="text-[11px] font-black">{item.total_bolos}</span>
                                            </div>
                                            <div className="flex justify-between items-baseline">
                                                <span className="text-[9px] font-bold text-gray-400 uppercase">Total</span>
                                                <span className="text-[11px] font-black">{Math.round(item.total_ingressos)}€</span>
                                            </div>
                                            <div className="flex justify-between items-baseline">
                                                <span className="text-[9px] font-bold text-gray-400 uppercase">Mitjana</span>
                                                <span className="text-[11px] font-black">{Math.round(item.total_ingressos / item.total_bolos)}€</span>
                                            </div>
                                        </div>
                                    </div>
                                </Tooltip>
                                <Popup>
                                    <div className="p-2 min-w-[180px]">
                                        <p className="font-black text-sm uppercase tracking-tight text-gray-900 mb-3">{item.municipi}</p>
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center bg-primary/5 p-2 rounded-xl">
                                                <span className="text-[10px] font-bold text-primary/70 uppercase">Bolos</span>
                                                <span className="text-base font-black text-primary">{item.total_bolos}</span>
                                            </div>
                                            <div className="flex justify-between items-center bg-gray-50 p-2 rounded-xl">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase">Facturació</span>
                                                <span className="text-base font-black text-gray-900">{Math.round(item.total_ingressos)}€</span>
                                            </div>
                                        </div>
                                    </div>
                                </Popup>
                            </CircleMarker>
                        ))
                    )}
                </MapContainer>
            </div>

            <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="p-5 bg-gray-50/50 rounded-3xl border border-gray-100 hover:bg-white hover:shadow-md transition-all">
                    <p className="text-[9px] font-black text-gray-400 uppercase leading-none mb-2">Municipis Visitats</p>
                    <p className="text-2xl font-black text-gray-900">{data.length}</p>
                </div>
                <div className="p-5 bg-gray-50/50 rounded-3xl border border-gray-100 hover:bg-white hover:shadow-md transition-all">
                    <p className="text-[9px] font-black text-gray-400 uppercase leading-none mb-2">Màxima Intensitat</p>
                    <p className="text-2xl font-black text-gray-900">
                        {mode === 'heat' ? 'Alta Densitat' : (mode === 'bolos' ? `${Math.max(...data.map(d => d.total_bolos), 0)} bolos` : `${Math.round(Math.max(...data.map(d => d.total_ingressos), 0))}€`)}
                    </p>
                </div>
                <div className="hidden md:block p-5 bg-gray-50/50 rounded-3xl border border-gray-100 hover:bg-white hover:shadow-md transition-all">
                    <p className="text-[9px] font-black text-gray-400 uppercase leading-none mb-2">Tipus de Mapa</p>
                    <div className="flex items-center gap-2">
                        {mode === 'heat' ? <Flame size={16} className="text-orange-500" /> : <MapIcon size={16} className="text-primary" />}
                        <p className={`text-xs font-black uppercase tracking-widest ${mode === 'heat' ? 'text-orange-500' : 'text-primary'}`}>
                            {mode === 'heat' ? 'Mapa de Calor' : (mode === 'bolos' ? 'Densitat Bolos' : 'Volum Facturat')}
                        </p>
                    </div>
                </div>
                <div className="hidden md:block p-5 bg-gray-50/50 rounded-3xl border border-gray-100 hover:bg-white hover:shadow-md transition-all">
                    <p className="text-[9px] font-black text-gray-400 uppercase leading-none mb-2">Regió</p>
                    <p className="text-xs font-bold text-gray-900 uppercase">Catalunya (Totes les Províncies)</p>
                </div>
            </div>
        </div>
    );
}
