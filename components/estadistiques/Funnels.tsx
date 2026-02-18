'use client';

import { motion } from 'framer-motion';
import { MousePointer2, CheckCircle2, XCircle, Clock } from 'lucide-react';

interface FunnelData {
    total: number;
    accepted: number;
    rejected: number;
    pending: number;
}

export const FunnelSollicituds = ({ data }: { data: FunnelData }) => {
    const steps = [
        { label: 'Sol·licituds Totals', value: data.total, color: 'bg-gray-100', icon: MousePointer2, textColor: 'text-gray-900' },
        { label: 'Bolo Confirmats', value: data.accepted, color: 'bg-emerald-500', icon: CheckCircle2, textColor: 'text-white' },
        { label: 'Pendents / En Curs', value: data.pending, color: 'bg-blue-500', icon: Clock, textColor: 'text-white' },
        { label: 'Rebutjats / Cancel·lats', value: data.rejected, color: 'bg-red-500', icon: XCircle, textColor: 'text-white' },
    ];

    return (
        <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
            <h3 className="text-2xl font-black text-gray-900 tracking-tight mb-2">Funnel de Conversió</h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-10">Històric d'estat de les actuacions</p>

            <div className="space-y-4">
                {steps.map((step, idx) => {
                    const width = data.total > 0 ? (step.value / data.total) * 100 : 0;

                    return (
                        <div key={idx} className="relative group flex items-center h-20">
                            <div className="absolute inset-0 z-0 h-full">
                                <motion.div
                                    initial={{ width: 0 }}
                                    whileInView={{ width: `${Math.max(width, 1)}%` }}
                                    transition={{ duration: 0.8, delay: idx * 0.1 }}
                                    className={`h-full ${step.color} rounded-2xl shadow-sm`}
                                />
                            </div>

                            <div className="relative z-10 flex items-center gap-6 px-8 w-full group">
                                <div className={`p-2.5 rounded-xl bg-white shadow-sm transition-transform duration-500 group-hover:scale-110 ${step.textColor.includes('white') ? 'text-gray-900' : step.textColor}`}>
                                    <step.icon size={20} className="shrink-0" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 group-hover:text-gray-900 transition-colors leading-none mb-1">{step.label}</p>
                                    <p className="text-3xl font-black text-gray-900 leading-none">{step.value}</p>
                                </div>
                                {width > 0 && (
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">{Math.round(width)}%</p>
                                    </div>
                                )}
                            </div>

                            {idx < steps.length - 1 && (
                                <div className="absolute left-14 -bottom-4 h-4 w-px bg-gray-200 border-l border-dashed border-gray-300 z-0" />
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="mt-10 p-6 bg-emerald-50 rounded-[2rem] border border-emerald-100 flex items-center justify-between">
                <div>
                    <p className="text-[10px] font-black uppercase text-emerald-800 tracking-widest mb-1">Taxa d'Acceptació</p>
                    <p className="text-4xl font-black text-emerald-900">{data.total > 0 ? Math.round((data.accepted / data.total) * 100) : 0}%</p>
                </div>
                <div className="bg-white/50 p-3 rounded-2xl">
                    <TrendingUp className="text-emerald-600" size={24} />
                </div>
            </div>
        </div>
    );
};

import { TrendingUp } from 'lucide-react';
