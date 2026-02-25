'use client';

import React, { useState, useEffect, useMemo, Fragment } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Bolo, Music, BoloMusic } from '@/types';
import { format } from 'date-fns';
import { ca } from 'date-fns/locale';

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
            onChange={(e) => setLocalValue(e.target.value)}
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

export default function CotxesPage() {
    const supabase = createClient();
    const [bolos, setBolos] = useState<Bolo[]>([]);
    const [musics, setMusics] = useState<Music[]>([]);
    const [attendance, setAttendance] = useState<BoloMusic[]>([]);
    const [loading, setLoading] = useState(true);
    // filterAny is now an array of strings
    const [selectedYears, setSelectedYears] = useState<string[]>([new Date().getFullYear().toString()]);

    useEffect(() => {
        fetchData();
    }, [selectedYears]);

    const fetchData = async () => {
        if (selectedYears.length === 0) {
            setBolos([]);
            setMusics([]);
            setAttendance([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            // Build query based on selected years
            let query = supabase.from('bolos').select('*').neq('estat', 'Cancel·lat').order('data_bolo', { ascending: true });

            if (selectedYears.length < AVAILABLE_YEARS.length) {
                // Construct multiple ranges or use a complex filter. 
                // Since years are contiguous here, we could find min/max, but for non-contiguous we use or filters.
                const yearFilters = selectedYears.map(y => `and(data_bolo.gte.${y}-01-01,data_bolo.lte.${y}-12-31)`).join(',');
                query = query.or(yearFilters);
            }

            const { data: bolosData, error: bolosError } = await query;

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

        } catch (error) {
            console.error('Error fetching car data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateKm = async (boloId: number, musicId: string, km: number) => {
        try {
            const { error } = await supabase
                .from('bolo_musics')
                .update({ km })
                .eq('bolo_id', boloId)
                .eq('music_id', musicId);

            if (error) throw error;
            setAttendance(prev => prev.map(a => (a.bolo_id === boloId && a.music_id === musicId) ? { ...a, km } : a));
        } catch (error) {
            console.error('Error updating Km:', error);
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

    // Filter only musicians who are/were drivers in this period to keep the table clean
    const driverMusicians = useMemo(() => {
        const driverIds = new Set(attendance.filter(a => a.conductor).map(a => a.music_id));
        return musics.filter(m => driverIds.has(m.id)).sort((a, b) => a.nom.localeCompare(b.nom));
    }, [musics, attendance]);

    // Filter only bolos that have at least one driver to keep the table clean
    const filteredActiveBolos = useMemo(() => {
        const driverBoloIds = new Set<number>(attendance.filter(a => a.conductor).map(a => a.bolo_id));
        return bolos.filter(b => driverBoloIds.has(b.id));
    }, [bolos, attendance]);

    if (loading) return (
        <div className="flex justify-center items-center h-screen bg-gray-50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
    );

    return (
        <div className="p-4 sm:p-6 min-h-screen bg-gray-50 w-full overflow-hidden">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 px-2 gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 uppercase">Control de Cotxes (Km)</h1>
                    <p className="text-gray-500 text-sm font-medium">Kilometratge per conductor i bolo</p>
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

            {driverMusicians.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-xl p-20 text-center shadow-sm">
                    <span className="material-icons-outlined text-6xl text-gray-200 mb-4 block">directions_car</span>
                    <p className="text-gray-400 font-bold uppercase tracking-widest">No hi ha cap dades per als anys seleccionats</p>
                    <p className="text-gray-400 text-xs mt-2">Assegura't d'haver assignat conductors als bolos d'aquest període.</p>
                </div>
            ) : (
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-x-auto max-w-full">
                    <table className="text-left border-collapse text-[10px] w-full min-w-[max-content]">
                        <thead>
                            <tr className="bg-gray-100 border-b border-gray-200 font-black">
                                <th className="p-3 border-r border-gray-200 sticky left-0 bg-gray-100 z-10 w-48">CONDUCTORS</th>
                                <th className="p-3 border-r border-gray-200 text-center bg-primary/5 text-primary w-24">TOTAL KM</th>
                                {filteredActiveBolos.map(bolo => (
                                    <th key={bolo.id} className="p-3 border-r border-gray-200 text-center align-top min-w-[100px]">
                                        <div className="uppercase tracking-tighter leading-none mb-1 text-gray-900">
                                            {bolo.titol || bolo.nom_poble}
                                        </div>
                                        <div className="text-[8px] text-gray-500 font-medium whitespace-nowrap">
                                            {format(new Date(bolo.data_bolo), 'dd/MM/yyyy')}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>

                        <tbody>
                            {driverMusicians.map(music => {
                                // Calculate total KM for this musician
                                const totalKm = attendance
                                    .filter(a => a.music_id === music.id && a.conductor)
                                    .reduce((acc, curr) => acc + (curr.km || 0), 0);

                                return (
                                    <tr key={music.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors group">
                                        <td className="p-3 border-r border-gray-200 sticky left-0 bg-white z-10 font-bold whitespace-nowrap group-hover:bg-gray-50">
                                            {music.nom}
                                        </td>
                                        <td className="p-3 border-r border-gray-200 bg-primary/5 text-center font-black text-primary text-xs group-hover:bg-primary/10">
                                            {totalKm}
                                        </td>
                                        {filteredActiveBolos.map(bolo => {
                                            const att = attendance.find(a => a.bolo_id === bolo.id && a.music_id === music.id);
                                            const isDriver = att && att.conductor;

                                            return (
                                                <td
                                                    key={`${music.id}-${bolo.id}`}
                                                    className={`p-1 border-r border-gray-200 text-center ${isDriver ? 'bg-blue-50/30 group-hover:bg-blue-50/50' : 'bg-gray-50/10 group-hover:bg-gray-50/20'}`}
                                                >
                                                    {isDriver ? (
                                                        <div className="flex flex-col items-center gap-1">
                                                            <DebouncedInput
                                                                type="number"
                                                                value={att.km}
                                                                onSave={(val: number) => handleUpdateKm(bolo.id, music.id, val)}
                                                                placeholder="0"
                                                                className="w-16 text-center text-[10px] font-black p-1 border rounded bg-white border-blue-200 focus:ring-2 focus:ring-primary/20 outline-none"
                                                            />
                                                            <span className="text-[7px] font-black text-blue-500 uppercase">Km</span>
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
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
