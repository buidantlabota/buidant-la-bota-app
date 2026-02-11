
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkValues() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
        .from('bolos')
        .select('tipus_ingres');

    if (error) {
        console.error(error);
        return;
    }

    const counts: Record<string, number> = {};
    data.forEach(b => {
        const val = b.tipus_ingres || 'null';
        counts[val] = (counts[val] || 0) + 1;
    });

    console.log('Distinct tipus_ingres values:', counts);
}

checkValues();
