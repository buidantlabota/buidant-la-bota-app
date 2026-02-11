import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';

/**
 * Hook to handle material management: Auto-assign + Request to n8n
 */
export function useMaterialRequest() {
    const [loading, setLoading] = useState(false);
    const supabase = createClient();

    const requestMaterial = async (boloData: {
        id: string;
        nom_poble: string;
        data_bolo: string;
        estat: string;
        import_total: number;
        tipus_ingres: string;
    }) => {
        return executeMaterialFlow(boloData);
    };

    const executeMaterialFlow = async (boloData: {
        id: string;
        nom_poble: string;
        data_bolo: string;
        estat: string;
        import_total: number;
        tipus_ingres: string;
    }) => {
        setLoading(true);
        try {
            // Ensure we have complete Bolo Data for the Webhook
            // If the passed object is missing fields (e.g. from a partial selection), fetch it.
            let fullBoloData = { ...boloData };
            if (!fullBoloData.data_bolo || !fullBoloData.nom_poble || fullBoloData.import_total === undefined) {
                const { data: fetchedBolo, error } = await supabase
                    .from('bolos')
                    .select('*')
                    .eq('id', boloData.id)
                    .single();

                if (!error && fetchedBolo) {
                    console.log('Refetched full bolo data:', fetchedBolo);
                    fullBoloData = fetchedBolo;
                }
            }

            // 1. AUTO-ASSIGN LOGIC
            await performAutoAssign(fullBoloData.id, fullBoloData.data_bolo);

            // 2. N8N REQUEST
            const webhookUrl = process.env.NEXT_PUBLIC_N8N_MATERIAL_WEBHOOK_URL;
            if (!webhookUrl) {
                console.warn("Falta configurar el webhook d'n8n per sol·licitar el material necessari.");
            } else {
                console.log('Sending to N8N via proxy:', fullBoloData);
                const payload = {
                    type: 'material_bolo',
                    bolo_id: fullBoloData.id,
                    nom_poble: fullBoloData.nom_poble,
                    data_bolo: fullBoloData.data_bolo,
                    estat: fullBoloData.estat,
                    import_total: fullBoloData.import_total,
                    tipus_ingres: fullBoloData.tipus_ingres
                };

                const response = await fetch('/api/n8n', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: webhookUrl, payload })
                });

                if (!response.ok) {
                    const result = await response.json();
                    throw new Error(result.error || 'Error al webhook de material');
                }
            }

            return true;
        } catch (error) {
            console.error('Error in material flow:', error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    // Private helper for auto-assign
    const performAutoAssign = async (boloId: string, boloDateIso: string) => {
        const normalize = (s: string) => s ? s.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";

        // Fetch necessary data
        const [
            { data: musicians },
            { data: existingLoans },
            { data: catalog },
            { data: stock },
            { data: items },
            { data: globalLoans }
        ] = await Promise.all([
            // Musicians in Bolo - ONLY SUPLENTS
            supabase.from('bolo_musics').select('music_id, tipus_music:tipus, music:musics(id, nom, talla_samarreta, talla_dessuadora, instruments)').eq('bolo_id', boloId).eq('tipus', 'substitut'),
            // Existing Loans for this Bolo
            supabase.from('material_loans').select('*').eq('bolo_id', boloId).eq('status', 'prestat'),
            // Catalog
            supabase.from('inventory_catalog').select('*'),
            // Stock
            supabase.from('inventory_stock').select('*'),
            // Items (individual ones like booklets)
            supabase.from('inventory_items').select('*').eq('status', 'disponible'),
            // All Active Loans (for availability) - filtered by 'prestat'
            supabase.from('material_loans').select('stock_id, item_id, suplent_id, item_type, bolo_id').eq('status', 'prestat')
        ]);

        if (!musicians || !catalog || !stock || !items) {
            console.error('Missing data for auto-assign');
            return;
        }

        console.log('=== INICI ASSIGNACIÓ AUTOMÀTICA ===');
        const boloDate = new Date(boloDateIso);
        const boloMonth = boloDate.getMonth() + 1;
        const isWinterSeason = boloMonth >= 9 || boloMonth <= 4;

        let createdCount = 0;
        const newLoans: any[] = [];
        const itemsToUpdateToPrestat: string[] = [];

        for (const m of (musicians as any[])) {
            const musicId = m.music_id;
            const musicData = m.music as any;
            const shirtSize = musicData?.talla_samarreta;
            const hoodieSize = musicData?.talla_dessuadora;
            const instruments = musicData?.instruments;

            // 1. Samarreta (Sempre s'intenta assignar)
            if (shirtSize) {
                const hasShirt = (existingLoans as any[])?.some(l => l.suplent_id === musicId && l.item_type === 'samarreta') ||
                    newLoans.some(l => l.suplent_id === musicId && l.item_type === 'samarreta');

                if (!hasShirt) {
                    const shirtCatalog = (catalog as any[]).find(c => c.type === 'samarreta');
                    if (shirtCatalog) {
                        const sRow = (stock as any[]).find(s => s.catalog_id === shirtCatalog.id && s.size === shirtSize);
                        if (sRow) {
                            const activeCount = (globalLoans as any[])?.filter(l => l.stock_id === sRow.id).length || 0;
                            if (sRow.quantity_total > activeCount) {
                                newLoans.push({
                                    bolo_id: boloId,
                                    suplent_id: musicId,
                                    item_type: 'samarreta',
                                    stock_id: sRow.id,
                                    loan_date: new Date().toISOString(),
                                    status: 'prestat'
                                });
                                createdCount++;
                            }
                        }
                    }
                }
            }

            // 2. Dessuadora (Sempre s'intenta assignar si té talla, però es pot filtrar per temporada a la UI)
            // L'usuari ha dit: "QUE SIGUI automatic i diferenciat"
            if (hoodieSize) {
                const hasHoodie = (existingLoans as any[])?.some(l => l.suplent_id === musicId && l.item_type === 'dessuadora') ||
                    newLoans.some(l => l.suplent_id === musicId && l.item_type === 'dessuadora');

                if (!hasHoodie) {
                    const hoodieCatalog = (catalog as any[]).find(c => c.type === 'dessuadora');
                    if (hoodieCatalog) {
                        const sRow = (stock as any[]).find(s => s.catalog_id === hoodieCatalog.id && s.size === hoodieSize);
                        if (sRow) {
                            const activeCount = (globalLoans as any[])?.filter(l => l.stock_id === sRow.id).length || 0;
                            if (sRow.quantity_total > activeCount) {
                                newLoans.push({
                                    bolo_id: boloId,
                                    suplent_id: musicId,
                                    item_type: 'dessuadora',
                                    stock_id: sRow.id,
                                    loan_date: new Date().toISOString(),
                                    status: 'prestat'
                                });
                                createdCount++;
                            }
                        }
                    }
                }
            }

            // 3. Llibrets (Per instrument)
            if (instruments) {
                const hasBook = (existingLoans as any[])?.some(l => l.suplent_id === musicId && l.item_type === 'llibret') ||
                    newLoans.some(l => l.suplent_id === musicId && l.item_type === 'llibret');

                if (!hasBook) {
                    const musicInstList = instruments.split(',').map((i: string) => normalize(i));
                    // Check available items for a match
                    const matchingItem = (items as any[]).find(item => {
                        const itemNameNorm = normalize(item.identifier || item.catalog?.name);
                        return musicInstList.some((inst: string) => itemNameNorm.includes(inst) || inst.includes(itemNameNorm));
                    });

                    if (matchingItem && !itemsToUpdateToPrestat.includes(matchingItem.id)) {
                        newLoans.push({
                            bolo_id: boloId,
                            suplent_id: musicId,
                            item_type: 'llibret',
                            item_id: matchingItem.id,
                            loan_date: new Date().toISOString(),
                            status: 'prestat'
                        });
                        itemsToUpdateToPrestat.push(matchingItem.id);
                        createdCount++;
                    }
                }
            }
        }

        if (newLoans.length > 0) {
            const { error: insertError } = await supabase.from('material_loans').insert(newLoans);
            if (insertError) console.error('Error inserting loans:', insertError);

            if (itemsToUpdateToPrestat.length > 0) {
                const { error: updateError } = await supabase.from('inventory_items').update({ status: 'prestat' }).in('id', itemsToUpdateToPrestat);
                if (updateError) console.error('Error updating items to prestat:', updateError);
            }
        }

        return createdCount;
    };

    return { requestMaterial, loading };
}
