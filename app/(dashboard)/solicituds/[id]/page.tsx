'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Solicitud, Client, BoloStatus } from '@/types';
import Link from 'next/link';
import { format } from 'date-fns';
import {
    ArrowLeft, CheckCircle2, XCircle, UserPlus,
    Calendar, MapPin, Clock, Phone, Mail,
    CreditCard, FileText, Info, Building2, Map
} from 'lucide-react';

export default function SolicitudDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const supabase = createClient();

    const [solicitud, setSolicitud] = useState<Solicitud | null>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        fetchSolicitud();
    }, [id]);

    const fetchSolicitud = async () => {
        const { data, error } = await supabase
            .from('solicituds')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error(error);
            router.push('/solicituds');
        } else {
            setSolicitud(data);
        }
        setLoading(false);
    };

    const handleAccept = async () => {
        if (!solicitud) return;
        if (!confirm('Vols acceptar aquesta sol·licitud? Això permetrà crear un client potencial i un bolo.')) return;

        setProcessing(true);
        try {
            // 1. Create Potential Client
            const { data: client, error: clientErr } = await supabase
                .from('clients')
                .insert([{
                    nom: solicitud.contacte_nom,
                    correu_contacte: solicitud.contacte_email,
                    telefon_contacte: solicitud.contacte_telefon,
                    tipus: 'potencial',
                    nif: solicitud.fact_nif,
                    rao_social: solicitud.fact_rao_social || solicitud.fact_nom,
                    adreca: solicitud.fact_direccio,
                    poblacio: solicitud.fact_poblacio,
                    codi_postal: solicitud.fact_cp,
                    tipus_client: 'altres', // Default required
                    requereix_efactura: solicitud.requereix_factura || false,
                    observacions: `Creat des de sol·licitud web el ${format(new Date(), 'dd/MM/yyyy')}`
                }])
                .select()
                .single();

            if (clientErr) {
                console.error('Error creant client:', clientErr);
                throw new Error(`Error creant client: ${clientErr.message}`);
            }

            // 2. Create Bolo (Actuació)
            const { data: bolo, error: boloErr } = await supabase
                .from('bolos')
                .insert([{
                    nom_poble: solicitud.municipi || 'Sense municipi',
                    data_bolo: solicitud.data_actuacio,
                    hora_inici: solicitud.hora_inici,
                    concepte: solicitud.concepte,
                    tipus_actuacio: solicitud.tipus_actuacio,
                    ubicacio_detallada: solicitud.ubicacio,
                    estat: 'Nova' as BoloStatus,
                    client_id: client.id,
                    solicitud_id: solicitud.id,
                    notes: solicitud.altres_acte,
                    // Numeric defaults to avoid NOT NULL issues
                    import_total: 0,
                    preu_per_musica: 0,
                    num_musics: 0,
                    cost_total_musics: 0,
                    pot_delta: 0,
                    ajust_pot_manual: 0,
                    pot_delta_final: 0,
                    estat_cobrament: 'pendent',
                    estat_assistencia: 'pendent',
                    tipus_ingres: 'Factura',
                    cobrat: false
                }])
                .select()
                .single();

            if (boloErr) {
                console.error('Error creant bolo:', boloErr);
                throw new Error(`Error creant bolo: ${boloErr.message}`);
            }

            // 3. Update Sol·licitud
            const { error: solErr } = await supabase
                .from('solicituds')
                .update({
                    estat: 'ACCEPTADA',
                    client_id: client.id,
                    bolo_id: bolo.id
                })
                .eq('id', solicitud.id);

            if (solErr) {
                console.error('Error actualitzant sol·licitud:', solErr);
                throw new Error(`Error actualitzant sol·licitud: ${solErr.message}`);
            }

            alert('Sol·licitud acceptada! S\'ha creat el client potencial i el bolo a la fase d\'estudi.');
            router.push(`/bolos/${bolo.id}`);

        } catch (err: any) {
            console.error('Critical handleAccept error:', err);
            // Better error extraction
            const msg = err.message || 'Error desconegut';
            alert(`⚠️ No s'ha pogut acceptar la sol·licitud.\n\nDetall de l'error: ${msg}\n\nRevisa la consola per a més detalls.`);
        } finally {
            setProcessing(false);
        }
    };

    const handleReject = async () => {
        if (!solicitud) return;
        const motiu = prompt('Motiu del rebuig (opcional):');
        if (motiu === null) return;

        setProcessing(true);
        const { error } = await supabase
            .from('solicituds')
            .update({
                estat: 'REBUTJADA',
                notes_internes: motiu ? `Rebuig: ${motiu}` : 'Rebutjada'
            })
            .eq('id', solicitud.id);

        if (error) alert('Error al rebutjar.');
        else fetchSolicitud();
        setProcessing(false);
    };

    if (loading) return <div className="p-12 text-center text-gray-500">Carregant detalls...</div>;
    if (!solicitud) return null;

    return (
        <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/solicituds" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <ArrowLeft size={20} className="text-gray-500" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-black text-gray-900">{solicitud.concepte}</h1>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${solicitud.estat === 'NOVA' ? 'bg-blue-600 text-white' :
                                solicitud.estat === 'ACCEPTADA' ? 'bg-emerald-600 text-white' :
                                    'bg-gray-400 text-white'
                                }`}>
                                {solicitud.estat}
                            </span>
                        </div>
                        <p className="text-xs text-gray-400 font-mono mt-1">ID: {solicitud.id}</p>
                    </div>
                </div>

                {solicitud.estat === 'NOVA' && (
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleReject}
                            disabled={processing}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 rounded-xl transition-all border border-red-200"
                        >
                            <XCircle size={18} />
                            Rebutjar
                        </button>
                        <button
                            onClick={handleAccept}
                            disabled={processing}
                            className="flex items-center gap-2 px-6 py-2 text-sm font-black text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-200 rounded-xl transition-all"
                        >
                            <CheckCircle2 size={18} />
                            Acceptar Sol·licitud
                        </button>
                    </div>
                )}

                {solicitud.bolo_id && (
                    <Link
                        href={`/bolos/${solicitud.bolo_id}`}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-primary bg-primary/10 hover:bg-primary/20 rounded-xl transition-all"
                    >
                        <FileText size={18} />
                        Veure Bolo Creat
                    </Link>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Column 1: Core Info */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Event Details Card */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden text-sm">
                        <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center gap-2 text-gray-400 font-bold uppercase tracking-widest text-[10px]">
                            <Info size={14} /> Dades de l'Acte
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                            <InfoItem icon={<MapPin size={16} />} label="Municipi" value={solicitud.municipi} />
                            <InfoItem icon={<Calendar size={16} />} label="Data" value={solicitud.data_actuacio ? format(new Date(solicitud.data_actuacio), 'dd MMMM yyyy') : 'Sense data'} />
                            <InfoItem icon={<Clock size={16} />} label="Horari" value={solicitud.hora_inici ? `${solicitud.hora_inici} - ${solicitud.hora_fi || '?'}` : 'No definit'} />
                            <InfoItem icon={<Map size={16} />} label="Ubicació" value={solicitud.ubicacio} />
                            <InfoItem icon={<Building2 size={16} />} label="Tipus Acte" value={solicitud.tipus_actuacio} />

                            <div className="flex gap-4 col-span-2 mt-2">
                                <Badge icon={<CheckCircle2 size={12} />} label="Aparcament" active={solicitud.aparcament} />
                                <Badge icon={<CheckCircle2 size={12} />} label="Espai Fundes" active={solicitud.espai_fundes} />
                                <Badge icon={<CreditCard size={12} />} label="Req. Factura" active={solicitud.requereix_factura} />
                                <Badge icon={<FileText size={12} />} label="Req. Pressupost" active={solicitud.necessita_pressupost} />
                            </div>

                            <div className="col-span-2 mt-4 p-4 bg-yellow-50 rounded-xl border border-yellow-100">
                                <h4 className="font-bold text-yellow-800 mb-1 flex items-center gap-1">
                                    <FileText size={14} /> Missatge / Observacions
                                </h4>
                                <p className="text-yellow-900 whitespace-pre-wrap leading-relaxed">{solicitud.altres_acte || 'Sense comentaris addicionals.'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Billing Info Card */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden text-sm">
                        <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center gap-2 text-gray-400 font-bold uppercase tracking-widest text-[10px]">
                            <CreditCard size={14} /> Dades per Facturació
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                            <InfoItem label="Responsable Pagament" value={solicitud.responsable_pagament} />
                            <InfoItem label="Forma Pagament" value={solicitud.forma_pagament} />
                            <InfoItem label="Nom Fiscal" value={solicitud.fact_nom} />
                            <InfoItem label="NIF" value={solicitud.fact_nif} />
                            <div className="col-span-2">
                                <InfoItem label="Direcció Fiscal" value={solicitud.fact_direccio ? `${solicitud.fact_direccio}, ${solicitud.fact_cp} ${solicitud.fact_poblacio}` : null} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Column 2: Contact Info */}
                <div className="space-y-6">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden text-sm sticky top-6">
                        <div className="p-4 bg-primary text-white flex items-center gap-2 font-bold uppercase tracking-widest text-[10px]">
                            <UserPlus size={14} /> Persona de Contacte
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="flex flex-col items-center text-center pb-6 border-b border-gray-50">
                                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-3">
                                    <UserPlus size={32} />
                                </div>
                                <h3 className="font-black text-lg text-gray-900 leading-none">{solicitud.contacte_nom}</h3>
                                <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest font-bold">Client Web</p>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-gray-50 rounded-lg text-gray-400"><Mail size={16} /></div>
                                    <div className="flex-1">
                                        <div className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Email</div>
                                        <a href={`mailto:${solicitud.contacte_email}`} className="font-mono font-bold text-gray-700 hover:text-primary transition-colors underline decoration-primary/30">
                                            {solicitud.contacte_email}
                                        </a>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-gray-50 rounded-lg text-gray-400"><Phone size={16} /></div>
                                    <div className="flex-1">
                                        <div className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Telèfon</div>
                                        <a href={`tel:${solicitud.contacte_telefon}`} className="font-mono font-bold text-gray-700 hover:text-primary transition-colors underline decoration-primary/30">
                                            {solicitud.contacte_telefon || 'No indicat'}
                                        </a>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-gray-50">
                                <div className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1">Com ens ha conegut?</div>
                                <p className="italic text-gray-500">"{solicitud.com_ens_has_conegut || 'No ho indica.'}"</p>
                            </div>
                        </div>
                    </div>

                    {solicitud.notes_internes && (
                        <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
                            <h4 className="text-xs font-black text-red-600 uppercase tracking-widest mb-2">Notes del rebuig</h4>
                            <p className="text-sm text-red-800">{solicitud.notes_internes}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function InfoItem({ icon, label, value }: { icon?: React.ReactNode, label: string, value?: string | null }) {
    return (
        <div className="space-y-1">
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                {icon} {label}
            </div>
            <div className="text-gray-900 font-bold leading-tight">
                {value || <span className="text-gray-300 font-medium">No indicat</span>}
            </div>
        </div>
    );
}

function Badge({ icon, label, active }: { icon: React.ReactNode, label: string, active: boolean }) {
    if (!active) return null;
    return (
        <span className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded text-[10px] font-bold uppercase tracking-wider border border-gray-200 shadow-sm">
            {icon} {label}
        </span>
    );
}
