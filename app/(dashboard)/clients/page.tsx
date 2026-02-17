'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { createClient } from '@/utils/supabase/client';
import { MunicipiSelector } from '@/components/MunicipiSelector';
import { useRouter, useSearchParams } from 'next/navigation';

function ClientsContent() {
    const supabase = createClient();
    const [clients, setClients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterTipus, setFilterTipus] = useState<string>('tots');
    const [filterEstat, setFilterEstat] = useState<'tots' | 'potencial' | 'real'>('tots');
    const [sortBy, setSortBy] = useState<'nom' | 'recent'>('nom');
    const [expandedClient, setExpandedClient] = useState<string | null>(null);
    const [editingClient, setEditingClient] = useState<any>(null);
    const [municipiSelection, setMunicipiSelection] = useState<any>(null);
    const router = useRouter();
    const searchParams = useSearchParams();

    const [toast, setToast] = useState<{ show: boolean, message: string, type: 'success' | 'error' }>({
        show: false,
        message: '',
        type: 'success'
    });

    useEffect(() => {
        fetchClients();
    }, [sortBy]);

    useEffect(() => {
        const newParam = searchParams.get('new');
        const editParam = searchParams.get('edit');

        if (newParam === 'true' && clients.length > 0 && !editingClient) {
            handleAddNew();
        } else if (editParam && clients.length > 0 && expandedClient !== editParam) {
            const client = clients.find(c => c.id === editParam);
            if (client) {
                setEditingClient({ ...client });
                setMunicipiSelection({
                    municipi_id: client.municipi_id || null,
                    municipi_custom_id: client.municipi_custom_id || null,
                    municipi_text: client.municipi_text || client.poblacio || ''
                });
                setExpandedClient(editParam);

                // Scroll to element
                setTimeout(() => {
                    const el = document.getElementById(`client-${editParam}`);
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 500);
            }
        }
    }, [searchParams, clients]);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
    };

    const fetchClients = async () => {
        setLoading(true);
        let query = supabase
            .from('clients')
            .select('*');

        if (sortBy === 'recent') {
            query = query.order('created_at', { ascending: false });
        } else {
            query = query.order('nom');
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching clients:', error);
            showToast('Error al carregar clients', 'error');
        } else {
            setClients(data || []);
        }
        setLoading(false);
    };

    const handleAddNew = () => {
        const newClient: any = {
            id: 'new-' + Date.now(),
            nom: '',
            tipus_client: 'altres',
            persona_contacte: '',
            telefon_contacte: '',
            nif: '',
            altres: '',
            rao_social: '',
            poblacio: '',
            adreca: '',
            codi_postal: '',
            requereix_efactura: false,
            correu_contacte: '',
            telefon_extra: '',
            municipi_id: null,
            municipi_custom_id: null,
            municipi_text: '',
            isNew: true
        };
        setEditingClient(newClient);
        setMunicipiSelection({
            municipi_id: null,
            municipi_custom_id: null,
            municipi_text: ''
        });
        setClients([newClient, ...clients]);
        setExpandedClient(newClient.id);
    };

    const handleExpand = (clientId: string) => {
        if (expandedClient === clientId) {
            setExpandedClient(null);
            setEditingClient(null);
        } else {
            const client = clients.find(c => c.id === clientId);
            setEditingClient({ ...client });
            setMunicipiSelection({
                municipi_id: client.municipi_id || null,
                municipi_custom_id: client.municipi_custom_id || null,
                municipi_text: client.municipi_text || client.poblacio || ''
            });
            setExpandedClient(clientId);
        }
    };

    const handleSaveClient = async () => {
        if (!editingClient) return;

        try {
            // 1. Resoldre el municipi si és necessari
            let finalMunicipi = municipiSelection;
            if (municipiSelection && !municipiSelection.municipi_id && !municipiSelection.municipi_custom_id && municipiSelection.municipi_text) {
                const res = await fetch('/api/municipis/resolve', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ value: municipiSelection.municipi_text })
                });
                if (res.ok) {
                    finalMunicipi = await res.json();
                }
            }

            if (!editingClient.nom?.trim()) {
                showToast('El nom és obligatori', 'error');
                return;
            }

            const saveData = {
                nom: editingClient.nom || '',
                tipus_client: editingClient.tipus_client || 'altres',
                persona_contacte: editingClient.persona_contacte || '',
                telefon_contacte: editingClient.telefon_contacte || '',
                nif: editingClient.nif || '',
                altres: editingClient.altres || '',
                rao_social: editingClient.rao_social || '',
                adreca: editingClient.adreca || '',
                codi_postal: editingClient.codi_postal || '',
                requereix_efactura: editingClient.requereix_efactura || false,
                correu_contacte: editingClient.correu_contacte || '',
                telefon_extra: editingClient.telefon_extra || '',
                // Nous camps de municipi
                municipi_id: finalMunicipi?.municipi_id || null,
                municipi_custom_id: finalMunicipi?.municipi_custom_id || null,
                municipi_text: finalMunicipi?.municipi_text || editingClient.poblacio || '',
                poblacio: finalMunicipi?.municipi_text || editingClient.poblacio || '' // Mantenim població per compatibilitat
            };

            console.log('Saving data:', saveData);

            if (editingClient.isNew) {
                const { data, error } = await supabase
                    .from('clients')
                    .insert([saveData])
                    .select()
                    .single();

                if (error) {
                    console.error('Insert error:', error);
                    throw error;
                }

                setClients(clients.map(c => c.id === editingClient.id ? data : c));
                showToast('Client creat correctament');
                setExpandedClient(null);
                setEditingClient(null);
            } else {
                const { error } = await supabase
                    .from('clients')
                    .update(saveData)
                    .eq('id', editingClient.id);

                if (error) {
                    console.error('Update error:', error);
                    throw error;
                }

                setClients(clients.map(c => c.id === editingClient.id ? { ...c, ...saveData } : c));
                showToast('Client actualitzat correctament');
                setExpandedClient(null);
                setEditingClient(null);

                const callback = searchParams.get('callback');
                if (callback) {
                    router.push(callback);
                }
            }
        } catch (error: any) {
            console.error('Error saving:', error);
            const errorMessage = error?.message || error?.error_description || error?.hint || 'Error desconegut al desar';
            showToast(errorMessage, 'error');
        }
    };

    const handleCancelEdit = () => {
        if (editingClient?.isNew) {
            setClients(clients.filter(c => c.id !== editingClient.id));
        }
        setExpandedClient(null);
        setEditingClient(null);
    };

    const handleDelete = async (id: string, isNew?: boolean) => {
        // Double confirmation
        if (!confirm('⚠️ ATENCIÓ: Segur que vols eliminar aquest client?')) return;
        if (!confirm('❗ CONFIRMACIÓ FINAL: Aquesta acció no es pot desfer. Continuar?')) return;

        if (isNew) {
            setClients(clients.filter(c => c.id !== id));
            setExpandedClient(null);
            setEditingClient(null);
            return;
        }

        try {
            const { error } = await supabase
                .from('clients')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setClients(clients.filter(c => c.id !== id));
            showToast('Client eliminat correctament');
            setExpandedClient(null);
            setEditingClient(null);
        } catch (error: any) {
            console.error('Error deleting client:', error);
            showToast('Error a l\'eliminar el client', 'error');
        }
    };

    const getClientIcon = (tipus: string | null) => {
        return tipus === 'ajuntament' ? '🏛️' : '👥';
    };

    const filteredClients = clients.filter(client => {
        const matchesSearch = !searchTerm ||
            client.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            client.nif?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            client.poblacio?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            client.persona_contacte?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesType = filterTipus === 'tots' ||
            (filterTipus === 'ajuntament' && client.tipus_client === 'ajuntament') ||
            (filterTipus === 'altres' && client.tipus_client !== 'ajuntament');

        const matchesEstat = filterEstat === 'tots' || client.tipus === filterEstat;

        return matchesSearch && matchesType && matchesEstat;
    });

    return (
        <div className="p-4 sm:p-8 max-w-[1400px] mx-auto">
            {/* Toast */}
            {toast.show && (
                <div className={`fixed top-4 right-4 px-4 py-2 rounded shadow-lg z-50 text-white ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                    {toast.message}
                </div>
            )}

            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-text-primary">Clients</h1>
                    <p className="text-text-secondary mt-1">
                        Gestió de clients i entitats
                    </p>
                </div>
                <button
                    onClick={handleAddNew}
                    className="bg-primary hover:bg-red-900 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center"
                >
                    <span className="material-icons-outlined mr-2">add</span>
                    Nou client
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <input
                    type="text"
                    placeholder="Cercar per nom, NIF, població o persona de contacte..."
                    className="flex-1 p-2 rounded border border-border bg-white text-text-primary"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <div className="flex gap-2 w-full sm:w-auto">
                    <select
                        className="flex-1 sm:w-40 p-2 rounded border border-border bg-white text-text-primary"
                        value={filterTipus}
                        onChange={(e) => setFilterTipus(e.target.value)}
                    >
                        <option value="tots">Tots els tipus</option>
                        <option value="ajuntament">Ajuntaments</option>
                        <option value="altres">Altres</option>
                    </select>

                    <select
                        className="flex-1 sm:w-40 p-2 rounded border border-border bg-white text-text-primary"
                        value={filterEstat}
                        onChange={(e) => setFilterEstat(e.target.value as any)}
                    >
                        <option value="tots">Tots els estats</option>
                        <option value="potencial">Potencials 🟠</option>
                        <option value="real">Reals 🟢</option>
                    </select>

                    <select
                        className="flex-1 sm:w-40 p-2 rounded border border-border bg-white text-text-primary font-bold"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                    >
                        <option value="nom">Sort: A-Z</option>
                        <option value="recent">Sort: Més recents</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="text-center text-text-secondary p-8">Carregant clients...</div>
            ) : (
                <div className="bg-card-bg rounded-xl border border-border overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-sm min-w-[600px]">
                            <thead>
                                <tr className="bg-white text-text-primary text-sm border-b border-border font-semibold">
                                    <th className="p-3 w-16">Tipus</th>
                                    <th className="p-3">NOM</th>
                                    <th className="p-3">Persona contacte</th>
                                    <th className="p-3">Telèfon</th>
                                    <th className="p-3 w-24 text-center">Accions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-light">
                                {filteredClients.map((client: any) => (
                                    <React.Fragment key={client.id}>
                                        <tr id={`client-${client.id}`} className="hover:bg-gray-50 transition-colors">
                                            <td className="p-3 text-center text-2xl">
                                                {getClientIcon(client.tipus_client)}
                                            </td>
                                            <td className="p-3 font-medium text-text-primary">
                                                <div className="flex items-center gap-2">
                                                    {client.nom || <span className="text-gray-400 italic">Sense nom</span>}
                                                    {client.tipus === 'potencial' && (
                                                        <span className="bg-orange-100 text-orange-700 text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-widest">
                                                            POTENCIAL
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-3 text-text-secondary">
                                                {client.persona_contacte || '-'}
                                            </td>
                                            <td className="p-3 text-text-secondary">
                                                {client.telefon_contacte || '-'}
                                            </td>
                                            <td className="p-3 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => handleExpand(client.id)}
                                                        className="text-blue-600 hover:text-blue-800 transition-colors"
                                                        title="Veure i editar detalls"
                                                    >
                                                        <span className="material-icons-outlined text-lg">
                                                            {expandedClient === client.id ? 'visibility_off' : 'visibility'}
                                                        </span>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(client.id, client.isNew)}
                                                        className="text-red-600 hover:text-red-800 transition-colors"
                                                        title="Eliminar (amb confirmació)"
                                                    >
                                                        <span className="material-icons-outlined text-lg">delete</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                        {/* Expanded Edit Panel */}
                                        {expandedClient === client.id && editingClient && (
                                            <tr className="bg-blue-50 border-l-4 border-blue-500">
                                                <td colSpan={5} className="p-6">
                                                    <div className="mb-4 flex justify-between items-center">
                                                        <h3 className="text-lg font-bold text-text-primary">
                                                            {editingClient.isNew ? 'Nou Client' : 'Editar Client'}
                                                        </h3>
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={handleSaveClient}
                                                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                                                            >
                                                                <span className="material-icons-outlined text-sm">save</span>
                                                                Desar
                                                            </button>
                                                            <button
                                                                onClick={handleCancelEdit}
                                                                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                                                            >
                                                                <span className="material-icons-outlined text-sm">close</span>
                                                                Cancel·lar
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                        <div>
                                                            <label className="block text-xs font-semibold text-text-secondary mb-1">Tipus *</label>
                                                            <select
                                                                className="w-full p-2 border border-border rounded bg-white text-text-primary text-sm"
                                                                value={editingClient.tipus_client || 'altres'}
                                                                onChange={(e) => setEditingClient({ ...editingClient, tipus_client: e.target.value })}
                                                            >
                                                                <option value="ajuntament">🏛️ Ajuntament</option>
                                                                <option value="altres">👥 Altres (Associacions, Empreses, etc.)</option>
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-semibold text-text-secondary mb-1">Estat CRM</label>
                                                            <select
                                                                className="w-full p-2 border border-border rounded bg-white text-text-primary text-sm font-bold"
                                                                value={editingClient.tipus || 'real'}
                                                                onChange={(e) => setEditingClient({ ...editingClient, tipus: e.target.value })}
                                                            >
                                                                <option value="potencial">🟠 Client Potencial</option>
                                                                <option value="real">🟢 Client Real</option>
                                                            </select>
                                                        </div>
                                                        <div className="md:col-span-2">
                                                            <label className="block text-xs font-semibold text-text-secondary mb-1">NOM *</label>
                                                            <input
                                                                type="text"
                                                                className="w-full p-2 border border-border rounded bg-white text-text-primary text-sm font-medium"
                                                                value={editingClient.nom || ''}
                                                                onChange={(e) => setEditingClient({ ...editingClient, nom: e.target.value })}
                                                                placeholder="Nom del client (obligatori)"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-semibold text-text-secondary mb-1">NIF/CIF</label>
                                                            <input
                                                                type="text"
                                                                className="w-full p-2 border border-border rounded bg-white text-text-primary text-sm"
                                                                value={editingClient.nif || ''}
                                                                onChange={(e) => setEditingClient({ ...editingClient, nif: e.target.value })}
                                                                placeholder="NIF/CIF"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-semibold text-text-secondary mb-1">ALTRES (OAC, etc.)</label>
                                                            <input
                                                                type="text"
                                                                className="w-full p-2 border border-border rounded bg-white text-text-primary text-sm"
                                                                value={editingClient.altres || ''}
                                                                onChange={(e) => setEditingClient({ ...editingClient, altres: e.target.value })}
                                                                placeholder="Informació addicional"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-semibold text-text-secondary mb-1">Raó Social</label>
                                                            <input
                                                                type="text"
                                                                className="w-full p-2 border border-border rounded bg-white text-text-primary text-sm"
                                                                value={editingClient.rao_social || ''}
                                                                onChange={(e) => setEditingClient({ ...editingClient, rao_social: e.target.value })}
                                                                placeholder="Raó social completa"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-semibold text-text-secondary mb-1">Població</label>
                                                            <MunicipiSelector
                                                                value={municipiSelection}
                                                                onChange={setMunicipiSelection}
                                                                placeholder="Població"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-semibold text-text-secondary mb-1">Direcció</label>
                                                            <input
                                                                type="text"
                                                                className="w-full p-2 border border-border rounded bg-white text-text-primary text-sm"
                                                                value={editingClient.adreca || ''}
                                                                onChange={(e) => setEditingClient({ ...editingClient, adreca: e.target.value })}
                                                                placeholder="Direcció completa"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-semibold text-text-secondary mb-1">Codi Postal</label>
                                                            <input
                                                                type="text"
                                                                className="w-full p-2 border border-border rounded bg-white text-text-primary text-sm"
                                                                value={editingClient.codi_postal || ''}
                                                                onChange={(e) => setEditingClient({ ...editingClient, codi_postal: e.target.value })}
                                                                placeholder="CP"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-semibold text-text-secondary mb-1">Persona contacte</label>
                                                            <input
                                                                type="text"
                                                                className="w-full p-2 border border-border rounded bg-white text-text-primary text-sm"
                                                                value={editingClient.persona_contacte || ''}
                                                                onChange={(e) => setEditingClient({ ...editingClient, persona_contacte: e.target.value })}
                                                                placeholder="Persona de contacte"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-semibold text-text-secondary mb-1">Correu contacte</label>
                                                            <input
                                                                type="email"
                                                                className="w-full p-2 border border-border rounded bg-white text-text-primary text-sm"
                                                                value={editingClient.correu_contacte || ''}
                                                                onChange={(e) => setEditingClient({ ...editingClient, correu_contacte: e.target.value })}
                                                                placeholder="correu@exemple.cat"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-semibold text-text-secondary mb-1">Telèfon</label>
                                                            <input
                                                                type="tel"
                                                                className="w-full p-2 border border-border rounded bg-white text-text-primary text-sm"
                                                                value={editingClient.telefon_contacte || ''}
                                                                onChange={(e) => setEditingClient({ ...editingClient, telefon_contacte: e.target.value })}
                                                                placeholder="Telèfon principal"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-semibold text-text-secondary mb-1">Telèfon extra</label>
                                                            <input
                                                                type="tel"
                                                                className="w-full p-2 border border-border rounded bg-white text-text-primary text-sm"
                                                                value={editingClient.telefon_extra || ''}
                                                                onChange={(e) => setEditingClient({ ...editingClient, telefon_extra: e.target.value })}
                                                                placeholder="Telèfon secundari"
                                                            />
                                                        </div>
                                                        <div className="flex items-end pb-2">
                                                            <label className="flex items-center cursor-pointer">
                                                                <input
                                                                    type="checkbox"
                                                                    className="mr-2"
                                                                    checked={editingClient.requereix_efactura || false}
                                                                    onChange={(e) => setEditingClient({ ...editingClient, requereix_efactura: e.target.checked })}
                                                                />
                                                                <span className="text-sm text-text-primary font-medium">Requereix e-factura</span>
                                                            </label>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {filteredClients.length === 0 && (
                        <div className="text-center py-12">
                            <p className="text-text-secondary">No hi ha clients que coincideixin amb els filtres.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default function ClientsPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-text-secondary">Carregant secció de clients...</div>}>
            <ClientsContent />
        </Suspense>
    );
}

