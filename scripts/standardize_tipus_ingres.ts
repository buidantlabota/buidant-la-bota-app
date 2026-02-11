
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function standardizeValues() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log('Starting standardization...');

    // 1. FACTURA -> Factura
    const { count: c1, error: e1 } = await supabase
        .from('bolos')
        .update({ tipus_ingres: 'Factura' })
        .eq('tipus_ingres', 'FACTURA');

    // 2. B -> Efectiu
    const { count: c2, error: e2 } = await supabase
        .from('bolos')
        .update({ tipus_ingres: 'Efectiu' })
        .eq('tipus_ingres', 'B');

    // 3. ALTRES -> Altres (just in case)
    const { count: c3, error: e3 } = await supabase
        .from('bolos')
        .update({ tipus_ingres: 'Altres' })
        .eq('tipus_ingres', 'ALTRES');

    if (e1 || e2 || e3) {
        console.error('Errors:', { e1, e2, e3 });
    } else {
        console.log('Standardization complete.');
    }
}

standardizeValues();
