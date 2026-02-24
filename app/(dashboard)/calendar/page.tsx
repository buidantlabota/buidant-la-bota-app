'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';

// Types
interface Bolo {
    type: 'bolo';
    id: string;
    nom_poble: string;
    data_bolo: string;
    estat: string;
    import_total?: number;
    tipus_ingres?: string;
    client?: { nom: string };
    maps_inici?: string | null;
    maps_fundes?: string | null;
}

interface Task {
    type: 'task';
    id: string;
    titol: string;
    data_limit: string;
    estat: string;
    importancia: string;
}

type CalendarEvent = Bolo | Task;

interface SelectedEvent {
    event: CalendarEvent;
    position: { x: number; y: number };
}

const monthNames = [
    'Gener', 'Febrer', 'Març', 'Abril', 'Maig', 'Juny',
    'Juliol', 'Agost', 'Setembre', 'Octubre', 'Novembre', 'Desembre'
];

// --- Estats que indiquen que un bolo ha estat CONFIRMAT/ACCEPTAT ---
const CONFIRMED_STATUSES = [
    'Confirmada', 'Confirmat', 'confirmada', 'confirmat',
    'Tancades', 'Tancat', 'Tancada', 'Tancats', 'tancades', 'tancat', 'tancada',
    'Pendents de cobrar', 'Per pagar', 'Pagat', 'Pagada', 'Cobrat', 'Cobrada',
    'Facturat', 'Facturada', 'Acceptat', 'Acceptada',
];

const CANCELLED_STATUSES = ['Cancel·lat', 'Cancel·lats', 'Rebutjat', 'cancel·lat', 'rebutjat'];

// Client de Supabase fora del component per evitar re-creació a cada render
const supabase = createClient();

