'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { InventoryCatalogItem, InventoryStock, InventoryItem, MaterialLoan, CatalogType } from '@/types/clothing';
import { format } from 'date-fns';
import { ca } from 'date-fns/locale';
import { useMaterialRequest } from '@/app/hooks/useMaterialRequest';

interface BoloAssignmentsProps {
    bolos: any[];
    selectedBoloId: string | null;
    setSelectedBoloId: (id: string) => void;
    catalog: InventoryCatalogItem[];
    stock: InventoryStock[];
    items: InventoryItem[];
    loans: MaterialLoan[];
    onUpdate: () => void;
}

export default function BoloAssignments({
    bolos, selectedBoloId, setSelectedBoloId,
    catalog, stock, items, loans, onUpdate
}: BoloAssignmentsProps) {
    const supabase = createClient();
    const [musicians, setMusicians] = useState<any[]>([]);
    const [loadingMusicians, setLoadingMusicians] = useState(false);
    const [showTitulars, setShowTitulars] = useState(false); // Default: Only Substituts (false)

    const { requestMaterial, loading: requestingMaterial } = useMaterialRequest();

    const selectedBolo = bolos.find(b => String(b.id) === String(selectedBoloId));

    // Fetch musicians when bolo changes
    useEffect(() => {
        if (selectedBoloId) {
            fetchMusicians(selectedBoloId);
        } else {
            setMusicians([]);
        }
    }, [selectedBoloId]);

    const fetchMusicians = async (boloId: string) => {
        setLoadingMusicians(true);
        // Explicitly select columns to ensure we get talla_samarreta and avoid any ambiguity
        const { data, error } = await supabase
            .from('bolo_musics')
            .select(`
                music_id, 
                tipus_music:tipus, 
                music:musics(id, nom, talla_samarreta, talla_dessuadora, instruments, tipus)
            `)
            .eq('bolo_id', boloId);

        if (error) {
            console.error('Error fetching musicians:', error);
        } else {
            console.log('Musicians fetched:', data);
            setMusicians(data || []);
        }
        setLoadingMusicians(false);
    };

    const handleAutoAssignAndRequest = async () => {
        if (!selectedBolo) return;

        if (!selectedBolo) {
            console.error('❌ AutoAssign: No selectedBolo found. ID:', selectedBoloId);
            alert('Error: No s\'ha trobat el bolo seleccionat per processar.');
            return;
        }

        console.log('🔄 Iniciant assignació automàtica per:', selectedBolo);

        if (!confirm('Vols executar l\'assignació automàtica i sol·licitar el material a n8n?')) return;

        try {
            await requestMaterial(selectedBolo);
            alert("S'ha realitzat l'assignació i s'ha enviat la sol·licitud.");
            onUpdate(); // Refresh parent data (loans)
        } catch (error) {
            console.error("Error regarding auto-assign:", error);
            alert("Hi ha hagut un error durant el procés. Revisa la consola.");
        }
    };

    const createLoan = async (musicId: string, type: string, stockId?: string, itemId?: string) => {
        await supabase.from('material_loans').insert({
            bolo_id: selectedBoloId,
            suplent_id: musicId,
            item_type: type,
            stock_id: stockId,
            item_id: itemId,
            loan_date: new Date().toISOString(),
            status: 'prestat'
        });

        if (itemId) {
            await supabase.from('inventory_items').update({ status: 'prestat' }).eq('id', itemId);
        }
    };

    const handleDeleteLoan = async (loanId: string, itemId?: string) => {
        if (!confirm('Eliminar aquesta assignació? (Es marcarà com a esborrat, no retornat)')) return;

        await supabase.from('material_loans').delete().eq('id', loanId);
        if (itemId) {
            await supabase.from('inventory_items').update({ status: 'disponible' }).eq('id', itemId);
        }
        onUpdate();
    };

    // Filter Musicians
    const displayedMusicians = musicians.filter(m => {
        const musicRole = m.music?.tipus || m.tipus_music;
        if (showTitulars) return true;
        return musicRole === 'substitut';
    });

    // Helper to render assignment card part
    const AssignmentItem = ({ music, type, label }: { music: any, type: CatalogType, label: string }) => {
        const activeGlobalLoan = loans.find(l =>
            l.suplent_id === music.music_id &&
            l.item_type === type &&
            l.status === 'prestat'
        );

        const assignedForThisBolo = !!activeGlobalLoan && String(activeGlobalLoan.bolo_id) === String(selectedBoloId);
        const isAssigned = !!activeGlobalLoan;

        let displayValue = "—";
        if (isAssigned) {
            if (activeGlobalLoan?.stock) {
                displayValue = `TALLA ${activeGlobalLoan.stock.size}`;
            } else if (activeGlobalLoan?.item) {
                displayValue = `${activeGlobalLoan.item.identifier}`;
            } else {
                displayValue = "ASSIGNAT";
            }
        }

        const containerBase = "flex flex-col gap-2 p-4 rounded-xl border-4 transition-all shadow-md";
        const containerStyle = assignedForThisBolo
            ? "bg-indigo-700 border-primary text-white shadow-[4px_4px_0px_0px_rgba(124,28,28,1)]"
            : "bg-white border-primary hover:bg-gray-50 shadow-[4px_4px_0px_0px_rgba(124,28,28,0.1)]";

        return (
            <div className={`${containerBase} ${containerStyle}`}>
                <div className="flex justify-between items-center">
                    <span className={`text-[11px] font-black uppercase tracking-widest ${assignedForThisBolo ? 'text-indigo-100' : 'text-gray-500'}`}>
                        {label}
                    </span>
                    {isAssigned && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-black uppercase tracking-tighter border-2 ${assignedForThisBolo
                            ? 'bg-white text-indigo-900 border-white'
                            : 'bg-primary text-white border-primary'
                            }`}>
                            {assignedForThisBolo ? 'AQUÍ' : 'JA EN TÉ'}
                        </span>
                    )}
                </div>

                <div className="flex items-center justify-between h-10">
                    {isAssigned ? (
                        <div className="flex items-center gap-3 w-full">
                            <span className={`font-black text-lg flex-1 truncate ${assignedForThisBolo ? 'text-white' : 'text-primary'}`} title={displayValue}>
                                {displayValue}
                            </span>
                            {assignedForThisBolo && (
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            setActiveAssignment({
                                                type: type,
                                                musicId: music.music_id,
                                                editingLoanId: activeGlobalLoan!.id,
                                                currentSelection: activeGlobalLoan?.stock_id || activeGlobalLoan?.item_id || ''
                                            });
                                            setAssignSelection(activeGlobalLoan?.stock_id || activeGlobalLoan?.item_id || '');
                                        }}
                                        className="bg-white text-indigo-700 hover:bg-indigo-50 p-1.5 rounded-lg border-2 border-white shadow-sm transition-all"
                                        title="Editar"
                                    >
                                        <span className="material-icons-outlined text-lg">edit</span>
                                    </button>
                                    <button
                                        onClick={() => handleDeleteLoan(activeGlobalLoan!.id, activeGlobalLoan!.item_id)}
                                        className="bg-red-500 hover:bg-red-600 p-1.5 rounded-lg border-2 border-red-700 shadow-sm transition-all text-white"
                                        title="Eliminar"
                                    >
                                        <span className="material-icons-outlined text-lg">close</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <button
                            onClick={() => setActiveAssignment({ musicId: music.music_id, type })}
                            className="text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg px-4 py-2 transition-all w-full text-center shadow-[4px_4px_0px_0px_rgba(124,28,28,1)] border-2 border-primary uppercase tracking-widest"
                        >
                            Assignar
                        </button>
                    )}
                </div>
            </div>
        );
    };

    // Modal state remains same...
    const [activeAssignment, setActiveAssignment] = useState<{ musicId: string, type: CatalogType, editingLoanId?: string, currentSelection?: string } | null>(null);
    const [assignSelection, setAssignSelection] = useState<string>('');

    const saveAssignment = async () => {
        if (!activeAssignment || !assignSelection || !selectedBoloId) return;
        const { type, musicId, editingLoanId } = activeAssignment;
        const isIndividual = type === 'llibret';

        if (editingLoanId) {
            const { data: oldLoan } = await supabase.from('material_loans').select('*').eq('id', editingLoanId).single();
            await supabase.from('material_loans').update({
                stock_id: isIndividual ? null : assignSelection,
                item_id: isIndividual ? assignSelection : null
            }).eq('id', editingLoanId);
            if (oldLoan?.item_id && oldLoan.item_id !== assignSelection) {
                await supabase.from('inventory_items').update({ status: 'disponible' }).eq('id', oldLoan.item_id);
            }
            if (isIndividual && assignSelection) {
                await supabase.from('inventory_items').update({ status: 'prestat' }).eq('id', assignSelection);
            }
        } else {
            await createLoan(musicId, type, isIndividual ? undefined : assignSelection, isIndividual ? assignSelection : undefined);
        }
        setActiveAssignment(null);
        setAssignSelection('');
        onUpdate();
    };

    return (
        <div className="space-y-10 pb-20">
            {/* Header / Controls */}
            <div className="bg-white p-6 rounded-2xl border-4 border-primary shadow-[8px_8px_0px_0px_rgba(124,28,28,0.1)] flex flex-col md:flex-row gap-6 items-end justify-between">
                <div className="flex-1 w-full md:max-w-md">
                    <label className="block text-xs font-black text-gray-500 mb-2 uppercase tracking-widest px-1">Selecciona Actuació</label>
                    <select
                        className="w-full p-3 rounded-xl bg-gray-50 border-4 border-primary text-primary h-14 font-black shadow-inner"
                        value={selectedBoloId || ''}
                        onChange={(e) => setSelectedBoloId(e.target.value)}
                    >
                        <option value="">-- ESCULL UN BOLO --</option>
                        {bolos.map(b => (
                            <option key={b.id} value={b.id}>
                                {format(new Date(b.data_bolo), 'dd/MM/yyyy')} - {b.nom_poble}
                            </option>
                        ))}
                    </select>
                </div>

                {selectedBoloId && (
                    <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                        <div className="flex bg-white p-1.5 rounded-xl border-4 border-primary shadow-md">
                            <button
                                onClick={() => setShowTitulars(false)}
                                className={`px-5 py-3 text-xs font-black rounded-lg transition-all uppercase tracking-widest ${!showTitulars ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                            >
                                Substituts
                            </button>
                            <button
                                onClick={() => setShowTitulars(true)}
                                className={`px-5 py-3 text-xs font-black rounded-lg transition-all uppercase tracking-widest ${showTitulars ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                            >
                                + Titulars
                            </button>
                        </div>

                        <button
                            onClick={handleAutoAssignAndRequest}
                            disabled={requestingMaterial}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-4 rounded-xl text-sm flex items-center gap-3 font-black transition-all shadow-[4px_4px_0px_0px_rgba(124,28,28,1)] border-4 border-primary disabled:opacity-50 uppercase tracking-widest"
                        >
                            {requestingMaterial ? (
                                <div className="w-5 h-5 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <span className="material-icons-outlined text-xl">auto_fix_high</span>
                            )}
                            Assignació Automàtica
                        </button>
                    </div>
                )}
            </div>

            {selectedBoloId ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-8">
                    {displayedMusicians.length === 0 ? (
                        <div className="col-span-full text-center py-20 bg-gray-50 border-4 border-dashed border-gray-300 rounded-2xl">
                            <p className="text-gray-400 font-black uppercase tracking-widest">No hi ha músics amb aquest filtre</p>
                        </div>
                    ) : (
                        displayedMusicians.map((m: any) => {
                            const musicRole = m.music?.tipus || m.tipus_music;
                            return (
                                <div key={m.music_id} className="bg-white rounded-2xl border-4 border-primary shadow-xl overflow-hidden flex flex-col transform transition-all hover:scale-[1.01]">
                                    {/* Musician Header */}
                                    <div className="p-6 border-b-4 border-primary bg-primary text-white">
                                        <div className="flex justify-between items-start mb-4">
                                            <h3 className="font-black text-2xl truncate pr-4 text-white" title={m.music?.nom}>{m.music?.nom}</h3>
                                            <span className={`text-[10px] uppercase font-black px-3 py-1.5 rounded-lg border-2 shadow-inner whitespace-nowrap ${musicRole === 'substitut' ? 'bg-indigo-600 border-indigo-500' : 'bg-gray-700 border-gray-600'}`}>
                                                {musicRole}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2 mb-4">
                                            <span className="material-icons-outlined text-indigo-400 text-lg">music_note</span>
                                            <span className="text-xs text-white font-bold uppercase tracking-widest truncate" title={m.music?.instruments}>
                                                {m.music?.instruments || 'SENSE INSTRUMENT'}
                                            </span>
                                        </div>

                                        <div className="flex flex-wrap gap-3">
                                            <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg border-2 border-white/10">
                                                <span className="text-[9px] font-black text-indigo-300 uppercase">SMR:</span>
                                                <span className="font-black text-sm">{m.music?.talla_samarreta || '?'}</span>
                                            </div>
                                            <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg border-2 border-white/10">
                                                <span className="text-[9px] font-black text-purple-300 uppercase">DESS:</span>
                                                <span className="font-black text-sm">{m.music?.talla_dessuadora || '?'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Assignments Body */}
                                    <div className="p-6 space-y-4 flex-1 bg-white">
                                        <AssignmentItem music={m} type="samarreta" label="Samarreta" />
                                        <AssignmentItem music={m} type="dessuadora" label="Dessuadora" />
                                        <AssignmentItem music={m} type="llibret" label="Llibret" />
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            ) : (
                <div className="text-center py-32 bg-gray-50 border-4 border-dashed border-gray-300 rounded-3xl">
                    <span className="material-icons-outlined text-6xl text-gray-300 mb-4 block">event_note</span>
                    <p className="text-xl font-black text-gray-400 uppercase tracking-[0.2em]">Selecciona un bolo per gestionar</p>
                </div>
            )}

            {/* Assignment Modal */}
            {activeAssignment && (
                <div className="fixed inset-0 bg-primary/80 backdrop-blur-sm flex items-center justify-center p-6 z-50">
                    <div className="bg-white p-8 rounded-3xl border-8 border-primary w-full max-w-md shadow-[12px_12px_0px_0px_rgba(124,28,28,1)]">
                        <h3 className="text-3xl font-black mb-8 text-primary uppercase tracking-tighter">
                            {activeAssignment.editingLoanId ? 'EDITAR' : 'ASSIGNAR'} {activeAssignment.type.toUpperCase()}
                        </h3>

                        <div className="mb-8">
                            <label className="block text-xs font-black text-gray-500 mb-3 uppercase tracking-widest px-1">Stock Disponible:</label>
                            <select
                                className="w-full p-4 rounded-2xl bg-gray-50 border-4 border-primary text-primary h-16 font-black shadow-inner appearance-none"
                                value={assignSelection || activeAssignment.currentSelection || ''}
                                onChange={(e) => setAssignSelection(e.target.value)}
                            >
                                <option value="">-- SELECCIONA --</option>
                                {activeAssignment.type === 'llibret' ? (
                                    items
                                        .filter(i => (i.status === 'disponible' || i.status === 'prestat'))
                                        .filter(i => i.catalog?.type === 'llibret' && i.status === 'disponible')
                                        .map(i => (
                                            <option key={i.id} value={i.id}>{i.identifier}</option>
                                        ))
                                ) : (
                                    stock
                                        .filter(s => s.catalog?.type === activeAssignment.type)
                                        .map(s => {
                                            const activeForThisStock = loans.filter(l => l.stock_id === s.id && l.status === 'prestat').length;
                                            const avail = s.quantity_total - activeForThisStock;
                                            const isNegative = avail < 0;
                                            return (
                                                <option key={s.id} value={s.id} style={isNegative ? { color: 'red' } : {}}>
                                                    {s.size} ({avail} disp.)
                                                </option>
                                            );
                                        })
                                )}
                            </select>
                        </div>

                        <div className="flex gap-4">
                            <button
                                onClick={() => {
                                    setActiveAssignment(null);
                                    setAssignSelection('');
                                }}
                                className="flex-1 px-6 py-4 rounded-xl border-4 border-primary font-black text-primary hover:bg-gray-50 transition-all uppercase tracking-widest"
                            >
                                Cancel·lar
                            </button>
                            <button
                                onClick={saveAssignment}
                                disabled={!assignSelection && !activeAssignment.currentSelection}
                                className="flex-[2] px-6 py-4 rounded-xl bg-indigo-600 text-white border-4 border-primary font-black hover:bg-indigo-700 shadow-[4px_4px_0px_0px_rgba(124,28,28,1)] disabled:opacity-50 transition-all uppercase tracking-widest"
                            >
                                Guardar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
