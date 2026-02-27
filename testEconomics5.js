const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://nkkekyhtybfheqjtxlgx.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ra2VreWh0eWJmaGVxanR4bGd4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDgwMTUyOSwiZXhwIjoyMDgwMzc3NTI5fQ.Q7Z4opX8M5Kv42o2GweTYyUJK6BJ0k1q74Fam1lIUok');

async function test() {
    const cutoffDate = '2026-01-01';

    // 1. Bolos
    const { data: allBolos } = await supabase.from('bolos').select('id, data_bolo, nom_poble, import_total, cost_total_musics, ajust_pot_manual, cobrat, pagaments_musics_fets, pot_delta_final').gte('data_bolo', cutoffDate).order('data_bolo', { ascending: true });

    // 2. Advances
    const { data: allAdvances } = await supabase.from('pagaments_anticipats').select('import, data_pagament, bolo_id').gte('data_pagament', cutoffDate);

    let totalDispoIncomes = 0;
    let totalDispoCosts = 0;
    let totalDispoAdvances = 0;

    console.log('--- RESTRICCIÓ COMPTABLE "DINERS A DISPOSICIÓ" ---');
    console.log('BOLOS QUE SUMEN (COBRATS):');

    allBolos.filter(b => b.cobrat).forEach(b => {
        const sum = (b.import_total || 0) + (b.ajust_pot_manual || 0);
        totalDispoIncomes += sum;
        console.log(`[+] ${b.data_bolo} - ${b.nom_poble}: +${sum}€ (Import: ${b.import_total || 0} + Ajust: ${b.ajust_pot_manual || 0})`);
    });

    console.log('\nBOLOS QUE RESTEN (PAGAMENTS FETS):');
    allBolos.filter(b => b.pagaments_musics_fets).forEach(b => {
        totalDispoCosts -= (b.cost_total_musics || 0);
        console.log(`[-] ${b.data_bolo} - ${b.nom_poble}: -${b.cost_total_musics || 0}€ (Cost Musics)`);
    });

    console.log('\nANTICIPOS QUE RESTEN (DE BOLOS NO PAGATS TOTALMENT):');
    allAdvances.forEach(a => {
        const b = allBolos.find(bolo => bolo.id === a.bolo_id);
        if (!b || !b.pagaments_musics_fets) {
            totalDispoAdvances -= (a.import || 0);
            console.log(`[-] Anticipo pel bolo ${b ? b.nom_poble : 'Desconegut'}: -${a.import}€`);
        }
    });

    console.log('\n--- RESUM DEL CÀLCUL ---');
    console.log(`+ Ingressos (Bolos): ${totalDispoIncomes}€`);
    console.log(`- Pagaments a Músics Fets: ${totalDispoCosts}€`);
    console.log(`- Anticipos Descomptats: ${totalDispoAdvances}€`);
    console.log(`= IMPACTE DINERS DISPOSICIÓ DELS BOLOS: ${totalDispoIncomes + totalDispoCosts + totalDispoAdvances}€`);

    console.log('\\nNota: Si el Pot tancat de l\'App no et suma exactament això al teu balanç inicial de Pot+Moviments és perquè el Pot està quadrat! L\'impacte es fa respecte aquest desgloss.');
}
test();