export default function CalendarPage() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [yearBolos, setYearBolos] = useState<Bolo[]>([]);
    const [yearLoading, setYearLoading] = useState(true);
    const [yearError, setYearError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<SelectedEvent | null>(null);
    const [activeTab, setActiveTab] = useState<'calendar' | 'summary'>('calendar');

    // Fetch calendari (mes actual ± 1)
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
            const endDate = new Date(year, month + 2, 0).toISOString().split('T')[0];

            const { data: bolosData } = await supabase
                .from('bolos')
                .select('id, nom_poble, data_bolo, estat, import_total, tipus_ingres, maps_inici, maps_fundes, client:clients(nom)')
                .gte('data_bolo', startDate)
                .lte('data_bolo', endDate);

            const { data: tasquesData } = await supabase
                .from('tasques')
                .select('id, titol, data_limit, estat, importancia')
                .not('data_limit', 'is', null)
                .gte('data_limit', startDate)
                .lte('data_limit', endDate);

            const mappedBolos: CalendarEvent[] = (bolosData || []).map((b: any) => ({
                type: 'bolo',
                id: b.id,
                nom_poble: b.nom_poble,
                data_bolo: b.data_bolo,
                estat: b.estat,
                import_total: b.import_total,
                tipus_ingres: b.tipus_ingres,
                maps_inici: b.maps_inici,
                maps_fundes: b.maps_fundes,
                client: Array.isArray(b.client) ? b.client[0] : b.client
            }));

            const mappedTasks: CalendarEvent[] = (tasquesData || []).map((t: any) => ({
                type: 'task',
                id: t.id,
                titol: t.titol,
                data_limit: t.data_limit,
                estat: t.estat,
                importancia: t.importancia
            }));

            setEvents([...mappedBolos, ...mappedTasks]);
            setLoading(false);
        };

        fetchData();
    }, [currentDate]);

    // Fetch tots els bolos de l'any per al resum (independent del mes del calendari)
    useEffect(() => {
        const fetchYearBolos = async () => {
            setYearLoading(true);
            setYearError(null);
            try {
                const year = new Date().getFullYear();
                const { data, error } = await supabase
                    .from('bolos')
                    .select('id, nom_poble, data_bolo, estat, import_total, tipus_ingres, maps_inici, maps_fundes')
                    .gte('data_bolo', `${year}-01-01`)
                    .lte('data_bolo', `${year}-12-31`)
                    .order('data_bolo', { ascending: true });

                if (error) throw error;

                setYearBolos((data || []).map((b: any) => ({
                    type: 'bolo',
                    id: b.id,
                    nom_poble: b.nom_poble,
                    data_bolo: b.data_bolo,
                    estat: b.estat,
                    import_total: b.import_total,
                    tipus_ingres: b.tipus_ingres,
                    maps_inici: b.maps_inici,
                    maps_fundes: b.maps_fundes,
                })));
            } catch (e: any) {
                console.error('Error carregant bolos anuals:', e);
                setYearError(e?.message || 'Error desconegut');
            } finally {
                setYearLoading(false);
            }
        };
        fetchYearBolos();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Helpers calendari
    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const days = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay();
        const startDay = firstDay === 0 ? 6 : firstDay - 1;
        return { days, startDay };
    };

    const weekDays = ['Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres', 'Dissabte', 'Diumenge'];

    const getEventsForDay = (day: number) => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const m = (month + 1).toString().padStart(2, '0');
        const d = day.toString().padStart(2, '0');
        const dateStr = `${year}-${m}-${d}`;
        return events.filter(e => {
            const relevantDate = e.type === 'bolo' ? e.data_bolo : e.data_limit;
            return relevantDate === dateStr;
        });
    };

    const handleEventClick = (e: React.MouseEvent, event: CalendarEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setSelectedEvent({ event, position: { x: 0, y: 0 } });
    };

    const { days, startDay } = getDaysInMonth(currentDate);

    // --- GENERACIÓ DEL RESUM DE WHATSAPP ---
    const generateWhatsappSummary = () => {
        const year = new Date().getFullYear();
        // Tots els bolos de l'any ordenats, excloent els passats (ja realitzats amb estat tancat)
        // Mostrem TOTS: futurs, pendents de confirmació, confirmats, etc.
        // Excloem Cancel·lats i els passats i ja tancats
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const cancelledStatuses = ['Cancel·lat', 'Cancel·lats', 'Rebutjat', 'cancel·lat'];

        const bolosToShow = yearBolos
            .filter(b => {
                if (cancelledStatuses.includes(b.estat)) return false;
                const bDate = new Date(b.data_bolo + 'T00:00:00');
                // Eliminem els que ja van passar I estan tancats (ja realitzats)
                const isPast = bDate < now;
                const isClosed = ['Tancades', 'Tancat', 'Tancada', 'Tancats', 'tancades', 'tancat', 'tancada',
                    'Pendents de cobrar', 'Per pagar', 'Pagat', 'Pagada', 'Cobrat', 'Cobrada',
                    'Facturat', 'Facturada'].includes(b.estat);
                if (isPast && isClosed) return false;
                return true;
            });

        let text = `BOLOS ${year}🍷\n\n`;

        // Agrupar per mes
        const monthGroups: Record<number, Bolo[]> = {};
        bolosToShow.forEach(b => {
            const m = parseInt(b.data_bolo.split('-')[1]) - 1;
            if (!monthGroups[m]) monthGroups[m] = [];
            monthGroups[m].push(b);
        });

        Object.keys(monthGroups)
            .map(Number)
            .sort((a, b) => a - b)
            .forEach(mIdx => {
                const monthBolos = monthGroups[mIdx];
                const monthName = monthNames[mIdx].toUpperCase();
                const confirmedCount = monthBolos.filter(b => CONFIRMED_STATUSES.includes(b.estat)).length;
                text += `${monthName} ${confirmedCount}\n`;

                monthBolos.forEach(b => {
                    const [, mStr, dStr] = b.data_bolo.split('-');
                    const dayFormatted = dStr === '00' ? '00' : dStr;
                    const monthFormatted = mStr;

                    const nomDisplay = b.nom_poble;

                    // Preu
                    const price = b.import_total && b.import_total > 0
                        ? ` ${b.import_total}€`
                        : '';

                    // Icona d'estat:  ✅ = confirmat  ❓ = pendent/nou
                    const isConfirmed = CONFIRMED_STATUSES.includes(b.estat);
                    const statusIcon = isConfirmed ? '✅' : '❓';

                    // Icona de pagament: 💳 = factura  ✉️ = efectiu/negre
                    let paymentIcon = '';
                    if (b.tipus_ingres === 'Factura') paymentIcon = '💳';
                    else if (b.tipus_ingres === 'Efectiu' || b.tipus_ingres === 'Negre') paymentIcon = '✉️';

                    const mapsIcon = b.maps_inici ? '📍' : '';

                    text += `- [ ] ${dayFormatted}/${monthFormatted} ${nomDisplay}${price}${statusIcon}${paymentIcon}${mapsIcon}\n`;
                    if (b.maps_inici) {
                        text += `      ${b.maps_inici}\n`;
                    }
                });

                text += '\n';
            });

        return text.trim();
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(generateWhatsappSummary());
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    return (
        <div className="p-4 md:p-8 space-y-6 min-h-screen bg-transparent">

            {/* Modal for Details */}
            {selectedEvent && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedEvent(null)}>
                    <div className="bg-card-bg rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100 border border-border" onClick={e => e.stopPropagation()}>
                        <div className={`p-6 ${selectedEvent.event.type === 'bolo' ? 'bg-gradient-to-r from-primary to-red-900' : 'bg-gradient-to-r from-blue-600 to-blue-800'} text-white`}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <span className="text-xs font-bold uppercase tracking-wider opacity-90 flex items-center gap-2">
                                        <span className="material-icons-outlined text-sm">
                                            {selectedEvent.event.type === 'bolo' ? 'festival' : 'task_alt'}
                                        </span>
                                        {selectedEvent.event.type === 'bolo' ? 'Bolo' : 'Tasca'}
                                    </span>
                                    <h3 className="text-2xl font-black mt-2">
                                        {selectedEvent.event.type === 'bolo' ? selectedEvent.event.nom_poble : selectedEvent.event.titol}
                                    </h3>
                                </div>
                                <button onClick={() => setSelectedEvent(null)} className="text-white/80 hover:text-white p-2 hover:bg-white/10 rounded-full transition-colors">
                                    <span className="material-icons-outlined">close</span>
                                </button>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-text-secondary">Estat:</span>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${CONFIRMED_STATUSES.includes(selectedEvent.event.estat) ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                    {selectedEvent.event.estat}
                                </span>
                            </div>
                            {selectedEvent.event.type === 'bolo' && selectedEvent.event.client && (
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <p className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">Client</p>
                                    <p className="text-base font-medium text-text-primary">{selectedEvent.event.client.nom}</p>
                                </div>
                            )}
                            {selectedEvent.event.type === 'task' && (
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <p className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">Importància</p>
                                    <p className="text-base font-medium text-text-primary capitalize">{selectedEvent.event.importancia}</p>
                                </div>
                            )}
                            <div className="pt-4 flex gap-3">
                                {selectedEvent.event.type === 'bolo' ? (
                                    <Link href={`/bolos/${selectedEvent.event.id}`} className="flex-1 bg-primary hover:bg-red-800 text-white text-center py-3 rounded-xl font-bold transition-all hover:shadow-lg flex items-center justify-center gap-2">
                                        <span className="material-icons-outlined text-sm">arrow_forward</span>
                                        Ves a gestió
                                    </Link>
                                ) : (
                                    <Link href={`/tasques`} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-center py-3 rounded-xl font-bold transition-all hover:shadow-lg flex items-center justify-center gap-2">
                                        <span className="material-icons-outlined text-sm">arrow_forward</span>
                                        Ves a gestió
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                    <div>
                        <h1 className="text-4xl font-black text-text-primary tracking-tight">PLANEJAMENT</h1>
                        <p className="text-text-secondary font-medium mt-1">Calendari i resum de bolos anual</p>
                    </div>
                    <div className="flex bg-gray-100 p-1 rounded-xl">
                        <button onClick={() => setActiveTab('calendar')} className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'calendar' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                            Calendari
                        </button>
                        <button onClick={() => setActiveTab('summary')} className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'summary' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                            Resum Anual
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    {activeTab === 'calendar' ? (
                        <>
                            <button onClick={() => setCurrentDate(new Date())} className="px-4 py-2 bg-card-bg border border-border rounded-xl font-medium text-sm hover:border-primary hover:text-primary transition-colors">
                                Avui
                            </button>
                            <Link href="/tasques?action=new" className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition-colors text-sm font-medium border border-blue-200">
                                <span className="material-icons-outlined text-sm">task_alt</span>
                                Nova Tasca
                            </Link>
                            <Link href="/bolos/new" className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary to-red-900 text-white rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all text-sm font-bold">
                                <span className="material-icons-outlined text-sm">add</span>
                                Nou Bolo
                            </Link>
                        </>
                    ) : (
                        <button
                            onClick={copyToClipboard}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold shadow-lg active:scale-95 transition-all ${copied ? 'bg-emerald-500 text-white' : 'bg-green-600 hover:bg-green-700 text-white'}`}
                        >
                            <span className="material-icons-outlined">{copied ? 'check' : 'content_copy'}</span>
                            {copied ? 'Copiat!' : 'Copiar per WhatsApp'}
                        </button>
                    )}
                </div>
            </header>

            {/* Content Area */}
            {activeTab === 'calendar' ? (
                <>
                    {/* Month Navigator */}
                    <div className="flex items-center justify-center gap-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-4 border border-border">
                        <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="p-3 rounded-xl hover:bg-white transition-colors group">
                            <span className="material-icons-outlined text-text-secondary group-hover:text-primary">chevron_left</span>
                        </button>
                        <div className="px-8 text-center">
                            <div className="text-3xl font-black text-text-primary capitalize">{monthNames[currentDate.getMonth()]}</div>
                            <div className="text-sm font-bold text-primary mt-1">{currentDate.getFullYear()}</div>
                        </div>
                        <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="p-3 rounded-xl hover:bg-white transition-colors group">
                            <span className="material-icons-outlined text-text-secondary group-hover:text-primary">chevron_right</span>
                        </button>
                    </div>

                    {/* Calendar Grid */}
                    <div className="bg-card-bg rounded-2xl shadow-lg border border-border overflow-hidden">
                        <div className="grid grid-cols-7 bg-gradient-to-r from-gray-100 to-gray-50 border-b-2 border-primary/20">
                            {weekDays.map(day => (
                                <div key={day} className="py-4 text-center text-xs font-bold text-primary uppercase tracking-widest">
                                    <span className="hidden sm:inline">{day}</span>
                                    <span className="sm:hidden">{day.substring(0, 3)}</span>
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 auto-rows-fr">
                            {Array.from({ length: startDay }).map((_, i) => (
                                <div key={`empty-${i}`} className="bg-gray-50/50 border-b border-r border-border p-2 min-h-[120px]"></div>
                            ))}
                            {Array.from({ length: days }).map((_, i) => {
                                const day = i + 1;
                                const dayEvents = getEventsForDay(day);
                                const today = day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear();
                                return (
                                    <div key={day} className={`group relative border-b border-r border-border p-3 min-h-[120px] transition-all hover:bg-gradient-to-br hover:from-red-50/50 hover:to-orange-50/30 ${today ? 'bg-gradient-to-br from-red-50 to-orange-50 ring-2 ring-primary/30' : ''}`}>
                                        <div className="flex justify-between items-start mb-2">
                                            <span className={`text-sm font-bold w-8 h-8 flex items-center justify-center rounded-full transition-all ${today ? 'bg-gradient-to-br from-primary to-red-900 text-white shadow-lg scale-110' : 'text-text-secondary group-hover:bg-primary/10 group-hover:text-primary'}`}>
                                                {day}
                                            </span>
                                            {dayEvents.length > 0 && (
                                                <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">{dayEvents.length}</span>
                                            )}
                                        </div>
                                        <div className="space-y-1.5 overflow-hidden">
                                            {dayEvents.map(event => (
                                                <button
                                                    key={`${event.type}-${event.id}`}
                                                    onClick={(e) => handleEventClick(e, event)}
                                                    className={`w-full text-left text-xs px-2.5 py-2 rounded-lg border-l-3 truncate shadow-sm transition-all hover:scale-[1.02] hover:shadow-md active:scale-95 flex items-center gap-2 font-medium ${event.type === 'bolo'
                                                        ? CANCELLED_STATUSES.includes(event.estat)
                                                            ? 'bg-red-50 border-red-500 text-red-700 line-through opacity-60'
                                                            : CONFIRMED_STATUSES.includes(event.estat)
                                                                ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-500 text-green-800'
                                                                : 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-500 text-yellow-800'
                                                        : event.estat === 'completada'
                                                            ? 'bg-gray-100 border-gray-400 text-gray-500 line-through opacity-60'
                                                            : 'bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-500 text-blue-800'
                                                        }`}
                                                >
                                                    <span className="material-icons-outlined text-xs opacity-70">
                                                        {event.type === 'bolo' ? 'festival' : 'task_alt'}
                                                    </span>
                                                    <span className="truncate flex-1">
                                                        {event.type === 'bolo' ? event.nom_poble : event.titol}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </>
            ) : (
                /* === RESUM ANUAL === */
                <div className="bg-white rounded-3xl border border-border shadow-sm overflow-hidden">
                    <div className="p-8 md:p-12">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h2 className="text-2xl font-black text-gray-900">Resum {new Date().getFullYear()} per a WhatsApp 🍷</h2>
                                <p className="text-gray-500 font-medium mt-1">Bolos pendents i per venir · Els tancats passats s'exclouen automàticament</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="hidden md:flex flex-col gap-1 text-xs font-bold text-gray-400">
                                    <span>✅ = Confirmat</span>
                                    <span>❓ = Pendent/Nou</span>
                                    <span>💳 = Factura · ✉️ = Efectiu</span>
                                </div>
                            </div>
                        </div>

                        <div className="relative">
                            <pre className="bg-gray-50 p-8 rounded-2xl border border-gray-200 text-gray-800 font-mono text-sm whitespace-pre-wrap leading-relaxed shadow-inner select-all">
                                {yearLoading
                                    ? '⏳ Carregant bolos de l\'any...'
                                    : yearError
                                        ? `❌ Error: ${yearError}`
                                        : yearBolos.length === 0
                                            ? '(No hi ha bolos per a l\'any en curs)'
                                            : generateWhatsappSummary()}
                            </pre>
                        </div>

                        <div className="mt-6 flex items-center gap-4 text-sm text-gray-400 font-medium italic">
                            <span className="material-icons-outlined text-sm">info</span>
                            Els bolos passats que ja estan tancats/pagats s'exclouen. Els pendents i confirmats futurs surten sempre.
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
