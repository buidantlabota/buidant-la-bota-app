const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://nkkekyhtybfheqjtxlgx.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ra2VreWh0eWJmaGVxanR4bGd4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDgwMTUyOSwiZXhwIjoyMDgwMzc3NTI5fQ.Q7Z4opX8M5Kv42o2GweTYyUJK6BJ0k1q74Fam1lIUok');

async function test() {
    const cutoffDate = '2026-01-01';
    let manualBalance = 0;
    const { data: allMovements } = await supabase.from('despeses_ingressos').select('import, tipus, data').gte('data', cutoffDate);
    allMovements.forEach(m => manualBalance += (m.tipus === 'ingrés' ? m.import : -m.import));

    const { data: allAdvances } = await supabase.from('pagaments_anticipats').select('import, data_pagament').gte('data_pagament', cutoffDate);
    let advancesSum = 0;
    allAdvances.forEach(a => advancesSum += a.import);

    console.log('Manual Balance:', manualBalance);
    console.log('Advances sum:', advancesSum);
    console.log('Pot real WITHOUT ANY BOLOS:', 4560.21 + manualBalance - advancesSum);
}

test();
