'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { Music, BoloMusic, Client, BoloComentari, Bolo, BoloStatus, BoloTasca, AdvancePayment } from '@/types';
import AssistenciaMusics from './AssistenciaMusics';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useMaterialRequest } from '@/app/hooks/useMaterialRequest';
import { TasquesPerFase } from '@/components/TasquesPerFase';
import { generateDescriptionText } from '@/lib/pdf-utils';
import { format, addMonths } from 'date-fns';
import { ca } from 'date-fns/locale';
import { MunicipiSelector } from '@/components/MunicipiSelector';

const BOLO_STATES: BoloStatus[] = [
    'Nova',
    'Pendent de confirmació',
    'Confirmada',
    'Pendents de cobrar',
    'Per pagar',
    'Tancades',
    'Cancel·lats'
];

export default function BoloDetailPage() {
    const router = useRouter();
    const params = useParams();
    const supabase = createClient();
    const [bolo, setBolo] = useState<Bolo | null>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);

    const { requestMaterial, loading: requestingMaterial } = useMaterialRequest();

    const handleRequestMaterial = async () => {
        if (!bolo) return;
        await requestMaterial({
            id: String(bolo.id),
            nom_poble: bolo.nom_poble,
            data_bolo: bolo.data_bolo,
            estat: bolo.estat,
            import_total: bolo.import_total || 0,
            tipus_ingres: bolo.tipus_ingres
        });
    };

    // Google Sync Helper
    const triggerGoogleSync = () => {
        if (!bolo) return;
        // Launch sync regardless of state (lib handles create/update/delete logic)
        fetch(`/api/bolos/${bolo.id}/sync`, { method: 'POST' })
            .then(res => {
                if (res.ok) console.log('Sync launched');
                else console.error('Sync failed trigger');
            })
            .catch(console.error);
    };

    // Economic Data State
    const [economicData, setEconomicData] = useState<Partial<Bolo>>({
        import_total: 0,
        preu_per_musica: 0,
        tipus_ingres: 'B',
        ajust_pot_manual: 0,
        comentari_ajust_pot: '',
    });


    // Rejection Modal State
    const [showRejectionModal, setShowRejectionModal] = useState(false);
    const [rejectionData, setRejectionData] = useState({
        motiu: '',
        origen: 'client'
    });

    // Attendance State
    const [musics, setMusics] = useState<Music[]>([]);
    const [boloMusics, setBoloMusics] = useState<BoloMusic[]>([]);
    const [loadingMusics, setLoadingMusics] = useState(true);
    const [selectedSubstitut, setSelectedSubstitut] = useState<string>('');

    // PDF Preview state
    const [showPreview, setShowPreview] = useState(false);
    const [previewType, setPreviewType] = useState<'pressupost' | 'factura' | null>(null);
    const [descriptionText, setDescriptionText] = useState('');
    const [manualNumber, setManualNumber] = useState('');
    const [pdfGenerating, setPdfGenerating] = useState(false);
    const [articles, setArticles] = useState<{ descripcio: string; preu: number; quantitat: number }[]>([]);

    // Client State
    const [clients, setClients] = useState<Client[]>([]);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [newClientModalOpen, setNewClientModalOpen] = useState(false);
    const [newClientData, setNewClientData] = useState({
        nom: '',
        telefon: '',
        correu: '',
        nif: '',
        adreca: '',
        observacions: ''
    });

    // Navigation State
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [tempTitle, setTempTitle] = useState('');
    const [tempDate, setTempDate] = useState('');
    const [tempMunicipi, setTempMunicipi] = useState<{
        municipi_id?: string | null;
        municipi_custom_id?: string | null;
        municipi_text: string;
    } | null>(null);
    const [nextBoloId, setNextBoloId] = useState<number | null>(null);
    const [prevBoloId, setPrevBoloId] = useState<number | null>(null);

    // Toast state
    const [toast, setToast] = useState<{ show: boolean, message: string, type: 'success' | 'error' }>({
        show: false,
        message: '',
        type: 'success'
    });

    // Comments State
    const [comentaris, setComentaris] = useState<BoloComentari[]>([]);
    const [loadingComentaris, setLoadingComentaris] = useState(false);
    const [newComentari, setNewComentari] = useState({ autor: '', text: '' });

    // Sections Expanded State
    const [isPhasesExpanded, setIsPhasesExpanded] = useState(true);
    const [isMusicsExpanded, setIsMusicsExpanded] = useState(true); // Matches component usage

    const [isEconomicsExpanded, setIsEconomicsExpanded] = useState(false);
    const [isClientExpanded, setIsClientExpanded] = useState(false);
    const [isCommentsExpanded, setIsCommentsExpanded] = useState(false);

    const [tasques, setTasques] = useState<BoloTasca[]>([]);
    const [loadingTasques, setLoadingTasques] = useState(false);

    useEffect(() => {
        if (params.id) {
            fetchBolo(params.id as string);
            fetchMusicsAndAttendance(params.id as string);
            fetchClients();
            fetchComentaris(params.id as string);
            fetchTasques(params.id as string);
            fetchAdvancePayments(params.id as string);
        }
    }, [params.id]);

    const [advancePayments, setAdvancePayments] = useState<AdvancePayment[]>([]);
    const [loadingAdvancePayments, setLoadingAdvancePayments] = useState(false);
    const [showAdvancePaymentModal, setShowAdvancePaymentModal] = useState(false);
    const [newAdvancePayment, setNewAdvancePayment] = useState<Partial<AdvancePayment>>({
        music_id: '',
        import: 0,
        data_pagament: new Date().toISOString().split('T')[0],
        notes: ''
    });

    const fetchAdvancePayments = async (boloId: string) => {
        setLoadingAdvancePayments(true);
        const { data, error } = await supabase
            .from('pagaments_anticipats')
            .select('*')
            .eq('bolo_id', Number(boloId))
            .order('data_pagament', { ascending: false });

        if (error) console.error('Error fetching advance payments:', error);
        else setAdvancePayments(data || []);
        setLoadingAdvancePayments(false);
    };

    const handleAddAdvancePayment = async () => {
        if (!bolo || !newAdvancePayment.music_id || !newAdvancePayment.import) return;
        setUpdating(true);
        try {
            const { error } = await supabase
                .from('pagaments_anticipats')
                .insert([{
                    bolo_id: bolo.id,
                    music_id: newAdvancePayment.music_id,
                    import: newAdvancePayment.import,
                    data_pagament: newAdvancePayment.data_pagament,
                    notes: newAdvancePayment.notes
                }]);

            if (error) throw error;
            setShowAdvancePaymentModal(false);
            setNewAdvancePayment({ music_id: '', import: 0, data_pagament: new Date().toISOString().split('T')[0], notes: '' });
            await fetchAdvancePayments(String(bolo.id));
            await fetchBolo(String(bolo.id), false);
        } catch (error) {
            console.error('Error adding advance payment:', error);
            showToastMessage('Error en afegir el pagament', 'error');
        } finally {
            setUpdating(false);
        }
    };

    const handleDeleteAdvancePayment = async (id: string) => {
        if (!bolo) return;
        if (!confirm('Segur que vols eliminar aquest pagament anticipat?')) return;
        setUpdating(true);
        try {
            const { error } = await supabase
                .from('pagaments_anticipats')
                .delete()
                .eq('id', id);

            if (error) throw error;
            await fetchAdvancePayments(String(bolo!.id));
            await fetchBolo(String(bolo!.id), false);
        } catch (error) {
            console.error('Error deleting advance payment:', error);
            showToastMessage('Error en eliminar el pagament', 'error');
        } finally {
            setUpdating(false);
        }
    };

    const showToastMessage = (message: string, type: 'success' | 'error') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ ...toast, show: false }), 3000);
    };

    const fetchBolo = async (id: string, showLoading = true) => {
        if (showLoading) setLoading(true);
        const { data, error } = await supabase
            .from('bolos')
            .select('*')
            .eq('id', Number(id))
            .single();

        if (error) {
            console.error('Error fetching bolo:', error);
        } else {
            setBolo(data);
            setEconomicData({
                import_total: data.import_total || 0,
                tipus_ingres: data.tipus_ingres || 'B',
                cobrat: data.cobrat,
                pagaments_musics_fets: data.pagaments_musics_fets || false || false,
                ajust_pot_manual: data.ajust_pot_manual || 0,
                comentari_ajust_pot: data.comentari_ajust_pot || '',
                preu_per_musica: data.preu_per_musica || 0
            });

            // If client_id exists, fetch client details
            if (data.client_id) {
                const { data: clientData } = await supabase
                    .from('clients')
                    .select('*')
                    .eq('id', data.client_id)
                    .single();

                if (clientData) setSelectedClient(clientData);
            }

        }

        // Fetch Next/Prev
        // Previous: DATE < Current OR (DATE = Current AND ID < Current) -> Order DESC
        const { data: prev } = await supabase
            .from('bolos')
            .select('id')
            .or(`data_bolo.lt.${data.data_bolo},and(data_bolo.eq.${data.data_bolo},id.lt.${data.id})`)
            .order('data_bolo', { ascending: false })
            .order('id', { ascending: false })
            .limit(1)
            .maybeSingle();

        // Next: DATE > Current OR (DATE = Current AND ID > Current) -> Order ASC
        const { data: next } = await supabase
            .from('bolos')
            .select('id')
            .or(`data_bolo.gt.${data.data_bolo},and(data_bolo.eq.${data.data_bolo},id.gt.${data.id})`)
            .order('data_bolo', { ascending: true })
            .order('id', { ascending: true })
            .limit(1)
            .maybeSingle();

        if (prev) setPrevBoloId(prev.id); else setPrevBoloId(null);
        if (next) setNextBoloId(next.id); else setNextBoloId(null);

        if (showLoading) setLoading(false);
    };

    const fetchClients = async () => {
        const { data } = await supabase.from('clients').select('*').order('nom');
        setClients(data || []);
    };

    const fetchComentaris = async (boloId: string, silent = false) => {
        if (!silent) setLoadingComentaris(true);
        const { data, error } = await supabase
            .from('bolo_comentaris')
            .select('*')
            .eq('bolo_id', Number(boloId))
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching comments:', error);
        } else {
            setComentaris(data || []);
        }
        setLoadingComentaris(false);
    };

    const handleAddComentari = async () => {
        if (!newComentari.text.trim() || !bolo) return;

        try {
            const { error } = await supabase
                .from('bolo_comentaris')
                .insert([{
                    bolo_id: bolo.id,
                    autor: newComentari.autor || 'Anònim',
                    text: newComentari.text
                }]);

            if (error) throw error;

            showToastMessage('Comentari afegit correctament', 'success');
            setNewComentari({ autor: '', text: '' });
            fetchComentaris(String(bolo.id), true);
        } catch (error) {
            console.error('Error adding comment:', error);
            showToastMessage('Error en afegir el comentari', 'error');
        }
    };

    const fetchTasques = async (boloId: string, silent = false) => {
        if (!silent) setLoadingTasques(true);
        try {
            const { data, error } = await supabase
                .from('bolo_tasques')
                .select('*')
                .eq('bolo_id', boloId)
                .order('ordre', { ascending: true });

            if (error) throw error;
            setTasques(data || []);
        } catch (error) {
            console.error('Error fetching tasques:', error);
        } finally {
            setLoadingTasques(false);
        }
    };

    const fetchMusicsAndAttendance = async (boloId: string, silent = false) => {
        if (!silent) setLoadingMusics(true);
        // Fetch all musicians
        const { data: musicsData, error: musicsError } = await supabase
            .from('musics')
            .select('*')
            .order('nom');

        if (musicsError) console.error('Error fetching musics:', musicsError);
        else setMusics(musicsData || []);

        // Fetch existing attendance
        const { data: attendanceData, error: attendanceError } = await supabase
            .from('bolo_musics')
            .select('*')
            .eq('bolo_id', boloId);

        if (attendanceError) console.error('Error fetching attendance:', attendanceError);
        else setBoloMusics(attendanceData || []);

        setLoadingMusics(false);
    };

    const handleAddMusicians = async (musicIds: string[], type: 'titular' | 'substitut') => {
        if (!bolo) return;
        setUpdating(true);
        try {
            const rows = musicIds.map(mid => ({
                bolo_id: Number(bolo.id),
                music_id: mid,
                tipus: type,
                estat: 'confirmat',
                import_assignat: 0
            }));

            const { error } = await supabase
                .from('bolo_musics')
                .insert(rows);

            if (error) throw error;

            showToastMessage(`${musicIds.length} músics afegits correctament`, 'success');
            await fetchMusicsAndAttendance(String(bolo.id), true);
            await fetchBolo(String(bolo.id), false); // Update economics silently
        } catch (error) {
            console.error('Error adding musicians:', error);
            showToastMessage('Error en afegir els músics', 'error');
        } finally {
            setUpdating(false);
        }
    };

    const handleUpdateMusicianStatus = async (musicId: string, status: string) => {
        if (!bolo) return;

        // Optimistic Update
        setBoloMusics(prev => prev.map(bm => bm.music_id === musicId ? { ...bm, estat: status as any } : bm));

        try {
            const { error } = await supabase
                .from('bolo_musics')
                .update({ estat: status })
                .eq('bolo_id', bolo.id)
                .eq('music_id', musicId);

            if (error) throw error;

            await fetchBolo(String(bolo.id), false); // Update economics silently
        } catch (error) {
            console.error('Error updating status:', error);
            showToastMessage('Error en actualitzar estat', 'error');
            await fetchMusicsAndAttendance(String(bolo.id), true); // Revert silently
        }
    };

    const handleUpdateMusicianComment = async (musicId: string, comment: string) => {
        if (!bolo) return;

        setBoloMusics(prev => prev.map(bm => bm.music_id === musicId ? { ...bm, comentari: comment } : bm));

        try {
            const { error } = await supabase
                .from('bolo_musics')
                .update({ comentari: comment })
                .eq('bolo_id', bolo.id)
                .eq('music_id', musicId);

            if (error) throw error;
        } catch (error) {
            console.error('Error updating comment:', error);
            showToastMessage('Error en desar el comentari', 'error');
        }
    };

    const handleUpdateMusicianPrice = async (musicId: string, price: number | null) => {
        if (!bolo) return;

        setBoloMusics(prev => prev.map(bm => bm.music_id === musicId ? { ...bm, preu_personalitzat: price } : bm));

        try {
            const { error } = await supabase
                .from('bolo_musics')
                .update({ preu_personalitzat: price })
                .eq('bolo_id', bolo.id)
                .eq('music_id', musicId);

            if (error) throw error;
            await fetchBolo(String(bolo.id), false);
        } catch (error) {
            console.error('Error updating price:', error);
            showToastMessage('Error en actualitzar el preu', 'error');
            await fetchMusicsAndAttendance(String(bolo.id), true);
        }
    };

    const handleRemoveMusician = async (attendanceId: string, musicId: string) => {
        if (!bolo) return;
        if (!confirm('Segur que vols eliminar aquest músic del bolo?')) return;

        // Optimistic
        setBoloMusics(prev => prev.filter(bm => bm.music_id !== musicId));

        try {
            const { error } = await supabase
                .from('bolo_musics')
                .delete()
                .eq('id', attendanceId);

            if (error) throw error;

            showToastMessage('Músic eliminat', 'success');
            await fetchBolo(String(bolo.id), false); // Update economics silently
        } catch (error) {
            console.error('Error removing musician:', error);
            showToastMessage('Error al eliminar', 'error');
            await fetchMusicsAndAttendance(String(bolo.id), true); // Revert silently
        }
    };

    const handleSaveEconomicData = async () => {
        if (!bolo) return;
        setUpdating(true);

        try {
            const { error } = await supabase
                .from('bolos')
                .update({
                    import_total: economicData.import_total,
                    tipus_ingres: economicData.tipus_ingres,
                    cobrat: economicData.cobrat,
                    pagaments_musics_fets: (economicData as any).pagaments_musics_fets,
                    ajust_pot_manual: economicData.ajust_pot_manual,
                    comentari_ajust_pot: economicData.comentari_ajust_pot,
                    preu_per_musica: economicData.preu_per_musica
                })
                .eq('id', bolo.id);

            if (error) throw error;

            // Refetch to get triggered calculations from DB
            await fetchBolo(String(bolo.id), false);

            showToastMessage('Dades econòmiques actualitzades', 'success');
            router.refresh();
        } catch (error) {
            console.error('Error updating economic data:', error);
            showToastMessage('No s’han pogut actualitzar les dades', 'error');
        } finally {
            setUpdating(false);
        }
    };

    const handleChecklistChange = async (field: keyof Bolo, value: boolean) => {
        if (!bolo) return;

        // Optimistic update
        const updatedBolo = { ...bolo, [field]: value };
        setBolo(updatedBolo);

        // If it's 'cobrat', also update economicData
        if (field === 'cobrat') {
            setEconomicData(prev => ({ ...prev, cobrat: value }));
        }

        try {
            const { error } = await supabase
                .from('bolos')
                .update({ [field]: value })
                .eq('id', bolo.id);

            if (error) throw error;
        } catch (error) {
            console.error(`Error updating ${field}:`, error);
            showToastMessage("Error al desar la tasca", 'error');
            // Revert on error
            setBolo(bolo);
        }
    };



    const handleSolicitarConvocatoria = async () => {
        if (!bolo) return;

        const webhookUrl = process.env.NEXT_PUBLIC_N8N_CONVOCATORIA_WEBHOOK_URL;

        if (!webhookUrl) {
            console.warn("Webhook URL not configured.");
            showToastMessage("URL de convocatòria no configurada.", 'error');
            return;
        }

        setUpdating(true);
        try {
            const localHora = (bolo.hora_inici || bolo.hora || '').substring(0, 5);
            const payload = {
                id: bolo.id,
                nom_poble: bolo.nom_poble,
                data_bolo: bolo.data_bolo,
                hora: localHora,
                concepte: bolo.concepte,
                ubicacio: bolo.ubicacio_detallada,
                num_musics: bolo.num_musics,
                sou_individual: bolo.preu_per_musica,
                vestimenta: bolo.vestimenta,
                partitures: bolo.partitures,
                ubicacio_inici: bolo.ubicacio_inici,
                notes_fundes: bolo.notes_fundes
            };

            const response = await fetch('/api/n8n', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: webhookUrl, payload })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Webhook call failed');
            }

            showToastMessage("S'ha sol·licitat la convocatòria als músics.", 'success');

            if (!bolo.convocatoria_enviada) {
                handleChecklistChange('convocatoria_enviada', true);
            }

        } catch (error: any) {
            console.error('Error requesting convocatoria:', error);
            showToastMessage(error.message || "Error en sol·licitar la convocatòria.", 'error');
        } finally {
            setUpdating(false);
        }
    };

    const handleOpenPreview = async (type: 'pressupost' | 'factura') => {
        if (!bolo || !selectedClient) {
            showToastMessage("Falten dades del bolo o client.", 'error');
            return;
        }

        setUpdating(true);
        try {
            let instrumentsCount = undefined;
            const instrData = await getInstrumentsData(bolo.id);
            instrumentsCount = instrData.counts;

            const initialText = generateDescriptionText(type, bolo, selectedClient, instrumentsCount);
            setDescriptionText(initialText);
            setPreviewType(type);

            // Fetch next number
            const currentYear = new Date().getFullYear().toString().slice(-2);
            const { data: config } = await supabase.from('app_config').select('value').eq('key', 'invoice_counter').single();
            let nextNum = 1;
            if (config?.value) {
                const val = config.value as { last_number: number; year: number };
                if (val.year === parseInt(currentYear)) {
                    nextNum = val.last_number + 1;
                }
            }
            setManualNumber(`${currentYear}/${nextNum.toString().padStart(3, '0')}`);

            // Initialize articles
            setArticles([{ descripcio: 'Actuació', preu: bolo.import_total || 0, quantitat: 1 }]);

            setShowPreview(true);
        } catch (error: any) {
            showToastMessage("Error al carregar la previsualització.", 'error');
        } finally {
            setUpdating(false);
        }
    };

    const handleGeneratePDF = async () => {
        if (!bolo || !selectedClient || !previewType) return;
        setPdfGenerating(true);
        try {
            const { generateClientPDF } = await import('@/utils/pdf-client-generator');

            const payload = {
                type: previewType,
                number: manualNumber,
                date: format(new Date(), 'dd/MM/yyyy'),
                dueDate: previewType === 'factura' ? format(new Date(new Date().setMonth(new Date().getMonth() + 3)), 'dd/MM/yyyy') : undefined,
                client: {
                    nom: selectedClient.nom,
                    nif: selectedClient.nif,
                    adreca: selectedClient.adreca,
                    poblacio: selectedClient.poblacio,
                    codi_postal: selectedClient.codi_postal
                },
                bolo: {
                    nom_poble: bolo.nom_poble,
                    concepte: bolo.concepte,
                    durada: bolo.durada,
                    data: bolo.data_bolo,
                    hora: bolo.hora_inici,
                    nombre_musics: bolo.num_musics
                },
                articles,
                total: articles.reduce((acc: number, art: any) => acc + (art.preu * art.quantitat), 0),
                descriptionText: descriptionText
            };

            // 1. Generar instantàniament al client
            const doc = await generateClientPDF(payload);
            const fileName = `${previewType}_${manualNumber.replace('/', '-')}.pdf`;
            doc.save(fileName);
            // 2. Registrar a la DB directament (Client-side)
            const today = new Date();
            console.log("PROCESSANT REGISTRE A DB...", { manualNumber, client: selectedClient.id, bolo: bolo.id });

            // Defineix el tipus de document (factura per defecte, pressupost si previewType ho diu)
            const docType = previewType === 'pressupost' ? 'pressupost' : 'factura';
            const dueDate = previewType === 'factura'
                ? addMonths(today, 3)
                : addMonths(today, 1); // Pressupost validesa 1 mes

            // Prepara el payload unificat (ora tot a invoice_records)
            const insertPayload = {
                invoice_number: manualNumber,
                client_name: selectedClient.nom,
                client_id: selectedClient.id,
                bolo_id: Number(bolo.id),
                creation_date: format(today, 'yyyy-MM-dd'),
                due_date: format(dueDate, 'yyyy-MM-dd'),
                total_amount: payload.total,
                paid: false,
                articles: articles,
                notes: descriptionText,
                type: docType, // NOU CAMP IMPORTANT
                status: 'sent'
            };

            // Insereix a la taula unificada
            const { error: insertError } = await supabase
                .from('invoice_records')
                .insert(insertPayload);

            if (insertError) {
                console.error("ERROR DB INSERT:", insertError);
                // Si l'error es duplicate key, avisem que ja existeix
                if (insertError.code === '23505') {
                    showToastMessage(`El document ${manualNumber} ja existeix registrat.`, 'success');
                } else {
                    alert(`ERROR CRÍTIC GUARDANT EL REGISTRE:\n${insertError.message}\n\nEl PDF s'ha descarregat, però NO està a la base de dades.`);
                    throw new Error(`Error BD: ${insertError.message}`);
                }
            } else {
                console.log("Document guardat correctament a DB:", insertPayload);
                showToastMessage(`${docType === 'factura' ? 'Factura' : 'Pressupost'} registrat correctament!`, 'success');
            }

            // B. Actualitzar comptador (només per Factures, per ara)
            if (docType === 'factura') {
                try {
                    const [yearStr, numStr] = manualNumber.split('/');
                    const num = parseInt(numStr);
                    const currentYearTwoDigits = parseInt(today.getFullYear().toString().slice(-2));

                    if (parseInt(yearStr) === currentYearTwoDigits) {
                        const { data: config } = await supabase.from('app_config').select('value').eq('key', 'invoice_counter').single();
                        const currentMax = (config?.value as any)?.last_number || 0;

                        if (num >= currentMax) {
                            const { error: counterError } = await supabase.from('app_config').upsert({
                                key: 'invoice_counter',
                                value: { last_number: num, year: currentYearTwoDigits }
                            });
                            if (counterError) console.error("Error actualitzant comptador:", counterError);
                        }
                    }
                } catch (e) {
                    console.error("Error actualitzant comptador (ignorable):", e);
                }
            }

            showToastMessage("Document generat correctament!", 'success');

            // Actualitzar checklist
            if (previewType === 'pressupost' && !bolo.pressupost_enviat) {
                handleChecklistChange('pressupost_enviat', true);
            } else if (previewType === 'factura' && !bolo.factura_enviada) {
                handleChecklistChange('factura_enviada', true);
            }

            setShowPreview(false);
        } catch (error: any) {
            showToastMessage(error.message || "Error en generar el PDF.", 'error');
        } finally {
            setPdfGenerating(false);
        }
    };

    const getInstrumentsData = async (boloId: number) => {
        const { data, error } = await supabase
            .from('bolo_musics')
            .select('musics(instruments)')
            .eq('bolo_id', boloId)
            .neq('estat', 'no')
            .neq('estat', 'baixa');

        if (error || !data) return { total: 0, counts: {} as Record<string, number> };

        const counts: Record<string, number> = {};
        data.forEach((row: any) => {
            if (row.musics && row.musics.instruments) {
                const instr = row.musics.instruments.toLowerCase();
                counts[instr] = (counts[instr] || 0) + 1;
            }
        });
        return { total: data.length, counts };
    };


    const handleUpdateTitle = async () => {
        if (!bolo || !tempMunicipi?.municipi_text || !tempDate) return;
        setUpdating(true);
        try {
            // 1. Resoldre el municipi si és necessari
            let finalMunicipi = tempMunicipi;
            if (tempMunicipi && !tempMunicipi.municipi_id && !tempMunicipi.municipi_custom_id) {
                const res = await fetch('/api/municipis/resolve', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ value: tempMunicipi.municipi_text })
                });
                if (res.ok) {
                    finalMunicipi = await res.json();
                }
            }

            const { error } = await supabase
                .from('bolos')
                .update({
                    nom_poble: (finalMunicipi?.municipi_text || tempTitle).trim(),
                    data_bolo: tempDate,
                    municipi_id: finalMunicipi?.municipi_id || null,
                    municipi_custom_id: finalMunicipi?.municipi_custom_id || null,
                    municipi_text: finalMunicipi?.municipi_text || null
                })
                .eq('id', bolo.id);

            if (error) throw error;

            setBolo({
                ...bolo,
                nom_poble: (finalMunicipi?.municipi_text || tempTitle).trim(),
                data_bolo: tempDate,
                municipi_id: finalMunicipi?.municipi_id || null,
                municipi_custom_id: finalMunicipi?.municipi_custom_id || null,
                municipi_text: finalMunicipi?.municipi_text || null
            });
            setIsEditingTitle(false);
            showToastMessage('Dades principals actualitzades', 'success');
            triggerGoogleSync();
        } catch (error) {
            console.error('Error updating main data:', error);
            showToastMessage('Error en actualitzar', 'error');
        } finally {
            setUpdating(false);
        }
    };

    const handleClientChange = async (clientId: string) => {
        if (!bolo) return;

        try {
            const { error } = await supabase
                .from('bolos')
                .update({ client_id: clientId || null })
                .eq('id', bolo.id);

            if (error) throw error;

            setBolo({ ...bolo, client_id: clientId || null });

            if (clientId) {
                const client = clients.find(c => c.id === clientId);
                setSelectedClient(client || null);
            } else {
                setSelectedClient(null);
            }

            showToastMessage('Client assignat correctament', 'success');
            triggerGoogleSync();
        } catch (error) {
            console.error('Error updating client:', error);
            showToastMessage("Error en assignar el client", 'error');
        }
    };

    const handleCreateClient = async () => {
        if (!newClientData.nom) {
            alert('El nom del client és obligatori');
            return;
        }

        try {
            const { data, error } = await supabase
                .from('clients')
                .insert([newClientData])
                .select()
                .single();

            if (error) throw error;

            // Add to local list
            setClients(prev => [...prev, data]);

            // Assign to bolo
            await handleClientChange(data.id);

            // Close modal and reset
            setNewClientModalOpen(false);
            setNewClientData({
                nom: '',
                telefon: '',
                correu: '',
                nif: '',
                adreca: '',
                observacions: ''
            });

            showToastMessage('Client creat i assignat correctament', 'success');

        } catch (error) {
            console.error('Error creating client:', error);
            showToastMessage("Error en crear el client", 'error');
        }
    };

    const [localHora, setLocalHora] = useState<string>('');

    useEffect(() => {
        setLocalHora(bolo?.hora_inici || '');
    }, [bolo?.hora_inici]);

    const handleDataBoloChange = async (newVal: string) => {
        if (!bolo) return;
        try {
            const { error } = await supabase
                .from('bolos')
                .update({ data_bolo: newVal })
                .eq('id', bolo.id);

            if (error) throw error;
            setBolo({ ...bolo, data_bolo: newVal });
            showToastMessage('Data actualitzada', 'success');
            triggerGoogleSync();
        } catch (error) {
            console.error('Error updating data:', error);
            showToastMessage('Error en actualitzar la data', 'error');
        }
    };

    const handleUpdateHora = async (newHora: string) => {
        if (!bolo) return;

        // Don't update if value hasn't changed
        if (newHora === bolo.hora_inici) return;

        try {
            const { error } = await supabase
                .from('bolos')
                .update({ hora_inici: newHora || null })
                .eq('id', bolo.id);

            if (error) {
                // Check specifically for missing column error
                if (error.code === '42703') {
                    alert('ERROR CRÍTIC: La columna "hora_inici" no existeix a la base de dades.\n\nSi us plau, executa aquest SQL al teu Panell de Supabase:\n\nALTER TABLE bolos ADD COLUMN hora_inici time;');
                }
                throw error;
            }

            setBolo({ ...bolo, hora_inici: newHora || null });
            showToastMessage('Hora actualitzada', 'success');
            triggerGoogleSync();
        } catch (error) {
            console.error('Error updating hora:', error);
            showToastMessage('Error en actualitzar l\'hora', 'error');
        }
    };

    // Fix: Removed extra braces/semicolons that were causing build errors


    const handlePobleChange = async (newVal: string) => {
        if (!bolo) return;
        try {
            const { error } = await supabase
                .from('bolos')
                .update({ nom_poble: newVal })
                .eq('id', bolo.id);

            if (error) throw error;
            setBolo({ ...bolo, nom_poble: newVal });
            showToastMessage('Població actualitzada', 'success');
            triggerGoogleSync();
        } catch (error) {
            console.error('Error updating poble:', error);
            showToastMessage('Error en actualitzar la població', 'error');
        }
    };

    const handleTipusActuacioChange = async (newVal: string) => {
        if (!bolo) return;
        try {
            const { error } = await supabase
                .from('bolos')
                .update({ tipus_actuacio: newVal || null })
                .eq('id', bolo.id);

            if (error) throw error;
            setBolo({ ...bolo, tipus_actuacio: newVal });
            showToastMessage('Tipus d\'actuació actualitzat', 'success');
            triggerGoogleSync();
        } catch (error) {
            console.error('Error updating tipus actuacio:', error);
            showToastMessage('Error en actualitzar el tipus', 'error');
        }
    };

    const handleConcepteChange = async (newVal: string) => {
        if (!bolo) return;
        try {
            const { error } = await supabase
                .from('bolos')
                .update({ concepte: newVal || null })
                .eq('id', bolo.id);

            if (error) throw error;
            setBolo({ ...bolo, concepte: newVal });
            showToastMessage('Concepte actualitzat', 'success');
            triggerGoogleSync();
        } catch (error) {
            console.error('Error updating concepte:', error);
            showToastMessage('Error en actualitzar el concepte', 'error');
        }
    };

    const handleDuradaChange = async (newVal: number) => {
        if (!bolo) return;
        try {
            const { error } = await supabase
                .from('bolos')
                .update({ durada: newVal || null })
                .eq('id', bolo.id);

            if (error) throw error;
            setBolo({ ...bolo, durada: newVal });
            showToastMessage('Durada actualitzada', 'success');
            triggerGoogleSync();
        } catch (error) {
            console.error('Error updating durada:', error);
            showToastMessage('Error en actualitzar la durada', 'error');
        }
    };

    const handleAutomationFieldChange = async (field: keyof Bolo, value: any) => {
        if (!bolo) return;
        try {
            const { error } = await supabase
                .from('bolos')
                .update({ [field]: value })
                .eq('id', bolo.id);

            if (error) throw error;
            setBolo({ ...bolo, [field]: value });
            showToastMessage('Camp actualitzat', 'success');

            // Sync if it's one of the fields in the calendar description
            const calendarFields: (keyof Bolo)[] = ['ubicacio_inici', 'vestimenta', 'partitures', 'notes_fundes', 'notes', 'ubicacio_detallada'];
            if (calendarFields.includes(field)) {
                triggerGoogleSync();
            }
        } catch (error) {
            console.error(`Error updating ${field}:`, error);
            showToastMessage('Error en actualitzar el camp', 'error');
        }
    };

    const handleStatusTransition = async (direction: 'next' | 'prev') => {
        if (!bolo) return;
        let currentIndex = BOLO_STATES.indexOf(bolo.estat as BoloStatus);

        // Fallback for legacy states
        if (currentIndex === -1) {
            if ((bolo.estat as string) === 'Sol·licitat') currentIndex = 0;
            else if ((bolo.estat as string) === 'Confirmat') currentIndex = 2;
            else if ((bolo.estat as string) === 'Tancat') currentIndex = 5;
        }

        let nextIndex = currentIndex;
        if (direction === 'next' && currentIndex < BOLO_STATES.length - 1) {
            nextIndex++;
        } else if (direction === 'prev' && currentIndex > 0) {
            nextIndex--;
        }

        if (nextIndex === currentIndex || nextIndex === -1) return;

        const newStatus = BOLO_STATES[nextIndex];

        // Confirmation if going back from deep states
        if (direction === 'prev' && currentIndex >= 2) { // From Confirmada onwards
            if (!window.confirm(`Segur que vols tornar el bolo a l'estat anterior ("${newStatus}")?`)) {
                return;
            }
        }

        setUpdating(true);
        try {
            const { error } = await supabase
                .from('bolos')
                .update({ estat: newStatus })
                .eq('id', bolo.id);

            if (error) throw error;
            setBolo({ ...bolo, estat: newStatus });
            showToastMessage(`Estat actualitzat a ${newStatus}`, 'success');

            if (newStatus === 'Confirmada' || bolo.estat === 'Confirmada') {
                fetch(`/api/bolos/${bolo.id}/sync`, { method: 'POST' }).catch(console.error);
            }
        } catch (error) {
            console.error('Error updating status:', error);
            showToastMessage("Error al canviar l'estat", 'error');
        } finally {
            setUpdating(false);
        }
    };

    const updateStatus = async (newStatus: string) => {
        if (!bolo) return;
        setUpdating(true);
        try {
            const { error } = await supabase
                .from('bolos')
                .update({ estat: newStatus })
                .eq('id', bolo.id);

            if (error) throw error;
            setBolo({ ...bolo, estat: newStatus as BoloStatus });
            showToastMessage(`Estat actualitzat a ${newStatus}`, 'success');
            if (newStatus === 'Confirmada' || bolo.estat === 'Confirmada') {
                fetch(`/api/bolos/${bolo.id}/sync`, { method: 'POST' }).catch(console.error);
            }
        } catch (error) {
            console.error('Error updating status:', error);
            showToastMessage("Error al canviar l'estat", 'error');
        } finally {
            setUpdating(false);
        }
    };
    const handleRejection = async () => {
        if (!bolo) return;

        if (!window.confirm("Segur que vols marcar aquest bolo com rebutjat / cancel·lat? Aquesta acció no es pot desfer fàcilment.")) {
            return;
        }

        setUpdating(true);
        try {
            // TODO: Trigger n8n webhook for rejection
            const updates = {
                estat: 'Cancel·lats' as BoloStatus, // Standardized plural
                estat_rebuig: 'rebutjat',
                motiu_rebuig: rejectionData.motiu,
                origen_rebuig: rejectionData.origen,
                data_rebuig: new Date().toISOString()
            };

            const { error } = await supabase
                .from('bolos')
                .update(updates)
                .eq('id', bolo.id);

            if (error) throw error;

            setBolo({ ...bolo, ...updates });
            setShowRejectionModal(false);
            showToastMessage("Bolo marcat com a cancel·lat", "success");
            triggerGoogleSync();
            router.refresh();
        } catch (error) {
            console.error('Error rejecting bolo:', error);
            showToastMessage("Error al rebutjar el bolo.", 'error');
        } finally {
            setUpdating(false);
        }
    };

    const handleRecover = async () => {
        if (!bolo) return;

        if (!window.confirm("Vols recuperar aquest bolo? Tornarà a l'estat 'Pendent de confirmació'.")) {
            return;
        }

        setUpdating(true);
        try {
            const updates = {
                estat: 'Pendent de confirmació' as BoloStatus,
                estat_rebuig: null,
                motiu_rebuig: null,
                origen_rebuig: null,
                data_rebuig: null
            };

            const { error } = await supabase
                .from('bolos')
                .update(updates)
                .eq('id', bolo.id);

            if (error) throw error;

            setBolo({ ...bolo, ...updates });
            showToastMessage("Bolo recuperat correctament", "success");
            triggerGoogleSync();
            router.refresh();
        } catch (error) {
            console.error('Error recovering bolo:', error);
            showToastMessage("Error al recuperar el bolo.", 'error');
        } finally {
            setUpdating(false);
        }
    };



    if (loading && !bolo) return <div className="p-8 text-center text-gray-500 dark:text-text-secondary-dark">Carregant...</div>;
    if (!bolo) return <div className="p-8 text-center text-gray-500 dark:text-text-secondary-dark">No s'ha trobat el bolo.</div>;

    const isRebutjat = bolo.estat_rebuig === 'rebutjat' || (bolo.estat as string) === 'Cancel·lats' || (bolo.estat as string) === 'Cancel·lat';

    return (
        <div className="p-2 sm:p-6 max-w-6xl mx-auto space-y-4 sm:space-y-6 relative">
            {/* Toast */}
            {toast.show && (
                <div className={`fixed top-4 right-4 px-4 py-2 rounded-lg shadow-lg text-white z-[110] ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                    {toast.message}
                </div>
            )}

            {/* Rejection Modal */}
            {showRejectionModal && (
                <div className="fixed inset-0 bg-black/50 flex items-start sm:items-center justify-center z-50 p-2 sm:p-4 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-white dark:bg-card-dark p-6 rounded-xl max-w-md w-full shadow-xl border border-gray-200 dark:border-border-dark my-auto max-h-[90vh] overflow-y-auto">
                        <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-text-primary-dark">Rebutjar / Cancel·lar Bolo</h3>
                        <p className="mb-4 text-sm text-gray-500 dark:text-text-secondary-dark">
                            Aquesta acció aturarà el flux de treball del bolo.
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-500 dark:text-text-secondary-dark">Motiu</label>
                                <textarea
                                    className="w-full p-2 rounded border border-gray-200 dark:border-border-dark bg-gray-50 dark:bg-background-dark text-gray-900 dark:text-text-primary-dark"
                                    rows={3}
                                    value={rejectionData.motiu}
                                    onChange={e => setRejectionData({ ...rejectionData, motiu: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-500 dark:text-text-secondary-dark">Qui ha pres la decisió?</label>
                                <select
                                    className="w-full p-2 rounded border border-gray-200 dark:border-border-dark bg-gray-50 dark:bg-background-dark text-gray-900 dark:text-text-primary-dark"
                                    value={rejectionData.origen}
                                    onChange={e => setRejectionData({ ...rejectionData, origen: e.target.value })}
                                >
                                    <option value="client">Client</option>
                                    <option value="xaranga">Xaranga</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setShowRejectionModal(false)}
                                className="px-4 py-2 rounded text-gray-500 dark:text-text-secondary-dark hover:bg-gray-100 dark:hover:bg-gray-800"
                            >
                                Cancel·lar
                            </button>
                            <button
                                onClick={handleRejection}
                                className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 font-bold"
                            >
                                Continuar amb el rebuig
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-2 sm:space-x-4 w-full sm:w-auto">
                    <Link href="/bolos" className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                        <span className="material-icons-outlined text-gray-500 dark:text-text-secondary-dark">arrow_back</span>
                    </Link>

                    {/* Navigation Arrows */}
                    <div className="flex items-center space-x-1">
                        <button
                            onClick={() => prevBoloId && router.push(`/bolos/${prevBoloId}`)}
                            disabled={!prevBoloId}
                            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            title="Bolo anterior"
                        >
                            <span className="material-icons-outlined text-gray-500 dark:text-text-secondary-dark">chevron_left</span>
                        </button>
                        <button
                            onClick={() => nextBoloId && router.push(`/bolos/${nextBoloId}`)}
                            disabled={!nextBoloId}
                            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            title="Bolo següent"
                        >
                            <span className="material-icons-outlined text-gray-500 dark:text-text-secondary-dark">chevron_right</span>
                        </button>
                    </div>
                    <div className="flex-1 min-w-0">
                        {isEditingTitle ? (
                            <div className="flex flex-col sm:flex-row items-center gap-2 w-full">
                                <div className="flex-1 w-full">
                                    <MunicipiSelector
                                        value={tempMunicipi}
                                        onChange={setTempMunicipi}
                                        placeholder="Poble"
                                    />
                                </div>
                                <input
                                    type="date"
                                    value={tempDate}
                                    onChange={(e) => setTempDate(e.target.value)}
                                    className="w-full sm:w-auto p-1.5 rounded border border-primary bg-white dark:bg-card-dark text-gray-900 dark:text-text-primary-dark focus:outline-none"
                                />
                                <div className="flex gap-1 shrink-0 w-full sm:w-auto justify-end">
                                    <button onClick={handleUpdateTitle} className="p-2 rounded bg-green-100 text-green-700 hover:bg-green-200">
                                        <span className="material-icons-outlined text-xl">check</span>
                                    </button>
                                    <button onClick={() => setIsEditingTitle(false)} className="p-2 rounded bg-red-100 text-red-700 hover:bg-red-200">
                                        <span className="material-icons-outlined text-xl">close</span>
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-text-primary-dark flex items-center gap-2 group truncate">
                                <span className="truncate">{bolo.nom_poble}</span>
                                {!isRebutjat && (bolo.estat as string) !== 'Tancat' && (
                                    <button
                                        onClick={() => {
                                            setTempTitle(bolo.nom_poble);
                                            setTempDate(bolo.data_bolo);
                                            setTempMunicipi({
                                                municipi_id: bolo.municipi_id || null,
                                                municipi_custom_id: bolo.municipi_custom_id || null,
                                                municipi_text: bolo.municipi_text || bolo.nom_poble
                                            });
                                            setIsEditingTitle(true);
                                        }}
                                        className="opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-text-secondary-dark"
                                        title="Editar nom i data"
                                    >
                                        <span className="material-icons-outlined text-lg">edit</span>
                                    </button>
                                )}
                            </h1>
                        )}
                    </div>
                </div>

                {/* State Control Pipeline */}
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <button
                        onClick={() => handleStatusTransition('prev')}
                        disabled={updating || BOLO_STATES.indexOf(bolo.estat as BoloStatus) <= 0 || isRebutjat}
                        className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        title="Estat anterior"
                    >
                        <span className="material-icons-outlined text-lg">west</span>
                    </button>

                    <div className={`px-4 py-2 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider shadow-sm flex items-center gap-2 transition-all duration-300 ${isRebutjat ? 'bg-red-600 text-white' :
                        bolo.estat === 'Nova' ? 'bg-red-600 text-white' :
                            bolo.estat === 'Pendent de confirmació' ? 'bg-orange-500 text-white' :
                                bolo.estat === 'Confirmada' ? 'bg-emerald-600 text-white' :
                                    bolo.estat === 'Pendents de cobrar' ? 'bg-yellow-400 text-gray-900' :
                                        bolo.estat === 'Per pagar' ? 'bg-lime-500 text-gray-900' :
                                            bolo.estat === 'Tancades' ? 'bg-red-900 text-white' :
                                                'bg-gray-400 text-white'
                        }`}>
                        {isRebutjat ? 'Cancel·lada' : (bolo.estat === 'Confirmada' ? 'En curs' : bolo.estat)}
                        {updating && <div className="animate-spin h-3 w-3 border-2 border-white/30 border-t-white rounded-full"></div>}
                    </div>

                    <button
                        onClick={() => handleStatusTransition('next')}
                        disabled={updating || BOLO_STATES.indexOf(bolo.estat as BoloStatus) >= BOLO_STATES.length - 1 || isRebutjat}
                        className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary text-primary hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        title="Següent estat"
                    >
                        <span className="material-icons-outlined text-lg">east</span>
                    </button>
                </div>
            </div>

            {/* Actions for Status Rejection */}
            {!isRebutjat && (bolo.estat as string) !== 'Tancat' && (
                <div className="flex justify-end">
                    <button
                        onClick={() => setShowRejectionModal(true)}
                        className="text-red-500 hover:text-red-700 text-xs font-bold flex items-center bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                    >
                        <span className="material-icons-outlined text-sm mr-1">block</span>
                        CANCEL·LAR BOLO
                    </button>
                </div>
            )}

            {/* Rejection Info Panel */}
            {isRebutjat && (
                <div className="bg-red-600 border-2 border-red-800 rounded-xl p-4 sm:p-5 shadow-lg">
                    <h3 className="text-white font-black flex items-center mb-3 text-base sm:text-lg">
                        <span className="material-icons-outlined mr-2 text-2xl">error_outline</span>
                        BOLO REBUTJAT / CANCEL·LAT
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm bg-white/10 p-4 rounded-lg border border-white/20">
                        <div className="sm:col-span-2">
                            <span className="font-bold text-red-100 uppercase text-[10px] tracking-widest block mb-1">Motiu / Qui:</span>
                            <p className="text-white font-medium text-base">
                                <span className="capitalize opacity-80 mr-2">[{bolo.origen_rebuig || '-'}]</span>
                                {bolo.motiu_rebuig || 'No s\'ha especificat cap motiu'}
                            </p>
                        </div>
                        <div className="flex flex-row sm:flex-col justify-between items-end sm:items-end gap-2">
                            <div className="text-right">
                                <span className="font-bold text-red-100 uppercase text-[10px] tracking-widest block mb-1">Data:</span>
                                <p className="text-white font-medium text-sm">
                                    {bolo.data_rebuig ? format(new Date(bolo.data_rebuig), 'dd/MM/yyyy') : '-'}
                                </p>
                            </div>
                            <button
                                onClick={handleRecover}
                                disabled={updating}
                                className="bg-white text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg font-black text-xs shadow-md transition-all flex items-center gap-1 active:scale-95 disabled:opacity-50"
                            >
                                <span className="material-icons-outlined text-sm">restore</span>
                                RECUPERAR
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Details Card */}
            <div className="bg-gradient-to-br from-white to-gray-50 dark:from-[#8B1538] dark:to-[#5D0E26] rounded-xl border border-gray-200 dark:border-[#A01D47] p-4 sm:p-6 shadow-md relative overflow-hidden text-gray-900 dark:text-white">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                    <span className="material-icons-outlined text-8xl text-current">event</span>
                </div>

                <div className="relative z-10 flex flex-col gap-6">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                        <div className="flex flex-col sm:flex-row items-baseline gap-2 sm:gap-4 w-full lg:w-auto">
                            <h2 className="text-2xl sm:text-4xl font-black text-gray-900 dark:text-white tracking-tight leading-none uppercase">
                                {format(new Date(bolo.data_bolo), 'dd MMMM', { locale: ca })} <span className="text-lg sm:text-2xl font-normal opacity-60 ml-1">{new Date(bolo.data_bolo).getFullYear()}</span>
                            </h2>

                            <div className="flex items-center bg-gray-100 dark:bg-[#A01D47] rounded-lg px-3 py-1.5 border border-transparent hover:border-gray-300 dark:hover:border-[#C02555] transition-colors w-full sm:w-auto">
                                <span className="material-icons-outlined text-gray-500 dark:text-white text-lg mr-2">schedule</span>
                                <input
                                    type="time"
                                    value={localHora}
                                    onChange={(e) => setLocalHora(e.target.value)}
                                    onBlur={(e) => handleUpdateHora(e.target.value)}
                                    className="bg-transparent border-none focus:ring-0 text-lg font-bold text-gray-900 dark:text-white cursor-pointer p-0 min-w-[90px]"
                                />
                            </div>
                        </div>

                        <div className={`px-4 py-2 rounded-full flex items-center gap-2 shadow-sm font-bold border-none ${(bolo.estat as string) === 'Sol·licitat' || (bolo.estat as string) === 'Nova' ? 'bg-red-600 text-white shadow-md' :
                            (bolo.estat as string) === 'Pendent de confirmació' ? 'bg-orange-500 text-white shadow-md' :
                                (bolo.estat as string) === 'Confirmada' ? 'bg-green-600 text-white shadow-md' :
                                    (bolo.estat as string) === 'Pendents de cobrar' ? 'bg-yellow-400 text-gray-900' :
                                        (bolo.estat as string) === 'Per pagar' ? 'bg-lime-500 text-gray-900' :
                                            'bg-gray-600 text-white shadow-md'
                            }`}>
                            <span className="material-icons-outlined text-lg">
                                {(bolo.estat as string) === 'Confirmada' ? 'check_circle' : 'pending'}
                            </span>
                            <span className="font-bold uppercase tracking-wider text-xs whitespace-nowrap">
                                {(bolo.estat as string) === 'Confirmada' ? 'En curs' : (isRebutjat ? 'Cancel·lada' : bolo.estat)}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-6 border-t border-gray-100 dark:border-white/10">
                        {/* 1. Type */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 dark:text-white/60 uppercase tracking-widest pl-1">Tipus</label>
                            <select
                                value={bolo.tipus_actuacio || ''}
                                onChange={(e) => handleTipusActuacioChange(e.target.value)}
                                disabled={isRebutjat}
                                className="w-full bg-white dark:bg-white/10 border border-gray-200 dark:border-white/20 rounded-lg text-sm font-bold text-gray-900 dark:text-white py-2 px-3 focus:ring-2 focus:ring-primary/20 outline-none"
                            >
                                <option value="">Selecciona...</option>
                                <option value="Carnestoltes">Carnestoltes</option>
                                <option value="Festa Major">Festa Major</option>
                                <option value="Correbars">Correbars</option>
                                <option value="Gegants">Gegants</option>
                                <option value="Cercavila">Cercavila</option>
                                <option value="Casament">Casament</option>
                                <option value="Concerts">Concerts</option>
                                <option value="Fires">Fires</option>
                            </select>
                        </div>

                        {/* 2. Concepte */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 dark:text-white/60 uppercase tracking-widest pl-1">Concepte</label>
                            <input
                                type="text"
                                value={bolo.concepte || ''}
                                onChange={(e) => handleConcepteChange(e.target.value)}
                                disabled={isRebutjat}
                                placeholder="Ex: Cercavila..."
                                className="w-full bg-white dark:bg-white/10 border border-gray-200 dark:border-white/20 rounded-lg text-sm font-bold text-gray-900 dark:text-white py-2 px-3 focus:ring-2 focus:ring-primary/20 outline-none"
                            />
                        </div>

                        {/* 3. Durada */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 dark:text-white/60 uppercase tracking-widest pl-1">Durada (min)</label>
                            <input
                                type="number"
                                value={bolo.durada || ''}
                                onChange={(e) => handleDuradaChange(Number(e.target.value))}
                                disabled={isRebutjat}
                                placeholder="Ex: 120"
                                className="w-full bg-white dark:bg-white/10 border border-gray-200 dark:border-white/20 rounded-lg text-sm font-bold text-gray-900 dark:text-white py-2 px-3 focus:ring-2 focus:ring-primary/20 outline-none"
                            />
                        </div>

                        {/* 4. Ubicació Inici */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 dark:text-white/60 uppercase tracking-widest pl-1">Inici convocatòria</label>
                            <input
                                type="text"
                                value={bolo.ubicacio_inici || ''}
                                onChange={(e) => handleAutomationFieldChange('ubicacio_inici', e.target.value)}
                                disabled={isRebutjat}
                                placeholder="Ex: Artés"
                                className="w-full bg-white dark:bg-white/10 border border-gray-200 dark:border-white/20 rounded-lg text-sm font-bold text-gray-900 dark:text-white py-2 px-3 focus:ring-2 focus:ring-primary/20 outline-none"
                            />
                        </div>

                        {/* 5. Vestimenta */}
                        <div className="space-y-1 sm:col-span-2">
                            <label className="text-[10px] font-bold text-gray-400 dark:text-white/60 uppercase tracking-widest pl-1">Vestimenta</label>
                            <input
                                type="text"
                                value={bolo.vestimenta || ''}
                                onChange={(e) => handleAutomationFieldChange('vestimenta', e.target.value)}
                                disabled={isRebutjat}
                                placeholder="Ex: Samarreta BLB + Pantalons Beige"
                                className="w-full bg-white dark:bg-white/10 border border-gray-200 dark:border-white/20 rounded-lg text-sm font-bold text-gray-900 dark:text-white py-2 px-3 focus:ring-2 focus:ring-primary/20 outline-none"
                            />
                        </div>

                        {/* 6. Partitures */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 dark:text-white/60 uppercase tracking-widest pl-1">Partitures</label>
                            <input
                                type="text"
                                value={bolo.partitures || ''}
                                onChange={(e) => handleAutomationFieldChange('partitures', e.target.value)}
                                disabled={isRebutjat}
                                placeholder="Ex: Les de sempre"
                                className="w-full bg-white dark:bg-white/10 border border-gray-200 dark:border-white/20 rounded-lg text-sm font-bold text-gray-900 dark:text-white py-2 px-3 focus:ring-2 focus:ring-primary/20 outline-none"
                            />
                        </div>

                        {/* 7. Fundes */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 dark:text-white/60 uppercase tracking-widest pl-1">On deixem les fundes?</label>
                            <input
                                type="text"
                                value={bolo.notes_fundes || ''}
                                onChange={(e) => handleAutomationFieldChange('notes_fundes', e.target.value)}
                                disabled={isRebutjat}
                                placeholder="Ex: Al cotxe"
                                className="w-full bg-white dark:bg-white/10 border border-gray-200 dark:border-white/20 rounded-lg text-sm font-bold text-gray-900 dark:text-white py-2 px-3 focus:ring-2 focus:ring-primary/20 outline-none"
                            />
                        </div>
                    </div>

                    {/* NEW: Servies de Menjar (Informatiu) */}
                    <div className="pt-6 mt-6 border-t border-gray-100">
                        <div className="flex flex-wrap gap-2">
                            {[
                                { id: 'menjar_esmorzar', label: 'Esmorzar', icon: 'bakery_dining' },
                                { id: 'menjar_dinar', label: 'Dinar', icon: 'lunch_dining' },
                                { id: 'menjar_sopar', label: 'Sopar', icon: 'dinner_dining' },
                                { id: 'menjar_barra_lliure', label: 'Barra lliure', icon: 'local_bar' },
                            ].map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => handleAutomationFieldChange(item.id as keyof Bolo, !bolo[item.id as keyof Bolo])}
                                    disabled={isRebutjat}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${bolo[item.id as keyof Bolo]
                                        ? 'bg-primary text-white border-primary shadow-sm'
                                        : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    <span className="material-icons-outlined text-sm">{item.icon}</span>
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* CHECKLISTS */}
            <div className="bg-white dark:bg-card-dark rounded-xl border border-gray-200 dark:border-border-dark overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-white cursor-pointer" onClick={() => setIsPhasesExpanded(!isPhasesExpanded)}>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-text-primary-dark flex items-center">
                        <button
                            className="mr-2 text-gray-500 dark:text-text-secondary-dark hover:text-primary transition-colors focus:outline-none"
                        >
                            <span className="material-icons-outlined transform transition-transform duration-200" style={{ transform: isPhasesExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                                chevron_right
                            </span>
                        </button>
                        <span className="material-icons-outlined mr-2">checklist</span>
                        Seguiment de Fases
                    </h2>
                </div>

                {/* Seguiment de Fases - Sistema de Tasques */}
                {isPhasesExpanded && (
                    <div className="p-6">
                        {loadingTasques && tasques.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                Carregant tasques...
                            </div>
                        ) : (
                            <TasquesPerFase
                                boloId={bolo.id}
                                bolo={bolo}
                                faseActual={bolo.estat}
                                tasques={tasques}
                                onTasquesChange={() => fetchTasques(String(bolo.id))}
                                onSystemTaskToggle={handleAutomationFieldChange}
                                isEditable={!isRebutjat}
                            />
                        )}
                    </div>
                )}
            </div>

            {/* Client Section */}
            <div className="bg-white dark:bg-card-dark rounded-xl border border-gray-200 dark:border-border-dark overflow-hidden mb-6">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-white cursor-pointer" onClick={() => setIsClientExpanded(!isClientExpanded)}>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-text-primary-dark flex items-center">
                        <button
                            className="mr-2 text-gray-500 dark:text-text-secondary-dark hover:text-primary transition-colors focus:outline-none"
                        >
                            <span className="material-icons-outlined transform transition-transform duration-200" style={{ transform: isClientExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                                chevron_right
                            </span>
                        </button>
                        <span className="material-icons-outlined mr-2">business</span>
                        Client
                    </h2>
                    {selectedClient && isClientExpanded && (
                        <Link href="/clients" className="text-xs text-primary hover:underline">
                            Veure tots els clients
                        </Link>
                    )}
                </div>
                {isClientExpanded && (
                    <div className="p-6">
                        {selectedClient ? (
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-text-primary-dark">{selectedClient.nom}</h3>
                                    <div className="mt-2 text-sm space-y-1 text-gray-500 dark:text-text-secondary-dark">
                                        <p className="flex items-center"><span className="material-icons-outlined text-xs mr-2">phone</span> {selectedClient.telefon || 'Sense telèfon'}</p>
                                        <p className="flex items-center"><span className="material-icons-outlined text-xs mr-2">email</span> {selectedClient.correu || 'Sense correu'}</p>
                                        <p className="flex items-center"><span className="material-icons-outlined text-xs mr-2">badge</span> {selectedClient.nif || 'Sense NIF'}</p>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end space-y-2">
                                    <Link
                                        href="/clients"
                                        className="text-sm border border-gray-200 dark:border-border-dark hover:bg-gray-100 dark:hover:bg-gray-800 px-3 py-1 rounded transition-colors text-gray-900 dark:text-text-primary-dark"
                                    >
                                        Editar fitxa client
                                    </Link>
                                    <button
                                        onClick={() => handleClientChange('')} // Unassign
                                        className="text-sm text-red-500 hover:text-red-700 hover:underline"
                                    >
                                        Canviar client
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <p className="text-gray-500 dark:text-text-secondary-dark text-sm">Aquest bolo no té cap client assignat. Selecciona'n un o crea'n un de nou.</p>
                                <div className="flex gap-4">
                                    <select
                                        className="flex-1 p-2 rounded bg-gray-50 dark:bg-background-dark border border-gray-200 dark:border-border-dark text-gray-900 dark:text-text-primary-dark"
                                        onChange={(e) => handleClientChange(e.target.value)}
                                        value=""
                                    >
                                        <option value="">Selecciona un client existent...</option>
                                        {clients.map(client => (
                                            <option key={client.id} value={client.id}>{client.nom}</option>
                                        ))}
                                    </select>
                                    <button
                                        onClick={() => setNewClientModalOpen(true)}
                                        className="bg-primary hover:bg-red-900 text-white font-medium py-2 px-4 rounded transition-colors whitespace-nowrap"
                                    >
                                        Afegir nou client
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Attendance Section */}
            <div className="bg-white dark:bg-card-dark rounded-xl border border-gray-200 dark:border-border-dark overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-white cursor-pointer" onClick={() => setIsMusicsExpanded(!isMusicsExpanded)}>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-text-primary-dark flex items-center">
                        <button
                            className="mr-2 text-gray-500 dark:text-text-secondary-dark hover:text-primary transition-colors focus:outline-none"
                        >
                            <span className="material-icons-outlined transform transition-transform duration-200" style={{ transform: isMusicsExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                                chevron_right
                            </span>
                        </button>
                        <span className="material-icons-outlined mr-2">people</span>
                        Assistència dels músics
                    </h2>
                </div>

                {isMusicsExpanded && (
                    <div className="p-6">
                        {loadingMusics && musics.length === 0 ? (
                            <div className="text-center text-gray-500 py-8">Carregant músics...</div>
                        ) : (
                            <AssistenciaMusics
                                boloId={Number(bolo.id)}
                                musics={musics}
                                attendance={boloMusics}
                                onAdd={handleAddMusicians}
                                onUpdateStatus={handleUpdateMusicianStatus}
                                onUpdateComment={handleUpdateMusicianComment}
                                onUpdatePrice={handleUpdateMusicianPrice}
                                onRemove={handleRemoveMusician}
                                onRequestMaterial={handleRequestMaterial}
                                isEditable={!isRebutjat && (bolo.estat as string) !== 'Tancat'}
                            />
                        )}
                    </div>
                )}
            </div>



            {/* Economic Information Card */}
            <div className="bg-white dark:bg-card-dark rounded-xl border border-gray-200 dark:border-border-dark overflow-hidden">
                <div
                    className="px-6 py-4 border-b border-gray-200 dark:border-border-dark flex justify-between items-center bg-white cursor-pointer select-none"
                    onClick={() => setIsEconomicsExpanded(!isEconomicsExpanded)}
                >
                    <h2 className="text-lg font-bold text-gray-900 dark:text-text-primary-dark flex items-center">
                        <button
                            className="mr-2 text-gray-500 dark:text-text-secondary-dark hover:text-primary transition-colors focus:outline-none"
                        >
                            <span className="material-icons-outlined transform transition-transform duration-200" style={{ transform: isEconomicsExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                                chevron_right
                            </span>
                        </button>
                        <span className="material-icons-outlined mr-2">payments</span>
                        Informació econòmica
                    </h2>

                    {/* Contextual Actions */}
                    <div className="flex flex-wrap gap-2">
                        {(bolo.estat as string) === 'Sol·licitat' && !isRebutjat && (
                            <button
                                onClick={() => handleOpenPreview('pressupost')}
                                disabled={updating}
                                className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg font-bold transition-all shadow-sm flex items-center gap-2"
                                title="Previsualitzar i generar pressupost"
                            >
                                <span className="material-icons-outlined text-sm">description</span>
                                Generar Pressupost
                            </button>
                        )}
                        {((bolo.estat as string) === 'Confirmat' || (bolo.estat as string) === 'Tancat') && !isRebutjat && (
                            <button
                                onClick={() => handleOpenPreview('factura')}
                                disabled={updating}
                                className="text-sm bg-primary hover:bg-red-900 text-white px-4 py-1.5 rounded-lg font-bold transition-all shadow-sm flex items-center gap-2"
                                title="Previsualitzar i generar factura"
                            >
                                <span className="material-icons-outlined text-sm">receipt_long</span>
                                Generar Factura
                            </button>
                        )}
                    </div>
                </div>
                {isEconomicsExpanded && (
                    <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Automatic Summary */}
                        <div className="md:col-span-2 bg-gray-50 dark:bg-white/5 p-4 rounded-xl border border-gray-100 dark:border-white/10 shadow-sm">
                            <h3 className="text-[10px] uppercase font-bold text-gray-400 dark:text-white/60 mb-4 tracking-[0.2em]">Resultat Econòmic (Automàtic)</h3>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                <div className="bg-white dark:bg-card-dark p-3 rounded-lg border border-gray-200 dark:border-border-dark shadow-sm">
                                    <p className="text-[10px] font-bold text-gray-400 dark:text-white/40 uppercase tracking-wider mb-1">Músics</p>
                                    <p className="text-xl font-black text-gray-900 dark:text-text-primary-dark leading-none">{bolo.num_musics || 0}</p>
                                </div>
                                <div className="bg-white dark:bg-card-dark p-3 rounded-lg border border-gray-200 dark:border-border-dark shadow-sm">
                                    <p className="text-[10px] font-bold text-gray-400 dark:text-white/40 uppercase tracking-wider mb-1">Cost Músics</p>
                                    <p className="text-xl font-black text-red-600 dark:text-red-400 leading-none">{(bolo.cost_total_musics || 0).toFixed(2)}€</p>
                                </div>
                                <div className="bg-white dark:bg-card-dark p-3 rounded-lg border border-gray-200 dark:border-border-dark shadow-sm">
                                    <p className="text-[10px] font-bold text-gray-400 dark:text-white/40 uppercase tracking-wider mb-1">Marge (Pot)</p>
                                    <p className={`text-xl font-black flex items-center gap-1 leading-none ${(bolo.pot_delta || 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                                        {(bolo.pot_delta || 0).toFixed(2)}€
                                    </p>
                                </div>
                                <div className="bg-white dark:bg-card-dark p-3 rounded-lg border-2 border-primary/30 dark:border-primary/50 shadow-sm">
                                    <p className="text-[10px] font-bold text-primary dark:text-white/60 uppercase tracking-wider mb-1">Pot Final (+Ajust)</p>
                                    <p className={`text-xl font-black flex items-center gap-1 leading-none ${(bolo.pot_delta_final || 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                                        {(bolo.pot_delta_final || 0).toFixed(2)}€
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Advance Payments List (New Section) */}
                        <div className="md:col-span-2 bg-amber-50 dark:bg-amber-900/10 p-4 rounded-xl border border-amber-100 dark:border-amber-900/20 shadow-sm mt-2">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 tracking-[0.2em]">Pagaments Anticipats</h3>
                                <button
                                    onClick={() => {
                                        setNewAdvancePayment({ ...newAdvancePayment, music_id: boloMusics[0]?.music_id || '' });
                                        setShowAdvancePaymentModal(true);
                                    }}
                                    className="text-[10px] bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-full font-black uppercase tracking-widest flex items-center gap-1 transition-all shadow-sm"
                                >
                                    <span className="material-icons-outlined text-sm">add</span> Nou Pagament
                                </button>
                            </div>

                            {loadingAdvancePayments ? (
                                <p className="text-sm text-amber-800/50 dark:text-amber-400/50 animate-pulse">Carregant pagaments...</p>
                            ) : advancePayments.length === 0 ? (
                                <p className="text-sm text-amber-800/50 dark:text-amber-400/50 italic">No s'han registrat pagaments anticipats per aquest bolo.</p>
                            ) : (
                                <div className="space-y-2">
                                    {advancePayments.map(p => {
                                        const music = musics.find(m => m.id === p.music_id);
                                        return (
                                            <div key={p.id} className="bg-white dark:bg-card-dark p-2 rounded-lg border border-amber-200 dark:border-amber-900/30 flex justify-between items-center shadow-sm">
                                                <div className="flex items-center gap-3">
                                                    <span className="material-icons-outlined text-amber-500 text-sm">payments</span>
                                                    <div>
                                                        <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{music?.nom || 'Músic desconegut'}</p>
                                                        <p className="text-[10px] text-gray-500 dark:text-gray-400">{format(new Date(p.data_pagament), 'dd/MM/yyyy')} {p.notes ? `• ${p.notes}` : ''}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <p className="text-sm font-black text-amber-600 dark:text-amber-400 font-mono">-{p.import.toFixed(2)}€</p>
                                                    <button
                                                        onClick={() => handleDeleteAdvancePayment(p.id)}
                                                        className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                                    >
                                                        <span className="material-icons-outlined text-sm">delete</span>
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div className="pt-2 border-t border-amber-200 dark:border-amber-900/30 flex justify-end">
                                        <p className="text-[10px] font-black uppercase text-amber-600/70 tracking-widest">Total Anticipat: {advancePayments.reduce((sum, p) => sum + p.import, 0).toFixed(2)}€</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Edit Fields */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 dark:text-white/60 uppercase tracking-widest pl-1">Import total / Pressupost (€)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={economicData.import_total}
                                onChange={(e) => setEconomicData({ ...economicData, import_total: parseFloat(e.target.value) || 0 })}
                                disabled={isRebutjat}
                                className="w-full bg-white dark:bg-white/10 border border-gray-200 dark:border-white/20 rounded-lg text-sm font-bold text-gray-900 dark:text-white py-2 px-3 focus:ring-2 focus:ring-primary/20 outline-none disabled:opacity-50"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 dark:text-white/60 uppercase tracking-widest pl-1">Preu per músic (€)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={economicData.preu_per_musica}
                                onChange={(e) => setEconomicData({ ...economicData, preu_per_musica: parseFloat(e.target.value) || 0 })}
                                disabled={isRebutjat}
                                className="w-full bg-white dark:bg-white/10 border border-gray-200 dark:border-white/20 rounded-lg text-sm font-bold text-gray-900 dark:text-white py-2 px-3 focus:ring-2 focus:ring-primary/20 outline-none disabled:opacity-50"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 dark:text-white/60 uppercase tracking-widest pl-1">Tipus d’ingrés</label>
                            <select
                                value={economicData.tipus_ingres}
                                onChange={(e) => setEconomicData({ ...economicData, tipus_ingres: e.target.value })}
                                disabled={isRebutjat}
                                className="w-full bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/20 rounded-lg text-sm font-bold text-gray-900 dark:text-white py-2 px-3 focus:ring-2 focus:ring-primary/20 outline-none appearance-none disabled:opacity-50"
                            >
                                <option value="Efectiu">Efectiu</option>
                                <option value="Factura">Factura</option>
                                <option value="Altres">Altres</option>
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 dark:text-white/60 uppercase tracking-widest pl-1">Ajust Manual Pot (€)</label>
                            <input
                                type="text"
                                inputMode="decimal"
                                value={economicData.ajust_pot_manual}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === '' || val === '-' || !isNaN(Number(val))) {
                                        setEconomicData({ ...economicData, ajust_pot_manual: val as any });
                                    }
                                }}
                                onBlur={() => {
                                    let final = parseFloat(String(economicData.ajust_pot_manual));
                                    if (isNaN(final)) final = 0;
                                    setEconomicData({ ...economicData, ajust_pot_manual: final });
                                }}
                                disabled={isRebutjat}
                                className="w-full bg-white dark:bg-white/10 border border-gray-200 dark:border-white/20 rounded-lg text-sm font-bold text-gray-900 dark:text-white py-2 px-3 focus:ring-2 focus:ring-primary/20 outline-none disabled:opacity-50 font-mono"
                            />
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                            <label className="text-[10px] font-bold text-gray-400 dark:text-white/60 uppercase tracking-widest pl-1">Motiu Ajust</label>
                            <input
                                type="text"
                                value={economicData.comentari_ajust_pot || ''}
                                onChange={(e) => setEconomicData({ ...economicData, comentari_ajust_pot: e.target.value })}
                                disabled={isRebutjat}
                                placeholder="Ex: Propina, Taxi, Despesa extra..."
                                className="w-full bg-white dark:bg-white/10 border border-gray-200 dark:border-white/20 rounded-lg text-sm font-bold text-gray-900 dark:text-white py-2 px-3 focus:ring-2 focus:ring-primary/20 outline-none disabled:opacity-50"
                            />
                        </div>

                        <div className="md:col-span-2 flex flex-col sm:flex-row gap-3 pt-2">
                            <div className="flex-1 flex items-center space-x-3 bg-gray-50 dark:bg-white/5 p-3 rounded-xl border border-gray-100 dark:border-white/10">
                                <input
                                    type="checkbox"
                                    id="cobrat_eco"
                                    checked={economicData.cobrat || false}
                                    onChange={(e) => {
                                        setEconomicData({ ...economicData, cobrat: e.target.checked });
                                        setBolo(prev => prev ? { ...prev, cobrat: e.target.checked } : null);
                                    }}
                                    disabled={isRebutjat}
                                    className="w-5 h-5 text-primary rounded border-gray-300 focus:ring-primary disabled:opacity-50"
                                />
                                <label htmlFor="cobrat_eco" className="text-sm text-gray-900 dark:text-white font-bold cursor-pointer select-none">
                                    Cobrat (Ingrés al Pot)
                                </label>
                            </div>

                            <div className="flex-1 flex items-center space-x-3 bg-gray-50 dark:bg-white/5 p-3 rounded-xl border border-gray-100 dark:border-white/10">
                                <input
                                    type="checkbox"
                                    id="pagat_eco"
                                    checked={economicData.pagaments_musics_fets || false}
                                    onChange={(e) => {
                                        setEconomicData({ ...economicData, pagaments_musics_fets: e.target.checked });
                                        setBolo(prev => prev ? { ...prev, pagaments_musics_fets: e.target.checked } : null);
                                    }}
                                    disabled={isRebutjat}
                                    className="w-5 h-5 text-primary rounded border-gray-300 focus:ring-primary disabled:opacity-50"
                                />
                                <label htmlFor="pagat_eco" className="text-sm text-gray-900 dark:text-white font-bold cursor-pointer select-none">
                                    Pagaments Músics Fets
                                </label>
                            </div>
                        </div>
                        <div className="md:col-span-2 pt-2">
                            <button
                                onClick={handleSaveEconomicData}
                                disabled={updating || isRebutjat}
                                className="w-full sm:w-auto bg-primary hover:bg-red-900 text-white font-black py-3 px-8 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center shadow-lg hover:shadow-primary/20 uppercase text-xs tracking-widest"
                            >
                                <span className="material-icons-outlined mr-2">save</span>
                                Desar Dades Econòmiques
                            </button>
                        </div>
                    </div>
                )}
            </div>
            {/* Internal Comments Section */}
            <div className="bg-white dark:bg-card-dark rounded-xl border border-gray-200 dark:border-border-dark overflow-hidden mt-6">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-white cursor-pointer" onClick={() => setIsCommentsExpanded(!isCommentsExpanded)}>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-text-primary-dark flex items-center">
                        <button
                            className="mr-2 text-gray-500 dark:text-text-secondary-dark hover:text-primary transition-colors focus:outline-none"
                        >
                            <span className="material-icons-outlined transform transition-transform duration-200" style={{ transform: isCommentsExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                                chevron_right
                            </span>
                        </button>
                        <span className="material-icons-outlined mr-2">chat</span>
                        Comentaris interns
                    </h2>
                </div>
                {isCommentsExpanded && (
                    <div className="p-6 space-y-6">
                        {/* List */}
                        <div className="space-y-4">
                            {loadingComentaris && comentaris.length === 0 ? (
                                <p className="text-gray-500 dark:text-text-secondary-dark text-sm">Carregant comentaris...</p>
                            ) : comentaris.length === 0 ? (
                                <p className="text-gray-500 dark:text-text-secondary-dark text-sm italic">No hi ha comentaris encara. Aquesta secció serveix per deixar constància interna (decisions, incidències, etc.).</p>
                            ) : (
                                comentaris.map((comentari) => (
                                    <div key={comentari.id} className="bg-gray-50 dark:bg-background-dark p-4 rounded-lg border border-gray-200 dark:border-border-dark">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="font-bold text-gray-900 dark:text-text-primary-dark text-sm">{comentari.autor || 'Sense autor'}</span>
                                            <span className="text-xs text-gray-500 dark:text-text-secondary-dark">
                                                {new Date(comentari.created_at).toLocaleString('ca-ES')}
                                            </span>
                                        </div>
                                        <p className="text-gray-900 dark:text-text-primary-dark text-sm whitespace-pre-wrap">{comentari.text}</p>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Add Form */}
                        <div className="border-t border-gray-200 dark:border-border-dark pt-4">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3">
                                <div className="md:col-span-1">
                                    <label className="block text-xs font-medium text-gray-500 dark:text-text-secondary-dark mb-1">Autor</label>
                                    <input
                                        type="text"
                                        placeholder="El teu nom"
                                        className="w-full p-2 rounded bg-gray-50 dark:bg-background-dark border border-gray-200 dark:border-border-dark text-gray-900 dark:text-text-primary-dark text-sm"
                                        value={newComentari.autor}
                                        onChange={(e) => setNewComentari({ ...newComentari, autor: e.target.value })}
                                    />
                                </div>
                                <div className="md:col-span-3">
                                    <label className="block text-xs font-medium text-gray-500 dark:text-text-secondary-dark mb-1">Comentari</label>
                                    <textarea
                                        placeholder="Escriu un comentari intern..."
                                        className="w-full p-2 rounded bg-gray-50 dark:bg-background-dark border border-gray-200 dark:border-border-dark text-gray-900 dark:text-text-primary-dark text-sm min-h-[60px]"
                                        value={newComentari.text}
                                        onChange={(e) => setNewComentari({ ...newComentari, text: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <button
                                    onClick={handleAddComentari}
                                    disabled={!newComentari.text.trim()}
                                    className="bg-primary hover:bg-red-900 text-white font-medium py-1 px-4 rounded transition-colors text-sm disabled:opacity-50"
                                >
                                    Afegir comentari
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* New Client Modal */}
            {newClientModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-start sm:items-center justify-center z-50 p-2 sm:p-4 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-white dark:bg-card-dark rounded-xl max-w-lg w-full p-6 shadow-xl border border-gray-200 dark:border-border-dark my-auto max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
                        <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-text-primary-dark">
                            Afegir nou client
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-500 dark:text-text-secondary-dark">Nom del client / entitat *</label>
                                <input
                                    type="text"
                                    className="w-full p-2 rounded bg-gray-50 dark:bg-background-dark border border-gray-200 dark:border-border-dark text-gray-900 dark:text-text-primary-dark"
                                    value={newClientData.nom}
                                    onChange={(e) => setNewClientData({ ...newClientData, nom: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-500 dark:text-text-secondary-dark">Telèfon</label>
                                    <input
                                        type="text"
                                        className="w-full p-2 rounded bg-gray-50 dark:bg-background-dark border border-gray-200 dark:border-border-dark text-gray-900 dark:text-text-primary-dark"
                                        value={newClientData.telefon}
                                        onChange={(e) => setNewClientData({ ...newClientData, telefon: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-500 dark:text-text-secondary-dark">Correu electrònic</label>
                                    <input
                                        type="email"
                                        className="w-full p-2 rounded bg-gray-50 dark:bg-background-dark border border-gray-200 dark:border-border-dark text-gray-900 dark:text-text-primary-dark"
                                        value={newClientData.correu}
                                        onChange={(e) => setNewClientData({ ...newClientData, correu: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-500 dark:text-text-secondary-dark">NIF / CIF</label>
                                <input
                                    type="text"
                                    className="w-full p-2 rounded bg-gray-50 dark:bg-background-dark border border-gray-200 dark:border-border-dark text-gray-900 dark:text-text-primary-dark"
                                    value={newClientData.nif}
                                    onChange={(e) => setNewClientData({ ...newClientData, nif: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-500 dark:text-text-secondary-dark">Adreça</label>
                                <input
                                    type="text"
                                    className="w-full p-2 rounded bg-gray-50 dark:bg-background-dark border border-gray-200 dark:border-border-dark text-gray-900 dark:text-text-primary-dark"
                                    value={newClientData.adreca}
                                    onChange={(e) => setNewClientData({ ...newClientData, adreca: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-500 dark:text-text-secondary-dark">Observacions</label>
                                <textarea
                                    className="w-full p-2 rounded bg-gray-50 dark:bg-background-dark border border-gray-200 dark:border-border-dark text-gray-900 dark:text-text-primary-dark min-h-[80px]"
                                    value={newClientData.observacions}
                                    onChange={(e) => setNewClientData({ ...newClientData, observacions: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end space-x-3 mt-6">
                            <button
                                onClick={() => setNewClientModalOpen(false)}
                                className="px-4 py-2 rounded text-gray-500 dark:text-text-secondary-dark hover:bg-gray-100 dark:hover:bg-gray-800"
                            >
                                Cancel·lar
                            </button>
                            <button
                                onClick={handleCreateClient}
                                className="px-4 py-2 rounded bg-primary hover:bg-red-900 text-white font-medium transition-colors"
                            >
                                Desar i Assignar
                            </button>
                        </div>
                    </div>
                </div>

            )}

            {showPreview && (
                <div className="fixed inset-0 bg-black/80 flex items-start sm:items-center justify-center z-[110] p-2 sm:p-4 backdrop-blur-md overflow-y-auto">
                    <div className="bg-white rounded-2xl max-w-4xl w-full p-4 sm:p-8 shadow-2xl space-y-4 sm:space-y-6 text-gray-900 my-auto max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center border-b pb-4">
                            <h2 className="text-xl sm:text-2xl font-black text-primary uppercase tracking-tight">
                                PREVISUALITZACIÓ {previewType === 'pressupost' ? 'PRESSUPOST' : 'FACTURA'}
                            </h2>
                            <button onClick={() => setShowPreview(false)} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
                                <span className="material-icons-outlined text-2xl sm:text-3xl">close</span>
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
                            {/* Left Side: Document & Bolo Info */}
                            <div className="space-y-4 sm:space-y-6">
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-4 shadow-sm">
                                    <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] mb-4">Detalls del Document</h4>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Núm. Document</label>
                                        <input
                                            type="text"
                                            value={manualNumber}
                                            onChange={(e) => setManualNumber(e.target.value)}
                                            className="w-full p-2.5 border border-gray-200 rounded-lg font-mono font-bold text-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                                        />
                                    </div>
                                </div>

                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-4 shadow-sm">
                                    <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] mb-4">Informació de l'Actuació</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="sm:col-span-2">
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Població</label>
                                            <input
                                                type="text"
                                                value={bolo.nom_poble}
                                                onChange={(e) => setBolo({ ...bolo, nom_poble: e.target.value })}
                                                onBlur={(e) => handlePobleChange(e.target.value)}
                                                className="w-full p-2 border border-gray-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Concepte</label>
                                            <input
                                                type="text"
                                                value={bolo.concepte || ''}
                                                onChange={(e) => setBolo({ ...bolo, concepte: e.target.value })}
                                                onBlur={(e) => handleConcepteChange(e.target.value)}
                                                className="w-full p-2 border border-gray-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Durada (min)</label>
                                            <input
                                                type="number"
                                                value={bolo.durada || ''}
                                                onChange={(e) => setBolo({ ...bolo, durada: Number(e.target.value) })}
                                                onBlur={(e) => handleDuradaChange(Number(e.target.value))}
                                                className="w-full p-2 border border-gray-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Data</label>
                                            <input
                                                type="date"
                                                value={bolo.data_bolo}
                                                onChange={(e) => handleDataBoloChange(e.target.value)}
                                                className="w-full p-2 border border-gray-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Hora</label>
                                            <input
                                                type="time"
                                                value={bolo.hora_inici || ''}
                                                onChange={(e) => setBolo({ ...bolo, hora_inici: e.target.value })}
                                                onBlur={(e) => handleUpdateHora(e.target.value)}
                                                className="w-full p-2 border border-gray-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Side: Client Info */}
                            <div className="space-y-4 sm:space-y-6">
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-4 shadow-sm h-full">
                                    <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] mb-4">Dades del Client</h4>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Nom / Entitat</label>
                                            <input
                                                type="text"
                                                value={selectedClient?.nom || ''}
                                                onChange={(e) => setSelectedClient(prev => prev ? { ...prev, nom: e.target.value } : null)}
                                                className="w-full p-2 border border-gray-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">NIF / CIF</label>
                                            <input
                                                type="text"
                                                value={selectedClient?.nif || ''}
                                                onChange={(e) => setSelectedClient(prev => prev ? { ...prev, nif: e.target.value } : null)}
                                                className="w-full p-2 border border-gray-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Adreça</label>
                                            <input
                                                type="text"
                                                value={selectedClient?.adreca || ''}
                                                onChange={(e) => setSelectedClient(prev => prev ? { ...prev, adreca: e.target.value } : null)}
                                                className="w-full p-2 border border-gray-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                                            />
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Població</label>
                                                <input
                                                    type="text"
                                                    value={selectedClient?.poblacio || ''}
                                                    onChange={(e) => setSelectedClient(prev => prev ? { ...prev, poblacio: e.target.value } : null)}
                                                    className="w-full p-2 border border-gray-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Codi Postal</label>
                                                <input
                                                    type="text"
                                                    value={selectedClient?.codi_postal || ''}
                                                    onChange={(e) => setSelectedClient(prev => prev ? { ...prev, codi_postal: e.target.value } : null)}
                                                    className="w-full p-2 border border-gray-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Articles Section */}
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-4 shadow-sm">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">Articles de Facturació</h4>
                                <button
                                    onClick={() => setArticles([...articles, { descripcio: '', preu: 0, quantitat: 1 }])}
                                    className="text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-full font-black uppercase tracking-widest flex items-center gap-1 transition-all shadow-sm"
                                >
                                    <span className="material-icons-outlined text-sm">add</span> Afegir Article
                                </button>
                            </div>
                            <div className="space-y-3">
                                {articles.map((art, idx) => (
                                    <div key={idx} className="flex flex-col sm:flex-row gap-2 sm:items-center bg-white p-3 rounded-xl border border-gray-200 shadow-sm relative group">
                                        <div className="flex-1">
                                            <label className="block sm:hidden text-[9px] font-bold text-gray-400 uppercase mb-1">Descripció</label>
                                            <input
                                                type="text"
                                                placeholder="Descripció de l'article"
                                                value={art.descripcio}
                                                onChange={(e) => {
                                                    const newArts = [...articles];
                                                    newArts[idx].descripcio = e.target.value;
                                                    setArticles(newArts);
                                                }}
                                                className="w-full p-2 border border-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none font-medium"
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            <div className="w-24">
                                                <label className="block sm:hidden text-[9px] font-bold text-gray-400 uppercase mb-1">Preu</label>
                                                <input
                                                    type="number"
                                                    value={art.preu}
                                                    onChange={(e) => {
                                                        const newArts = [...articles];
                                                        newArts[idx].preu = parseFloat(e.target.value) || 0;
                                                        setArticles(newArts);
                                                    }}
                                                    className="w-full p-2 border border-gray-100 rounded-lg text-sm text-right font-mono focus:ring-2 focus:ring-primary/20 outline-none"
                                                />
                                            </div>
                                            <div className="w-16">
                                                <label className="block sm:hidden text-[9px] font-bold text-gray-400 uppercase mb-1">Cant</label>
                                                <input
                                                    type="number"
                                                    value={art.quantitat}
                                                    onChange={(e) => {
                                                        const newArts = [...articles];
                                                        newArts[idx].quantitat = parseInt(e.target.value) || 0;
                                                        setArticles(newArts);
                                                    }}
                                                    className="w-full p-2 border border-gray-100 rounded-lg text-sm text-center focus:ring-2 focus:ring-primary/20 outline-none"
                                                />
                                            </div>
                                            <div className="w-20 hidden sm:flex items-center justify-end font-black text-sm text-primary">
                                                {(art.preu * art.quantitat).toFixed(2)}€
                                            </div>
                                            <button
                                                onClick={() => {
                                                    const newArts = articles.filter((_, i) => i !== idx);
                                                    setArticles(newArts);
                                                }}
                                                className="absolute -top-2 -right-2 sm:static sm:flex bg-red-50 text-red-500 p-1.5 rounded-full hover:bg-red-500 hover:text-white transition-all shadow-sm"
                                            >
                                                <span className="material-icons-outlined text-sm">delete</span>
                                            </button>
                                        </div>
                                        <div className="sm:hidden flex justify-between items-center pt-2 mt-2 border-t border-gray-50">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase">Subtotal</span>
                                            <span className="font-black text-primary">{(art.preu * art.quantitat).toFixed(2)}€</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t">
                            <div className="text-center sm:text-left">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Document</p>
                                <p className="text-3xl font-black text-primary leading-none">
                                    {articles.reduce((acc, art) => acc + (art.preu * art.quantitat), 0).toFixed(2)}<span className="text-xl ml-1">€</span>
                                </p>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto mt-4 sm:mt-0">
                                <button
                                    onClick={() => setShowPreview(false)}
                                    className="w-full sm:flex-none px-6 py-3 rounded-xl border border-gray-200 font-bold text-gray-500 hover:bg-gray-50 transition-all uppercase text-xs tracking-widest order-2 sm:order-1"
                                >
                                    Enrere
                                </button>
                                <button
                                    onClick={() => handleGeneratePDF()}
                                    disabled={pdfGenerating}
                                    className="w-full sm:flex-none px-8 py-3 rounded-xl bg-primary text-white font-black hover:bg-red-900 transition-all uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-2 order-1 sm:order-2"
                                >
                                    {pdfGenerating ? (
                                        <>
                                            <div className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full"></div>
                                            Generant...
                                        </>
                                    ) : (
                                        <>
                                            <span className="material-icons-outlined text-lg">picture_as_pdf</span>
                                            Generar i Pujar
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Advance Payment Modal (New) */}
            {showAdvancePaymentModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[120] p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-card-dark rounded-xl max-w-md w-full p-6 shadow-2xl border border-gray-200 dark:border-border-dark">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Nou Pagament Anticipat</h3>
                            <button onClick={() => setShowAdvancePaymentModal(false)} className="text-gray-400 hover:text-gray-600">
                                <span className="material-icons-outlined">close</span>
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Músic</label>
                                <select
                                    value={newAdvancePayment.music_id}
                                    onChange={(e) => setNewAdvancePayment({ ...newAdvancePayment, music_id: e.target.value })}
                                    className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-border-dark bg-gray-50 dark:bg-background-dark text-sm font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/20"
                                >
                                    <option value="">Selecciona un músic...</option>
                                    {boloMusics.filter(bm => bm.estat === 'confirmat').map(bm => {
                                        const m = musics.find(mu => mu.id === bm.music_id);
                                        return <option key={bm.music_id} value={bm.music_id}>{m?.nom}</option>;
                                    })}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Import (€)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={newAdvancePayment.import}
                                        onChange={(e) => setNewAdvancePayment({ ...newAdvancePayment, import: parseFloat(e.target.value) || 0 })}
                                        className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-border-dark bg-gray-50 dark:bg-background-dark text-sm font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/20"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Data</label>
                                    <input
                                        type="date"
                                        value={newAdvancePayment.data_pagament}
                                        onChange={(e) => setNewAdvancePayment({ ...newAdvancePayment, data_pagament: e.target.value })}
                                        className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-border-dark bg-gray-50 dark:bg-background-dark text-sm font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/20"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Notes (Opcional)</label>
                                <input
                                    type="text"
                                    value={newAdvancePayment.notes || ''}
                                    onChange={(e) => setNewAdvancePayment({ ...newAdvancePayment, notes: e.target.value })}
                                    className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-border-dark bg-gray-50 dark:bg-background-dark text-sm font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/20"
                                    placeholder="Ex: Pagament en efectiu, Bizum..."
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-8">
                            <button
                                onClick={() => setShowAdvancePaymentModal(false)}
                                className="px-6 py-2 rounded-lg text-sm font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all uppercase tracking-widest"
                            >
                                Cancel·lar
                            </button>
                            <button
                                onClick={handleAddAdvancePayment}
                                disabled={updating || !newAdvancePayment.music_id || !newAdvancePayment.import}
                                className="px-8 py-2 rounded-lg bg-amber-600 text-white font-black hover:bg-amber-700 transition-all uppercase text-xs tracking-widest shadow-lg disabled:opacity-50"
                            >
                                Guardar Pagament
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function ChecklistItem({ label, checked, onChange, disabled }: { label: string, checked: boolean, onChange: (v: boolean) => void, disabled: boolean }) {
    return (
        <div className="flex items-center space-x-3">
            <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                disabled={disabled}
                className="w-5 h-5 text-primary rounded border-gray-300 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <span className={`text-gray-900 dark:text-text-primary-dark ${disabled ? 'opacity-70' : ''}`}>
                {label}
            </span>
        </div>
    );
}
