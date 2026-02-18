'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Bolo, Client } from '@/types';
import { format, addMonths } from 'date-fns';

export default function PressupostosPage() {
    const supabase = createClient();
    const [bolos, setBolos] = useState<Bolo[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [bolosWithQuotes, setBolosWithQuotes] = useState<Set<number>>(new Set());
    const [bolosWithInvoices, setBolosWithInvoices] = useState<Set<number>>(new Set());
    const [showAllBolos, setShowAllBolos] = useState(false);
    const [yearFilter, setYearFilter] = useState<string>('all');
    const [availableYears, setAvailableYears] = useState<string[]>([]);

    // Modals & Selection
    const [modalOpen, setModalOpen] = useState<'pressupost' | 'factura' | null>(null);
    const [selectedBoloId, setSelectedBoloId] = useState<number | null>(null);
    const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
    const [articles, setArticles] = useState<{ descripcio: string; preu: number; quantitat: number }[]>([]);
    const [manualNumber, setManualNumber] = useState('');
    const [selectedBolo, setSelectedBolo] = useState<Bolo | null>(null);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);

    // Preview state
    const [showPreview, setShowPreview] = useState(false);
    const [descriptionText, setDescriptionText] = useState('');
    const [pdfGenerating, setPdfGenerating] = useState(false);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        const [bolosRes, clientsRes, quotesRes, invoicesRes] = await Promise.all([
            supabase.from('bolos').select('*').order('data_bolo', { ascending: false }),
            supabase.from('clients').select('*').order('nom'),
            supabase.from('quote_records').select('bolo_id'),
            supabase.from('invoice_records').select('bolo_id')
        ]);

        const b = bolosRes.data || [];
        setBolos(b);
        setClients(clientsRes.data || []);

        // Track which bolos already have documents
        const qIds = new Set<number>((quotesRes.data || []).filter((q: any) => q.bolo_id).map((q: any) => q.bolo_id));
        const iIds = new Set<number>((invoicesRes.data || []).filter((i: any) => i.bolo_id).map((i: any) => i.bolo_id));
        setBolosWithQuotes(qIds);
        setBolosWithInvoices(iIds);

        // Extract years for filtering
        const years = Array.from(new Set(b.map((x: any) => new Date(x.data_bolo).getFullYear().toString()))).sort().reverse() as string[];
        setAvailableYears(years);

        setLoading(false);
    };

    const handleBoloChange = async (boloId: number) => {
        setSelectedBoloId(boloId);
        const b = bolos.find(x => x.id === boloId);
        if (b) {
            setSelectedBolo(b);
            setArticles([{ descripcio: 'Actuació', preu: b.import_total || 0, quantitat: 1 }]);
            if (b.client_id) {
                handleClientChange(b.client_id);
            }
        }
    };

    const handleClientChange = (clientId: string) => {
        setSelectedClientId(clientId);
        const c = clients.find(x => x.id === clientId);
        if (c) {
            setSelectedClient(c);
        }
    };

    const handleOpenPreviewComp = async () => {
        if (!selectedBolo || !selectedClient || !modalOpen) {
            alert('Selecciona un bolo i un client primer.');
            return;
        }

        // Fetch counter
        const currentYear = new Date().getFullYear().toString().slice(-2);
        const { data: config } = await supabase.from('app_config').select('value').eq('key', 'invoice_counter').single();
        let nextNum = 1;
        if (config?.value) {
            const val = config.value as { last_number: number; year: number };
            if (val.year === parseInt(currentYear)) nextNum = val.last_number + 1;
        }
        setManualNumber(`${currentYear}/${nextNum.toString().padStart(3, '0')}`);

        // Fetch instrument counts for description
        const { data: instrData } = await supabase
            .from('bolo_musics')
            .select('musics(instruments)')
            .eq('bolo_id', selectedBolo.id)
            .neq('estat', 'no')
            .neq('estat', 'baixa');

        const counts: Record<string, number> = {};
        instrData?.forEach((row: any) => {
            if (row.musics?.instruments) {
                const instr = row.musics.instruments.toLowerCase();
                counts[instr] = (counts[instr] || 0) + 1;
            }
        });

        // Try to import utils to generate initial description if needed
        const { generateDescriptionText } = await import('@/lib/pdf-utils');
        const initialText = generateDescriptionText(modalOpen, selectedBolo, selectedClient, counts);
        setDescriptionText(initialText);
        setShowPreview(true);
    };

    const handleBoloUpdateField = async (field: keyof Bolo, value: any) => {
        if (!selectedBolo) return;
        try {
            const { error } = await supabase.from('bolos').update({ [field]: value }).eq('id', selectedBolo.id);
            if (error) throw error;
            setSelectedBolo({ ...selectedBolo, [field]: value });
            // Update the bolos list too to keep it sync
            setBolos(bolos.map(b => b.id === selectedBolo.id ? { ...b, [field]: value } : b));
        } catch (e) {
            console.error("Error updating bolo:", e);
        }
    };

    const handleGeneratePDF = async () => {
        if (!modalOpen || !selectedBolo || !selectedClient) return;
        setPdfGenerating(true);
        try {
            const payload = {
                type: modalOpen,
                number: manualNumber,
                date: format(new Date(), 'dd/MM/yyyy'),
                dueDate: modalOpen === 'factura' ? format(addMonths(new Date(), 3), 'dd/MM/yyyy') : undefined,
                client: {
                    nom: selectedClient.nom,
                    nif: selectedClient.nif,
                    adreca: selectedClient.adreca,
                    poblacio: selectedClient.poblacio,
                    codi_postal: selectedClient.codi_postal
                },
                bolo: {
                    id: selectedBolo.id, // Passem la ID per al backend
                    nom_poble: selectedBolo.nom_poble,
                    concepte: selectedBolo.concepte,
                    durada: selectedBolo.durada,
                    data: selectedBolo.data_bolo,
                    hora: selectedBolo.hora_inici || selectedBolo.hora,
                    nombre_musics: selectedBolo.num_musics
                },
                articles: articles,
                total: articles.reduce((acc: number, art: any) => acc + (art.preu * art.quantitat), 0),
                descriptionText: descriptionText,
                bolo_id: selectedBolo.id // També el passem directament per si de cas
            };

            // Fem la crida al nostre BACKEND API que genera i guarda l'arxiu
            const response = await fetch('/api/pdf/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.details || errorData.error || 'Error generant el PDF');
            }

            // Descarregar el PDF rebut del servidor
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${modalOpen}_${manualNumber.replace('/', '-')}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);

            alert('Document generat, registrat i guardat correctament!');
            resetForm();
        } catch (error: any) {
            console.error("Process error:", error);
            alert('Error: ' + error.message);
        } finally {
            setPdfGenerating(false);
            setShowPreview(false);
        }
    };

    const resetForm = () => {
        setSelectedBoloId(null);
        setSelectedClientId(null);
        setSelectedBolo(null);
        setSelectedClient(null);
        setArticles([]);
        setModalOpen(null);
        setShowPreview(false);
    };

    return (
        <div className="p-2 sm:p-8 max-w-6xl mx-auto space-y-6 sm:space-y-8">
            <h1 className="text-4xl font-black text-gray-900 tracking-tight">Pressupost i facturació</h1>
            <p className="text-gray-500 font-medium tracking-tight">Generació instantània de documents i registre automàtic des del catàleg global.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Pressupost Card */}
                <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
                    <div className="flex items-center mb-6 text-blue-600">
                        <div className="p-3 bg-blue-50 rounded-2xl mr-4 group-hover:scale-110 transition-transform">
                            <span className="material-icons-outlined text-3xl">description</span>
                        </div>
                        <h2 className="text-2xl font-black">Pressupost</h2>
                    </div>
                    <p className="text-gray-500 mb-8 text-sm leading-relaxed">Genera una proposta formal per a un client.</p>
                    <button onClick={() => setModalOpen('pressupost')} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-blue-600 transition-colors shadow-lg">
                        Nou Pressupost
                    </button>
                    <div className="absolute top-0 right-0 p-8 transform translate-x-12 -translate-y-12 opacity-5 pointer-events-none">
                        <span className="material-icons-outlined text-[150px]">description</span>
                    </div>
                </div>

                {/* Factura Card */}
                <div className="bg-white p-8 rounded-3xl border-2 border-primary/10 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
                    <div className="flex items-center mb-6 text-primary">
                        <div className="p-3 bg-red-50 rounded-2xl mr-4 group-hover:scale-110 transition-transform">
                            <span className="material-icons-outlined text-3xl">receipt_long</span>
                        </div>
                        <h2 className="text-2xl font-black">Factura</h2>
                    </div>
                    <p className="text-gray-500 mb-8 text-sm leading-relaxed">Registra el cobrament d'una actuació finalitzada.</p>
                    <button onClick={() => setModalOpen('factura')} className="w-full py-4 bg-primary text-white rounded-2xl font-bold hover:bg-red-900 transition-colors shadow-lg">
                        Nova Factura
                    </button>
                    <div className="absolute top-0 right-0 p-8 transform translate-x-12 -translate-y-12 opacity-5 pointer-events-none">
                        <span className="material-icons-outlined text-[150px]">receipt_long</span>
                    </div>
                </div>
            </div>

            {/* Modal de Formulari */}
            {modalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-start sm:items-center justify-center z-50 p-2 sm:p-4 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-white rounded-2xl sm:rounded-3xl max-w-5xl w-full p-4 sm:p-8 shadow-2xl space-y-6 sm:space-y-8 my-auto max-h-[96vh] sm:max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center border-b border-gray-100 pb-6">
                            <h3 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">
                                {modalOpen === 'pressupost' ? 'Nou Pressupost' : 'Nova Factura'}
                            </h3>
                            <button onClick={() => setModalOpen(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400">
                                <span className="material-icons-outlined">close</span>
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            {/* Selecció i Dades Bolo */}
                            <div className="space-y-6">
                                <h4 className="font-black text-xs uppercase tracking-widest text-primary">1. Selecció del Bolo i Dades</h4>
                                <div className="space-y-4 bg-gray-50 p-6 rounded-2xl border border-gray-100">
                                    <div>
                                        <div className="flex justify-between items-end mb-1">
                                            <label className="block text-[10px] font-black uppercase text-gray-400">Bolo de Referència</label>
                                            <div className="flex items-center gap-4">
                                                {showAllBolos && (
                                                    <select
                                                        value={yearFilter}
                                                        onChange={(e) => setYearFilter(e.target.value)}
                                                        className="text-[10px] font-bold border-none bg-transparent p-0 focus:ring-0 text-primary cursor-pointer"
                                                    >
                                                        <option value="all">Tots els anys</option>
                                                        {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                                                    </select>
                                                )}
                                                <label className="flex items-center gap-1.5 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={showAllBolos}
                                                        onChange={(e) => setShowAllBolos(e.target.checked)}
                                                        className="w-3 h-3 rounded border-gray-300 text-primary focus:ring-primary"
                                                    />
                                                    <span className="text-[10px] font-bold uppercase text-gray-500">Repetir / Veure tots</span>
                                                </label>
                                            </div>
                                        </div>
                                        <select
                                            className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary font-bold text-sm"
                                            value={selectedBoloId || ''}
                                            onChange={(e) => handleBoloChange(Number(e.target.value))}
                                        >
                                            <option value="">-- Tria un bolo --</option>
                                            {bolos
                                                .filter(b => {
                                                    // Filter by year if in showAllBolos and yearFilter is not 'all'
                                                    if (showAllBolos && yearFilter !== 'all') {
                                                        const bYear = new Date(b.data_bolo).getFullYear().toString();
                                                        if (bYear !== yearFilter) return false;
                                                    }
                                                    // If not showing all, filter those that already have document of this type
                                                    if (!showAllBolos) {
                                                        if (modalOpen === 'pressupost' && bolosWithQuotes.has(b.id)) return false;
                                                        if (modalOpen === 'factura' && bolosWithInvoices.has(b.id)) return false;
                                                    }
                                                    return true;
                                                })
                                                .map(b => (
                                                    <option key={b.id} value={b.id}>{b.nom_poble} ({new Date(b.data_bolo).toLocaleDateString()})</option>
                                                ))
                                            }
                                        </select>
                                    </div>
                                    {selectedBolo && (
                                        <div className="grid grid-cols-2 gap-3 mt-4">
                                            <div className="col-span-2">
                                                <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Poble / Ubicació</label>
                                                <input
                                                    type="text"
                                                    value={selectedBolo.nom_poble}
                                                    onChange={(e) => setSelectedBolo({ ...selectedBolo, nom_poble: e.target.value })}
                                                    onBlur={(e) => handleBoloUpdateField('nom_poble', e.target.value)}
                                                    className="w-full p-2 bg-white border border-gray-200 rounded-lg text-sm font-bold"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Concepte</label>
                                                <input
                                                    type="text"
                                                    value={selectedBolo.concepte || ''}
                                                    onChange={(e) => setSelectedBolo({ ...selectedBolo, concepte: e.target.value })}
                                                    onBlur={(e) => handleBoloUpdateField('concepte', e.target.value)}
                                                    className="w-full p-2 bg-white border border-gray-200 rounded-lg text-sm font-bold"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Durada (min)</label>
                                                <input
                                                    type="number"
                                                    value={selectedBolo.durada || ''}
                                                    onChange={(e) => setSelectedBolo({ ...selectedBolo, durada: parseInt(e.target.value) || 0 })}
                                                    onBlur={(e) => handleBoloUpdateField('durada', parseInt(e.target.value) || 0)}
                                                    className="w-full p-2 bg-white border border-gray-200 rounded-lg text-sm font-bold"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Data</label>
                                                <input
                                                    type="date"
                                                    value={selectedBolo.data_bolo}
                                                    onChange={(e) => setSelectedBolo({ ...selectedBolo, data_bolo: e.target.value })}
                                                    onBlur={(e) => handleBoloUpdateField('data_bolo', e.target.value)}
                                                    className="w-full p-2 bg-white border border-gray-200 rounded-lg text-sm font-bold"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Hora</label>
                                                <input
                                                    type="time"
                                                    value={selectedBolo.hora_inici || selectedBolo.hora || ''}
                                                    onChange={(e) => setSelectedBolo({ ...selectedBolo, hora_inici: e.target.value })}
                                                    onBlur={(e) => handleBoloUpdateField('hora_inici', e.target.value)}
                                                    className="w-full p-2 bg-white border border-gray-200 rounded-lg text-sm font-bold"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Client Section */}
                            <div className="space-y-6">
                                <h4 className="font-black text-xs uppercase tracking-widest text-primary">2. Dades del Client</h4>
                                <div className="space-y-4 bg-gray-50 p-6 rounded-2xl border border-gray-100">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Selecciona Client existent</label>
                                        <select
                                            className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary font-bold text-sm"
                                            value={selectedClientId || ''}
                                            onChange={(e) => handleClientChange(e.target.value)}
                                        >
                                            <option value="">-- Tria un client --</option>
                                            {clients.map(c => (
                                                <option key={c.id} value={c.id}>{c.nom}</option>
                                            ))}
                                        </select>
                                    </div>
                                    {selectedClient && (
                                        <div className="space-y-3 mt-2">
                                            <div>
                                                <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Nom Fiscal / Entitat</label>
                                                <input type="text" value={selectedClient.nom} onChange={(e) => setSelectedClient({ ...selectedClient, nom: e.target.value })} className="w-full p-2 bg-white border border-gray-200 rounded-lg text-sm font-bold" />
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">NIF / CIF</label>
                                                    <input type="text" value={selectedClient.nif || ''} onChange={(e) => setSelectedClient({ ...selectedClient, nif: e.target.value })} className="w-full p-2 bg-white border border-gray-200 rounded-lg text-sm font-bold" />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Adreça</label>
                                                    <input type="text" value={selectedClient.adreca || ''} onChange={(e) => setSelectedClient({ ...selectedClient, adreca: e.target.value })} className="w-full p-2 bg-white border border-gray-200 rounded-lg text-sm font-bold" />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Articles Logic */}
                        <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                <h4 className="font-black text-xs uppercase tracking-widest text-primary">3. Detalls econòmics (Articles)</h4>
                                <button
                                    onClick={() => setArticles([...articles, { descripcio: '', preu: 0, quantitat: 1 }])}
                                    className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-full font-bold transition-all shadow-md active:scale-95 flex items-center gap-1"
                                >
                                    <span className="material-icons-outlined text-sm">add</span> Afegir Article
                                </button>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-2xl sm:rounded-3xl border border-gray-100 space-y-3">
                                {articles.length === 0 && <p className="text-center text-gray-400 text-xs py-4">No hi ha cap article. Afegeix-ne un per començar.</p>}

                                {articles.length > 0 && (
                                    <div className="hidden md:grid grid-cols-12 gap-3 px-3 mb-1">
                                        <div className="col-span-6 text-[10px] font-black uppercase text-gray-400">Descripció</div>
                                        <div className="col-span-2 text-[10px] font-black uppercase text-gray-400 text-right">Preu</div>
                                        <div className="col-span-1"></div>
                                        <div className="col-span-1 text-[10px] font-black uppercase text-gray-400 text-center">Quant.</div>
                                        <div className="col-span-1 text-[10px] font-black uppercase text-gray-400 text-right">Total</div>
                                        <div className="col-span-1"></div>
                                    </div>
                                )}

                                {articles.map((art, idx) => (
                                    <div key={idx} className="flex flex-col md:grid md:grid-cols-12 gap-3 items-start md:items-center bg-white p-4 md:p-3 rounded-2xl border border-gray-100 shadow-sm">
                                        <div className="w-full md:col-span-6">
                                            <div className="md:hidden text-[10px] font-black uppercase text-gray-400 mb-1">Descripció</div>
                                            <input
                                                type="text"
                                                className="w-full bg-transparent border md:border-none focus:ring-0 font-bold text-sm"
                                                placeholder="Descripció de l'article o servei..."
                                                value={art.descripcio}
                                                onChange={(e) => {
                                                    const newArts = [...articles];
                                                    newArts[idx].descripcio = e.target.value;
                                                    setArticles(newArts);
                                                }}
                                            />
                                        </div>

                                        <div className="w-full grid grid-cols-3 md:contents gap-2">
                                            <div className="md:col-span-2">
                                                <div className="md:hidden text-[10px] font-black uppercase text-gray-400 mb-1 text-right">Preu</div>
                                                <input
                                                    type="number"
                                                    className="w-full bg-transparent border md:border-none focus:ring-0 font-bold text-right text-sm"
                                                    placeholder="Preu"
                                                    value={art.preu}
                                                    onChange={(e) => {
                                                        const newArts = [...articles];
                                                        newArts[idx].preu = parseFloat(e.target.value) || 0;
                                                        setArticles(newArts);
                                                    }}
                                                />
                                            </div>
                                            <div className="hidden md:flex md:col-span-1 text-center font-bold text-gray-300 items-center justify-center">×</div>
                                            <div className="md:col-span-1">
                                                <div className="md:hidden text-[10px] font-black uppercase text-gray-400 mb-1 text-center">Quant.</div>
                                                <input
                                                    type="number"
                                                    className="w-full bg-transparent border md:border-none focus:ring-0 font-bold text-center text-sm"
                                                    value={art.quantitat}
                                                    onChange={(e) => {
                                                        const newArts = [...articles];
                                                        newArts[idx].quantitat = parseInt(e.target.value) || 0;
                                                        setArticles(newArts);
                                                    }}
                                                />
                                            </div>
                                            <div className="md:col-span-1 text-right flex flex-col justify-end h-full">
                                                <div className="md:hidden text-[10px] font-black uppercase text-gray-400 mb-1">Total</div>
                                                <div className="font-black text-primary text-sm whitespace-nowrap">
                                                    {(art.preu * art.quantitat).toFixed(2)}€
                                                </div>
                                            </div>
                                        </div>

                                        <div className="w-full md:col-span-1 text-right mt-2 md:mt-0 pt-2 md:pt-0 border-t md:border-none border-gray-100">
                                            <button onClick={() => setArticles(articles.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600 transition-colors flex items-center justify-center w-full md:w-auto p-2 bg-red-50 md:bg-transparent rounded-lg">
                                                <span className="material-icons-outlined text-sm mr-1 md:mr-0">delete</span>
                                                <span className="md:hidden font-bold text-xs uppercase">Eliminar</span>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {articles.length > 0 && (
                                    <div className="flex justify-end md:pr-12 pt-4 border-t mt-2">
                                        <div className="text-xl font-black text-gray-900 bg-primary/5 px-6 py-2 rounded-xl">
                                            TOTAL: {articles.reduce((acc: number, art: any) => acc + (art.preu * art.quantitat), 0).toFixed(2)} €
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row justify-end pt-6 border-t border-gray-100 gap-3 sm:gap-4">
                            <button onClick={() => setModalOpen(null)} className="w-full sm:w-auto px-8 py-4 font-black uppercase text-xs tracking-widest text-gray-400 hover:text-gray-600 transition-colors order-2 sm:order-1">
                                Cancel·lar
                            </button>
                            <button
                                onClick={handleOpenPreviewComp}
                                disabled={!selectedBolo || !selectedClient || articles.length === 0}
                                className="w-full sm:w-auto px-10 py-4 bg-primary text-white rounded-3xl font-black uppercase text-xs tracking-widest hover:bg-red-900 transition-all shadow-xl active:scale-95 disabled:opacity-30 flex items-center justify-center gap-2 order-1 sm:order-2"
                            >
                                <span className="material-icons-outlined">visibility</span>
                                Previsualitzar i Editar Descripció
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Previsualització Editable */}
            {showPreview && (
                <div className="fixed inset-0 bg-black/80 flex items-start sm:items-center justify-center z-[60] p-2 sm:p-4 backdrop-blur-md overflow-y-auto">
                    <div className="bg-white rounded-3xl sm:rounded-[40px] max-w-4xl w-full p-5 sm:p-10 shadow-2xl space-y-6 sm:space-y-8 animate-in slide-in-from-bottom-12 duration-500 my-auto max-h-[96vh] sm:max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center border-b border-gray-100 pb-6">
                            <div className="space-y-1">
                                <h3 className="text-2xl font-black uppercase tracking-tighter text-gray-900">Últims retocs del PDF</h3>
                                <p className="text-xs font-bold text-gray-400">Revisa el número i la descripció final abans de generar-lo.</p>
                            </div>
                            <button onClick={() => setShowPreview(false)} className="p-3 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"><span className="material-icons-outlined">close</span></button>
                        </div>

                        <div className="space-y-8">
                            <div className="grid grid-cols-2 gap-6 bg-gray-50 p-6 rounded-[30px] border border-gray-100">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-primary mb-2">Població i Data (Dades del Bolo)</label>
                                    <div className="text-sm font-bold text-gray-800">
                                        {selectedBolo?.nom_poble} — {selectedBolo?.data_bolo ? format(new Date(selectedBolo.data_bolo), 'dd/MM/yyyy') : '-'}
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-primary mb-2">Número Document</label>
                                        <input
                                            type="text"
                                            value={manualNumber}
                                            onChange={(e) => setManualNumber(e.target.value)}
                                            className="w-full p-3 bg-white border border-gray-200 rounded-2xl font-bold text-gray-900 focus:ring-2 focus:ring-primary shadow-sm"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Total Document</label>
                                        <div className="w-full p-3 bg-white/50 border border-gray-100 rounded-2xl font-black text-lg text-primary">
                                            {articles.reduce((acc: number, art: any) => acc + (art.preu * art.quantitat), 0).toFixed(2)}€
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3 ml-2">Text descriptiu del requadre (Editable)</label>
                                <textarea
                                    className="w-full p-8 bg-gray-50 border border-gray-100 rounded-[30px] min-h-[220px] font-sans text-lg leading-relaxed focus:ring-2 focus:ring-primary shadow-inner"
                                    value={descriptionText}
                                    onChange={(e) => setDescriptionText(e.target.value)}
                                    placeholder="Introdueix el text que apareixerà al PDF..."
                                />
                                <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-4 font-bold tracking-wide italic px-4 uppercase">
                                    <span className="material-icons-outlined text-xs">info</span>
                                    Aquest text s'imprimirà al requadre central del PDF.
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4 border-t border-gray-100">
                            <button
                                onClick={() => setShowPreview(false)}
                                className="w-full sm:flex-1 py-4 sm:py-5 font-black uppercase text-xs tracking-widest text-gray-400 border-2 border-gray-100 rounded-3xl hover:bg-gray-50 transition-all hover:text-gray-700 order-2 sm:order-1"
                            >
                                Enrere
                            </button>
                            <button
                                onClick={handleGeneratePDF}
                                disabled={pdfGenerating}
                                className="w-full sm:flex-[2] py-4 sm:py-5 bg-primary text-white rounded-3xl font-black uppercase text-xs tracking-widest hover:bg-red-900 transition-all shadow-xl hover:shadow-primary/20 disabled:opacity-50 flex items-center justify-center gap-3 active:scale-[0.98] order-1 sm:order-2"
                            >
                                {pdfGenerating ? (
                                    <>
                                        <div className="animate-spin h-5 w-5 border-2 border-white/30 border-t-white rounded-full"></div>
                                        Generant document...
                                    </>
                                ) : (
                                    <>
                                        <span className="material-icons-outlined">download</span>
                                        Confirmar i Descarregar PDF
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
