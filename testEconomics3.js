const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://nkkekyhtybfheqjtxlgx.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ra2VreWh0eWJmaGVxanR4bGd4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDgwMTUyOSwiZXhwIjoyMDgwMzc3NTI5fQ.Q7Z4opX8M5Kv42o2GweTYyUJK6BJ0k1q74Fam1lIUok');

async function test() {
    const cutoffDate = '2026-01-01';
    let bolosMargin = 0;

    const { data: allBolos } = await supabase.from('bolos').select('*').gte('data_bolo', cutoffDate);
    allBolos.forEach(b => {
        // let's compute margin
        const import_total = b.import_total || 0;
        const cost_total_musics = b.cost_total_musics || 0;
        const ajust_pot_manual = b.ajust_pot_manual || 0;
        const margin = import_total - cost_total_musics + ajust_pot_manual;

        console.log(`${b.nom_poble}: Import=${import_total}, Cost=${cost_total_musics} -> Margin=${margin}`);
        bolosMargin += margin;
    });
    console.log('Total Bolos Margin:', bolosMargin);
}

test();
