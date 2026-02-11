
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function simulateLead() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const leadData = {
        concepte: "Boda Real a Sitges (PROVA CRM)",
        tipus_actuacio: "Casament",
        data_actuacio: "2026-09-20",
        hora_inici: "11:00",
        hora_fi: "14:30",
        municipi: "Sitges",
        ubicacio: "Casa de la Vila i Passeig Marítim",
        aparcament: true,
        espai_fundes: true,
        altres_acte: "Necessitem molta marxa i que toqueu l'entrada!",

        contacte_nom: "Maria Garcia",
        contacte_email: "maria.garcia@casaments.cat",
        contacte_telefon: "600112233",

        responsable_pagament: "La núvia",
        forma_pagament: "Transferència",
        requereix_factura: true,
        necessita_pressupost: true,

        fact_nom: "Maria Garcia Ruiz",
        fact_nif: "44556677X",
        fact_direccio: "Carrer Major 15, 2n 1a",
        fact_poblacio: "Sitges",
        fact_cp: "08870",

        com_ens_has_conegut: "Instagram",
        estat: 'NOVA',
        raw_payload: { source: 'Simulació AI Avançada' }
    };

    console.log('Simulant entrada de lead COMPLETA...');

    const { data, error } = await supabase
        .from('solicituds')
        .insert([leadData])
        .select()
        .single();

    if (error) {
        console.error('Error en la simulació:', error.message);
        console.log('RECORDA: Has d\'executar el NOU SQL a Supabase per afegir les columnes de bolos.');
    } else {
        console.log('✅ Lead COMPLET simulat amb èxit!');
        console.log('ID Generat:', data.id);
        console.log('Nom:', data.contacte_nom);
        console.log('Ara pots anar a l\'App (secció Sol·licituds) per provar d\'Acceptar-lo.');
    }
}

simulateLead();
