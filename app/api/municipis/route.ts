import { createClient } from "@/utils/supabase/server";
import { normalizePlace } from "@/utils/normalization";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q");

    if (!q || q.length < 2) {
        return NextResponse.json([]);
    }

    const normalizedQ = normalizePlace(q);
    const supabase = await createClient();

    // Cercar en catàleg (municipis)
    // Intentar primer coincidència per prefix
    const { data: catalogData, error } = await supabase
        .from("municipis")
        .select("id, nom, comarca, provincia, pais, region")
        .ilike("nom_normalitzat", `${normalizedQ}%`)
        .limit(15);

    if (error) {
        console.error("Error fetching municipis:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let results = (catalogData || []).map((m) => ({ ...m, type: "catalog" }));

    // Si hi ha pocs resultats, intentar "conté"
    if (results.length < 10) {
        const existingIds = results.map((r) => r.id);
        const { data: fallbackData } = await supabase
            .from("municipis")
            .select("id, nom, comarca, provincia, pais, region")
            .ilike("nom_normalitzat", `%${normalizedQ}%`)
            .not("id", "in", `(${existingIds.length > 0 ? existingIds.join(",") : "00000000-0000-0000-0000-000000000000"})`)
            .limit(15 - results.length);

        if (fallbackData) {
            results = [...results, ...fallbackData.map((m) => ({ ...m, type: "catalog" }))];
        }
    }

    return NextResponse.json(results);
}
