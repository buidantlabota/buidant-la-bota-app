'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
    TrendingUp,
    Users,
    MapPin,
    Euro,
    ChevronLeft,
    ChevronRight,
    BarChart3,
    Award,
    Calendar,
    Filter,
    Briefcase,
    PieChart,
    UserCheck,
    UserMinus
} from 'lucide-react';
import { PrivacyMask } from '@/components/PrivacyMask';

export default function EstadistiquesPage() {
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [activeChartView, setActiveChartView] = useState<'revenue' | 'count'>('revenue');

    // Data states
    const [stats, setStats] = useState({
        totalBolos: 0,
        totalRevenue: 0,
        avgRevenue: 0,
        confirmedBolos: 0,
        titularsCount: 0,
        substitutsCount: 0,
        attendanceTitulars: 0,
        attendanceSubstituts: 0
    });

    const [topPopulations, setTopPopulations] = useState<{ nom: string, count: number, revenue: number }[]>([]);
    const [topClients, setTopClients] = useState<{ nom: string, count: number, revenue: number }[]>([]);
    const [topAssistants, setTopAssistants] = useState<{ nom: string, count: number, instrument: string, tipus: string }[]>([]);
    const [monthlyDistribution, setMonthlyDistribution] = useState<{ month: string, count: number, revenue: number }[]>([]);

    useEffect(() => {
        fetchStats();
    }, [selectedYear]);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const yearStart = `${selectedYear}-01-01`;
            const yearEnd = `${selectedYear}-12-31`;

            const [
                { data: allBolos },
                { data: attendanceData },
                { data: allMusics },
                { data: allClients }
            ] = await Promise.all([
                supabase.from('bolos').select('*, client:clients(nom)'),
                supabase.from('bolo_musics').select('music_id, tipus, estat, bolos!inner(data_bolo)'),
                supabase.from('musics').select('id, nom, tipus, instruments'),
                supabase.from('clients').select('id, nom')
            ]);

            if (allBolos) {
                const yearBolos = allBolos.filter((b: any) => b.data_bolo >= yearStart && b.data_bolo <= yearEnd);
                const confirmedStates = ['Confirmada', 'Confirmat', 'Pendents de cobrar', 'Per pagar', 'Tancades', 'Tancat'];
                const confirmedYearBolos = yearBolos.filter((b: any) => confirmedStates.includes(b.estat));

                // 1. General Stats
                const totalRevenue = confirmedYearBolos.reduce((sum: number, b: any) => sum + (b.import_total || 0), 0);

                // 2. Musician breakdown
                const titularsCount = (allMusics || []).filter((m: any) => m.tipus === 'titular').length;
                const substitutsCount = (allMusics || []).filter((m: any) => m.tipus === 'substitut').length;

                // 3. Attendance breakdown
                let attTitulars = 0;
                let attSubstituts = 0;
                (attendanceData || []).forEach((row: any) => {
                    const date = (row.bolos as any)?.data_bolo;
                    if (date && date >= yearStart && date <= yearEnd && row.estat === 'confirmat') {
                        if (row.tipus === 'titular') attTitulars++;
                        else attSubstituts++;
                    }
                });

                setStats({
                    totalBolos: yearBolos.length,
                    totalRevenue,
                    avgRevenue: confirmedYearBolos.length > 0 ? totalRevenue / confirmedYearBolos.length : 0,
                    confirmedBolos: confirmedYearBolos.length,
                    titularsCount,
                    substitutsCount,
                    attendanceTitulars: attTitulars,
                    attendanceSubstituts: attSubstituts
                });

                // 4. Population & Client Rankings
                const popMap: Record<string, { count: number, revenue: number }> = {};
                const clientMap: Record<string, { count: number, revenue: number }> = {};

                yearBolos.forEach((b: any) => {
                    // Populations
                    if (!popMap[b.nom_poble]) popMap[b.nom_poble] = { count: 0, revenue: 0 };
                    popMap[b.nom_poble].count++;
                    if (confirmedStates.includes(b.estat)) {
                        popMap[b.nom_poble].revenue += (b.import_total || 0);
                    }

                    // Clients
                    const clientName = b.client?.nom || 'Sense Client';
                    if (!clientMap[clientName]) clientMap[clientName] = { count: 0, revenue: 0 };
                    clientMap[clientName].count++;
                    if (confirmedStates.includes(b.estat)) {
                        clientMap[clientName].revenue += (b.import_total || 0);
                    }
                });

                setTopPopulations(
                    Object.entries(popMap)
                        .map(([nom, d]) => ({ nom, count: d.count, revenue: d.revenue }))
                        .sort((a, b) => b.revenue - a.revenue)
                        .slice(0, 15)
                );

                setTopClients(
                    Object.entries(clientMap)
                        .map(([nom, d]) => ({ nom, count: d.count, revenue: d.revenue }))
                        .sort((a, b) => b.revenue - a.revenue)
                        .slice(0, 15)
                );

                // 5. Monthly Evolution
                const months = ['Gen', 'Feb', 'Mar', 'Abr', 'Maig', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Des'];
                const monthlyData = months.map((m, idx) => {
                    const mBolos = confirmedYearBolos.filter((b: any) => new Date(b.data_bolo).getMonth() === idx);
                    return {
                        month: m,
                        count: mBolos.length,
                        revenue: mBolos.reduce((sum: number, b: any) => sum + (b.import_total || 0), 0)
                    };
                });
                setMonthlyDistribution(monthlyData);
            }

            // 6. Detailed Attendance Rankings
            if (attendanceData && allMusics) {
                const musicInfoMap = Object.fromEntries(allMusics.map((m: any) => [m.id, { nom: m.nom, inst: m.instruments, tipus: m.tipus }]));
                const assistantMap: Record<string, number> = {};

                attendanceData.forEach((row: any) => {
                    const date = row.bolos?.data_bolo;
                    if (date && date >= yearStart && date <= yearEnd && row.estat === 'confirmat') {
                        const mid = row.music_id;
                        assistantMap[mid] = (assistantMap[mid] || 0) + 1;
                    }
                });

                setTopAssistants(
                    Object.entries(assistantMap)
                        .map(([mid, count]) => ({
                            nom: musicInfoMap[mid]?.nom || 'Desconegut',
                            count,
                            instrument: musicInfoMap[mid]?.inst || '-',
                            tipus: musicInfoMap[mid]?.tipus || '-'
                        }))
                        .sort((a, b) => b.count - a.count)
                );
            }

        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-8 bg-gray-50/50 min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-4 border-b border-gray-200">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        <span className="p-2 bg-primary text-white rounded-2xl shadow-lg"><BarChart3 size={32} /></span>
                        Estadístiques i Analítica
                    </h1>
                    <p className="text-gray-500 mt-2 font-medium flex items-center gap-2">
                        <Filter size={14} />
                        Analitzant l'històric i rendiment de Buidant la Bota
                    </p>
                </div>

                <div className="flex items-center bg-white rounded-2xl border border-gray-200 p-1.5 shadow-sm">
                    <button onClick={() => setSelectedYear(prev => prev - 1)} className="p-2 hover:bg-primary hover:text-white rounded-xl transition-all"><ChevronLeft size={20} /></button>
                    <span className="px-6 text-xl font-black font-mono text-gray-800">{selectedYear}</span>
                    <button onClick={() => setSelectedYear(prev => prev + 1)} className="p-2 hover:bg-primary hover:text-white rounded-xl transition-all"><ChevronRight size={20} /></button>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-40 gap-4">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent shadow-md"></div>
                    <p className="font-bold text-gray-400 animate-pulse">Processant dades de la base de dades...</p>
                </div>
            ) : (
                <>
                    {/* General Stats Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex flex-col justify-between group hover:shadow-xl transition-all duration-300">
                            <div className="flex justify-between items-start">
                                <div className="bg-primary/10 p-4 rounded-3xl text-primary group-hover:scale-110 transition-transform"><Calendar size={28} /></div>
                                <span className="text-[10px] font-black text-primary bg-primary/5 px-3 py-1 rounded-full uppercase tracking-tighter">Bolos Totals</span>
                            </div>
                            <div className="mt-6">
                                <p className="text-4xl font-black text-gray-900">{stats.totalBolos}</p>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-primary" style={{ width: `${(stats.confirmedBolos / stats.totalBolos) * 100}%` }}></div>
                                    </span>
                                    <span className="text-[10px] font-black text-gray-400">{stats.confirmedBolos} CONFIRMATS</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex flex-col justify-between group hover:shadow-xl transition-all duration-300">
                            <div className="flex justify-between items-start">
                                <div className="bg-emerald-100 p-4 rounded-3xl text-emerald-600 group-hover:scale-110 transition-transform"><Euro size={28} /></div>
                                <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-tighter">Ingressos Any</span>
                            </div>
                            <div className="mt-6">
                                <p className="text-4xl font-black text-gray-900 leading-none"><PrivacyMask value={stats.totalRevenue} /></p>
                                <p className="text-[10px] text-gray-400 font-bold mt-3 uppercase tracking-widest flex items-center gap-1">
                                    <TrendingUp size={10} className="text-emerald-500" />
                                    Liquiditat generada
                                </p>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex flex-col justify-between group hover:shadow-xl transition-all duration-300">
                            <div className="flex justify-between items-start">
                                <div className="bg-blue-100 p-4 rounded-3xl text-blue-600 group-hover:scale-110 transition-transform"><Briefcase size={28} /></div>
                                <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-tighter">Balanç Mitjà</span>
                            </div>
                            <div className="mt-6">
                                <p className="text-4xl font-black text-gray-900 leading-none"><PrivacyMask value={stats.avgRevenue} /></p>
                                <p className="text-[10px] text-gray-400 font-bold mt-3 uppercase tracking-widest flex items-center gap-1">
                                    Per actuació confirmada
                                </p>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex flex-col justify-between group hover:shadow-xl transition-all duration-300">
                            <div className="flex justify-between items-start">
                                <div className="bg-orange-100 p-4 rounded-3xl text-orange-600 group-hover:scale-110 transition-transform"><TrendingUp size={28} /></div>
                                <span className="text-[10px] font-black text-orange-600 bg-orange-50 px-3 py-1 rounded-full uppercase tracking-tighter">Efectivitat</span>
                            </div>
                            <div className="mt-6">
                                <p className="text-4xl font-black text-gray-900 leading-none">
                                    {stats.totalBolos > 0 ? Math.round((stats.confirmedBolos / stats.totalBolos) * 100) : 0}%
                                </p>
                                <p className="text-[10px] text-gray-400 font-bold mt-3 uppercase tracking-widest leading-none flex items-center gap-1">
                                    Conversió de sol·licituds
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Evolution Chart */}
                        <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm relative overflow-hidden group">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h3 className="text-2xl font-black text-gray-900 tracking-tight">Estacionalitat i Evolució</h3>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Comparativa de volum i facturació mensual</p>
                                </div>
                                <div className="flex bg-gray-100 p-1 rounded-xl">
                                    <button
                                        onClick={() => setActiveChartView('revenue')}
                                        className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${activeChartView === 'revenue' ? 'bg-primary text-white shadow-md' : 'text-gray-400'}`}
                                    >
                                        Facturació
                                    </button>
                                    <button
                                        onClick={() => setActiveChartView('count')}
                                        className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${activeChartView === 'count' ? 'bg-primary text-white shadow-md' : 'text-gray-400'}`}
                                    >
                                        Volum
                                    </button>
                                </div>
                            </div>

                            <div className="relative h-72 w-full flex items-end justify-between gap-3 px-4 pt-12">
                                <div className="absolute top-10 left-4 right-4 h-[1px] bg-gray-50 border-t border-dashed border-gray-200"></div>
                                <div className="absolute top-28 left-4 right-4 h-[1px] bg-gray-50 border-t border-dashed border-gray-200"></div>
                                <div className="absolute top-48 left-4 right-4 h-[1px] bg-gray-50 border-t border-dashed border-gray-200"></div>

                                {monthlyDistribution.map((m, idx) => {
                                    const maxVal = activeChartView === 'revenue'
                                        ? Math.max(...monthlyDistribution.map(d => d.revenue), 1)
                                        : Math.max(...monthlyDistribution.map(d => d.count), 1);

                                    const currentVal = activeChartView === 'revenue' ? m.revenue : m.count;
                                    const height = (currentVal / maxVal) * 100;

                                    return (
                                        <div key={idx} className="flex-1 group/bar relative flex flex-col items-center h-full justify-end">
                                            <div
                                                className={`w-full max-w-[40px] rounded-t-2xl transition-all duration-700 relative z-10 ${activeChartView === 'revenue' ? 'bg-primary hover:bg-red-800' : 'bg-gray-800 hover:bg-black'}`}
                                                style={{ height: `${height}%` }}
                                            >
                                                <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-black py-2 px-3 rounded-xl opacity-0 group-hover/bar:opacity-100 transition-all scale-75 group-hover/bar:scale-100 whitespace-nowrap shadow-xl border border-white/20">
                                                    {activeChartView === 'revenue' ? <PrivacyMask value={m.revenue} /> : `${m.count} BOLOS`}
                                                </div>
                                                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover/bar:opacity-100 transition-opacity rounded-t-2xl"></div>
                                            </div>
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter mt-4 group-hover/bar:text-primary transition-colors">{m.month}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Attendance & Personal Stats */}
                        <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm flex flex-col gap-8">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-2xl font-black text-gray-900 tracking-tight">Personal i Plantilla</h3>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Distribució i ocupació de la música</p>
                                </div>
                                <PieChart className="text-gray-200" size={32} />
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="bg-emerald-50/50 p-6 rounded-[32px] border border-emerald-100 flex flex-col gap-1 items-center">
                                    <UserCheck className="text-emerald-600 mb-2" />
                                    <span className="text-4xl font-black text-emerald-700">{stats.titularsCount}</span>
                                    <span className="text-[9px] font-black uppercase text-emerald-800 tracking-tighter">Músics Titulars</span>
                                    <div className="mt-4 w-full bg-emerald-100 h-1.5 rounded-full overflow-hidden">
                                        <div className="h-full bg-emerald-600" style={{ width: `${(stats.titularsCount / (stats.titularsCount + stats.substitutsCount)) * 100}%` }}></div>
                                    </div>
                                    <p className="text-[9px] font-black text-emerald-600/60 mt-2">{stats.attendanceTitulars} Serveis confirmats</p>
                                </div>

                                <div className="bg-gray-50 p-6 rounded-[32px] border border-gray-200 flex flex-col gap-1 items-center">
                                    <UserMinus className="text-gray-500 mb-2" />
                                    <span className="text-4xl font-black text-gray-900">{stats.substitutsCount}</span>
                                    <span className="text-[9px] font-black uppercase text-gray-600 tracking-tighter">Músics Substituts</span>
                                    <div className="mt-4 w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                                        <div className="h-full bg-gray-800" style={{ width: `${(stats.substitutsCount / (stats.titularsCount + stats.substitutsCount)) * 100}%` }}></div>
                                    </div>
                                    <p className="text-[9px] font-black text-gray-500/60 mt-2">{stats.attendanceSubstituts} Serveis confirmats</p>
                                </div>
                            </div>

                            <div className="flex-1 bg-gray-900 text-white p-6 rounded-[32px] relative overflow-hidden flex items-center justify-between group">
                                <div className="relative z-10">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">Taxa d'assistència Titular</p>
                                    <p className="text-5xl font-black font-mono">
                                        {stats.attendanceTitulars + stats.attendanceSubstituts > 0
                                            ? Math.round((stats.attendanceTitulars / (stats.attendanceTitulars + stats.attendanceSubstituts)) * 100)
                                            : 0}%
                                    </p>
                                    <p className="text-[10px] text-gray-400 mt-2 italic font-medium leading-tight">Percentatge de places cobertes per titulars vs total de serveis reals.</p>
                                </div>
                                <div className="absolute right-0 bottom-0 p-4 opacity-10 group-hover:scale-125 transition-transform duration-700">
                                    <Award size={140} />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Top Populations */}
                        <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                            <div className="p-8 pb-4 flex items-center gap-3">
                                <MapPin className="text-primary" />
                                <h3 className="text-xl font-bold">Llogarrets i Poblacions</h3>
                            </div>
                            <div className="p-4 pt-0 overflow-y-auto max-h-[500px] scrollbar-thin">
                                <table className="w-full">
                                    <thead>
                                        <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50">
                                            <th className="text-left p-4">Població</th>
                                            <th className="text-center p-4">Bolos</th>
                                            <th className="text-right p-4">Ingressos</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {topPopulations.map((p, idx) => (
                                            <tr key={idx} className="group hover:bg-gray-50/50 transition-colors">
                                                <td className="p-4">
                                                    <span className="text-[10px] font-black text-gray-300 mr-2">#{idx + 1}</span>
                                                    <span className="text-sm font-bold text-gray-700">{p.nom}</span>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <span className="bg-gray-100 text-primary px-2 py-1 rounded-lg text-[10px] font-black">{p.count}</span>
                                                </td>
                                                <td className="p-4 text-right">
                                                    <span className="text-sm font-black text-gray-900"><PrivacyMask value={p.revenue} /></span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Top Clients */}
                        <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                            <div className="p-8 pb-4 flex items-center gap-3">
                                <Briefcase className="text-blue-500" />
                                <h3 className="text-xl font-bold">Clients i Entitats</h3>
                            </div>
                            <div className="p-4 pt-0 overflow-y-auto max-h-[500px] scrollbar-thin">
                                <table className="w-full">
                                    <thead>
                                        <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50">
                                            <th className="text-left p-4">Client</th>
                                            <th className="text-right p-4">Ingressos</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {topClients.map((c, idx) => (
                                            <tr key={idx} className="group hover:bg-gray-50/50 transition-colors">
                                                <td className="p-4">
                                                    <span className="text-[10px] font-black text-gray-300 mr-2">#{idx + 1}</span>
                                                    <span className="text-sm font-bold text-gray-700 truncate block max-w-[150px]">{c.nom}</span>
                                                </td>
                                                <td className="p-4 text-right">
                                                    <span className="text-sm font-black text-emerald-600"><PrivacyMask value={c.revenue} /></span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Attendance Detail Ranking */}
                        <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                            <div className="p-8 pb-4 flex items-center gap-3">
                                <Award className="text-orange-500" />
                                <h3 className="text-xl font-bold">L'Onze Ideal (Més serveis)</h3>
                            </div>
                            <div className="p-4 pt-0 overflow-y-auto max-h-[500px] scrollbar-thin">
                                {topAssistants.map((a, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-4 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors pointer-events-none">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${idx === 0 ? 'bg-yellow-100 text-yellow-700' : idx === 1 ? 'bg-gray-100 text-gray-600' : idx === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-50 text-gray-300'}`}>
                                                {idx + 1}
                                            </div>
                                            <div>
                                                <span className="text-sm font-bold text-gray-800 block">{a.nom}</span>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[9px] font-black uppercase text-gray-400 bg-gray-100 px-1.5 rounded">{a.instrument}</span>
                                                    <span className={`text-[9px] font-black uppercase px-1.5 rounded ${a.tipus === 'titular' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>{a.tipus}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 bg-white border border-gray-100 px-3 py-1 rounded-2xl shadow-sm">
                                            <span className="text-lg font-black text-gray-900 font-mono leading-none">{a.count}</span>
                                            <span className="text-[10px] font-black text-gray-300 uppercase leading-none">Bolos</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
