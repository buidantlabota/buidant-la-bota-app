'use client';

import { useState, useEffect, useCallback, ReactNode } from 'react';
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
    Star
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
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (currentFilters.years.length) params.append('years', currentFilters.years.join(','));
            if (currentFilters.towns.length) params.append('towns', currentFilters.towns.join(','));
            if (currentFilters.types.length) params.append('types', currentFilters.types.join(','));
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

    const handleFilterChange = (newFilters: any) => {
        setFilters(newFilters);
        fetchStats(newFilters);
    };

    return (
        <div className="flex flex-col lg:flex-row min-h-screen bg-gray-50/50">
            {/* Sidebar Filters */}
            <FilterPanel
                availableData={metaData}
                onFilterChange={handleFilterChange}
            />

            {/* Main Content */}
            <main className="flex-1 p-4 md:p-10 space-y-12">
                {/* Header */}
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-gray-200">
                    <div>
                        <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center gap-4">
                            <span className="p-3 bg-primary text-white rounded-[2rem] shadow-2xl shadow-primary/20">
                                <LayoutDashboard size={32} />
                            </span>
                            Dashboard d'Anàlisi
                        </h1>
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-4 flex items-center gap-2">
                            <Activity size={16} className="text-primary" />
                            Vista professional de rendiment i mètriques
                        </p>
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

                {loading && !stats ? (
                    <div className="flex flex-col items-center justify-center py-40 gap-6">
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            className="rounded-full h-16 w-16 border-4 border-primary border-t-transparent shadow-xl"
                        />
                        <p className="font-black text-gray-300 uppercase tracking-[0.3em] animate-pulse">Carregant dades...</p>
                    </div>
                ) : (
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={JSON.stringify(filters)}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            transition={{ duration: 0.4 }}
                            className="space-y-12"
                        >
                            {/* Charts Section 1: Financial & Volume */}
                            <section className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                                <MonthlyEvolutionChart data={stats?.charts?.monthly || []} />
                                <VolumeVsRevenueChart data={stats?.charts?.monthly || []} />
                            </section>

                            {/* Charts Section 2: Distribution */}
                            <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <div className="md:col-span-2">
                                    <TopTownsChart data={stats?.charts?.towns || []} />
                                </div>
                                <div className="space-y-8">
                                    <PaymentDistributionChart data={stats?.charts?.payments || []} />
                                    <PriceRangesChart data={stats?.charts?.prices || []} />
                                </div>
                            </section>

                            {/* Cool Stats Section */}
                            <section className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                                <div className="xl:col-span-2">
                                    <ElevenGala musicians={stats?.rankings?.elevenGala || []} />
                                </div>
                                <div className="space-y-8">
                                    <TopBySection sections={stats?.rankings?.topSections || []} />
                                    <FunnelSollicituds data={{
                                        total: stats?.kpis?.count || 0,
                                        accepted: stats?.kpis?.confirmedCount || 0,
                                        rejected: stats?.kpis?.rejectedCount || 0,
                                        pending: stats?.kpis?.pendingCount || 0
                                    }} />
                                </div>
                            </section>
                        </motion.div>
                    </AnimatePresence>
                )}
            </main>
        </div>
    );
}
