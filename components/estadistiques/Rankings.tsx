'use client';

import { Award, Users, MapPin, TrendingUp, Star } from 'lucide-react';
import { motion } from 'framer-motion';

interface Musician {
    name: string;
    count: number;
    instrument: string;
    type: string;
    percentage: number;
}

export const ElevenGala = ({ musicians }: { musicians: Musician[] }) => (
    <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden h-full flex flex-col">
        <div className="p-10 pb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div className="bg-yellow-100 p-4 rounded-3xl text-yellow-600">
                    <Award size={32} />
                </div>
                <div>
                    <h3 className="text-2xl font-black text-gray-900 tracking-tight">L'Onze de Gala</h3>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Músics amb més assistències en el període</p>
                </div>
            </div>
            <div className="hidden sm:block">
                <span className="text-[10px] font-black bg-gray-900 text-white px-4 py-2 rounded-2xl uppercase tracking-widest">Top Ocupació</span>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto px-10 pb-10 scrollbar-thin">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {musicians.length === 0 ? (
                    <div className="col-span-full text-center py-20 text-gray-300 italic font-medium">No hi ha prou dades per l'Eleven de Gala</div>
                ) : (
                    musicians.map((m, idx) => (
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            key={idx}
                            className="bg-gray-50/50 hover:bg-white hover:shadow-xl hover:scale-[1.02] transform transition-all duration-300 p-6 rounded-3xl border border-transparent hover:border-gray-100 group flex items-center justify-between"
                        >
                            <div className="flex items-center gap-5">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-black shrink-0 shadow-sm ${idx === 0 ? 'bg-yellow-400 text-white shadow-yellow-200' :
                                    idx === 1 ? 'bg-gray-300 text-white shadow-gray-200' :
                                        idx === 2 ? 'bg-orange-400 text-white shadow-orange-200' :
                                            'bg-white text-gray-400 border border-gray-100'
                                    }`}>
                                    {idx + 1}
                                </div>
                                <div>
                                    <span className="text-base font-black text-gray-900 group-hover:text-primary transition-colors">{m.name}</span>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className="text-[9px] font-black uppercase text-gray-400 bg-gray-100 px-2 py-0.5 rounded-lg group-hover:bg-primary/5 group-hover:text-primary transition-colors">{m.instrument}</span>
                                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg ${m.type === 'titular' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>{m.type}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="text-right">
                                <div className="flex items-baseline gap-1 justify-end">
                                    <span className="text-2xl font-black text-gray-900 font-mono tracking-tighter">{m.count}</span>
                                    <span className="text-[10px] font-black text-gray-300 uppercase">Bolos</span>
                                </div>
                                <div className="mt-2 w-24 bg-gray-200 h-1.5 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        whileInView={{ width: `${m.percentage}%` }}
                                        transition={{ duration: 1, delay: idx * 0.1 }}
                                        className={`h-full ${idx < 3 ? 'bg-primary' : 'bg-gray-500'}`}
                                    />
                                </div>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>
        </div>
    </div>
);

export const TopBySection = ({ sections }: { sections: { name: string, count: number }[] }) => (
    <div className="bg-gray-900 rounded-[3rem] p-10 text-white relative overflow-hidden h-full group">
        <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:scale-110 transition-transform duration-1000">
            <Star size={180} />
        </div>

        <div className="relative z-10">
            <h3 className="text-2xl font-black tracking-tight mb-2">Assistència per Seccions</h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-10">Quines seccions han estat més actives?</p>

            <div className="space-y-6">
                {(sections || []).slice(0, 6).map((s, idx) => (
                    <div key={idx} className="space-y-3">
                        <div className="flex justify-between items-end">
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{s.name}</span>
                            <span className="text-sm font-mono font-black">{s.count} serveis</span>
                        </div>
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                whileInView={{ width: `${(s.count / (sections[0]?.count || 1)) * 100}%` }}
                                transition={{ duration: 1, delay: idx * 0.1 }}
                                className="h-full bg-primary"
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
);
