'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { MunicipiSelector } from '@/components/MunicipiSelector';

export default function NewBoloPage() {
    const router = useRouter();
    const supabase = createClient();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        data_bolo: '',
        import_total: '',
        tipus_ingres: 'Efectiu',
        notes: '',
        tipus_actuacio: '',
        concepte: '',
        durada: '',
        menjar_esmorzar: false,
        menjar_dinar: false,
        menjar_sopar: false,
        menjar_barra_lliure: false,
    });

    const [municipi, setMunicipi] = useState<{
        municipi_id?: string | null;
        municipi_custom_id?: string | null;
        municipi_text: string;
    } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // 1. Resoldre el municipi si és text lliure o no té ID de catàleg definitiu
            let finalMunicipi = municipi;

            if (municipi && !municipi.municipi_id && !municipi.municipi_custom_id) {
                const res = await fetch('/api/municipis/resolve', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ value: municipi.municipi_text })
                });
                if (res.ok) {
                    finalMunicipi = await res.json();
                }
            }

            // 2. Crear nou bolo
            const { error } = await supabase.from('bolos').insert([
                {
                    nom_poble: finalMunicipi?.municipi_text || 'Desconegut',
                    data_bolo: formData.data_bolo,
                    import_total: formData.import_total ? parseFloat(formData.import_total) : 0,
                    tipus_ingres: formData.tipus_ingres,
                    notes: formData.notes || null,
                    estat: 'Nova',
                    cobrat: false,
                    tipus_actuacio: formData.tipus_actuacio || null,
                    concepte: formData.concepte || null,
                    durada: formData.durada ? parseInt(formData.durada) : null,
                    // Nous camps del sistema de municipis
                    municipi_id: finalMunicipi?.municipi_id || null,
                    municipi_custom_id: finalMunicipi?.municipi_custom_id || null,
                    municipi_text: finalMunicipi?.municipi_text || 'Desconegut',
                    // Camps informatius de menjar
                    menjar_esmorzar: formData.menjar_esmorzar,
                    menjar_dinar: formData.menjar_dinar,
                    menjar_sopar: formData.menjar_sopar,
                    menjar_barra_lliure: formData.menjar_barra_lliure,
                }
            ]);

            if (error) throw error;

            router.push('/bolos');
            router.refresh();
        } catch (error: any) {
            console.error('Error creating bolo detailed:', JSON.stringify(error, null, 2));
            alert(`Error al crear el bolo: ${error.message || 'Error desconegut'}. Comprova la consola per més detalls.`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-4 sm:p-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center space-x-4 mb-8">
                <Link
                    href="/bolos"
                    className="p-2 rounded-full hover:bg-white transition-colors border border-gray-200"
                >
                    <span className="material-icons-outlined text-gray-500">arrow_back</span>
                </Link>
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Nou Bolo</h1>
            </div>

            {/* Form */}
            <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
                <form onSubmit={handleSubmit} className="space-y-8">

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <MunicipiSelector
                                label="Poble / Municipi"
                                value={municipi}
                                onChange={setMunicipi}
                                required
                                placeholder="Ex: Salt o La Massana, Andorra"
                            />
                        </div>

                        {/* Data */}
                        <div className="space-y-1.5">
                            <label className="block text-sm font-bold text-gray-600 uppercase tracking-wider">
                                Data del bolo
                            </label>
                            <input
                                type="date"
                                required
                                value={formData.data_bolo}
                                onChange={e => setFormData({ ...formData, data_bolo: e.target.value })}
                            />
                        </div>

                        {/* Tipus Actuació */}
                        <div className="space-y-1.5">
                            <label className="block text-sm font-bold text-gray-600 uppercase tracking-wider">
                                Tipus d'actuació
                            </label>
                            <select
                                value={formData.tipus_actuacio}
                                onChange={e => setFormData({ ...formData, tipus_actuacio: e.target.value })}
                                required
                            >
                                <option value="">Selecciona tipus</option>
                                <option value="Festa Major">Festa Major</option>
                                <option value="Cercavila">Cercavila</option>
                                <option value="Concert">Concert</option>
                                <option value="Correfoc">Correfoc</option>
                                <option value="Privat">Privat</option>
                                <option value="Casament">Casament</option>
                                <option value="Altres">Altres</option>
                            </select>
                        </div>

                        {/* Concepte */}
                        <div className="md:col-span-2 space-y-1.5">
                            <label className="block text-sm font-bold text-gray-600 uppercase tracking-wider">
                                Concepte / Descripció
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.concepte}
                                onChange={e => setFormData({ ...formData, concepte: e.target.value })}
                                placeholder="Ex: Cercavila de Gegants del Barri"
                            />
                        </div>

                        {/* Durada */}
                        <div className="space-y-1.5">
                            <label className="block text-sm font-bold text-gray-600 uppercase tracking-wider">
                                Durada (minuts)
                            </label>
                            <input
                                type="number"
                                required
                                min="0"
                                value={formData.durada}
                                onChange={e => setFormData({ ...formData, durada: e.target.value })}
                                placeholder="Ex: 120"
                            />
                        </div>

                        {/* Import Total */}
                        <div className="space-y-1.5">
                            <label className="block text-sm font-bold text-gray-600 uppercase tracking-wider">
                                Import total (€)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                required
                                value={formData.import_total}
                                onChange={e => setFormData({ ...formData, import_total: e.target.value })}
                                placeholder="0.00"
                            />
                        </div>

                        {/* Tipus Ingrés */}
                        <div className="space-y-1.5">
                            <label className="block text-sm font-bold text-gray-600 uppercase tracking-wider">
                                Tipus d'ingrés
                            </label>
                            <select
                                value={formData.tipus_ingres}
                                onChange={e => setFormData({ ...formData, tipus_ingres: e.target.value })}
                            >
                                <option value="Efectiu">Efectiu</option>
                                <option value="Factura">Factura</option>
                                <option value="Altres">Altres</option>
                            </select>
                        </div>
                    </div>

                    {/* SELECTORS INFORMATIUS (NO VINCULANTS) */}
                    <div className="pt-6 border-t border-gray-100">
                        <label className="block text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <span className="material-icons-outlined text-primary">restaurant</span>
                            Serveis de menjar i beguda (Informatiu)
                        </label>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {[
                                { id: 'menjar_esmorzar', label: 'Esmorzar', icon: 'bakery_dining' },
                                { id: 'menjar_dinar', label: 'Dinar', icon: 'lunch_dining' },
                                { id: 'menjar_sopar', label: 'Sopar', icon: 'dinner_dining' },
                                { id: 'menjar_barra_lliure', label: 'Barra lliure', icon: 'local_bar' },
                            ].map((item) => (
                                <label
                                    key={item.id}
                                    className={`flex items-center gap-3 p-4 rounded-xl border transition-all cursor-pointer ${formData[item.id as keyof typeof formData]
                                        ? 'bg-primary/5 border-primary text-primary shadow-sm'
                                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                                        }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={formData[item.id as keyof typeof formData] as boolean}
                                        onChange={e => setFormData({ ...formData, [item.id]: e.target.checked })}
                                        className="sr-only"
                                    />
                                    <span className="material-icons-outlined text-xl">{item.icon}</span>
                                    <span className="font-semibold">{item.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-1.5">
                        <label className="block text-sm font-bold text-gray-600 uppercase tracking-wider">
                            Notes addicionals
                        </label>
                        <textarea
                            value={formData.notes}
                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="Apunts extres per a aquest bolo..."
                            rows={4}
                        />
                    </div>

                    {/* Submit Button */}
                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full btn-primary py-4 text-lg ${loading ? 'opacity-70' : ''}`}
                        >
                            {loading ? (
                                <>
                                    <span className="animate-spin rounded-full h-5 w-5 border-2 border-white/20 border-t-white"></span>
                                    Creant bolo...
                                </>
                            ) : 'Crear Bolo'}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}
