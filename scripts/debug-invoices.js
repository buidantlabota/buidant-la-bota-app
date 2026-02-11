const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
    console.log(`Loading environment from ${envPath}`);
    dotenv.config({ path: envPath });
} else {
    console.error('ERROR: .env.local file not found!');
    process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('ERROR: Database URL or Anon Key missing in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugInvoices() {
    console.log('--- STARTING INVOICE DEBUG ---');
    console.log(`Connecting to: ${supabaseUrl}`);

    // 1. Try to read existing invoices
    console.log('\nStep 1: Reading existing invoices...');
    const { data: invoices, error: readError } = await supabase
        .from('invoice_records')
        .select('*')
        .limit(5);

    if (readError) {
        console.error('❌ READ ERROR:', readError);
        console.log('POSSIBLE CAUSE: Table does not exist or RLS policy is blocking read access.');
    } else {
        console.log(`✅ Read Success! Found ${invoices.length} invoices.`);
        if (invoices.length > 0) {
            console.log('Sample invoice:', invoices[0]);
        }
    }

    // 2. Try to insert a test invoice
    console.log('\nStep 2: Inserting TEST invoice...');
    const textId = `TEST-${Date.now()}`;
    const testInvoice = {
        invoice_number: textId,
        client_name: 'DEBUG_SCRIPT_CLIENT',
        creation_date: new Date().toISOString().split('T')[0],
        due_date: new Date().toISOString().split('T')[0],
        total_amount: 123.45,
        paid: false,
        articles: [{ descripcio: 'Test Item', preu: 123.45, quantitat: 1 }],
        notes: 'Created by debug script'
    };

    const { data: insertData, error: insertError } = await supabase
        .from('invoice_records')
        .insert(testInvoice)
        .select();

    if (insertError) {
        console.error('❌ INSERT ERROR:', insertError);
        console.log('POSSIBLE CAUSE: RLS policy blocking write access, or unique constraint violation.');
    } else {
        console.log('✅ Insert Success!', insertData);

        // 3. Clean up (delete the test invoice)
        console.log('\nStep 3: Cleaning up test invoice...');
        const { error: deleteError } = await supabase
            .from('invoice_records')
            .delete()
            .eq('invoice_number', textId);

        if (deleteError) {
            console.error('❌ DELETE ERROR:', deleteError);
        } else {
            console.log('✅ Delete Success (Cleanup complete).');
        }
    }

    console.log('\n--- DEBUG COMPLETE ---');
}

debugInvoices();
