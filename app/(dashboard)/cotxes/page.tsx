'use client';

import React, { useState, useEffect, useMemo, Fragment } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Bolo, Music, BoloMusic } from '@/types';
import { format } from 'date-fns';
import { ca } from 'date-fns/locale';

export default function CotxesPage() {
    const supabase = createClient();
    const [bolos, setBolos] = useState<Bolo[]>([]);
    const [musics, setMusics] = useState<Music[]>([]);
    const [attendance, setAttendance] = useState<BoloMusic[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterAny, setFilterAny] = useState(new Date().getFullYear().toString());

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

    // Filter only musicians who are/were drivers in this period to keep the table clean
    const driverMusicians = useMemo(() => {
        const driverIds = new Set(attendance.filter(a => a.conductor).map(a => a.music_id));
        return musics.filter(m => driverIds.has(m.id)).sort((a, b) => a.nom.localeCompare(b.nom));
    }, [musics, attendance]);

    // Filter only bolos that have at least one driver to keep the table clean
    const activeBolos = useMemo(() => {
        const driverBoloIds = new Set(attendance.filter(a => a.conductor).map(a => a.bolo_id));
        return bolos.filter(b => driverBoloIds.has(b.id));
    }, [bolos, attendance]);

    if (loading) return (
        <div className="flex justify-center items-center h-screen bg-gray-50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
    );

    return (
        <div className="p-4 sm:p-6 min-h-screen bg-gray-50 w-full overflow-hidden">
            <div className="flex justify-between items-center mb-6 px-2">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 uppercase">Control de Cotxes (Km)</h1>
                    <p className="text-gray-500 text-sm font-medium">Kilometratge per conductor i bolo</p>
                </div>
                <select
                    value={filterAny}
                    onChange={(e) => setFilterAny(e.target.value)}
                    className="bg-white border rounded px-3 py-1 font-bold text-sm"
                >
                    {[2024, 2025, 2026].map(year => <option key={year} value={year}>{year}</option>)}
                </select>
            </div>

            {driverMusicians.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-xl p-20 text-center shadow-sm">
                    <span className="material-icons-outlined text-6xl text-gray-200 mb-4 block">directions_car</span>
                    <p className="text-gray-400 font-bold uppercase tracking-widest">No hi ha cap conductor assignat encara</p>
                    <p className="text-gray-400 text-xs mt-2">Assigna conductors des de la fitxa de cada bolo per veure'ls aquí.</p>
                </div>
            ) : (
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-x-auto">
                    <table className="text-left border-collapse text-[10px] w-full min-w-[1000px]">
                        <thead>
                            <tr className="bg-gray-100 border-b border-gray-200 font-black">
                                <th className="p-3 border-r border-gray-200 sticky left-0 bg-gray-100 z-10 w-48">CONDUCTORS</th>
                                <th className="p-3 border-r border-gray-200 text-center bg-primary/5 text-primary w-24">TOTAL KM</th>
                                {activeBolos.map(bolo => (
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
                                    <tr key={music.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                        <td className="p-3 border-r border-gray-200 sticky left-0 bg-white z-10 font-bold whitespace-nowrap">
                                            {music.nom}
                                        </td>
                                        <td className="p-3 border-r border-gray-200 bg-primary/5 text-center font-black text-primary text-xs">
                                            {totalKm}
                                        </td>
                                        {activeBolos.map(bolo => {
                                            const att = attendance.find(a => a.bolo_id === bolo.id && a.music_id === music.id);
                                            const isDriver = att && att.conductor;

                                            return (
                                                <td
                                                    key={`${music.id}-${bolo.id}`}
                                                    className={`p-1 border-r border-gray-200 text-center ${isDriver ? 'bg-blue-50/30' : 'bg-gray-50/10'}`}
                                                >
                                                    {isDriver ? (
                                                        <div className="flex flex-col items-center gap-1">
                                                            <input
                                                                type="number"
                                                                value={att.km || ''}
                                                                onChange={(e) => handleUpdateKm(bolo.id, music.id, parseFloat(e.target.value) || 0)}
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
