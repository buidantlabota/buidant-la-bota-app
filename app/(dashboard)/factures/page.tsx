'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { format, addMonths } from 'date-fns';

interface InvoiceRecord {
    id: string;
    invoice_number: string;
    type: 'factura' | 'pressupost';
    client_name: string;
    bolo_id: number | null;
    creation_date: string;
    due_date: string;
    total_amount: number;
    paid: boolean;
    articles: any[];
    notes: string | null;
    bolos?: {
        nom_poble: string;
        data_bolo: string;
    };
}

export default function BillingPage() {
    const supabase = createClient();
    const [records, setRecords] = useState<InvoiceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [typeFilter, setTypeFilter] = useState<'all' | 'factura' | 'pressupost'>('all');
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [showModal, setShowModal] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        type: 'factura',
        client_name: '',
        total_amount: '',
        bolo_id: '',
        notes: ''
    });

    useEffect(() => {
        fetchRecords();
    }, [selectedYear]);

    const fetchRecords = async () => {
        setLoading(true);
        console.log("Fetching billing records...");

        try {
            // 1. Fetch records simple
            const start = `${selectedYear}-01-01`;
            const end = `${selectedYear}-12-31`;

            const { data: rawData, error } = await supabase
                .from('invoice_records')
                .select('*')
                .gte('creation_date', start)
                .lte('creation_date', end)
                .order('creation_date', { ascending: false });

            if (error) throw error;

            if (!rawData || rawData.length === 0) {
                setRecords([]);
                setLoading(false);
                return;
            }

            const data = rawData as InvoiceRecord[];

            // 2. Fetch related bolos manually (Robust Join)
            const boloIds = [...new Set(data.map((i) => i.bolo_id).filter((id): id is number => id !== null))];
            let bolosMap: Record<number, any> = {};

            if (boloIds.length > 0) {
                const { data: bolosData, error: bolosError } = await supabase
                    .from('bolos')
                    .select('id, nom_poble, data_bolo')
                    .in('id', boloIds);

                if (!bolosError && bolosData) {
                    bolosData.forEach((b: any) => {
                        bolosMap[b.id] = b;
                    });
                }
            }

            // 3. Merge data
            const enrichedData = data.map((item) => ({
                ...item,
                bolos: item.bolo_id ? bolosMap[item.bolo_id] : undefined,
                // Ensure type fallback for old records
                type: item.type || 'factura'
            })) as InvoiceRecord[];

            setRecords(enrichedData);
            console.log(`Loaded ${enrichedData.length} records.`);

        } catch (err: any) {
            console.error('Error fetching records:', err);
            alert("Error carregant el llistat: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string, number: string) => {
        if (!confirm(`ESTÀS SEGUR? Esborraràs permanentment el document ${number}.`)) return;

        const { error } = await supabase
            .from('invoice_records')
            .delete()
            .eq('id', id);

        if (error) {
            alert('Error al esborrar: ' + error.message);
        } else {
            fetchRecords();
        }
    };

    const handleRegisterManual = async () => {
        if (!formData.client_name || !formData.total_amount) {
            alert('Camps obligatoris incomplerts.');
            return;
        }

        try {
            // Generate number logic (Simplified for Manual)
            // For functionality, we'll suggest a manual number or auto-generate if possible.
            // But to keep it robust as requested, let's reuse the counter logic only for invoices.

            let invoiceNumber = '';
            const today = new Date();

            if (formData.type === 'factura') {
                const currentYear = today.getFullYear().toString().slice(-2);
                const { data: config } = await supabase.from('app_config').select('value').eq('key', 'invoice_counter').single();

                let nextNum = 1;
                const val = config?.value as any;
                if (val && val.year === parseInt(currentYear)) {
                    nextNum = val.last_number + 1;
                }

                invoiceNumber = `${currentYear}/${nextNum.toString().padStart(3, '0')}`;

                // Update counter
                await supabase.from('app_config').upsert({
                    key: 'invoice_counter', value: { last_number: nextNum, year: parseInt(currentYear) }
                });
            } else {
                // For quotes, generate a random temporary ID or simple one
                invoiceNumber = `P-${format(today, 'yyyyMMdd-HHmm')}`;
            }

            const payload = {
                type: formData.type,
                invoice_number: invoiceNumber,
                client_name: formData.client_name,
                bolo_id: formData.bolo_id ? parseInt(formData.bolo_id) : null,
                creation_date: format(today, 'yyyy-MM-dd'),
                due_date: format(addMonths(today, formData.type === 'factura' ? 3 : 1), 'yyyy-MM-dd'),
                total_amount: parseFloat(formData.total_amount),
                paid: false,
                articles: [{ descripcio: 'Concepte Manual', preu: parseFloat(formData.total_amount), quantitat: 1 }],
                notes: formData.notes
            };

            const { error } = await supabase.from('invoice_records').insert(payload);
            if (error) throw error;

            alert(`${formData.type === 'factura' ? 'Factura' : 'Pressupost'} ${invoiceNumber} creat!`);
            setShowModal(false);
            setFormData({ type: 'factura', client_name: '', total_amount: '', bolo_id: '', notes: '' });
            fetchRecords();

        } catch (e: any) {
            alert('Error creant registre: ' + e.message);
        }
    };

    const togglePaid = async (id: string, currentPaid: boolean) => {
        await supabase.from('invoice_records').update({ paid: !currentPaid }).eq('id', id);
        fetchRecords(); // Refresh to show update
    };

    // Filters
    const filteredRecords = records.filter(r => {
        if (typeFilter === 'all') return true;
        return r.type === typeFilter;
    });

    const totalInvoices = records.filter((r: any) => r.type === 'factura').reduce((acc: number, curr: any) => acc + curr.total_amount, 0);
    const totalQuotes = records.filter((r: any) => r.type === 'pressupost').reduce((acc: number, curr: any) => acc + curr.total_amount, 0);

    return (
        <div className="min-h-screen bg-gray-50 p-8 font-sans">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900">Factures i Pressupostos</h1>
                        <p className="text-gray-500">Gestió unificada de documents</p>
                    </div>
                    <div className="flex items-center gap-4">
                        {/* Year Selector */}
                        <div className="flex items-center bg-white border border-gray-200 rounded-lg px-2 py-1 shadow-sm">
                            <button onClick={() => setSelectedYear(prev => prev - 1)} className="p-1 text-gray-400 hover:text-black transition-colors"><span className="material-icons-outlined text-lg">chevron_left</span></button>
                            <span className="font-mono font-bold mx-3 text-lg">{selectedYear}</span>
                            <button onClick={() => setSelectedYear(prev => prev + 1)} className="p-1 text-gray-400 hover:text-black transition-colors"><span className="material-icons-outlined text-lg">chevron_right</span></button>
                        </div>

                        <div className="flex gap-2">
                            <button onClick={fetchRecords} className="p-2 bg-white border rounded-lg hover:bg-gray-50 text-gray-500 hover:text-black transition-colors">
                                <span className="material-icons-outlined">refresh</span>
                            </button>
                            <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-black text-white rounded-lg font-bold hover:bg-gray-800 transition-colors shadow-sm">
                                + Nou Manual
                            </button>
                        </div>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <div className="text-sm text-gray-500 font-bold uppercase">Total Facturat</div>
                        <div className="text-2xl font-black text-gray-900">{totalInvoices.toFixed(2)}€</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <div className="text-sm text-gray-500 font-bold uppercase">Total Pressupostat</div>
                        <div className="text-2xl font-black text-gray-400">{totalQuotes.toFixed(2)}€</div>
                    </div>
                </div>

                {/* Tabs / Filters */}
                <div className="flex gap-4 mb-4 border-b border-gray-200 pb-1">
                    {['all', 'factura', 'pressupost'].map((t) => (
                        <button
                            key={t}
                            onClick={() => setTypeFilter(t as any)}
                            className={`pb-2 px-2 font-bold capitalize transition-colors ${typeFilter === t ? 'text-black border-b-2 border-black' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            {t === 'all' ? 'Tots' : t === 'pressupost' ? 'Pressupostos' : 'Factures'}
                        </button>
                    ))}
                </div>

                {/* Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    {loading ? (
                        <div className="p-8 text-center text-gray-500">Carregant dades...</div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="p-4 text-xs font-black text-gray-500 uppercase">Tipus</th>
                                    <th className="p-4 text-xs font-black text-gray-500 uppercase">Número</th>
                                    <th className="p-4 text-xs font-black text-gray-500 uppercase">Client</th>
                                    <th className="p-4 text-xs font-black text-gray-500 uppercase">Emissió</th>
                                    <th className="p-4 text-xs font-black text-gray-500 uppercase">Bolo</th>
                                    <th className="p-4 text-xs font-black text-gray-500 uppercase text-right">Import</th>
                                    <th className="p-4 text-xs font-black text-gray-500 uppercase text-center">Cobrada</th>
                                    <th className="p-4 text-xs font-black text-gray-500 uppercase text-center">Accions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredRecords.length === 0 && (
                                    <tr><td colSpan={8} className="p-8 text-center text-gray-400">No hi ha registres.</td></tr>
                                )}
                                {filteredRecords.map(r => (
                                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wide ${r.type === 'factura' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                                {r.type === 'factura' ? 'FRA' : 'PRE'}
                                            </span>
                                        </td>
                                        <td className="p-4 font-bold text-gray-900">{r.invoice_number}</td>
                                        <td className="p-4 text-gray-700">{r.client_name}</td>
                                        <td className="p-4 text-gray-500 text-sm">{format(new Date(r.creation_date), 'dd/MM/yyyy')}</td>
                                        <td className="p-4 text-gray-600 text-sm">
                                            {r.bolos ? (
                                                <div>
                                                    <div className="font-bold text-gray-800">{r.bolos.nom_poble}</div>
                                                    <div className="text-xs text-gray-400">{format(new Date(r.bolos.data_bolo), 'dd/MM/yyyy')}</div>
                                                </div>
                                            ) : '-'}
                                        </td>
                                        <td className="p-4 text-right font-mono font-bold">{r.total_amount.toFixed(2)}€</td>
                                        <td className="p-4 text-center">
                                            {r.type === 'factura' ? (
                                                <button
                                                    onClick={() => togglePaid(r.id, r.paid)}
                                                    className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${r.paid ? 'bg-green-100 text-green-700 border-green-200' : 'bg-orange-50 text-orange-600 border-orange-200'}`}
                                                >
                                                    {r.paid ? 'SÍ' : 'NO'}
                                                </button>
                                            ) : (
                                                <span className="text-gray-300">-</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-center">
                                            <button
                                                onClick={() => handleDelete(r.id, r.invoice_number)}
                                                className="text-gray-400 hover:text-red-600 transition-colors"
                                                title="Eliminar"
                                            >
                                                <span className="material-icons-outlined">delete</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Modal Manual Create */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
                        <h2 className="text-xl font-bold mb-4">Nou Document Manual</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tipus</label>
                                <select
                                    className="w-full p-2 border rounded-lg bg-gray-50"
                                    value={formData.type}
                                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                                >
                                    <option value="factura">Factura</option>
                                    <option value="pressupost">Pressupost</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Client</label>
                                <input
                                    className="w-full p-2 border rounded-lg"
                                    placeholder="Nom del client..."
                                    value={formData.client_name}
                                    onChange={e => setFormData({ ...formData, client_name: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Import Total (€)</label>
                                <input
                                    type="number"
                                    className="w-full p-2 border rounded-lg"
                                    placeholder="0.00"
                                    value={formData.total_amount}
                                    onChange={e => setFormData({ ...formData, total_amount: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">ID Bolo (Opcional)</label>
                                <input
                                    type="number"
                                    className="w-full p-2 border rounded-lg"
                                    placeholder="ID numèric..."
                                    value={formData.bolo_id}
                                    onChange={e => setFormData({ ...formData, bolo_id: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Notes</label>
                                <textarea
                                    className="w-full p-2 border rounded-lg"
                                    rows={2}
                                    value={formData.notes}
                                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setShowModal(false)} className="flex-1 py-3 bg-gray-100 rounded-xl font-bold text-gray-600 hover:bg-gray-200">
                                Cancel·lar
                            </button>
                            <button onClick={handleRegisterManual} className="flex-1 py-3 bg-black text-white rounded-xl font-bold hover:bg-gray-800">
                                Crear
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
