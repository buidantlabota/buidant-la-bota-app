'use client';

import { useState } from 'react';
import { Bolo, Music, BoloMusic } from '@/types';
import { format } from 'date-fns';
import { ca } from 'date-fns/locale';
import { MaterialLoan } from '@/types/clothing';

interface ExtendedBoloMusic extends BoloMusic {
    music: Music;
}

interface PrevisioMaterialProps {
    bolos: Bolo[];
    boloMusics: ExtendedBoloMusic[];
    loans: MaterialLoan[];
    temporada: 'Hivern' | 'Estiu';
}

export default function PrevisioMaterial({ bolos, boloMusics, loans, temporada }: PrevisioMaterialProps) {

    // 1. Filter bolos for next 30 days
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    const upcomingBolos = bolos.filter(b => {
        const d = new Date(b.data_bolo);
        return d >= today && d <= thirtyDaysFromNow;
    }).sort((a, b) => new Date(a.data_bolo).getTime() - new Date(b.data_bolo).getTime());

    // 2. Aggregate Requirements with Musician Names
    const shirtStats: Record<string, string[]> = {};
    const hoodieStats: Record<string, string[]> = {};
    const bookStats: Record<string, string[]> = {};

    upcomingBolos.forEach(bolo => {
        // A musician counts if:
        // 1. They are a substitute in this bolo (assigned role or music profile)
        // 2. OR they already have a loan for this specific bolo (manual override)

        const musiciansWithLoans = loans
            .filter(l => String(l.bolo_id) === String(bolo.id) && l.status === 'prestat')
            .map(l => l.suplent_id);

        const substitutes = boloMusics.filter(bm =>
            String(bm.bolo_id) === String(bolo.id) && (
                bm.tipus === 'substitut' ||
                bm.music?.tipus === 'substitut' ||
                musiciansWithLoans.includes(bm.music_id)
            )
        );

        substitutes.forEach(sub => {
            if (!sub.music) return;

            // Check if they ALREADY have a specific loan for this bolo
            const myLoans = loans.filter(l => String(l.bolo_id) === String(bolo.id) && String(l.suplent_id) === String(sub.music_id) && l.status === 'prestat');

            // If they have manual loans, use those items for stats
            if (myLoans.length > 0) {
                myLoans.forEach(l => {
                    if (l.item_type === 'samarreta' && l.stock?.size) {
                        const sSize = l.stock.size;
                        if (!shirtStats[sSize]) shirtStats[sSize] = [];
                        if (!shirtStats[sSize].includes(sub.music.nom)) shirtStats[sSize].push(sub.music.nom);
                    }
                    if (l.item_type === 'dessuadora' && l.stock?.size) {
                        const hSize = l.stock.size;
                        if (!hoodieStats[hSize]) hoodieStats[hSize] = [];
                        if (!hoodieStats[hSize].includes(sub.music.nom)) hoodieStats[hSize].push(sub.music.nom);
                    }
                    if (l.item_type === 'llibret') {
                        const inst = l.item?.identifier || sub.music.instruments || 'Llibret';
                        if (!bookStats[inst]) bookStats[inst] = [];
                        if (!bookStats[inst].includes(sub.music.nom)) bookStats[inst].push(sub.music.nom);
                    }
                });
            } else {
                // FALLBACK: Use profile sizes if no specific loan yet
                if (sub.music.talla_samarreta) {
                    const sSize = sub.music.talla_samarreta;
                    if (!shirtStats[sSize]) shirtStats[sSize] = [];
                    if (!shirtStats[sSize].includes(sub.music.nom)) shirtStats[sSize].push(sub.music.nom);
                }

                if (sub.music.talla_dessuadora) {
                    const hSize = sub.music.talla_dessuadora;
                    if (!hoodieStats[hSize]) hoodieStats[hSize] = [];
                    if (!hoodieStats[hSize].includes(sub.music.nom)) hoodieStats[hSize].push(sub.music.nom);
                }

                // Stats Books fallback
                const instruments = sub.music.instruments ? sub.music.instruments.split(',').map(i => i.trim()) : ['Desconegut'];
                instruments.forEach(inst => {
                    if (!bookStats[inst]) bookStats[inst] = [];
                    if (!bookStats[inst].includes(sub.music.nom)) bookStats[inst].push(sub.music.nom);
                });
            }
        });
    });

    return (
        <div className="space-y-12 animate-in fade-in duration-700 pb-20">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* T-Shirts / Hoodies Card */}
                <div className="bg-white p-8 rounded-2xl border-4 border-indigo-700 shadow-[8px_8px_0px_0px_rgba(67,56,202,1)]">
                    <h3 className="text-3xl font-black text-primary flex items-center mb-8 uppercase tracking-tighter">
                        <span className="material-icons-outlined mr-3 text-indigo-700 text-4xl">checkroom</span>
                        Previsió de Roba
                    </h3>

                    <div className="space-y-10">
                        {/* Shirts Section */}
                        <div>
                            <h4 className="text-sm font-black text-indigo-700 uppercase tracking-widest mb-4 flex items-center gap-3">
                                <span className="w-3 h-3 bg-indigo-600 rounded-full"></span>
                                Samarretes
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {Object.entries(shirtStats).length > 0 ? (
                                    Object.entries(shirtStats).map(([size, names]) => (
                                        <div key={size} className="bg-white rounded-xl p-4 border-2 border-primary shadow-md">
                                            <div className="flex items-center justify-between mb-2 border-b-2 border-gray-100 pb-2">
                                                <span className="text-xs font-black text-primary">TALLA {size}</span>
                                                <span className="text-3xl font-black text-indigo-700">{names.length}</span>
                                            </div>
                                            <p className="text-xs font-bold text-primary leading-tight">
                                                {names.join(', ')}
                                            </p>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-gray-500 font-black italic">Cap samarreta necessària.</p>
                                )}
                            </div>
                        </div>

                        {/* Hoodies Section */}
                        {temporada === 'Hivern' && (
                            <div className="pt-8 border-t-4 border-gray-100">
                                <h4 className="text-sm font-black text-purple-700 uppercase tracking-widest mb-4 flex items-center gap-3">
                                    <span className="w-3 h-3 bg-purple-600 rounded-full"></span>
                                    Dessuadores
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {Object.entries(hoodieStats).length > 0 ? (
                                        Object.entries(hoodieStats).map(([size, names]) => (
                                            <div key={size} className="bg-white rounded-xl p-4 border-2 border-primary shadow-md">
                                                <div className="flex items-center justify-between mb-2 border-b-2 border-gray-100 pb-2">
                                                    <span className="text-xs font-black text-primary">TALLA {size}</span>
                                                    <span className="text-3xl font-black text-purple-700">{names.length}</span>
                                                </div>
                                                <p className="text-xs font-bold text-primary leading-tight">
                                                    {names.join(', ')}
                                                </p>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-gray-500 font-black italic">Cap dessuadora necessària.</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Material / Books Card */}
                <div className="bg-white p-8 rounded-2xl border-4 border-amber-500 shadow-[8px_8px_0px_0px_rgba(245,158,11,1)]">
                    <h3 className="text-3xl font-black text-primary flex items-center mb-8 uppercase tracking-tighter">
                        <span className="material-icons-outlined mr-3 text-amber-700 text-4xl">menu_book</span>
                        Llibretes i Material
                    </h3>
                    <div className="grid grid-cols-1 gap-6">
                        {Object.entries(bookStats).length > 0 ? (
                            Object.entries(bookStats).map(([inst, names]) => (
                                <div key={inst} className="bg-white rounded-xl p-5 border-2 border-primary shadow-md">
                                    <div className="flex items-center justify-between mb-3 border-b-2 border-amber-100 pb-2">
                                        <span className="text-base font-black text-primary uppercase tracking-tight">{inst}</span>
                                        <span className="text-3xl font-black text-amber-700">{names.length}</span>
                                    </div>
                                    <p className="text-sm font-bold text-primary leading-relaxed">
                                        {names.join(', ')}
                                    </p>
                                </div>
                            ))
                        ) : (
                            <p className="text-base text-gray-500 font-black italic">Cap llibreta necessària.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* List by Bolo */}
            <div className="space-y-8">
                <div className="flex items-center justify-between border-b-4 border-primary pb-4">
                    <h3 className="text-4xl font-black text-primary uppercase tracking-tighter">
                        Detall per Bolo <span className="text-indigo-600 ml-2">30 DIES</span>
                    </h3>
                </div>

                {upcomingBolos.length === 0 ? (
                    <div className="text-center py-20 bg-gray-50 rounded-2xl border-4 border-dashed border-gray-300">
                        <p className="text-gray-500 text-2xl font-black uppercase tracking-widest">Cap bolo previst</p>
                    </div>
                ) : (
                    upcomingBolos.map(bolo => {
                        const musiciansWithLoans = loans
                            .filter(l => String(l.bolo_id) === String(bolo.id) && l.status === 'prestat')
                            .map(l => l.suplent_id);

                        const substitutes = boloMusics.filter(bm =>
                            String(bm.bolo_id) === String(bolo.id) && (
                                bm.tipus === 'substitut' ||
                                bm.music?.tipus === 'substitut' ||
                                musiciansWithLoans.includes(bm.music_id)
                            )
                        );

                        return (
                            <div key={bolo.id} className="bg-white rounded-2xl border-4 border-primary overflow-hidden flex flex-col md:flex-row shadow-xl transform transition-all hover:scale-[1.01]">
                                {/* Date Column - MASSIVE */}
                                <div className="bg-primary p-8 flex flex-col items-center justify-center md:w-48 text-white min-h-[160px]">
                                    <span className="text-7xl font-black leading-none tracking-tighter">
                                        {format(new Date(bolo.data_bolo), 'dd', { locale: ca })}
                                    </span>
                                    <span className="text-2xl uppercase font-black tracking-widest mt-2 text-indigo-400">
                                        {format(new Date(bolo.data_bolo), 'MMMM', { locale: ca })}
                                    </span>
                                </div>

                                {/* Content */}
                                <div className="p-8 flex-1 bg-white">
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 pb-6 border-b-2 border-gray-100">
                                        <div>
                                            <h4 className="text-4xl font-black text-primary uppercase tracking-tighter">{bolo.nom_poble}</h4>
                                            <p className="text-base font-black text-indigo-700 bg-indigo-50 px-3 py-1 mt-2 inline-block rounded-md border border-indigo-200 uppercase tracking-widest">
                                                {bolo.tipus_actuacio || 'ACTUACIÓ'}
                                            </p>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <span className={`px-4 py-2 rounded-lg text-sm font-black uppercase tracking-widest shadow-md ${bolo.estat === 'Confirmada' ? 'bg-green-600 text-white' : 'bg-gray-800 text-white'
                                                }`}>
                                                {bolo.estat}
                                            </span>
                                            <span className="text-xs font-black text-gray-500 uppercase tracking-tighter">
                                                {format(new Date(bolo.data_bolo), 'HH:mm')} HORES
                                            </span>
                                        </div>
                                    </div>

                                    {/* Substitutes Grid */}
                                    <div className="space-y-4">
                                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Músics amb material assignat o requerit:</p>
                                        {substitutes.length > 0 ? (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                                {substitutes.map(sub => {
                                                    const myLoans = loans.filter(l => String(l.bolo_id) === String(bolo.id) && String(l.suplent_id) === String(sub.music_id) && l.status === 'prestat');
                                                    const hasLoans = myLoans.length > 0;

                                                    return (
                                                        <div key={sub.id} className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${hasLoans ? 'bg-indigo-50 border-indigo-500 shadow-md' : 'bg-white border-gray-200'
                                                            }`}>
                                                            <div className={`h-14 w-14 rounded-xl flex items-center justify-center font-black text-lg shadow-inner ${hasLoans ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'
                                                                }`}>
                                                                {sub.music?.nom.substring(0, 1).toUpperCase()}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-base font-black text-primary truncate">{sub.music?.nom}</p>
                                                                <p className={`text-[10px] font-black uppercase tracking-tight ${(sub.music?.tipus || sub.tipus) === 'substitut' ? 'text-purple-600' : 'text-blue-600'
                                                                    }`}>
                                                                    {sub.music?.tipus || sub.tipus}
                                                                </p>
                                                            </div>
                                                            <div className="flex flex-col gap-1 items-end">
                                                                {hasLoans ? (
                                                                    <span className="text-[10px] font-black bg-indigo-700 text-white px-2 py-1 rounded shadow-sm">OK</span>
                                                                ) : (
                                                                    <span className="text-[10px] font-black bg-red-100 text-red-700 px-2 py-1 rounded">PENDENT</span>
                                                                )}
                                                                <span className="text-[10px] font-black text-gray-500">{sub.music?.talla_samarreta || '?'}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="bg-gray-50 p-6 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center gap-3">
                                                <span className="material-icons-outlined text-gray-400">person_off</span>
                                                <p className="text-sm font-black text-gray-400 uppercase tracking-widest">Cap músic pendent de material</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
