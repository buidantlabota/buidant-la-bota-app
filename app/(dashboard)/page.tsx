'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import type { ViewBolosResumAny } from '@/types';
import { PrivacyMask } from '@/components/PrivacyMask';
import { usePrivacy } from '@/context/PrivacyContext';

export default function Dashboard() {
  const supabase = createClient();
  const { isPrivate, togglePrivacy } = usePrivacy();
  const currentYear = new Date().getFullYear();

  // State for years
  const [availableYears, setAvailableYears] = useState<number[]>([currentYear]);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [yearsLoaded, setYearsLoaded] = useState(false);

  // Stats state
  const [loading, setLoading] = useState(true);
  const [numBolos, setNumBolos] = useState(0);
  const [totalIngres, setTotalIngres] = useState(0);

  // Financial detailed state
  const [finances, setFinances] = useState({
    potReal: 0,
    aCobrar: 0,
    aPagar: 0,
    projectat: 0
  });

  // Rankings state
  const [topPopulations, setTopPopulations] = useState<{ nom: string, count: number }[]>([]);
  const [topAssistants, setTopAssistants] = useState<{ nom: string, count: number }[]>([]);

  // Bolo cards state
  const [properBolo, setProperBolo] = useState<{ id: number, titol: string | null, poblacio: string, lloc?: string | null, data: string, tipus?: string, hora?: string | null } | null>(null);
  const [pendingRequests, setPendingRequests] = useState<{ id: number, titol: string | null, poblacio: string, data: string, estat: string, hora_inici?: string | null }[]>([]);

  // 1. Fetch available years on mount
  useEffect(() => {
    const fetchYears = async () => {
      try {
        const { data, error } = await supabase.from('bolos').select('data_bolo');
        if (error) throw error;

        if (data) {
          const years = data.map((b: any) => new Date(b.data_bolo).getFullYear());
          const uniqueYears = Array.from(new Set(years)) as number[];
          uniqueYears.sort((a, b) => b - a);
          if (uniqueYears.length > 0) {
            setAvailableYears(uniqueYears);
            if (!uniqueYears.includes(currentYear)) setSelectedYear(uniqueYears[0]);
          }
        }
      } catch (error) {
        console.error('Error fetching available years:', error);
      } finally {
        setYearsLoaded(true);
      }
    };
    fetchYears();
  }, []);

  // 2. Fetch data whenever selectedYear changes
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const today = new Date().toLocaleDateString('en-CA');

        // Parallel requests
        const [
          { data: viewData },
          { data: allBolos },
          { data: allMovements },
          { data: nextBolo },
          { data: requestBolos },
          { data: allAdvances },
          { data: attendanceData },
          { data: forecastItems },
          { data: economySettings }
        ] = await Promise.all([
          supabase.from('view_bolos_resum_any').select('*').eq('any', selectedYear).single(),
          supabase.from('bolos').select('id, estat, nom_poble, import_total, cost_total_musics, pot_delta_final, data_bolo, cobrat, pagaments_musics_fets'),
          supabase.from('despeses_ingressos').select('import, tipus'),
          supabase.from('bolos').select('id, titol, nom_poble, lloc, data_bolo, tipus_actuacio, hora_inici').in('estat', ['Confirmada', 'Confirmat', 'Pendents de cobrar', 'Per pagar']).gte('data_bolo', today).order('data_bolo', { ascending: true }).limit(1).maybeSingle(),
          supabase.from('bolos').select('id, titol, nom_poble, data_bolo, estat, hora_inici').in('estat', ['Nova', 'Sol·licitat', 'Pendent de confirmació']).gte('data_bolo', today).order('data_bolo', { ascending: true }).limit(5),
          supabase.from('pagaments_anticipats').select('*, bolos(estat, pot_delta_final)'),
          supabase.from('bolo_musics').select('music_id, musics(nom), bolos!inner(data_bolo)').eq('estat', 'confirmat').gte('bolos.data_bolo', `${selectedYear}-01-01`).lte('bolos.data_bolo', `${selectedYear}-12-31`),
          supabase.from('forecast_items').select('*'),
          supabase.from('economy_settings').select('*').single()
        ]);

        // A. Stats (Annual)
        if (viewData) {
          const stats = viewData as unknown as ViewBolosResumAny;
          setNumBolos(stats.total_bolos || 0);
          setTotalIngres(stats.total_ingressos || 0);
        } else {
          setNumBolos(0);
          setTotalIngres(0);
        }

        const totalManualBalance = (allMovements || []).reduce((sum: number, m: any) => sum + (m.tipus === 'ingrés' ? m.import : -m.import), 0);

        const closedBolosPot = (allBolos || [])
          .filter((b: any) => b.estat === 'Tancades' || b.estat === 'Tancat')
          .reduce((sum: number, b: any) => sum + (b.pot_delta_final || 0), 0);

        const currentAdvances = (allAdvances || [])
          .filter((a: any) => a.bolos?.pot_delta_final === null)
          .reduce((sum: number, a: any) => sum + (a.import || 0), 0);

        const potReal = totalManualBalance + closedBolosPot + currentAdvances;

        const aCobrar = (allBolos || [])
          .filter((b: any) => {
            const skip = ['Tancades', 'Tancat', 'Cancel·lats', 'Cancel·lat'].includes(b.estat);
            return !skip && !b.cobrat;
          })
          .reduce((sum: number, b: any) => {
            const income = b.import_total || 0;
            // Subtraction of advances already received is handled via potReal + aCobrar if we assume advances are part of aCobrar, 
            // but usually aCobrar means "what remains to be collected".
            // Let's keep it simple and consistent with Previsio: aCobrar is total remaining of open bolos.
            const advancesForThisBolo = (allAdvances || [])
              .filter((p: any) => p.bolo_id === b.id)
              .reduce((acc: number, p: any) => acc + (p.import || 0), 0);
            return sum + (income - advancesForThisBolo);
          }, 0);

        const aPagar = (allBolos || [])
          .filter((b: any) => {
            const skip = ['Tancades', 'Tancat', 'Cancel·lats', 'Cancel·lat'].includes(b.estat);
            return !skip && !b.pagaments_musics_fets;
          })
          .reduce((sum: number, b: any) => {
            const totalCost = b.cost_total_musics || 0;
            return sum + totalCost;
          }, 0);

        const horizonDays = (economySettings as any)?.default_horizon_days || 90;
        const horizonDate = new Date();
        horizonDate.setDate(horizonDate.getDate() + horizonDays);

        const activeExpensesTotal = (forecastItems || [])
          .filter((item: any) => item.type === 'expense' && item.is_active)
          .filter((item: any) => !item.date || new Date(item.date) <= horizonDate)
          .reduce((sum: number, item: any) => sum + (item.amount || 0), 0);

        const activeInvestmentsTotal = (forecastItems || [])
          .filter((item: any) => item.type === 'investment' && item.is_active)
          .filter((item: any) => !item.date || new Date(item.date) <= horizonDate)
          .reduce((sum: number, item: any) => sum + (item.amount || 0), 0);

        setFinances({
          potReal,
          aCobrar,
          aPagar,
          projectat: potReal + aCobrar - aPagar - activeExpensesTotal - activeInvestmentsTotal
        });

        // C. Next Bolo
        if (nextBolo) {
          setProperBolo({
            id: nextBolo.id,
            titol: nextBolo.titol,
            poblacio: nextBolo.nom_poble,
            lloc: nextBolo.lloc,
            data: nextBolo.data_bolo,
            tipus: nextBolo.tipus_actuacio || 'Actuació',
            hora: nextBolo.hora_inici
          });
        } else {
          setProperBolo(null);
        }

        // D. Pending Requests
        if (requestBolos) {
          setPendingRequests(requestBolos.map((b: any) => ({
            id: b.id,
            titol: b.titol,
            poblacio: b.nom_poble,
            data: b.data_bolo,
            estat: b.estat,
            hora_inici: b.hora_inici
          })));
        } else {
          setPendingRequests([]);
        }

        // E. Count Bolos per State for Mini-Kanban
        const counts = {
          'Nova': 0,
          'Pendent de confirmació': 0,
          'Confirmada': 0,
          'Pendents de cobrar': 0,
          'Per pagar': 0,
          'Tancades': 0
        };

        if (allBolos) {
          allBolos.forEach((b: any) => {
            if (counts.hasOwnProperty(b.estat)) {
              // @ts-ignore
              counts[b.estat]++;
            } else {
              if (b.estat === 'Sol·licitat') counts['Nova']++;
              if (b.estat === 'Confirmat') counts['Confirmada']++;
              if (b.estat === 'Tancat') counts['Tancades']++;
            }
          });
        }
        setBoloCounts(counts);

        // F. Rankings
        const yearStart = `${selectedYear}-01-01`;
        const yearEnd = `${selectedYear}-12-31`;

        // 1. Top Populations
        const popMap: Record<string, number> = {};
        (allBolos || []).forEach((b: any) => {
          if (b.data_bolo >= yearStart && b.data_bolo <= yearEnd) {
            popMap[b.nom_poble] = (popMap[b.nom_poble] || 0) + 1;
          }
        });
        const popRanking = Object.entries(popMap)
          .map(([nom, count]) => ({ nom, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
        setTopPopulations(popRanking);

        // 2. Top Assistants
        const assistantMap: Record<string, number> = {};
        (attendanceData || []).forEach((row: any) => {
          const nom = row.musics?.nom;
          if (nom) {
            assistantMap[nom] = (assistantMap[nom] || 0) + 1;
          }
        });
        const assistantRanking = Object.entries(assistantMap)
          .map(([nom, count]) => ({ nom, count }))
          .sort((a, b) => b.count - a.count);
        setTopAssistants(assistantRanking);

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (yearsLoaded) fetchData();
  }, [selectedYear, yearsLoaded, supabase]);

  const [boloCounts, setBoloCounts] = useState<Record<string, number>>({
    'Nova': 0,
    'Pendent de confirmació': 0,
    'Confirmada': 0,
    'Pendents de cobrar': 0,
    'Per pagar': 0,
    'Tancades': 0
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ca-ES', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ca-ES', { day: 'numeric', month: 'long' });
  };

  const getDaysUntil = (dateString: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateString);
    target.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Animated counter hook
  const useAnimatedCounter = (end: number, duration: number = 1000) => {
    const [count, setCount] = useState(0);

    useEffect(() => {
      if (loading) return;
      let startTime: number;
      let animationFrame: number;

      const animate = (currentTime: number) => {
        if (!startTime) startTime = currentTime;
        const progress = Math.min((currentTime - startTime) / duration, 1);

        setCount(Math.floor(progress * end));

        if (progress < 1) {
          animationFrame = requestAnimationFrame(animate);
        }
      };

      animationFrame = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(animationFrame);
    }, [end, duration, loading]);

    return count;
  };

  const animatedBolos = useAnimatedCounter(numBolos);

  return (
    <div className="p-4 md:p-8 space-y-8 min-h-screen bg-transparent">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-black text-text-primary tracking-tight">
              BUIDANT LA BOTA
            </h1>
            <button
              onClick={togglePrivacy}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-primary shadow-sm border border-gray-100 bg-white"
              title={isPrivate ? "Mostrar dades econòmiques" : "Ocultar dades econòmiques"}
            >
              <span className="material-icons-outlined text-xl">
                {isPrivate ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>
          <p className="text-text-secondary font-medium">
            Panell de Control {selectedYear}
          </p>
        </div>

        {/* Year Selector */}
        <div className="relative">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="appearance-none bg-card-bg border border-gray-200 text-lg font-bold py-2 pl-4 pr-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary shadow-sm cursor-pointer hover:bg-gray-50 transition-colors"
          >
            {availableYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
            <span className="material-icons-outlined">expand_more</span>
          </div>
        </div>
      </header>

      {/* Hero: Next Bolo */}
      <section>
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-red-900 to-black text-white shadow-2xl">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <span className="material-icons-outlined text-[150px] rotate-[-12deg]">festival</span>
          </div>

          <div className="relative p-8 md:p-12 z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            {properBolo ? (
              <>
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm border border-white/10 text-xs font-bold uppercase tracking-wider">
                    <span className="material-icons-outlined text-sm">event</span>
                    Propera Actuació
                  </div>
                  <h2 className="text-4xl md:text-6xl font-black leading-tight tracking-tight">
                    {properBolo.titol || properBolo.poblacio}
                  </h2>
                  <div className="flex items-center gap-2 text-white/80 font-bold mb-2">
                    <span className="material-icons-outlined text-sm">location_on</span>
                    {properBolo.poblacio}{properBolo.lloc ? ` (${properBolo.lloc})` : ''}
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-white/90">
                    <div className="flex items-center gap-2">
                      <span className="material-icons-outlined">calendar_today</span>
                      <span className="text-xl font-medium">{formatDate(properBolo.data)}</span>
                    </div>
                    {properBolo.hora && (
                      <>
                        <span className="hidden sm:inline opacity-50">•</span>
                        <div className="flex items-center gap-2">
                          <span className="material-icons-outlined">schedule</span>
                          <span className="text-xl font-medium">{properBolo.hora.substring(0, 5)}h</span>
                        </div>
                      </>
                    )}
                    <span className="hidden sm:inline opacity-50">•</span>
                    <div className="flex items-center gap-2">
                      <span className="material-icons-outlined">label</span>
                      <span className="text-lg opacity-90">{properBolo.tipus}</span>
                    </div>
                  </div>

                  <div className="pt-4">
                    <Link href={`/bolos/${properBolo.id}`} className="inline-flex items-center gap-2 bg-white text-primary px-6 py-3 rounded-xl font-bold hover:bg-gray-100 transition-colors shadow-lg">
                      Veure Detalls
                      <span className="material-icons-outlined">arrow_forward</span>
                    </Link>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center bg-black/20 backdrop-blur-md rounded-2xl p-6 border border-white/10 min-w-[160px]">
                  <div className="relative">
                    <span className="text-6xl font-black animate-pulse">{getDaysUntil(properBolo.data)}</span>
                    {getDaysUntil(properBolo.data) <= 3 && (
                      <span className="absolute -top-2 -right-2 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-bold uppercase tracking-widest opacity-80">Dies</span>
                  {getDaysUntil(properBolo.data) === 0 && (
                    <span className="text-xs font-bold text-yellow-300 mt-1 animate-bounce">AVUI!</span>
                  )}
                  {getDaysUntil(properBolo.data) === 1 && (
                    <span className="text-xs font-bold text-yellow-300 mt-1">Demà</span>
                  )}
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <h2 className="text-3xl font-bold opacity-90">Sense actuacions properes confirmades</h2>
                <p className="text-white/70 max-w-lg">
                  Sembla que no hi ha bolos a la vista. Afegeix-ne un de nou o revisa les sol·licituds pendents.
                </p>
                <Link href="/bolos" className="inline-flex items-center gap-2 bg-white/10 text-white px-6 py-3 rounded-xl font-bold hover:bg-white/20 transition-colors border border-white/20">
                  Gestió de Bolos
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* KPI Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Pot Final Projectat (Forecast) */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
          <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="material-icons-outlined text-9xl">calculate</span>
          </div>
          <p className="text-gray-400 text-sm font-bold uppercase tracking-wider mb-1">Pot Projectat</p>
          <div className="text-4xl font-extrabold tracking-tight">
            {loading ? '...' : <PrivacyMask value={finances.projectat} className="" />}
          </div>
          <p className="text-gray-500 text-xs mt-2 italic">Previsió incloent pendents de cobrar i pagar</p>
          <Link href="/previsio-economica" className="absolute inset-0" aria-label="Veure Pot"></Link>
        </div>

        {/* Pot Real (Diners en Caixa) */}
        <div className="bg-gradient-to-br from-primary to-red-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
          <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="material-icons-outlined text-9xl">payments</span>
          </div>
          <p className="text-white/70 text-sm font-bold uppercase tracking-wider mb-1">Diners en Caixa</p>
          <div className="text-4xl font-extrabold tracking-tight">
            {loading ? '...' : <PrivacyMask value={finances.potReal} className="" />}
          </div>
          <Link href="/pot" className="absolute inset-0" aria-label="Veure Pot"></Link>
        </div>

        {/* A cobrar */}
        <div className="bg-card-bg rounded-2xl p-6 border border-emerald-100 shadow-sm relative overflow-hidden group hover:border-emerald-500/50 transition-colors">
          <div className="absolute top-4 right-4 p-2 bg-emerald-50 rounded-lg text-emerald-600">
            <span className="material-icons-outlined">trending_up</span>
          </div>
          <p className="text-emerald-600 text-sm font-bold uppercase tracking-wider mb-2">Pendent d'entrada</p>
          <div className="text-3xl font-bold text-emerald-700">
            {loading ? '...' : <PrivacyMask value={finances.aCobrar} className="" />}
          </div>
        </div>

        {/* A pagar */}
        <div className="bg-card-bg rounded-2xl p-6 border border-red-100 shadow-sm relative overflow-hidden group hover:border-red-500/50 transition-colors">
          <div className="absolute top-4 right-4 p-2 bg-red-50 rounded-lg text-red-600">
            <span className="material-icons-outlined">trending_down</span>
          </div>
          <p className="text-red-600 text-sm font-bold uppercase tracking-wider mb-2">Pendent de sortida</p>
          <div className="text-3xl font-bold text-red-700">
            {loading ? '...' : <PrivacyMask value={finances.aPagar} className="" />}
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section>
        <h3 className="text-xl font-bold text-text-primary flex items-center gap-2 mb-4">
          <span className="material-icons-outlined text-primary">bolt</span>
          Accions Ràpides
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link href="/bolos/new" className="group bg-card-bg p-4 rounded-xl border-2 border-border hover:border-primary hover:shadow-lg transition-all duration-300 flex flex-col items-center gap-3">
            <div className="p-3 rounded-full bg-primary/10 group-hover:bg-primary group-hover:scale-110 transition-all duration-300">
              <span className="material-icons-outlined text-primary group-hover:text-white text-2xl">add_circle</span>
            </div>
            <span className="text-sm font-bold text-center">Nou Bolo</span>
          </Link>

          <Link href="/musics" className="group bg-card-bg p-4 rounded-xl border-2 border-border hover:border-blue-500 hover:shadow-lg transition-all duration-300 flex flex-col items-center gap-3">
            <div className="p-3 rounded-full bg-blue-500/10 group-hover:bg-blue-500 group-hover:scale-110 transition-all duration-300">
              <span className="material-icons-outlined text-blue-500 group-hover:text-white text-2xl">group_add</span>
            </div>
            <span className="text-sm font-bold text-center">Gestió Músics</span>
          </Link>

          {/* New Note Action (Updated URL and Label) */}
          <Link href="/tasques?view=notes" className="group bg-card-bg p-4 rounded-xl border-2 border-border hover:border-green-500 hover:shadow-lg transition-all duration-300 flex flex-col items-center gap-3">
            <div className="p-3 rounded-full bg-green-500/10 group-hover:bg-green-500 group-hover:scale-110 transition-all duration-300">
              <span className="material-icons-outlined text-green-500 group-hover:text-white text-2xl">sticky_note_2</span>
            </div>
            <span className="text-sm font-bold text-center">Nova Nota</span>
          </Link>

          <Link href="/pot" className="group bg-card-bg p-4 rounded-xl border-2 border-border hover:border-orange-500 hover:shadow-lg transition-all duration-300 flex flex-col items-center gap-3">
            <div className="p-3 rounded-full bg-orange-500/10 group-hover:bg-orange-500 group-hover:scale-110 transition-all duration-300">
              <span className="material-icons-outlined text-orange-500 group-hover:text-white text-2xl">account_balance</span>
            </div>
            <span className="text-sm font-bold text-center">Gestió Pot</span>
          </Link>
        </div>
      </section>

      {/* Annual Stats Section */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Bolos Count Widget */}
        <div className="bg-gradient-to-br from-primary to-red-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 opacity-10">
            <span className="material-icons-outlined text-9xl">music_note</span>
          </div>
          <p className="text-white/70 text-sm font-bold uppercase tracking-wider mb-1">Bolos {selectedYear}</p>
          <p className="text-5xl font-black tracking-tight">{loading ? '...' : animatedBolos}</p>
          <p className="text-white/60 text-xs mt-2">Total d'actuacions confirmades</p>
        </div>

        {/* Top 5 Populations */}
        <div className="bg-card-bg rounded-2xl p-6 border border-border shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-icons-outlined text-primary">location_on</span>
            <h3 className="text-lg font-bold text-text-primary">Top 5 Poblacions {selectedYear}</h3>
          </div>
          {loading ? (
            <p className="text-text-secondary text-sm">Carregant...</p>
          ) : topPopulations.length > 0 ? (
            <div className="space-y-2">
              {topPopulations.map((pop, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className={`text-lg font-black ${idx === 0 ? 'text-yellow-500' : idx === 1 ? 'text-gray-400' : idx === 2 ? 'text-orange-600' : 'text-gray-500'}`}>
                      #{idx + 1}
                    </span>
                    <span className="font-semibold text-text-primary">{pop.nom}</span>
                  </div>
                  <span className="text-sm font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">{pop.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-text-secondary text-sm">No hi ha dades disponibles</p>
          )}
        </div>

        {/* Top 5 Assistants - Now showing ALL with scroll */}
        <div className="bg-card-bg rounded-2xl p-6 border border-border shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-icons-outlined text-blue-600">emoji_events</span>
            <h3 className="text-lg font-bold text-text-primary">Assistència Músics {selectedYear}</h3>
          </div>
          {loading ? (
            <p className="text-text-secondary text-sm">Carregant...</p>
          ) : topAssistants.length > 0 ? (
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              {topAssistants.map((assistant, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className={`text-lg font-black ${idx === 0 ? 'text-yellow-500' : idx === 1 ? 'text-gray-400' : idx === 2 ? 'text-orange-600' : 'text-gray-500'}`}>
                      #{idx + 1}
                    </span>
                    <span className="font-semibold text-text-primary">{assistant.nom}</span>
                  </div>
                  <span className="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">{assistant.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-text-secondary text-sm">No hi ha dades disponibles</p>
          )}
        </div>
      </section>

      {/* Pending Requests Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <span className="material-icons-outlined text-primary">pending_actions</span>
            Sol·licituds pendents
          </h3>
          <Link href="/bolos" className="text-sm font-bold text-primary hover:underline">Veure tot</Link>
        </div>

        <div className="grid gap-4">
          {pendingRequests.length > 0 ? (
            pendingRequests.map(bolo => (
              <div key={bolo.id} className="bg-card-bg p-4 rounded-xl border border-border hover:shadow-md transition-shadow flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-yellow-100 p-3 rounded-full text-yellow-700">
                    <span className="material-icons-outlined">notifications_active</span>
                  </div>
                  <div>
                    <p className="font-bold text-lg text-text-primary">
                      {bolo.titol || bolo.poblacio}
                      <span className="ml-2 py-0.5 px-2 bg-gray-100 rounded text-[10px] text-gray-500 font-black tracking-tight uppercase">
                        {bolo.poblacio}
                      </span>
                    </p>
                    <p className="text-sm text-text-secondary flex items-center gap-2">
                      {bolo.data ? formatDate(bolo.data) : 'Sense data'}
                      {bolo.hora_inici && (
                        <span className="flex items-center text-xs bg-gray-100 rounded px-1 text-gray-600">
                          <span className="material-icons-outlined text-[10px] mr-1">schedule</span>
                          {bolo.hora_inici.substring(0, 5)}h
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right hidden sm:block">
                    {bolo.data && (
                      <p className="text-xs font-bold text-primary uppercase tracking-wider">
                        Atenció necessària
                      </p>
                    )}
                  </div>
                  <Link href={`/bolos/${bolo.id}`} className="p-2 text-gray-400 hover:text-primary transition-colors">
                    <span className="material-icons-outlined">arrow_forward_ios</span>
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 bg-card-bg rounded-xl border border-dashed border-gray-300">
              <div className="mb-3">
                <span className="material-icons-outlined text-4xl text-gray-300">task_alt</span>
              </div>
              <p className="text-gray-500 font-medium">No hi ha sol·licituds de bolos pendents.</p>
              <p className="text-gray-400 text-sm mt-1">Tot està al dia!</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

