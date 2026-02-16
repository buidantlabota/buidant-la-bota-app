import { createAdminClient } from '@/utils/supabase/admin';
import { addMonths, format } from 'date-fns';

export async function getNextInvoiceNumber() {
    const supabase = createAdminClient();

    // Obtenir el comptador de la configuració
    const { data: config, error: configError } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', 'invoice_counter')
        .single();

    const currentYear = new Date().getFullYear().toString().slice(-2);
    let nextNum = 1;
    let configYear = parseInt(currentYear);

    if (!configError && config?.value) {
        const value = config.value as { last_number: number; year: number };
        configYear = value.year;

        // Si l'any ha canviat, reiniciem el comptador
        if (configYear !== parseInt(currentYear)) {
            nextNum = 1;
        } else {
            nextNum = value.last_number + 1;
        }
    }

    return `${currentYear}/${nextNum.toString().padStart(3, '0')}`;
}

export async function incrementInvoiceCounter(lastNumberStr: string) {
    const supabase = createAdminClient();
    const parts = lastNumberStr.split('/');
    if (parts.length !== 2) return;

    const year = parseInt(parts[0]);
    const num = parseInt(parts[1]);

    await supabase
        .from('app_config')
        .upsert({
            key: 'invoice_counter',
            value: { last_number: num, year: year }
        });
}

export async function registerInvoice(data: {
    invoice_number: string;
    client_name: string;
    client_id?: string;
    bolo_id?: number;
    total_amount: number;
    articles: any[];
    paid?: boolean;
    notes?: string;
    status?: string;
    pdf_storage_path?: string;
}) {
    const supabase = createAdminClient();
    const creationDate = new Date();
    const dueDate = addMonths(creationDate, 3);

    const { data: record, error } = await supabase
        .from('invoice_records')
        .insert({
            invoice_number: data.invoice_number,
            client_name: data.client_name,
            client_id: data.client_id,
            bolo_id: data.bolo_id,
            creation_date: format(creationDate, 'yyyy-MM-dd'),
            due_date: format(dueDate, 'yyyy-MM-dd'),
            total_amount: data.total_amount,
            paid: data.paid || false,
            articles: data.articles,
            notes: data.notes,
            status: data.status || 'sent',
            pdf_storage_path: data.pdf_storage_path
        })
        .select()
        .single();

    if (error) throw error;

    // Actualitzar el comptador
    await incrementInvoiceCounter(data.invoice_number);

    return record;
}

export async function registerQuote(data: {
    quote_number: string;
    client_name: string;
    client_id?: string;
    bolo_id?: number;
    total_amount: number;
    articles: any[];
    notes?: string;
    status?: string;
    pdf_storage_path?: string;
}) {
    const supabase = createAdminClient();

    const { data: record, error } = await supabase
        .from('quote_records')
        .insert({
            quote_number: data.quote_number,
            client_name: data.client_name,
            client_id: data.client_id,
            bolo_id: data.bolo_id,
            creation_date: format(new Date(), 'yyyy-MM-dd'),
            total_amount: data.total_amount,
            articles: data.articles,
            notes: data.notes,
            status: data.status || 'sent',
            pdf_storage_path: data.pdf_storage_path
        })
        .select()
        .single();

    if (error) throw error;
    return record;
}
