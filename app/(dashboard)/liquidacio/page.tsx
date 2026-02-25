'use client';

import React, { useState, useEffect, useMemo, Fragment } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Bolo, Music, BoloMusic } from '@/types';
import { format } from 'date-fns';
import { ca } from 'date-fns/locale';
import { PrivacyMask } from '@/components/PrivacyMask';

export default function LiquidacioPage() {
    const supabase = createClient();
    const [bolos, setBolos] = useState<Bolo[]>([]);
    const [musics, setMusics] = useState<Music[]>([]);
    const [attendance, setAttendance] = useState<BoloMusic[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterAny, setFilterAny] = useState(new Date().getFullYear().toString());

    // State for selected bolos to calculate payment
    const [selectedBolos, setSelectedBolos] = useState<Record<number, boolean>>({});

    useEffect(() => {
        fetchData();
    }, [filterAny]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const startDate = `${filterAny}-01-01`;
            const endDate = `${filterAny}-12-31`;

            // 1. Fetch Bolos
            const { data: bolosData, error: bolosError } = await supabase
                .from('bolos')
                .select('*')
                .gte('data_bolo', startDate)
                .lte('data_bolo', endDate)
                .neq('estat', 'Cancel·lat')
                .order('data_bolo', { ascending: true });

            if (bolosError) throw bolosError;
            if (!bolosData || bolosData.length === 0) {
                setBolos([]);
                setMusics([]);
                setAttendance([]);
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

        // Any musician not tagged as titular/substitut but who has attendance
        const othersIds = new Set(attendance.map(a => a.music_id));
        const taggedIds = new Set([...titulars, ...substituts].map(m => m.id));
        const others = musics.filter(m => othersIds.has(m.id) && !taggedIds.has(m.id));

        return [
            { title: 'FIXES', list: titulars },
            { title: 'SUBSTITUTS', list: [...substituts, ...others] }
        ];
    }, [musics, attendance]);

    if (loading) return (
        <div className="flex justify-center items-center h-screen bg-gray-50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
    );

    return (
        <div className="p-4 sm:p-6 max-w-[100vw] overflow-x-auto min-h-screen bg-gray-50">
            <div className="flex justify-between items-center mb-6 px-2">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 uppercase">Resum de Liquidació</h1>
                    <p className="text-gray-500 text-sm font-medium">Control de pagaments als músics</p>
                </div>
                <select
                    value={filterAny}
                    onChange={(e) => setFilterAny(e.target.value)}
                    className="bg-white border rounded px-3 py-1 font-bold text-sm"
                >
                    {[2024, 2025, 2026].map(year => <option key={year} value={year}>{year}</option>)}
                </select>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <table className="text-left border-collapse text-[10px] w-full min-w-[1200px]">
                    <thead>
                        {/* Selector Row */}
                        <tr className="bg-gray-100 border-b border-gray-200">
                            <th className="p-2 border-r border-gray-200 sticky left-0 bg-gray-100 z-10 w-48">PAGAR? (Selector)</th>
                            <th className="p-2 border-r border-gray-200 text-center font-black w-24">TOTAL INDIVIDUAL</th>
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
                            <th className="p-2 border-r border-gray-200 bg-primary/5 text-primary text-center">SUMA SELECCIONATS</th>
                            {bolos.map(bolo => (
                                <th key={`name-${bolo.id}`} className="p-2 border-r border-gray-200 text-center align-top min-w-[80px]">
                                    <div className="uppercase tracking-tighter leading-none mb-1 text-gray-900">
                                        {bolo.titol || bolo.nom_poble}
                                    </div>
                                    <div className="text-[8px] text-gray-500 font-medium">
                                        {format(new Date(bolo.data_bolo), 'dd/MM')}
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
                                    <td colSpan={bolos.length + 2} className="px-3 py-1">{group.title}</td>
                                </tr>
                                {group.list.map(music => {
                                    // Calculate total for this musician across selected bolos
                                    let totalIndividual = 0;
                                    bolos.forEach(bolo => {
                                        if (selectedBolos[bolo.id]) {
                                            const att = attendance.find(a => a.bolo_id === bolo.id && a.music_id === music.id);
                                            if (att && att.estat === 'confirmat') {
                                                const basePrice = att.preu_personalitzat !== null ? att.preu_personalitzat : (bolo.preu_per_musica || 0);
                                                const adjustment = att.ajustament_preu || 0;
                                                totalIndividual += (basePrice + adjustment);
                                            }
                                        }
                                    });

                                    return (
                                        <tr key={music.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                            <td className="p-2 border-r border-gray-200 sticky left-0 bg-white z-10 font-bold whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <span>{music.nom}</span>
                                                    <span className="text-[7px] font-medium opacity-50 uppercase">{music.instrument_principal || music.instruments || ''}</span>
                                                </div>
                                            </td>
                                            <td className="p-2 border-r border-gray-200 bg-primary/5 text-center font-black text-primary text-xs">
                                                <PrivacyMask value={totalIndividual as number} />
                                            </td>
                                            {bolos.map(bolo => {
                                                const att = attendance.find(a => a.bolo_id === bolo.id && a.music_id === music.id);
                                                const isConfirmed = att && att.estat === 'confirmat';
                                                const isSelected = selectedBolos[bolo.id];

                                                return (
                                                    <td
                                                        key={`${music.id}-${bolo.id}`}
                                                        className={`p-1 border-r border-gray-200 text-center ${isConfirmed ? (isSelected ? 'bg-green-50' : 'bg-gray-50') : 'bg-red-50/30'}`}
                                                    >
                                                        {isConfirmed ? (
                                                            <div className="flex flex-col items-center">
                                                                <span className="font-black text-gray-900">
                                                                    {(att!.preu_personalitzat !== null ? att!.preu_personalitzat : (bolo.preu_per_musica || 0)) + (att!.ajustament_preu || 0)}€
                                                                </span>
                                                                {(att!.ajustament_preu !== 0 || att!.comentari_ajustament) && (
                                                                    <div className="group relative mt-1">
                                                                        <span className="material-icons-outlined text-[10px] text-primary cursor-help">info</span>
                                                                        <div className="hidden group-hover:block absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-gray-900 text-white text-[8px] p-2 rounded shadow-lg pointer-events-none">
                                                                            <p className="font-bold">Ajustament: {att!.ajustament_preu || 0}€</p>
                                                                            <p className="mt-1 italic">{att!.comentari_ajustament || 'Sense comentari'}</p>
                                                                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-gray-900"></div>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                {/* Editors inside cell for quick adjustments */}
                                                                <div className="flex flex-col gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <input
                                                                        type="number"
                                                                        className="w-12 text-[7px] p-0.5 border rounded"
                                                                        placeholder="Ajust."
                                                                        value={att!.ajustament_preu || ''}
                                                                        onChange={(e) => handleUpdateAjustament(bolo.id, music.id, parseFloat(e.target.value) || 0)}
                                                                    />
                                                                    <input
                                                                        type="text"
                                                                        className="w-12 text-[7px] p-0.5 border rounded"
                                                                        placeholder="Mot."
                                                                        value={att!.comentari_ajustament || ''}
                                                                        onChange={(e) => handleUpdateComentari(bolo.id, music.id, e.target.value)}
                                                                    />
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-300 font-black">---</span>
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
        </div>
    );
}

