'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Bolo } from '@/types';

interface DespesaIngres {
    id: string;
    data: string;
    descripcio: string;
    tipus: 'ingrés' | 'despesa';
    categoria: string | null;
    import: number;
    actuacio_id: number | null;
    any_pot: number | null;
}

export default function GestioPotPage() {
    const supabase = createClient();
    const [movements, setMovements] = useState<DespesaIngres[]>([]);
    const [loading, setLoading] = useState(true);
    const [year, setYear] = useState(new Date().getFullYear());
    const [stats, setStats] = useState({
        totalPot: 0,
        yearBoloPot: 0,
        yearExtraPot: 0,
        yearIngressos: 0,
        yearDespeses: 0,
        yearBalance: 0
    });

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newMovement, setNewMovement] = useState<Partial<DespesaIngres>>({
        data: new Date().toISOString().split('T')[0],
        tipus: 'despesa',
        import: 0,
        descripcio: '',
        categoria: 'Altres'
    });
    const [amountStr, setAmountStr] = useState('');

    const [bolos, setBolos] = useState<Bolo[]>([]); // For linking if needed

    // Fetch data
    const fetchPot = async () => {
        setLoading(true);

        // 1. Get ALL movements to calc global pot (expensive if many rows, but okay for now)
        // Optimization: Create a view or a separate table for cached balance. 
        // For now, we fetch current year detailed, and maybe a separate query for total balance.

        // Let's simplified: Fetch filtered year for the table, and a separate aggregation query for global pot.

        // A. Table Data (Current Year)
        const start = `${year}-01-01`;
        const end = `${year}-12-31`;

        const { data: yearData, error: yearError } = await supabase
            .from('despeses_ingressos')
            .select('*')
            .gte('data', start)
            .lte('data', end)
            .order('data', { ascending: false });

        let ing = 0;
        let desp = 0;

        if (yearData) {
            setMovements(yearData);

            // Year Stats
            ing = yearData.filter((m: DespesaIngres) => m.tipus === 'ingrés').reduce((sum: number, m: DespesaIngres) => sum + m.import, 0);
            desp = yearData.filter((m: DespesaIngres) => m.tipus === 'despesa').reduce((sum: number, m: DespesaIngres) => sum + m.import, 0);

            // setStats(prev => ({ ...prev, yearIngressos: ing, yearDespeses: desp, yearBalance: ing - desp })); 
            // We do global update at the end now to be cleaner
        }

        // B. Global Pot Balance
        // We can use RPC or a raw query, strictly speaking. Or just fetch all.
        // Let's try to fetch all IDs and amounts just for calc, if not huge.
        // Better: Use the view_bolos_resum_any we made? No, that's only for bolos.
        // The "Pot" includes logic from DespesesIngressos AND Bolos usually.
        // But wait, the user said "Pot" section manages general expenses.
        // The GLOBAL POT is usually: (Sum of all Bolos Pot Delta) + (Sum of all Ingressos - Despeses in DespesesIngressos).
        // That's complex. Let's stick to showing the balance of THIS table + maybe fetching the Bolo Pot Sum.

        // Fetch Bolo Pot Sum
        const { data: boloData } = await supabase
            .from('bolos')
            .select('pot_delta_final')
            .not('pot_delta_final', 'is', null);

        const totalBoloPot = (boloData || []).reduce((sum: number, b: any) => sum + (b.pot_delta_final || 0), 0);

        // Fetch All DespesesIngressos Sum
        const { data: allMovements } = await supabase.from('despeses_ingressos').select('import, tipus');
        let totalExtraPot = 0;
        if (allMovements) {
            totalExtraPot = allMovements.reduce((sum: number, m: any) => sum + (m.tipus === 'ingrés' ? m.import : -m.import), 0);
        }

        // C. Annual Bolo Pot
        const { data: yearBoloData } = await supabase
            .from('bolos')
            .select('pot_delta_final')
            .not('pot_delta_final', 'is', null)
            .gte('data_bolo', start)
            .lte('data_bolo', end);

        const yearBoloPot = (yearBoloData || []).reduce((sum: number, b: any) => sum + (b.pot_delta_final || 0), 0);

        // Annual Extra Pot
        const yearExtraPot = ing - desp;

        setStats(prev => ({
            ...prev,
            totalPot: totalBoloPot + totalExtraPot,
            yearBoloPot,
            yearExtraPot,
            yearIngressos: ing,
            yearDespeses: desp,
            yearBalance: yearExtraPot
        }));
        setLoading(false);
    };

    useEffect(() => {
        fetchPot();
        // Fetch bolos for dropdown
        supabase.from('bolos').select('id, nom_poble, data_bolo').order('data_bolo', { ascending: false }).limit(20)
            .then(({ data }: { data: any }) => setBolos(data || []));
    }, [year]);

    const handleAdd = async () => {
        if (!newMovement.import || !newMovement.descripcio) return;

        const { error } = await supabase.from('despeses_ingressos').insert([{
            ...newMovement,
            any_pot: year // Explicitly set year if needed, or rely on data trigger if implemented. Just data date is likely enough.
        }]);

        if (error) {
            console.error(error);
            alert('Error al guardar');
        } else {
            setIsModalOpen(false);
            setNewMovement({ data: new Date().toISOString().split('T')[0], tipus: 'despesa', import: 0, descripcio: '', categoria: 'Altres' });
            setAmountStr('');
            fetchPot();
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Segur que vols esborrar aquest moviment?')) return;
        const { error } = await supabase.from('despeses_ingressos').delete().eq('id', id);
        if (!error) fetchPot();
    };

    return (
        <div className="p-2 sm:p-8 space-y-4 sm:space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h1 className="text-3xl font-bold text-text-primary">
                    Gestió del Pot
                </h1>
                {/* Year Selector */}
                <div className="flex items-center space-x-2">
                    <button onClick={() => setYear(prev => prev - 1)} className="p-2 rounded hover:bg-gray-100"><span className="material-icons-outlined">chevron_left</span></button>
                    <span className="text-xl font-bold font-mono">{year}</span>
                    <button onClick={() => setYear(prev => prev + 1)} className="p-2 rounded hover:bg-gray-100"><span className="material-icons-outlined">chevron_right</span></button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Global Pot */}
                <div className="md:col-span-3 bg-gradient-to-r from-primary via-red-800 to-red-950 text-white p-8 rounded-2xl shadow-2xl border border-red-700/50 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <span className="material-icons-outlined text-9xl">savings</span>
                    </div>
                    <p className="text-red-100/80 text-lg font-medium mb-2 uppercase tracking-wider">Pot Actual disponible</p>
                    <div className="flex items-baseline gap-4">
                        <p className="text-6xl font-bold font-mono tracking-tighter">{stats.totalPot.toFixed(2)}€</p>
                    </div>
                </div>

                {/* Bolos Breakdown (ANNUAL) */}
                <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white p-6 rounded-xl shadow-lg border border-gray-700 relative group transition-transform hover:-translate-y-1">
                    <div className="absolute top-4 right-4 p-2 bg-white/10 rounded-lg">
                        <span className="material-icons-outlined text-green-400">music_note</span>
                    </div>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Resultat Bolos {year}</p>
                    <p className={`text-3xl font-bold font-mono ${stats.yearBoloPot >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {stats.yearBoloPot >= 0 ? '+' : ''}{stats.yearBoloPot.toFixed(2)}€
                    </p>
                    <p className="text-xs text-gray-500 mt-2">Benefici net dels bolos de l'any {year}.</p>
                </div>

                {/* Extras Breakdown (ANNUAL) */}
                <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white p-6 rounded-xl shadow-lg border border-gray-700 relative group transition-transform hover:-translate-y-1">
                    <div className="absolute top-4 right-4 p-2 bg-white/10 rounded-lg">
                        <span className="material-icons-outlined text-orange-400">account_balance_wallet</span>
                    </div>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Moviments Manuals {year}</p>
                    <div className="flex items-end justify-between">
                        <p className={`text-3xl font-bold font-mono ${stats.yearExtraPot >= 0 ? 'text-green-400' : 'text-orange-400'}`}>
                            {stats.yearExtraPot >= 0 ? '+' : ''}{stats.yearExtraPot.toFixed(2)}€
                        </p>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Balanç d'altres ingressos/despeses de l'any {year}.</p>
                </div>

                {/* Income/Expenses Split (ANNUAL) */}
                <div className="rounded-xl shadow-lg border border-gray-700 overflow-hidden flex flex-col group transition-transform hover:-translate-y-1">
                    {/* Income Top Half */}
                    <div className="flex-1 bg-gradient-to-r from-green-900/50 to-green-800/50 p-4 flex items-center justify-between border-b border-gray-700/50">
                        <div>
                            <p className="text-green-400 text-xs font-bold uppercase tracking-widest mb-1">Ingressos Extra {year}</p>
                            <p className="text-2xl font-bold text-green-300 font-mono">+{stats.yearIngressos.toFixed(2)}€</p>
                        </div>
                        <span className="material-icons-outlined text-green-400/20 text-4xl">trending_up</span>
                    </div>

                    {/* Expenses Bottom Half */}
                    <div className="flex-1 bg-gradient-to-r from-red-900/50 to-red-800/50 p-4 flex items-center justify-between">
                        <div>
                            <p className="text-red-400 text-xs font-bold uppercase tracking-widest mb-1">Despeses Extra {year}</p>
                            <p className="text-2xl font-bold text-red-300 font-mono">-{stats.yearDespeses.toFixed(2)}€</p>
                        </div>
                        <span className="material-icons-outlined text-red-400/20 text-4xl">trending_down</span>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center bg-white p-4 rounded-lg border border-border">
                <p className="text-sm text-text-secondary font-medium">
                    Llistat de moviments manuals (no vinculats automàticament a bolos)
                </p>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center space-x-2 bg-primary hover:bg-red-900 text-white px-4 py-2 rounded-lg transition-colors shadow-sm"
                >
                    <span className="material-icons-outlined">add</span>
                    <span>Afegir Moviment</span>
                </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-white text-xs uppercase text-text-primary border-b border-border font-semibold">
                        <tr>
                            <th className="p-4">Data</th>
                            <th className="p-4">Descripció</th>
                            <th className="p-4">Categoria</th>
                            <th className="p-4 text-center">Tipus</th>
                            <th className="p-4 text-right">Import</th>
                            <th className="p-4 w-10"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border-light">
                        {loading ? (
                            <tr><td colSpan={6} className="p-6 text-center">Carregant...</td></tr>
                        ) : movements.length === 0 ? (
                            <tr><td colSpan={6} className="p-6 text-center text-text-secondary">No hi ha moviments extra aquest any.</td></tr>
                        ) : (
                            movements.map(m => (
                                <tr key={m.id} className="hover:bg-gray-50">
                                    <td className="p-4 font-mono text-sm">{new Date(m.data).toLocaleDateString('ca-ES')}</td>
                                    <td className="p-4 font-medium">{m.descripcio}</td>
                                    <td className="p-4 text-sm text-text-secondary">{m.categoria || '-'}</td>
                                    <td className="p-4 text-center">
                                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${m.tipus === 'ingrés' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                            }`}>
                                            {m.tipus}
                                        </span>
                                    </td>
                                    <td className={`p-4 text-right font-mono font-bold ${m.tipus === 'ingrés' ? 'text-green-600' : 'text-red-500'}`}>
                                        {m.tipus === 'ingrés' ? '+' : '-'}{m.import.toFixed(2)}€
                                    </td>
                                    <td className="p-4 text-right">
                                        <button onClick={() => handleDelete(m.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                                            <span className="material-icons-outlined">delete</span>
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-start sm:items-center justify-center z-50 p-2 sm:p-4 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-gray-200 my-auto max-h-[95vh] overflow-y-auto">
                        <h3 className="text-xl font-bold mb-4">Nou Moviment</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Tipus</label>
                                <div className="flex rounded-md shadow-sm">
                                    <button
                                        onClick={() => setNewMovement({ ...newMovement, tipus: 'despesa' })}
                                        className={`flex-1 px-4 py-2 text-sm font-medium rounded-l-md border ${newMovement.tipus === 'despesa' ? 'bg-red-100 border-red-300 text-red-800' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                                    >
                                        Despesa
                                    </button>
                                    <button
                                        onClick={() => setNewMovement({ ...newMovement, tipus: 'ingrés' })}
                                        className={`flex-1 px-4 py-2 text-sm font-medium rounded-r-md border ${newMovement.tipus === 'ingrés' ? 'bg-green-100 border-green-300 text-green-800' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                                    >
                                        Ingrés
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Data</label>
                                <input type="date" value={newMovement.data} onChange={e => setNewMovement({ ...newMovement, data: e.target.value })} className="w-full p-2 border border-gray-300 rounded bg-gray-50 text-gray-900 focus:bg-white transition-colors" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Import (€)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={amountStr}
                                    onChange={e => {
                                        setAmountStr(e.target.value);
                                        const val = parseFloat(e.target.value);
                                        setNewMovement({ ...newMovement, import: isNaN(val) ? 0 : val });
                                    }}
                                    className="w-full p-2 border border-gray-300 rounded bg-gray-50 text-gray-900 focus:bg-white transition-colors"
                                    placeholder="0.00"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Descripció</label>
                                <input type="text" value={newMovement.descripcio} onChange={e => setNewMovement({ ...newMovement, descripcio: e.target.value })} className="w-full p-2 border border-gray-300 rounded bg-gray-50 text-gray-900 focus:bg-white transition-colors" placeholder="Ex: Compra pegatines..." />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Categoria</label>
                                <select value={newMovement.categoria || ''} onChange={e => setNewMovement({ ...newMovement, categoria: e.target.value })} className="w-full p-2 border border-gray-300 rounded bg-gray-50 text-gray-900 focus:bg-white transition-colors">
                                    <option value="Altres">Altres</option>
                                    <option value="Material">Material</option>
                                    <option value="Transport">Transport</option>
                                    <option value="Menjar/Beure">Menjar/Beure</option>
                                    <option value="Loteria">Loteria</option>
                                    <option value="Subvenció">Subvenció</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end space-x-3 mt-6">
                            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-text-secondary">Cancel·lar</button>
                            <button onClick={handleAdd} className="px-4 py-2 bg-primary text-white rounded">Guardar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

