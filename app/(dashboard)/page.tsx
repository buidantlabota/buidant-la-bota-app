'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
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

  // Financial detailed state
  const [finances, setFinances] = useState({
    potReal: 0,
    aCobrar: 0,
    aPagar: 0,
    projectat: 0
  });


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
          supabase.from('bolos').select('id, estat, nom_poble, import_total, cost_total_musics, pot_delta_final, data_bolo, cobrat, pagaments_musics_fets').not('estat', 'in', '("Cancel·lat","Cancel·lats","rebutjat","rebutjats")'),
          supabase.from('despeses_ingressos').select('import, tipus, data'),
          supabase.from('bolos').select('id, titol, nom_poble, ubicacio_detallada, data_bolo, tipus_actuacio, hora_inici').in('estat', ['Confirmada', 'Confirmat', 'Pendents de cobrar', 'Per pagar']).gte('data_bolo', today).order('data_bolo', { ascending: true }).limit(1).maybeSingle(),
          supabase.from('bolos').select('id, titol, nom_poble, data_bolo, estat, hora_inici').in('estat', ['Nova', 'Sol·licitat', 'Pendent de confirmació']).gte('data_bolo', today).order('data_bolo', { ascending: true }).limit(5),
          supabase.from('pagaments_anticipats').select('*, bolos(estat, pot_delta_final)'),
          supabase.from('bolo_musics').select('music_id, musics(nom), bolos!inner(data_bolo)').eq('estat', 'confirmat').gte('bolos.data_bolo', `${selectedYear}-01-01`).lte('bolos.data_bolo', `${selectedYear}-12-31`),
          supabase.from('forecast_items').select('*'),
          supabase.from('economy_settings').select('*').single()
        ]);

        // A. Stats (Annual - Only confirmed)
        if (allBolos) {
          const yearStart = `${selectedYear}-01-01`;
          const yearEnd = `${selectedYear}-12-31`;
          const confirmedStates = ['Confirmada', 'Confirmat', 'Pendents de cobrar', 'Per pagar', 'Tancades', 'Tancat'];

          const filteredForStats = allBolos.filter((b: any) =>
            b.data_bolo >= yearStart &&
            b.data_bolo <= yearEnd &&
            confirmedStates.includes(b.estat)
          );
          setNumBolos(filteredForStats.length);
        } else {
          setNumBolos(0);
        }

        const potBase = 4560.21;
        const cutoffDate = '2026-01-01';

        const totalManualBalance = (allMovements || [])
          .filter((m: any) => m.data >= cutoffDate || !m.data)
          .reduce((sum: number, m: any) => sum + (m.tipus === 'ingrés' ? m.import : -m.import), 0);

        const closedBolosPot = (allBolos || [])
          .filter((b: any) => (b.cobrat && b.pagaments_musics_fets) && b.data_bolo >= cutoffDate)
          .reduce((sum: number, b: any) => sum + (b.pot_delta_final || 0), 0);

        const currentAdvances = (allAdvances || [])
          .filter((a: any) => !(a.bolos?.cobrat && a.bolos?.pagaments_musics_fets))
          .reduce((sum: number, a: any) => sum + (a.import || 0), 0);

        const potReal = potBase + totalManualBalance + closedBolosPot - currentAdvances;

        const aCobrar = (allBolos || [])
          .filter((b: any) => {
            const skip = ['Tancades', 'Tancat', 'Cancel·lats', 'Cancel·lat'].includes(b.estat);
            return !skip && !b.cobrat && b.data_bolo >= cutoffDate;
          })
          .reduce((sum: number, b: any) => {
            const income = b.import_total || 0;
            const advancesForThisBolo = (allAdvances || [])
              .filter((p: any) => p.bolo_id === b.id)
              .reduce((acc: number, p: any) => acc + (p.import || 0), 0);
            return sum + (income - advancesForThisBolo);
          }, 0);

        const aPagar = (allBolos || [])
          .filter((b: any) => {
            const skip = ['Tancades', 'Tancat', 'Cancel·lats', 'Cancel·lat'].includes(b.estat);
            return !skip && !b.pagaments_musics_fets && b.data_bolo >= cutoffDate;
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
            lloc: nextBolo.ubicacio_detallada,
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
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Bolos Count Widget */}
        <div className="bg-gradient-to-br from-primary to-orange-700 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
          <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="material-icons-outlined text-9xl">festival</span>
          </div>
          <p className="text-white/70 text-xs font-black uppercase tracking-widest mb-2">Actuacions {selectedYear}</p>
          <div className="text-6xl font-black tracking-tighter">
            {loading ? '...' : animatedBolos}
          </div>
          <p className="text-white/40 text-[10px] mt-4 font-bold uppercase tracking-widest">Confirmades i Tancades</p>
          <Link href="/bolos" className="absolute inset-0" aria-label="Veure Bolos"></Link>
        </div>

        {/* Pot Real (Diners en Caixa) */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300 border border-white/5">
          <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="material-icons-outlined text-9xl">payments</span>
          </div>
          <p className="text-white/50 text-xs font-black uppercase tracking-[0.2em] mb-2">Diners en Caixa (Pot Real)</p>
          <div className="text-6xl font-black tracking-tighter">
            {loading ? '...' : <PrivacyMask value={finances.potReal} className="" />}
          </div>
          <p className="text-white/30 text-[10px] mt-4 italic">Saldo actual lliure de deutes immediats</p>
          <Link href="/pot" className="absolute inset-0" aria-label="Veure Pot"></Link>
        </div>
      </section>

      {/* Kanban Summary Stats - The missing summary */}
      <section className="bg-card-bg rounded-3xl border border-border p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <span className="material-icons-outlined text-primary">analytics</span>
          <h3 className="text-lg font-bold text-text-primary uppercase tracking-tight">Resum del Tauler d'Estats</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {Object.entries(boloCounts).map(([label, count]) => {
            let color = "bg-gray-100 text-gray-600";
            let icon = "circle";
            if (label === 'Nova') { color = "bg-red-50 text-red-600 border-red-100"; icon = "fiber_new"; }
            if (label === 'Pendent de confirmació') { color = "bg-orange-50 text-orange-600 border-orange-100"; icon = "pending"; }
            if (label === 'Confirmada') { color = "bg-emerald-50 text-emerald-600 border-emerald-100"; icon = "check_circle"; }
            if (label === 'Pendents de cobrar') { color = "bg-yellow-50 text-yellow-700 border-yellow-200"; icon = "payments"; }
            if (label === 'Per pagar') { color = "bg-lime-50 text-lime-700 border-lime-200"; icon = "group_work"; }
            if (label === 'Tancades') { color = "bg-gray-800 text-white"; icon = "archive"; }

            return (
              <div key={label} className={`p-4 rounded-2xl border ${color} transition-all hover:scale-105 flex flex-col items-center justify-center text-center gap-1`}>
                <span className="material-icons-outlined text-xl mb-1">{icon}</span>
                <span className="text-2xl font-black">{count}</span>
                <span className="text-[9px] font-black uppercase tracking-tighter opacity-70 leading-tight">{label}</span>
              </div>
            );
          })}
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

      {/* Pending Requests Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <span className="material-icons-outlined text-primary">pending_actions</span>
            Sol·licituds que necessiten acció
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
              <p className="text-gray-500 font-medium">No hi ha sol·licituds pendents.</p>
              <p className="text-gray-400 text-sm mt-1">Tot està al dia!</p>
            </div>
          )}
        </div>
      </section>


    </div>
  );
}

