'use client';

import React, { useState, useEffect, useMemo, Fragment } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Bolo, Music, BoloMusic } from '@/types';
import { format } from 'date-fns';
import { ca } from 'date-fns/locale';
import { PrivacyMask } from '@/components/PrivacyMask';

interface GlobalLiquidacio {
    music_id: string;
    sobre_fet: boolean;
    ajustament_global: number;
    comentari_global: string | null;
    exercici: number;
}

const AVAILABLE_YEARS = ['2024', '2025', '2026'];

// Sub-component to handle local input state to prevent losing focus/characters during DB updates
function DebouncedInput({ value, onSave, type = 'text', placeholder = '', className = '' }: any) {
    const [localValue, setLocalValue] = useState(value);

    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    return (
        <input
            type={type}
            value={localValue === null ? '' : localValue}
            onChange={(e) => setLocalValue(type === 'number' ? e.target.value : e.target.value)}
            onBlur={() => {
                const finalValue = type === 'number' ? (parseFloat(localValue) || 0) : localValue;
                if (finalValue !== value) onSave(finalValue);
            }}
            onKeyDown={(e) => {
                if (e.key === 'Enter') {
                    e.currentTarget.blur();
                }
            }}
            placeholder={placeholder}
            className={className}
        />
    );
}

export default function LiquidacioPage() {
    const supabase = createClient();
    const [bolos, setBolos] = useState<Bolo[]>([]);
    const [musics, setMusics] = useState<Music[]>([]);
    const [attendance, setAttendance] = useState<BoloMusic[]>([]);
    const [globals, setGlobals] = useState<GlobalLiquidacio[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedYears, setSelectedYears] = useState<string[]>([new Date().getFullYear().toString()]);

    // State for selected bolos to calculate payment
    const [selectedBolos, setSelectedBolos] = useState<Record<number, boolean>>({});

    // Summary State
    const [summaryEfectiu, setSummaryEfectiu] = useState(0);
    const [summaryTransfer, setSummaryTransfer] = useState(0);
    const [summaryBanc, setSummaryBanc] = useState(0);

    // Load summary from localStorage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const key = `summary-${selectedYears.join('-')}`;
            const saved = localStorage.getItem(key);
            if (saved) {
                const data = JSON.parse(saved);
                setSummaryEfectiu(data.efectiu || 0);
                setSummaryTransfer(data.transfer || 0);
                setSummaryBanc(data.banc || 0);
            } else {
                setSummaryEfectiu(0);
                setSummaryTransfer(0);
                setSummaryBanc(0);
            }
        }
    }, [selectedYears]);

    const saveSummary = (ef: number, tr: number, ba: number) => {
        const key = `summary-${selectedYears.join('-')}`;
        localStorage.setItem(key, JSON.stringify({ efectiu: ef, transfer: tr, banc: ba }));
    };

    useEffect(() => {
        fetchData();
    }, [selectedYears]);

    const fetchData = async () => {
        if (selectedYears.length === 0) {
            setBolos([]);
            setMusics([]);
            setAttendance([]);
            setGlobals([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            // 1. Fetch Bolos
            let query = supabase.from('bolos').select('*').neq('estat', 'Cancel·lat').order('data_bolo', { ascending: true });

            if (selectedYears.length < AVAILABLE_YEARS.length) {
                const yearFilters = selectedYears.map(y => `and(data_bolo.gte.${y}-01-01,data_bolo.lte.${y}-12-31)`).join(',');
                query = query.or(yearFilters);
            }

            const { data: bolosData, error: bolosError } = await query;

            if (bolosError) throw bolosError;

            if (!bolosData || bolosData.length === 0) {
                setBolos([]);
                setMusics([]);
                setAttendance([]);
                setGlobals([]);
                setLoading(false);
                return;
            }

            const activeBolos = bolosData as Bolo[];

            // 2. Fetch Musicians
            const { data: musicsData, error: musicsError } = await supabase
                .from('musics')
                .select('*')
                .order('nom');

            if (musicsError) throw musicsError;

            // 3. Fetch all attendance for these bolos
            const boloIds = activeBolos.map(b => b.id);
            const { data: attendanceData, error: attendanceError } = await supabase
                .from('bolo_musics')
                .select('*')
                .in('bolo_id', boloIds);

            if (attendanceError) throw attendanceError;

            // 4. Fetch Global Adjustments for selected years
            const { data: globalsData, error: globalsError } = await supabase
                .from('liquidacio_global')
                .select('*')
                .in('exercici', selectedYears.map(y => parseInt(y)));

            if (!globalsError) {
                setGlobals(globalsData || []);
            }

            setBolos(activeBolos);
            setMusics(musicsData);
            setAttendance(attendanceData);

            // Initialize all bolos as NOT selected for payment by default
            const initialSelected: Record<number, boolean> = {};
            activeBolos.forEach((b: Bolo) => {
                initialSelected[b.id] = false;
            });
            setSelectedBolos(initialSelected);

        } catch (error) {
            console.error('Error fetching liquidation data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateAjustament = async (boloId: number, musicId: string, value: number) => {
        try {
            const { error } = await supabase
                .from('bolo_musics')
                .update({ ajustament_preu: value })
                .eq('bolo_id', boloId)
                .eq('music_id', musicId);

            if (error) throw error;
            setAttendance(prev => prev.map(a => (a.bolo_id === boloId && a.music_id === musicId) ? { ...a, ajustament_preu: value } : a));
        } catch (error) {
            console.error('Error updating adjustment:', error);
        }
    };

    const handleUpdateComentari = async (boloId: number, musicId: string, text: string) => {
        try {
            const { error } = await supabase
                .from('bolo_musics')
                .update({ comentari_ajustament: text })
                .eq('bolo_id', boloId)
                .eq('music_id', musicId);

            if (error) throw error;
            setAttendance(prev => prev.map(a => (a.bolo_id === boloId && a.music_id === musicId) ? { ...a, comentari_ajustament: text } : a));
        } catch (error) {
            console.error('Error updating adjustment comment:', error);
        }
    };

    const handleUpdateGlobal = async (musicId: string, field: 'sobre_fet' | 'ajustament_global', value: number | boolean) => {
        const targetYear = Math.max(...selectedYears.map(y => parseInt(y)));

        try {
            const current = globals.find(g => g.music_id === musicId && g.exercici === targetYear);

            if (current) {
                const { error } = await supabase
                    .from('liquidacio_global')
                    .update({ [field]: value })
                    .eq('exercici', targetYear)
                    .eq('music_id', musicId);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('liquidacio_global')
                    .insert([{ exercici: targetYear, music_id: musicId, [field]: value }]);
                if (error) throw error;
            }

            setGlobals(prev => {
                const exists = prev.find(g => g.music_id === musicId && g.exercici === targetYear);
                if (exists) {
                    return prev.map(g => (g.music_id === musicId && g.exercici === targetYear) ? { ...g, [field]: value } : g);
                } else {
                    return [...prev, {
                        music_id: musicId,
                        sobre_fet: field === 'sobre_fet' ? (value as boolean) : false,
                        ajustament_global: field === 'ajustament_global' ? (value as number) : 0,
                        comentari_global: null,
                        exercici: targetYear
                    }];
                }
            });
        } catch (error) {
            console.error('Error updating global data:', error);
        }
    };

    const toggleYear = (year: string) => {
        setSelectedYears(prev =>
            prev.includes(year)
                ? prev.filter(y => y !== year)
                : [...prev, year]
        );
    };

    const selectAllYears = () => {
        setSelectedYears(AVAILABLE_YEARS);
    };

    const getInstrumentPriority = (inst: string): number => {
        const i = inst.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (i.includes('percussio') || i.includes('caixa') || i.includes('bombo')) return 1;
        if (i.includes('trompeta')) return 2;
        if (i.includes('trombo')) return 3;
        if (i.includes('tuba') || i.includes('bombardi')) return 4;
        if (i.includes('saxo') && i.includes('alt')) return 5;
        if (i.includes('saxo') && (i.includes('tenor') || i.includes('terror'))) return 6;
        if (i.includes('saxo')) return 7;
        return 99;
    };

    // Grouping musicians
    const groupedMusicians = useMemo(() => {
        const titulars = musics.filter(m => m.tipus === 'titular').sort((a, b) => {
            const prioA = getInstrumentPriority(a.instrument_principal || a.instruments || '');
            const prioB = getInstrumentPriority(b.instrument_principal || b.instruments || '');
            if (prioA !== prioB) return prioA - prioB;
            return a.nom.localeCompare(b.nom);
        });

        const substituts = musics.filter(m => m.tipus === 'substitut').sort((a, b) => {
            const prioA = getInstrumentPriority(a.instrument_principal || a.instruments || '');
            const prioB = getInstrumentPriority(b.instrument_principal || b.instruments || '');
            if (prioA !== prioB) return prioA - prioB;
            return a.nom.localeCompare(b.nom);
        });

        const othersIds = new Set(attendance.map(a => a.music_id).concat(globals.map(g => g.music_id)));
        const taggedIds = new Set([...titulars, ...substituts].map(m => m.id));
        const others = musics.filter(m => othersIds.has(m.id) && !taggedIds.has(m.id));

        return [
            { title: 'FIXES', list: titulars },
            { title: 'SUBSTITUTS', list: [...substituts, ...others] }
        ];
    }, [musics, attendance, globals]);

    // Calculate Grand Total for the summary
    const grandTotal = useMemo(() => {
        let total = 0;
        groupedMusicians.forEach(group => {
            group.list.forEach(music => {
                let musicBase = 0;
                let musicAjust = 0;
                bolos.forEach(bolo => {
                    if (selectedBolos[bolo.id]) {
                        const att = attendance.find(a => a.bolo_id === bolo.id && a.music_id === music.id);
                        if (att && att.estat === 'confirmat') {
                            musicBase += (att.preu_personalitzat !== null ? att.preu_personalitzat : (bolo.preu_per_musica || 0));
                            musicAjust += (att.ajustament_preu || 0);
                        }
                    }
                });
                const musicGlobals = globals.filter(g => g.music_id === music.id);
                const musicGlobalAjust = musicGlobals.reduce((acc, curr) => acc + (curr.ajustament_global || 0), 0);
                total += (musicBase + musicAjust + musicGlobalAjust);
            });
        });
        return total;
    }, [groupedMusicians, bolos, selectedBolos, attendance, globals]);

    if (loading) return (
        <div className="flex justify-center items-center h-screen bg-gray-50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
    );

    return (
        <div className="p-4 sm:p-6 min-h-screen bg-gray-50 w-full overflow-hidden">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 px-2 gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 uppercase">Resum de Liquidació</h1>
                    <p className="text-gray-500 text-sm font-medium">Control de pagaments als músics</p>
                </div>

                <div className="flex flex-wrap items-center gap-2 bg-white p-1 rounded-lg border border-gray-200">
                    <button
                        onClick={selectAllYears}
                        className={`px-3 py-1 rounded text-[10px] font-black uppercase transition-colors ${selectedYears.length === AVAILABLE_YEARS.length ? 'bg-primary text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                    >
                        Tots
                    </button>
                    <div className="w-px h-4 bg-gray-200 mx-1"></div>
                    {AVAILABLE_YEARS.map(year => (
                        <button
                            key={year}
                            onClick={() => toggleYear(year)}
                            className={`px-3 py-1 rounded text-[10px] font-black uppercase transition-colors ${selectedYears.includes(year) ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-transparent text-gray-400 border border-transparent hover:bg-gray-50'}`}
                        >
                            {year}
                        </button>
                    ))}
                </div>
            </div>

            {/* Container wrapper for horizontal scroll */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-x-auto max-w-full font-sans">
                <table className="text-left border-collapse text-[10px] w-full min-w-[max-content]">
                    <thead>
                        {/* Selector Row */}
                        <tr className="bg-gray-100 border-b border-gray-200">
                            <th className="p-2 border-r border-gray-200 sticky left-0 bg-gray-100 z-10 w-48">PAGAR? (Selector)</th>
                            <th className="p-2 border-r border-gray-200 text-center font-black w-24">BOLOS</th>
                            <th className="p-2 border-r border-gray-200 text-center font-black w-24">AJUSTAMENTS</th>
                            <th className="p-2 border-r border-gray-200 text-center font-black w-24 text-red-600">SOBRE FET</th>
                            <th className="p-2 border-r border-gray-200 text-center font-black w-24 bg-primary/10 text-primary">TOTAL NET</th>
                            {bolos.map(bolo => (
                                <th key={`sel-${bolo.id}`} className="p-1 border-r border-gray-200 text-center w-24">
                                    <div className="flex flex-col items-center">
                                        <input
                                            type="checkbox"
                                            checked={selectedBolos[bolo.id]}
                                            onChange={(e) => setSelectedBolos(prev => ({ ...prev, [bolo.id]: e.target.checked }))}
                                            className="w-4 h-4 text-primary rounded cursor-pointer"
                                        />
                                        <span className={`mt-1 font-bold ${selectedBolos[bolo.id] ? 'text-green-600' : 'text-gray-400'}`}>
                                            {selectedBolos[bolo.id] ? 'SI' : 'NO'}
                                        </span>
                                    </div>
                                </th>
                            ))}
                        </tr>

                        {/* Bolo Names Row */}
                        <tr className="bg-gray-50 border-b border-gray-200 font-black">
                            <th className="p-2 border-r border-gray-200 sticky left-0 bg-gray-50 z-10">MÚSICS</th>
                            <th className="p-2 border-r border-gray-200 text-center">Base</th>
                            <th className="p-2 border-r border-gray-200 text-center text-primary">(+/-)</th>
                            <th className="p-2 border-r border-gray-200 text-center text-red-600">Ja lliurat</th>
                            <th className="p-2 border-r border-gray-200 text-center bg-primary/10 text-primary">LIQUIDACIÓ</th>
                            {bolos.map(bolo => (
                                <th key={`name-${bolo.id}`} className="p-2 border-r border-gray-200 text-center align-top min-w-[80px]">
                                    <div className="uppercase tracking-tighter leading-none mb-1 text-gray-900">
                                        {bolo.titol || bolo.nom_poble}
                                    </div>
                                    <div className="text-[8px] text-gray-500 font-medium whitespace-nowrap">
                                        {format(new Date(bolo.data_bolo), 'dd/MM/yy')}
                                    </div>
                                    <div className="mt-2 text-[8px] bg-gray-200 rounded px-1 py-0.5 inline-block text-gray-700">
                                        {bolo.preu_per_musica || 0}€
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>

                    <tbody>
                        {groupedMusicians.map(group => (
                            <Fragment key={group.title}>
                                <tr className="bg-gray-900 text-white font-black text-[9px] uppercase tracking-widest">
                                    <td colSpan={bolos.length + 5} className="px-3 py-1">{group.title}</td>
                                </tr>
                                {group.list.map(music => {
                                    let sumaBaseBolos = 0;
                                    let sumaAjustaments = 0;

                                    bolos.forEach(bolo => {
                                        if (selectedBolos[bolo.id]) {
                                            const att = attendance.find(a => a.bolo_id === bolo.id && a.music_id === music.id);
                                            if (att && att.estat === 'confirmat') {
                                                sumaBaseBolos += (att.preu_personalitzat !== null ? att.preu_personalitzat : (bolo.preu_per_musica || 0));
                                                sumaAjustaments += (att.ajustament_preu || 0);
                                            }
                                        }
                                    });

                                    const musicGlobals = globals.filter(g => g.music_id === music.id);
                                    const latestYear = Math.max(...selectedYears.map(y => parseInt(y)));
                                    const latestGlobal = musicGlobals.find(g => g.exercici === latestYear);

                                    const sumaAjustGlobal = musicGlobals.reduce((acc, curr) => acc + (curr.ajustament_global || 0), 0);
                                    const sobreFet = !!latestGlobal?.sobre_fet;

                                    const totalNet = sumaBaseBolos + sumaAjustaments + sumaAjustGlobal;

                                    return (
                                        <tr key={music.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors group">
                                            <td className="p-2 border-r border-gray-200 sticky left-0 bg-white z-10 font-bold whitespace-nowrap group-hover:bg-gray-50">
                                                <div className="flex flex-col">
                                                    <span>{music.nom}</span>
                                                    <span className="text-[7px] font-medium opacity-50 uppercase">{music.instrument_principal || music.instruments || ''}</span>
                                                </div>
                                            </td>
                                            <td className="p-2 border-r border-gray-200 text-center font-black text-gray-700">
                                                <PrivacyMask value={sumaBaseBolos} />
                                            </td>
                                            <td className="p-2 border-r border-gray-200 text-center font-bold text-primary group/ajust relative">
                                                <div className="flex flex-col items-center">
                                                    <PrivacyMask value={sumaAjustaments + sumaAjustGlobal} />
                                                    <DebouncedInput
                                                        type="number"
                                                        className="w-12 text-[7px] p-0.5 border rounded mt-1 opacity-0 group-hover/ajust:opacity-100 transition-opacity"
                                                        placeholder={selectedYears.length > 1 ? `Any ${latestYear}` : "+/-"}
                                                        value={latestGlobal?.ajustament_global}
                                                        onSave={(val: number) => handleUpdateGlobal(music.id, 'ajustament_global', val)}
                                                    />
                                                </div>
                                            </td>
                                            <td className="p-2 border-r border-gray-200 text-center font-bold text-red-600">
                                                <div className="flex flex-col items-center">
                                                    <input
                                                        type="checkbox"
                                                        className="w-4 h-4 text-red-600 rounded cursor-pointer"
                                                        checked={sobreFet}
                                                        onChange={(e) => handleUpdateGlobal(music.id, 'sobre_fet', e.target.checked)}
                                                    />
                                                    <span className="text-[7px] mt-1 uppercase opacity-50">{sobreFet ? 'Fet' : 'Pendent'}</span>
                                                </div>
                                            </td>
                                            {/* Green background only when sobreFet is true. Otherwise use a light warning color if > 0. */}
                                            <td className={`p-2 border-r border-gray-200 text-center font-black text-xs transition-colors duration-300 ${sobreFet ? 'bg-green-600 text-white' : (totalNet > 0 ? 'bg-orange-50 text-orange-600' : 'bg-gray-50 text-gray-400')}`}>
                                                <PrivacyMask value={totalNet} showEuro={true} />
                                            </td>
                                            {bolos.map(bolo => {
                                                const att = attendance.find(a => a.bolo_id === bolo.id && a.music_id === music.id);
                                                const isConfirmed = att && att.estat === 'confirmat';
                                                const isSelected = selectedBolos[bolo.id];

                                                return (
                                                    <td
                                                        key={`${music.id}-${bolo.id}`}
                                                        className={`p-1 border-r border-gray-200 text-center group/cell cursor-default ${isConfirmed ? (isSelected ? 'bg-green-50' : 'bg-gray-50 group-hover:bg-gray-100') : 'bg-red-50/10'}`}
                                                    >
                                                        {isConfirmed ? (
                                                            <div className="flex flex-col items-center">
                                                                <span className="font-black text-gray-900">
                                                                    {(att!.preu_personalitzat !== null ? att!.preu_personalitzat : (bolo.preu_per_musica || 0)) + (att!.ajustament_preu || 0)}€
                                                                </span>
                                                                {(att!.ajustament_preu !== 0 || att!.comentari_ajustament) && (
                                                                    <div className="group/info relative mt-1">
                                                                        <span className="material-icons-outlined text-[10px] text-primary cursor-help">info</span>
                                                                        <div className="hidden group-hover/info:block absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-gray-900 text-white text-[8px] p-2 rounded shadow-lg pointer-events-none">
                                                                            <p className="font-bold">Ajustament: {att!.ajustament_preu || 0}€</p>
                                                                            <p className="mt-1 italic">{att!.comentari_ajustament || 'Sense comentari'}</p>
                                                                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-gray-900"></div>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                {/* Editors inside cell for quick adjustments */}
                                                                <div className="flex flex-col gap-1 mt-1 opacity-0 group-hover/cell:opacity-100 transition-opacity">
                                                                    <DebouncedInput
                                                                        type="number"
                                                                        className="w-12 text-[7px] p-0.5 border rounded"
                                                                        placeholder="Ajust."
                                                                        value={att!.ajustament_preu}
                                                                        onSave={(val: number) => handleUpdateAjustament(bolo.id, music.id, val)}
                                                                    />
                                                                    <DebouncedInput
                                                                        type="text"
                                                                        className="w-12 text-[7px] p-0.5 border rounded"
                                                                        placeholder="Mot."
                                                                        value={att!.comentari_ajustament}
                                                                        onSave={(text: string) => handleUpdateComentari(bolo.id, music.id, text)}
                                                                    />
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-200 font-black">---</span>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })}
                            </Fragment>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Previsions de Pagament Summary */}
            <div className="mt-8 flex flex-col md:flex-row gap-6 items-end justify-between px-2 pb-12">
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex-1 max-w-md">
                    <h3 className="text-xs font-black uppercase text-gray-400 mb-3 tracking-widest">Resum de Previsions</h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center bg-primary/5 p-3 rounded-lg border border-primary/10">
                            <span className="text-[10px] font-black uppercase text-primary">DESTINAT A PAGAMENTS</span>
                            <span className="text-lg font-black text-primary">
                                <PrivacyMask value={grandTotal} showEuro={true} />
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1">
                                <label className="text-[8px] font-black text-gray-400 uppercase">Efectiu (Ja el tenim)</label>
                                <DebouncedInput
                                    type="number"
                                    className="p-2 border rounded font-black text-xs"
                                    placeholder="0€"
                                    value={summaryEfectiu}
                                    onSave={(v: number) => { setSummaryEfectiu(v); saveSummary(v, summaryTransfer, summaryBanc); }}
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-[8px] font-black text-gray-400 uppercase">Per treure del Banc</label>
                                <DebouncedInput
                                    type="number"
                                    className="p-2 border rounded font-black text-xs text-red-600 border-red-100"
                                    placeholder="0€"
                                    value={summaryBanc}
                                    onSave={(v: number) => { setSummaryBanc(v); saveSummary(summaryEfectiu, summaryTransfer, v); }}
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-[8px] font-black text-gray-400 uppercase">Transferència / Bizum</label>
                            <DebouncedInput
                                type="number"
                                className="p-2 border rounded font-black text-xs text-blue-600 border-blue-100 w-full"
                                placeholder="0€"
                                value={summaryTransfer}
                                onSave={(v: number) => { setSummaryTransfer(v); saveSummary(summaryEfectiu, v, summaryBanc); }}
                            />
                        </div>

                        <div className="h-px bg-gray-100 my-2"></div>

                        <div className="flex justify-between items-center px-1">
                            <span className="text-[9px] font-bold text-gray-400">Diferència / Resta</span>
                            <span className={`text-sm font-black ${grandTotal - (summaryEfectiu + summaryBanc + summaryTransfer) === 0 ? 'text-green-600' : 'text-orange-600'}`}>
                                <PrivacyMask value={grandTotal - (summaryEfectiu + summaryBanc + summaryTransfer)} showEuro={true} />
                            </span>
                        </div>
                    </div>
                </div>

                <div className="text-right hidden md:block">
                    <p className="text-[10px] text-gray-400 font-medium italic">
                        * Les previsions es guarden localment al navegador <br />
                        per als anys seleccionats.
                    </p>
                </div>
            </div>
        </div>
    );
}
