'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface KpiCardProps {
    title: string;
    value: ReactNode;
    subtitle?: string;
    icon: ReactNode;
    trend?: {
        value: number;
        label: string;
        isPositive?: boolean;
    };
    color?: 'primary' | 'emerald' | 'blue' | 'orange' | 'purple' | 'red';
    isLoading?: boolean;
}

const colors = {
    primary: 'bg-primary/10 text-primary border-primary/20',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    orange: 'bg-orange-50 text-orange-600 border-orange-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    red: 'bg-red-50 text-red-600 border-red-100',
};

export default function KpiCard({ title, value, subtitle, icon, trend, color = 'primary', isLoading }: KpiCardProps) {
    if (isLoading) {
        return (
            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 animate-pulse">
                <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-2xl" />
                    <div className="w-16 h-4 bg-gray-50 rounded-full" />
                </div>
                <div className="w-24 h-8 bg-gray-100 rounded-lg mb-2" />
                <div className="w-32 h-3 bg-gray-50 rounded-lg" />
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -5, boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)' }}
            className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col justify-between group transition-all duration-300"
        >
            <div className="flex justify-between items-start">
                <div className={cn("p-4 rounded-2xl group-hover:scale-110 transition-transform", colors[color])}>
                    {icon}
                </div>
                {trend && (
                    <span className={cn(
                        "text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-tighter",
                        trend.isPositive ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                    )}>
                        {trend.isPositive ? '+' : ''}{trend.value}% {trend.label}
                    </span>
                )}
            </div>

            <div className="mt-6">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">{title}</h4>
                <p className="text-4xl font-black text-gray-900 leading-none truncate">{value}</p>
                {subtitle && (
                    <p className="text-[10px] text-gray-400 font-bold mt-2 uppercase tracking-widest">{subtitle}</p>
                )}
            </div>
        </motion.div>
    );
}
