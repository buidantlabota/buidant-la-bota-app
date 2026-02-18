'use client';

import { useState, useEffect, useCallback, ReactNode, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
    BarChart3,
    LayoutDashboard,
    TrendingUp,
    Users,
    MapPin,
    Euro,
    CreditCard,
    Activity,
    Award,
    Star,
    ArrowUpRight
} from 'lucide-react';
import { PrivacyMask } from '@/components/PrivacyMask';
import FilterPanel from '@/components/estadistiques/FilterPanel';
import KpiCard from '@/components/estadistiques/KpiCard';
import {
    MonthlyEvolutionChart,
    VolumeVsRevenueChart,
    TopTownsChart,
    PaymentDistributionChart,
    PriceRangesChart
} from '@/components/estadistiques/Charts';
import { ElevenGala, TopBySection } from '@/components/estadistiques/Rankings';
import { FunnelSollicituds } from '@/components/estadistiques/Funnels';
import { motion, AnimatePresence } from 'framer-motion';

export default function EstadistiquesPage() {
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [metaData, setMetaData] = useState({ years: [], towns: [], types: [] });
    const [stats, setStats] = useState<any>(null);
    const [filters, setFilters] = useState<any>(null);

    // 1. Initial Metadata load for filters
    useEffect(() => {
        const fetchMeta = async () => {
            const { data: bolos } = await supabase.from('bolos').select('data_bolo, nom_poble, tipus_actuacio');
            if (bolos) {
                const years = Array.from(new Set(bolos.map((b: any) => new Date(b.data_bolo).getFullYear().toString()))).sort().reverse();
                const towns = Array.from(new Set(bolos.map((b: any) => b.nom_poble))).sort();
                const types = Array.from(new Set(bolos.map((b: any) => b.tipus_actuacio).filter((t: any) => !!t))).sort();
                setMetaData({ years: years as any, towns: towns as any, types: types as any });
            }
        };
        fetchMeta();
    }, []);

    // 2. Fetch stats when filters change
    const fetchStats = useCallback(async (currentFilters: any) => {
        if (!currentFilters) return;
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (currentFilters.years?.length) params.append('years', currentFilters.years.join(','));
            if (currentFilters.towns?.length) params.append('towns', currentFilters.towns.join(','));
            if (currentFilters.types?.length) params.append('types', currentFilters.types.join(','));
            if (currentFilters.status !== 'tots') params.append('status', currentFilters.status);
            if (currentFilters.paymentType !== 'tots') params.append('paymentType', currentFilters.paymentType);
            if (currentFilters.minPrice) params.append('minPrice', currentFilters.minPrice);
            if (currentFilters.maxPrice) params.append('maxPrice', currentFilters.maxPrice);

            const res = await fetch(`/api/estadistiques?${params.toString()}`);
            const data = await res.json();
            setStats(data);
        } catch (e) {
            console.error('Error fetching stats:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleFilterChange = useCallback((newFilters: any) => {
        setFilters(newFilters);
        fetchStats(newFilters);
    }, [fetchStats]);

    return (
        <div className="min-h-screen bg-gray-50/50 flex flex-col">
            {/* Horizontal Top Filters */}
            <FilterPanel
                availableData={metaData}
                onFilterChange={handleFilterChange}
            />

            {/* Main Content */}
            <main className="flex-1 p-4 md:p-10 space-y-12 max-w-[1600px] mx-auto w-full">
                {/* Header */}
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-gray-200">
                    <div>
                        <div className="flex items-center gap-3 text-primary mb-2">
                            <span className="p-1.5 bg-primary/10 rounded-lg"><Activity size={18} /></span>
                            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Business Intelligence</span>
                        </div>
                        <h1 className="text-5xl font-black text-gray-900 tracking-tighter">
                            Estadístiques <span className="text-primary">&</span> Analítica
                        </h1>
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-4">
                            Panell de control i monitorització de rendiment
                        </p>
                    </div>

                    <div className="hidden md:flex items-center gap-4 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
                        <div className="px-4 py-2 text-right">
                            <p className="text-[9px] font-black text-gray-400 uppercase leading-none">Última Actualització</p>
                            <p className="text-xs font-bold text-gray-900 mt-1">Avui a les {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                        <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center animate-pulse">
                            <ArrowUpRight size={20} />
                        </div>
                    </div>
                </header>

                {/* KPIs Grid */}
                <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                    <KpiCard
                        title="Total Ingressos"
                        value={<PrivacyMask value={stats?.kpis?.totalIncome || 0} />}
                        subtitle="Confirmats i tancats"
                        icon={<Euro size={24} />}
                        isLoading={loading && !stats}
                        color="emerald"
                    />
                    <KpiCard
                        title="Nº de Bolos"
                        value={stats?.kpis?.count || 0}
                        subtitle={`${stats?.kpis?.confirmedCount || 0} confirmats`}
                        icon={<BarChart3 size={24} />}
                        isLoading={loading && !stats}
                        color="primary"
                    />
                    <KpiCard
                        title="Mitjana per Bolo"
                        value={<PrivacyMask value={stats?.kpis?.avgPrice || 0} />}
                        subtitle={`Mediana: ${Math.round(stats?.kpis?.medianPrice || 0)}€`}
                        icon={<TrendingUp size={24} />}
                        isLoading={loading && !stats}
                        color="blue"
                    />
                    <KpiCard
                        title="Benefici Net"
                        value={<PrivacyMask value={stats?.kpis?.netProfit || 0} />}
                        subtitle={`Despeses: ${Math.round(stats?.kpis?.totalExpenses || 0)}€`}
                        icon={<Star size={24} />}
                        isLoading={loading && !stats}
                        color="purple"
                    />
                </section>

                <div className="relative">
                    {/* Overlay subtle loading state instead of full replace to avoid "buggy" UX */}
                    {loading && stats && (
                        <div className="absolute top-0 right-0 p-4 z-40">
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                className="rounded-full h-8 w-8 border-4 border-primary border-t-transparent shadow-lg"
                            />
                        </div>
                    )}

                    {!stats && loading ? (
                        <div className="flex flex-col items-center justify-center py-60 gap-8">
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                className="rounded-full h-20 w-20 border-4 border-primary border-t-transparent shadow-2xl"
                            />
                            <div className="text-center">
                                <p className="font-black text-gray-900 text-xl tracking-tighter uppercase mb-2">Processant Dades</p>
                                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest animate-pulse">Calculant mètriques de rendiment...</p>
                            </div>
                        </div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.5 }}
                            className="space-y-12"
                        >
                            {/* Financial & Evolution Section */}
                            <section className="space-y-8">
                                <div className="grid grid-cols-1 gap-8">
                                    <MonthlyEvolutionChart data={stats?.charts?.monthly || []} />
                                </div>
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                                    <VolumeVsRevenueChart data={stats?.charts?.monthly || []} />
                                    <TopTownsChart data={stats?.charts?.towns || []} />
                                </div>
                            </section>

                            {/* Distribution Section - Now more prominent */}
                            <section className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                                <div className="xl:col-span-1">
                                    <PaymentDistributionChart data={stats?.charts?.payments || []} />
                                </div>
                                <div className="xl:col-span-1">
                                    <PriceRangesChart data={stats?.charts?.prices || []} />
                                </div>
                                <div className="xl:col-span-1 bg-white p-8 rounded-[2.5rem] border border-gray-100 flex flex-col justify-center items-center text-center">
                                    <div className="p-6 bg-primary/5 rounded-full text-primary mb-6">
                                        <TrendingUp size={48} />
                                    </div>
                                    <h3 className="text-4xl font-black text-gray-900 mb-2">
                                        {stats?.kpis?.acceptanceRate ? Math.round(stats.kpis.acceptanceRate) : 0}%
                                    </h3>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Taxa d'Acceptació Global</p>
                                    <div className="mt-8 w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${stats?.kpis?.acceptanceRate || 0}%` }}
                                            className="h-full bg-primary"
                                        />
                                    </div>
                                </div>
                            </section>

                            {/* Rankings - Full width boxes */}
                            <section className="grid grid-cols-1 gap-8">
                                <ElevenGala musicians={stats?.rankings?.elevenGala || []} />
                            </section>

                            <section className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                                <TopBySection sections={stats?.rankings?.topSections || []} />
                                <FunnelSollicituds data={{
                                    total: stats?.kpis?.count || 0,
                                    accepted: stats?.kpis?.confirmedCount || 0,
                                    rejected: stats?.kpis?.rejectedCount || 0,
                                    pending: stats?.kpis?.pendingCount || 0
                                }} />
                            </section>
                        </motion.div>
                    )}
                </div>

                {/* Footer simple */}
                <footer className="pt-12 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-black text-gray-300 uppercase tracking-widest">
                    <span>&copy; {new Date().getFullYear()} Buidant la Bota Analytics</span>
                    <div className="flex gap-6">
                        <span>Seguretat Supabase</span>
                        <span>Dades encriptades</span>
                        <span>Vercel Edge</span>
                    </div>
                </footer>
            </main>
        </div>
    );
}
