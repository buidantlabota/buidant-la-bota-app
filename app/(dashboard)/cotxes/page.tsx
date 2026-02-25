'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Bolo, BoloMusic } from '@/types';
import { format } from 'date-fns';
import { ca } from 'date-fns/locale';

interface BoloWithDrivers extends Bolo {
    drivers: (BoloMusic & { music: { nom: string } })[];
}

export default function CotxesPage() {
    const supabase = createClient();
    const [bolos, setBolos] = useState<BoloWithDrivers[]>([]);
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

            const { data, error } = await supabase
                .from('bolos')
                .select(`
                    *,
                    bolo_musics (
                        *,
                        music:musics (nom)
                    )
                `)
                .gte('data_bolo', startDate)
                .lte('data_bolo', endDate)
                .order('data_bolo', { ascending: false });

            if (error) throw error;

            const processed = (data || []).map((bolo: any) => ({
                ...bolo,
                drivers: (bolo.bolo_musics || []).filter((bm: any) => bm.conductor === true)
            }));

            setBolos(processed);
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

            setBolos(prev => prev.map(b => {
                if (b.id === boloId) {
                    return {
                        ...b,
                        drivers: b.drivers.map(d => d.music_id === musicId ? { ...d, km } : d)
                    };
                }
                return b;
            }));
        } catch (error) {
            console.error('Error updating Km:', error);
            alert('Error en actualitzar els quilòmetres');
        }
    };

    return (
        <div className="p-4 sm:p-8 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tight">Control de Cotxes</h1>
                    <p className="text-gray-500 font-medium">Resum de conductors i quilometratge per bolo</p>
                </div>

                <select
                    value={filterAny}
                    onChange={(e) => setFilterAny(e.target.value)}
                    className="bg-white border border-gray-300 rounded-lg px-4 py-2 font-bold text-gray-900 outline-none focus:ring-2 focus:ring-primary/20"
                >
                    {[2024, 2025, 2026].map(year => (
                        <option key={year} value={year}>{year}</option>
                    ))}
                </select>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
            ) : bolos.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <span className="material-icons-outlined text-6xl text-gray-300 mb-4">directions_car</span>
                    <p className="text-gray-500 font-medium text-lg">No s'ha registrat cap conductor per a aquest any.</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 tracking-widest">Data i Bolo</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 tracking-widest">Conductors</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 tracking-widest w-32">Km totals</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {bolos.map(bolo => (
                                <tr key={bolo.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-gray-900">{bolo.titol || bolo.nom_poble}</div>
                                        <div className="text-xs text-gray-500">
                                            {format(new Date(bolo.data_bolo), 'dd MMMM yyyy', { locale: ca })}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-3">
                                            {bolo.drivers.map(driver => (
                                                <div key={driver.music_id} className="flex items-center justify-between gap-4 bg-gray-50 p-2 rounded-lg border border-gray-100">
                                                    <span className="font-bold text-sm text-gray-700">{driver.music?.nom}</span>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="number"
                                                            value={driver.km || ''}
                                                            onChange={(e) => handleUpdateKm(bolo.id, driver.music_id, parseFloat(e.target.value) || 0)}
                                                            placeholder="0"
                                                            className="w-20 text-right p-1 rounded border border-gray-300 text-sm font-black focus:ring-2 focus:ring-primary/20 outline-none"
                                                        />
                                                        <span className="text-[10px] font-black text-gray-400 uppercase">Km</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 align-top">
                                        <div className="bg-primary/5 text-primary rounded-lg p-2 text-center border border-primary/10">
                                            <span className="text-lg font-black">{bolo.drivers.reduce((acc, d) => acc + (d.km || 0), 0)}</span>
                                            <span className="text-[10px] font-black ml-1 block opacity-60">TOTAL KM</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
