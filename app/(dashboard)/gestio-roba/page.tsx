'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
// Bolo type managed as any type locally for simplicity in this dashboard view

import { CatalogType, InventoryCatalogItem, InventoryStock, InventoryItem, MaterialLoan } from '@/types/clothing';
import { Bolo, BoloMusic, Music } from '@/types'; // Import main types
import { format } from 'date-fns';
import { ca } from 'date-fns/locale';

// Components (we will build these next)
import InventoryManager from './components/InventoryManager';
import BoloAssignments from './components/BoloAssignments';
import GlobalSummary from './components/GlobalSummary';
import PrevisioMaterial from './components/PrevisioMaterial';

interface ExtendedBoloMusic extends BoloMusic {
    music: Music;
}

export default function GestioRobaPage() {
    const supabase = createClient();
    const [activeTab, setActiveTab] = useState<'bolos' | 'global' | 'inventory' | 'forecast'>('forecast');
    const [temporada, setTemporada] = useState<'Hivern' | 'Estiu'>('Hivern');
    const [bolos, setBolos] = useState<any[]>([]); // Using any for simplicity or define interface
    const [boloMusics, setBoloMusics] = useState<ExtendedBoloMusic[]>([]);
    const [selectedBoloId, setSelectedBoloId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Global Data State (Shared across components)
    const [catalog, setCatalog] = useState<InventoryCatalogItem[]>([]);
    const [stock, setStock] = useState<InventoryStock[]>([]);
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [loans, setLoans] = useState<MaterialLoan[]>([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async (silent = false) => {
        if (silent) setRefreshing(true);
        else setLoading(true);
        try {
            const [
                { data: bolosData },
                { data: catalogData },
                { data: stockData },
                { data: itemsData },
                { data: loansData },
                { data: boloMusicsData }
            ] = await Promise.all([
                supabase.from('bolos').select('*').order('data_bolo', { ascending: false }).limit(50),
                supabase.from('inventory_catalog').select('*'),
                supabase.from('inventory_stock').select('*, catalog:inventory_catalog(*)'),
                supabase.from('inventory_items').select('*, catalog:inventory_catalog(*)'),
                supabase.from('material_loans').select(`
                    *,
                    bolo:bolos(nom_poble, data_bolo),
                    suplent:musics(nom, tipus),
                    stock:inventory_stock(id, size, quantity_total, catalog_id),
                    item:inventory_items(id, identifier, catalog_id)
                `),
                supabase.from('bolo_musics').select('*, music:musics(*)')
            ]);

            setBolos(bolosData || []);
            setCatalog(catalogData || []);
            setStock(stockData || []);
            setItems(itemsData || []);
            setLoans(loansData || []);
            setBoloMusics(boloMusicsData as unknown as ExtendedBoloMusic[] || []);

        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Shared refresh function
    const refreshData = () => loadData(true);

    return (
        <div className="p-4 sm:p-8 space-y-6 sm:space-y-10 min-h-screen bg-white">
            <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 border-b-4 sm:border-b-8 border-primary pb-6 sm:pb-8">
                <div>
                    <h1 className="text-4xl sm:text-6xl font-black text-primary flex items-center gap-4 uppercase tracking-tighter">
                        <span className="material-icons-outlined text-indigo-700 text-4xl sm:text-6xl">checkroom</span>
                        Material
                    </h1>
                    <p className="text-gray-500 text-sm sm:text-lg font-black mt-2 uppercase tracking-[0.2em] sm:tracking-[0.3em]">Gestió d'estoc i préstecs</p>
                </div>

                <div className="flex flex-wrap items-center gap-4 sm:gap-6 w-full lg:w-auto">
                    {/* Season Toggle */}
                    <div className="bg-white p-1.5 sm:p-2 rounded-xl sm:rounded-2xl border-2 sm:border-4 border-primary flex gap-1 sm:gap-2 shadow-[2px_2px_0px_0px_rgba(124,28,28,1)] sm:shadow-[4px_4px_0px_0px_rgba(124,28,28,1)] flex-1 sm:flex-none justify-center">
                        <button
                            onClick={() => setTemporada('Hivern')}
                            className={`px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black tracking-widest transition-all uppercase flex items-center gap-2 ${temporada === 'Hivern'
                                ? 'bg-indigo-600 text-white'
                                : 'text-gray-400 hover:bg-gray-50'
                                }`}
                        >
                            <span className="material-icons-outlined text-xs sm:text-sm">ac_unit</span>
                            <span className="hidden sm:inline">Hivern</span>
                        </button>
                        <button
                            onClick={() => setTemporada('Estiu')}
                            className={`px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black tracking-widest transition-all uppercase flex items-center gap-2 ${temporada === 'Estiu'
                                ? 'bg-orange-500 text-white'
                                : 'text-gray-400 hover:bg-gray-50'
                                }`}
                        >
                            <span className="material-icons-outlined text-xs sm:text-sm">wb_sunny</span>
                            <span className="hidden sm:inline">Estiu</span>
                        </button>
                    </div>

                    <button
                        onClick={refreshData}
                        className="p-3 sm:p-4 bg-white hover:bg-gray-50 border-2 sm:border-4 border-primary rounded-xl sm:rounded-2xl shadow-[2px_2px_0px_0px_rgba(124,28,28,1)] sm:shadow-[4px_4px_0px_0px_rgba(124,28,28,1)] active:translate-y-0.5 active:shadow-none transition-all relative"
                    >
                        <span className={`material-icons-outlined text-primary text-xl sm:text-2xl ${refreshing ? 'animate-spin' : ''}`}>refresh</span>
                        {refreshing && (
                            <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-[8px] font-black px-1 py-0.5 rounded-full animate-bounce shadow-sm">
                                ...
                            </span>
                        )}
                    </button>
                </div>
            </header>

            {/* Main Tabs */}
            <nav className="flex flex-wrap gap-2 sm:gap-4 overflow-x-auto no-scrollbar pb-2">
                {[
                    { id: 'forecast', label: 'Propera Previsió', icon: 'visibility' },
                    { id: 'bolos', label: 'Assignació', icon: 'assignment' },
                    { id: 'global', label: 'Préstecs', icon: 'inventory' },
                    { id: 'inventory', label: 'Catàleg', icon: 'analytics' },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`
                            px-4 sm:px-8 py-3 sm:py-5 rounded-xl sm:rounded-2xl border-2 sm:border-4 border-primary font-black text-[10px] sm:text-sm uppercase tracking-widest flex items-center gap-2 sm:gap-3 transition-all whitespace-nowrap
                            ${activeTab === tab.id
                                ? 'bg-primary text-white translate-y-0.5 shadow-none'
                                : 'bg-white text-primary shadow-[3px_3px_0px_0px_rgba(124,28,28,1)] sm:shadow-[6px_6px_0px_0px_rgba(124,28,28,1)] hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_0px_rgba(124,28,28,1)]'
                            }
                        `}
                    >
                        <span className="material-icons-outlined text-lg sm:text-xl">{tab.icon}</span>
                        {tab.label}
                    </button>
                ))}
            </nav>

            {loading ? (
                <div className="flex-1 flex justify-center items-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                </div>
            ) : (
                <main className="flex-1 overflow-visible flex flex-col">
                    {activeTab === 'forecast' && (
                        <PrevisioMaterial
                            bolos={bolos}
                            boloMusics={boloMusics}
                            loans={loans}
                            temporada={temporada}
                        />
                    )}
                    {activeTab === 'global' && (
                        <GlobalSummary
                            loans={loans}
                            catalog={catalog}
                            stock={stock}
                            items={items}
                            onUpdate={refreshData}
                            temporada={temporada}
                        />
                    )}
                    {activeTab === 'bolos' && (
                        <BoloAssignments
                            bolos={bolos}
                            selectedBoloId={selectedBoloId}
                            setSelectedBoloId={setSelectedBoloId}
                            catalog={catalog}
                            stock={stock}
                            items={items}
                            loans={loans}
                            onUpdate={refreshData}
                        />
                    )}
                    {activeTab === 'inventory' && (
                        <InventoryManager
                            catalog={catalog}
                            stock={stock}
                            items={items}
                            onUpdate={refreshData}
                        />
                    )}
                </main>
            )}
        </div>
    );
}
