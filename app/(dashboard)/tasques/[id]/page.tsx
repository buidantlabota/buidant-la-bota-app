'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Tasca } from '@/types';
import Link from 'next/link';

export default function TascaDetailPage() {
    const router = useRouter();
    const params = useParams();
    const supabase = createClient();
    const [tasca, setTasca] = useState<Tasca | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Edit states
    const [editForm, setEditForm] = useState({
        estat: 'pendent' as 'pendent' | 'en curs' | 'completada',
        importancia: 'mitjana' as 'baixa' | 'mitjana' | 'alta',
        encarregat: '',
        seguiment: ''
    });

    const [toast, setToast] = useState<{ show: boolean, message: string }>({ show: false, message: '' });

    useEffect(() => {
        if (params.id) {
            fetchTasca(params.id as string);
        }
    }, [params.id]);

    const showToast = (message: string) => {
        setToast({ show: true, message });
        setTimeout(() => setToast({ ...toast, show: false }), 3000);
    };

    const fetchTasca = async (id: string) => {
        setLoading(true);
        const { data, error } = await supabase
            .from('tasques')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error('Error fetching tasca:', error);
        } else {
            setTasca(data);
            setEditForm({
                estat: data.estat,
                importancia: data.importancia,
                encarregat: data.encarregat || '',
                seguiment: data.seguiment || ''
            });
        }
        setLoading(false);
    };

    const handleSave = async () => {
        if (!tasca) return;
        setSaving(true);

        try {
            const { error } = await supabase
                .from('tasques')
                .update({
                    estat: editForm.estat,
                    importancia: editForm.importancia,
                    encarregat: editForm.encarregat || null,
                    seguiment: editForm.seguiment || null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', tasca.id);

            if (error) throw error;
            showToast('Canvis desats correctament.');

            // Refresh local data
            setTasca(prev => prev ? ({
                ...prev,
                estat: editForm.estat,
                importancia: editForm.importancia,
                encarregat: editForm.encarregat || null,
                seguiment: editForm.seguiment || null
            }) : null);

        } catch (error) {
            console.error('Error updating tasca:', error);
            alert('Error al desar els canvis.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!tasca) return;
        if (!confirm('Segur que vols eliminar aquesta tasca? Aquesta acció no es pot desfer.')) return;

        try {
            const { error } = await supabase
                .from('tasques')
                .delete()
                .eq('id', tasca.id);

            if (error) throw error;
            router.push('/tasques');
        } catch (error) {
            console.error('Error deleting tasca:', error);
            alert("Error a l'eliminar la tasca.");
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-500 dark:text-text-secondary-dark">Carregant tasca...</div>;
    }

    if (!tasca) {
        return (
            <div className="p-8 text-center">
                <h2 className="text-xl font-bold text-gray-900 dark:text-text-primary-dark">No s'ha trobat aquesta tasca.</h2>
                <Link href="/tasques" className="text-primary hover:underline mt-4 block">
                    Tornar a les tasques
                </Link>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-4xl mx-auto">
            {/* Toast */}
            {toast.show && (
                <div className="fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg z-50">
                    {toast.message}
                </div>
            )}

            {/* Header / Nav */}
            <div className="mb-6">
                <Link href="/tasques" className="text-gray-500 dark:text-text-secondary-dark hover:text-primary flex items-center text-sm font-medium mb-4">
                    <span className="material-icons-outlined text-sm mr-1">arrow_back</span>
                    Tornar a les tasques
                </Link>
                <div className="flex justify-between items-start">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-text-primary-dark">{tasca.titol}</h1>
                    <button
                        onClick={handleDelete}
                        className="text-red-600 hover:text-red-800 dark:text-red-500 dark:hover:text-red-300 font-medium text-sm border border-red-200 dark:border-red-900 rounded px-3 py-1 bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                    >
                        Eliminar tasca
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="md:col-span-2 space-y-6">
                    {/* Description */}
                    <div className="bg-white dark:bg-card-dark rounded-xl border border-gray-200 dark:border-border-dark p-6 shadow-sm">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-text-primary-dark mb-3 border-b border-gray-200 dark:border-border-dark pb-2">
                            Descripció
                        </h3>
                        <div className="text-gray-500 dark:text-text-secondary-dark whitespace-pre-wrap">
                            {tasca.descripcio || <span className="italic opacity-50">Sense descripció</span>}
                        </div>
                    </div>

                    {/* Seguiment */}
                    <div className="bg-white dark:bg-card-dark rounded-xl border border-gray-200 dark:border-border-dark p-6 shadow-sm">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-text-primary-dark mb-3 border-b border-gray-200 dark:border-border-dark pb-2">
                            Seguiment
                        </h3>
                        <div className="space-y-2">
                            <p className="text-sm text-gray-500 dark:text-text-secondary-dark italic">
                                Aquest camp serveix per anar apuntant el seguiment de la tasca i deixar constància del que s'ha anat fent.
                            </p>
                            <textarea
                                className="w-full p-3 rounded bg-gray-50 dark:bg-background-dark border border-gray-200 dark:border-border-dark text-gray-900 dark:text-text-primary-dark min-h-[150px]"
                                placeholder="Anota aquí el seguiment d'aquesta tasca (accions fetes, decisions, comentaris, etc.)."
                                value={editForm.seguiment}
                                onChange={(e) => setEditForm(prev => ({ ...prev, seguiment: e.target.value }))}
                            />
                        </div>
                    </div>

                    {/* Meta info display (Non-editable) */}
                    <div className="bg-white dark:bg-card-dark rounded-xl border border-gray-200 dark:border-border-dark p-6 shadow-sm">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-text-primary-dark mb-4">
                            Detalls
                        </h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="block text-gray-500 dark:text-text-secondary-dark font-medium">Creat per</span>
                                <span className="text-gray-900 dark:text-text-primary-dark">{tasca.creada_per || '-'}</span>
                            </div>
                            <div>
                                <span className="block text-gray-500 dark:text-text-secondary-dark font-medium">Data límit</span>
                                <span className="text-gray-900 dark:text-text-primary-dark">{tasca.data_limit || '-'}</span>
                            </div>
                            <div>
                                <span className="block text-gray-500 dark:text-text-secondary-dark font-medium">Creat el</span>
                                <span className="text-gray-900 dark:text-text-primary-dark">{new Date(tasca.created_at).toLocaleDateString('ca-ES')}</span>
                            </div>
                            <div>
                                <span className="block text-gray-500 dark:text-text-secondary-dark font-medium">ID</span>
                                <span className="text-gray-900 dark:text-text-primary-dark font-mono text-xs">{tasca.id.slice(0, 8)}...</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar (Editable) */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-card-dark rounded-xl border border-gray-200 dark:border-border-dark p-6 shadow-sm">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-text-primary-dark mb-4">
                            Gestió
                        </h3>
                        <div className="space-y-4">
                            {/* Estat */}
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-500 dark:text-text-secondary-dark">Estat</label>
                                <select
                                    className="w-full p-2 rounded bg-gray-50 dark:bg-background-dark border border-gray-200 dark:border-border-dark text-gray-900 dark:text-text-primary-dark appearance-none"
                                    value={editForm.estat}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, estat: e.target.value as any }))}
                                >
                                    <option value="pendent">Pendent</option>
                                    <option value="en curs">En curs</option>
                                    <option value="completada">Completada</option>
                                </select>
                            </div>

                            {/* Importància */}
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-500 dark:text-text-secondary-dark">Importància</label>
                                <select
                                    className="w-full p-2 rounded bg-gray-50 dark:bg-background-dark border border-gray-200 dark:border-border-dark text-gray-900 dark:text-text-primary-dark appearance-none"
                                    value={editForm.importancia}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, importancia: e.target.value as any }))}
                                >
                                    <option value="baixa">Baixa</option>
                                    <option value="mitjana">Mitjana</option>
                                    <option value="alta">Alta</option>
                                </select>
                            </div>

                            {/* Encarregat */}
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-500 dark:text-text-secondary-dark">Encarregat</label>
                                <input
                                    type="text"
                                    className="w-full p-2 rounded bg-gray-50 dark:bg-background-dark border border-gray-200 dark:border-border-dark text-gray-900 dark:text-text-primary-dark"
                                    value={editForm.encarregat}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, encarregat: e.target.value }))}
                                    placeholder="Nom de la persona..."
                                />
                            </div>

                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="w-full mt-4 bg-primary hover:bg-red-900 text-white font-bold py-2 px-4 rounded-lg transition-colors flex justify-center items-center"
                            >
                                {saving ? 'Desant...' : 'Desar canvis'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
