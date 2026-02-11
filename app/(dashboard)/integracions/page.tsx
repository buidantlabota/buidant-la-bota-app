
import { createAdminClient } from "@/utils/supabase/admin";
import Link from 'next/link';
import { CheckCircle, XCircle, Calendar, RefreshCw } from 'lucide-react';

export default async function IntegracionsPage() {
    const supabase = createAdminClient();
    const { data } = await supabase.from('oauth_tokens').select('updated_at').eq('provider', 'google').single();

    const isConnected = !!data;
    const lastSync = data?.updated_at ? new Date(data.updated_at).toLocaleString('ca-ES') : 'Mai';

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8">
            <h1 className="text-3xl font-black text-gray-900">Integracions</h1>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex items-center gap-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                        <Calendar size={32} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Google Calendar</h2>
                        <p className="text-gray-500 text-sm">Sincronitza automàticament els bolos confirmats.</p>
                    </div>
                    <div className="ml-auto">
                        {isConnected ? (
                            <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-bold">
                                <CheckCircle size={16} /> Connectat
                            </span>
                        ) : (
                            <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 text-red-700 text-sm font-bold">
                                <XCircle size={16} /> No connectat
                            </span>
                        )}
                    </div>
                </div>

                <div className="p-6 bg-gray-50/50 space-y-4">
                    <div className="flex items-center justify-between text-sm text-gray-600">
                        <span>Estat de la connexió:</span>
                        <span className="font-mono font-bold">
                            {isConnected ? 'Token vàlid' : 'Sense token'}
                        </span>
                    </div>
                    {isConnected && (
                        <div className="flex items-center justify-between text-sm text-gray-600">
                            <span>Última actualització del token:</span>
                            <span className="font-mono">{lastSync}</span>
                        </div>
                    )}
                </div>

                <div className="p-6 flex gap-4">
                    <Link
                        href="/api/google/connect"
                        className={`flex-1 py-3 px-4 rounded-xl font-bold text-center transition-all ${isConnected
                                ? 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200 shadow-lg'
                            }`}
                    >
                        {isConnected ? 'Reconnectarcompte' : 'Connectar Google Calendar'}
                    </Link>
                </div>
            </div>

            <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 text-sm text-blue-800 space-y-2">
                <h3 className="font-bold flex items-center gap-2">
                    <span className="material-icons-outlined">info</span>
                    Com funciona?
                </h3>
                <ul className="list-disc pl-5 space-y-1 opacity-90">
                    <li>Quan un bolo passa a estat <strong>Confirmada</strong>, es crea automàticament al calendari.</li>
                    <li>Si edites un bolo confirmat, s'actualitza al calendari.</li>
                    <li>Si un bolo confirmat es cancel·la o canvia d'estat, es marca com a [CANCEL·LAT] al títol (no s'esborra).</li>
                </ul>
            </div>
        </div>
    );
}
