import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

// Punts clau:
// 1. Aquest endpoint és públic per permetre que GitHub Actions el cridi.
// 2. Només fem una lectura d'un sol registre per mantenir Supabase actiu.

export async function GET() {
    try {
        const supabase = await createClient();

        // Fem una consulta simple a una taula existentper despertar el projecte
        const { data, error } = await supabase
            .from('bolos')
            .select('id')
            .limit(1);

        if (error) throw error;

        return NextResponse.json({
            ok: true,
            message: 'Supabase s\'ha despertat correctament',
            timestamp: new Date().toISOString()
        });
    } catch (error: any) {
        console.error('Keep-alive error:', error);
        return NextResponse.json({
            ok: false,
            error: error.message
        }, { status: 500 });
    }
}
