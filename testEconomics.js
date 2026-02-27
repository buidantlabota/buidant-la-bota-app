const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://nkkekyhtybfheqjtxlgx.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ra2VreWh0eWJmaGVxanR4bGd4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDgwMTUyOSwiZXhwIjoyMDgwMzc3NTI5fQ.Q7Z4opX8M5Kv42o2GweTYyUJK6BJ0k1q74Fam1lIUok');

async function test() {
    const { data: bolos } = await supabase.from('bolos').select('id, data_bolo, nom_poble, import_total, cost_total_musics, pot_delta_final, cobrat').gte('data_bolo', '2026-01-01');

    let marginCobrat = 0;

    bolos.forEach((b) => {
        // let's output which bolos are marked cobrat and what their margin is
        console.log(`- ${b.nom_poble} (Cobrat: ${b.cobrat}) | Import: ${b.import_total} | Cost Musics: ${b.cost_total_musics} | Margin: ${b.pot_delta_final}`);
    });
}

test();
