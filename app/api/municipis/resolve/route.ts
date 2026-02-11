import { createClient } from "@/utils/supabase/server";
import { normalizePlace } from "@/utils/normalization";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const { value } = await request.json();
        if (!value) return NextResponse.json({ error: "Value is required" }, { status: 400 });

        const normalizedValue = normalizePlace(value);
        const supabase = await createClient();

        // 1. Intentar trobar match exacte al catàleg
        const { data: catalogMatch } = await supabase
            .from("municipis")
            .select("id, nom")
            .eq("nom_normalitzat", normalizedValue)
            .maybeSingle();

        if (catalogMatch) {
            return NextResponse.json({
                kind: "catalog",
                municipi_id: catalogMatch.id,
                municipi_custom_id: null,
                municipi_text: catalogMatch.nom,
            });
        }

        // 2. Si no hi ha match al catàleg, parsejar i gestionar municipis_custom
        let nom = value;
        let pais = "ES";

        if (value.includes(",")) {
            const parts = value.split(",");
            nom = parts[0].trim();
            pais = parts[parts.length - 1].trim();
        }

        const normalizedNom = normalizePlace(nom);
        const normalizedPais = normalizePlace(pais);

        // Intentar trobar si ja existeix a custom (per nom i pais normalitzats)
        const { data: customMatch } = await supabase
            .from("municipis_custom")
            .select("id, entrada_original")
            .eq("nom_normalitzat", normalizedNom)
            .eq("pais", pais) // No normalitzem el camp pais a la DB per mantenir l'entrada, però fem match exacte
            .maybeSingle();

        if (customMatch) {
            return NextResponse.json({
                kind: "custom",
                municipi_id: null,
                municipi_custom_id: customMatch.id,
                municipi_text: customMatch.entrada_original,
            });
        }

        // Crear un nou registre a custom
        const { data: newCustom, error: insertError } = await supabase
            .from("municipis_custom")
            .upsert({
                entrada_original: value,
                nom: nom,
                pais: pais,
                nom_normalitzat: normalizedNom,
                origen: "user",
            }, {
                onConflict: "nom_normalitzat, pais"
            })
            .select()
            .single();

        if (insertError) {
            console.error("Error creating custom municipi:", insertError);
            return NextResponse.json({ error: insertError.message }, { status: 500 });
        }

        return NextResponse.json({
            kind: "custom",
            municipi_id: null,
            municipi_custom_id: newCustom.id,
            municipi_text: newCustom.entrada_original,
        });
    } catch (error) {
        console.error("Internal Error in /api/municipis/resolve:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
