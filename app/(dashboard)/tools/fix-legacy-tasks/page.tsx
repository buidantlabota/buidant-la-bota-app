'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';

export default function FixLegacyTasksPage() {
    const supabase = createClient();
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<string>('');

    const handleMarkAllDone = async () => {
        if (!confirm('Això marcarà TOTES les tasques de sistema (booleanes) com a completades per a TOTS els bolos existents. Estàs segur?')) return;

        setLoading(true);
        setStatus('Actualitzant bolos...');

        try {
            const { error } = await supabase
                .from('bolos')
                .update({
                    disponibilitat_comprovada: true,
                    pressupost_enviat: true,
                    enquesta_enviada: true,
                    fitxa_client_completa: true,
                    pressupost_acceptat: true,
                    convocatoria_enviada: true,
                    enquesta_disponibilitat_musics_enviada: true,
                    calendari_actualitzat: true,
                    material_organitzat: true,
                    actuacio_acabada: true,
                    factura_enviada: true,
                    cobrat: true,
                    pagaments_musics_planificats: true,
                    pagaments_musics_fets: true,
                    bolo_arxivat: true
                })
                .neq('id', 0); // Hack to update all rows if no specific filter

            if (error) throw error;

            setStatus('S\'han marcat totes les tasques com a fetes correctament.');
        } catch (error: any) {
            console.error('Error:', error);
            setStatus(`Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">Eina de Correcció de Dades (Legacy)</h1>
            <p className="mb-6 text-gray-600">
                Utilitza aquesta eina per marcar automàticament totes les tasques de sistema com a completades per als bolos existents.
                Això és útil si acabes de migrar al nou sistema i vols netejar els avisos "pendents" dels bolos antics.
            </p>

            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <button
                    onClick={handleMarkAllDone}
                    disabled={loading}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg disabled:opacity-50 transition-colors flex justify-center items-center gap-2"
                >
                    {loading ? (
                        <>
                            <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
                            Processant...
                        </>
                    ) : (
                        <>
                            <span className="material-icons-outlined">done_all</span>
                            Marcar TOTES les tasques com a fetes
                        </>
                    )}
                </button>

                {status && (
                    <div className={`mt-4 p-4 rounded-lg font-medium ${status.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                        {status}
                    </div>
                )}
            </div>
        </div>
    );
}
