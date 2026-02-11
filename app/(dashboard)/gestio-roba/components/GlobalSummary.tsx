'use client';

import { InventoryCatalogItem, InventoryStock, InventoryItem, MaterialLoan } from '@/types/clothing';
import { format } from 'date-fns';
import { ca } from 'date-fns/locale';
import { createClient } from '@/utils/supabase/client';

interface GlobalSummaryProps {
    loans: MaterialLoan[];
    catalog: InventoryCatalogItem[];
    stock: InventoryStock[];
    items: InventoryItem[];
    onUpdate: () => void;
    temporada: 'Hivern' | 'Estiu';
}

export default function GlobalSummary({ loans, catalog, stock, items, onUpdate, temporada }: GlobalSummaryProps) {
    const supabase = createClient();

    // Calculate Availability
    const getStockAvailability = (s: InventoryStock) => {
        const activeLoansForStock = loans.filter(l =>
            l.stock_id === s.id &&
            l.status === 'prestat'
        ).length;
        return s.quantity_total - activeLoansForStock;
    };

    const getBookletAvailability = (c: InventoryCatalogItem) => {
        const totalItems = items.filter(i => i.catalog_id === c.id).length;
        const availableItems = items.filter(i => i.catalog_id === c.id && i.status === 'disponible').length;
        // Or check loan status if 'prestat' is not fully synced to item status.
        // We rely on item.status for simplicity as per migration plan.
        return { total: totalItems, available: availableItems };
    };

    const handleMarkReturned = async (loanId: string, itemId?: string) => {
        if (!confirm('Vols marcar aquest material com a retornat?')) return;

        // 1. Update Loan
        const { error: loanError } = await supabase
            .from('material_loans')
            .update({
                status: 'retornat',
                return_date_real: new Date().toISOString()
            })
            .eq('id', loanId);

        if (loanError) {
            alert('Error actualitzant préstec: ' + loanError.message);
            return;
        }

        // 2. If it's an individual item, update item status to 'disponible'
        if (itemId) {
            await supabase
                .from('inventory_items')
                .update({ status: 'disponible' })
                .eq('id', itemId);
        }

        onUpdate();
    };

    const handleClearAllLoans = async () => {
        if (!confirm('⚠️ ATENCIÓ: Això eliminarà TOTS els registres de material prestat. Només per proves. Continuar?')) return;
        if (!confirm('Estàs SEGUR? Aquesta acció NO es pot desfer!')) return;

        try {
            // 1. Mark all items as disponible
            await supabase.from('inventory_items').update({ status: 'disponible' }).eq('status', 'prestat');

            // 2. Delete all loans with status 'prestat'
            await supabase.from('material_loans').delete().eq('status', 'prestat');

            alert('✅ Tots els préstecs han estat eliminats.');
            onUpdate();
        } catch (error) {
            console.error('Error clearing loans:', error);
            alert('❌ Error eliminant préstecs');
        }
    };

    // Filter active loans
    const activeLoans = loans.filter(l => l.status === 'prestat');

    return (
        <div className="space-y-6">
            {/* Quick Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* T-Shirts */}
                <div className="bg-white dark:bg-card-bg p-6 rounded-xl border-4 border-indigo-600 shadow-xl">
                    <h3 className="text-base font-black text-primary mb-5 flex items-center gap-2 uppercase tracking-tighter">
                        <span className="material-icons-outlined text-indigo-700 text-2xl">checkroom</span>
                        Samarretes
                    </h3>
                    <div className="space-y-3">
                        {stock.filter(s => s.catalog?.type === 'samarreta').map(s => {
                            const avail = getStockAvailability(s);
                            const total = s.quantity_total;
                            const isLow = avail === 0;
                            return (
                                <div key={s.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border-2 border-gray-200 shadow-sm">
                                    <span className="font-black text-primary text-sm tracking-widest">TALLA {s.size}</span>
                                    <span className={`rounded-md px-3 py-1 ${isLow || avail < 0 ? 'bg-red-700 text-white' : 'bg-green-700 text-white'} font-black text-base shadow-md`}>
                                        {avail} <span className="opacity-60 text-[10px] text-white font-normal ml-1">DE {total}</span>
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Hoodies - Only in Hivern */}
                {temporada === 'Hivern' ? (
                    <div className="bg-white dark:bg-card-bg p-6 rounded-xl border-4 border-purple-600 shadow-xl">
                        <h3 className="text-base font-black text-primary mb-5 flex items-center gap-2 uppercase tracking-tighter">
                            <span className="material-icons-outlined text-purple-700 text-2xl">checkroom</span>
                            Dessuadores
                        </h3>
                        <div className="space-y-3">
                            {stock.filter(s => s.catalog?.type === 'dessuadora').map(s => {
                                const avail = getStockAvailability(s);
                                const total = s.quantity_total;
                                const isLow = avail === 0;
                                return (
                                    <div key={s.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border-2 border-gray-200 shadow-sm">
                                        <span className="font-black text-primary text-sm tracking-widest">TALLA {s.size}</span>
                                        <span className={`rounded-md px-3 py-1 ${isLow || avail < 0 ? 'bg-red-700 text-white' : 'bg-green-700 text-white'} font-black text-base shadow-md`}>
                                            {avail} <span className="opacity-60 text-[10px] text-white font-normal ml-1">DE {total}</span>
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="bg-orange-50 p-6 rounded-xl border-4 border-dashed border-orange-200 flex flex-col items-center justify-center">
                        <span className="material-icons-outlined text-orange-600 text-4xl mb-3">wb_sunny</span>
                        <p className="text-sm font-black text-orange-950 uppercase tracking-widest">TEMPORADA ESTIU</p>
                        <p className="text-xs text-orange-800 font-bold mt-2 text-center">Les dessuadores no es mostren en aquesta previsió.</p>
                    </div>
                )}

                {/* Booklets */}
                <div className="bg-white dark:bg-card-bg p-6 rounded-xl border-4 border-amber-500 shadow-xl">
                    <h3 className="text-base font-black text-primary mb-5 flex items-center gap-2 uppercase tracking-tighter">
                        <span className="material-icons-outlined text-amber-600 text-2xl">library_music</span>
                        Llibrets i Material
                    </h3>
                    <div className="space-y-3">
                        {catalog.filter(c => c.type === 'llibret' || c.type === 'altre').map(c => {
                            const { available, total } = getBookletAvailability(c);
                            return (
                                <div key={c.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border-2 border-gray-200 shadow-sm">
                                    <span className="font-black text-primary text-xs truncate max-w-[140px] uppercase tracking-tight">{c.name}</span>
                                    <span className={`rounded-md px-3 py-1 ${available <= 0 ? 'bg-red-700 text-white' : 'bg-green-700 text-white'} font-black text-base shadow-md`}>
                                        {available} <span className="opacity-60 text-[10px] text-white font-normal ml-1">DE {total}</span>
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Active Loans Table */}
            <div className="space-y-6 pt-10">
                <div className="flex justify-between items-end border-b-8 border-primary pb-6">
                    <h2 className="text-4xl font-black text-primary uppercase tracking-tighter">Material Prestat</h2>
                    {activeLoans.length > 0 && (
                        <button
                            onClick={handleClearAllLoans}
                            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl text-sm font-black flex items-center gap-3 transition-all border-4 border-primary shadow-[4px_4px_0px_0px_rgba(124,28,28,1)] uppercase tracking-widest"
                        >
                            <span className="material-icons-outlined text-xl">delete_sweep</span>
                            Buidar Tot
                        </button>
                    )}
                </div>

                <div className="bg-white rounded-2xl border-4 border-primary overflow-hidden shadow-2xl">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-primary text-white">
                            <tr>
                                <th className="px-6 py-5 font-black uppercase tracking-widest text-xs">Material / Talla</th>
                                <th className="px-6 py-5 font-black uppercase tracking-widest text-xs">Qui ho té?</th>
                                <th className="px-6 py-5 font-black uppercase tracking-widest text-xs">Esdeveniment</th>
                                <th className="px-6 py-5 font-black uppercase tracking-widest text-xs">Data</th>
                                <th className="px-6 py-5 font-black uppercase tracking-widest text-xs text-right">Gestió</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y-4 divide-gray-100">
                            {activeLoans.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-20 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <span className="material-icons-outlined text-6xl text-green-500">verified</span>
                                            <p className="text-2xl font-black text-gray-400 uppercase tracking-[0.2em]">Tot el material està a magatzem</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                activeLoans.map(loan => {
                                    let itemName: string = String(loan.item_type).toUpperCase();
                                    if (loan.stock) {
                                        itemName = `${loan.stock.catalog?.name || loan.item_type} (${loan.stock.size})`;
                                    } else if (loan.item) {
                                        itemName = loan.item.identifier;
                                    }

                                    return (
                                        <tr key={loan.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-6 font-black text-primary text-base">
                                                <div className="flex items-center gap-3">
                                                    <span className="material-icons-outlined text-indigo-600">
                                                        {loan.item_type === 'llibret' ? 'menu_book' : 'checkroom'}
                                                    </span>
                                                    {itemName}
                                                </div>
                                            </td>
                                            <td className="px-6 py-6">
                                                <div className="flex flex-col">
                                                    <span className="text-lg font-black text-primary uppercase tracking-tighter">{loan.suplent?.nom || 'Desconegut'}</span>
                                                    {loan.suplent?.tipus === 'substitut' && (
                                                        <span className="text-[10px] w-fit font-black bg-purple-600 text-white px-2 py-0.5 rounded shadow-sm mt-1 uppercase">Substitut</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-6 font-bold text-gray-600 uppercase tracking-tight text-sm">
                                                {loan.bolo ? (
                                                    <span title={loan.bolo.data_bolo}>{loan.bolo.nom_poble}</span>
                                                ) : <span className="italic opacity-30">Directe</span>}
                                            </td>
                                            <td className="px-6 py-6 font-black text-gray-400 text-xs tabular-nums">
                                                {loan.loan_date ? format(new Date(loan.loan_date), 'dd/MM/yy', { locale: ca }) : '-'}
                                            </td>
                                            <td className="px-6 py-6 text-right">
                                                <button
                                                    onClick={() => handleMarkReturned(loan.id, loan.item_id)}
                                                    className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl border-2 border-primary shadow-[4px_4px_0px_0px_rgba(124,28,28,1)] text-xs font-black uppercase tracking-widest transition-all hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
                                                >
                                                    RETORNAT
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
