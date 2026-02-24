export type BoloStatus = 'Nova' | 'Pendent de confirmació' | 'Confirmada' | 'Pendents de cobrar' | 'Per pagar' | 'Tancades' | 'Cancel·lats' | 'Tancat' | 'Cancel·lat' | 'Sol·licitat' | 'Confirmat'
export type SolicitudStatus = 'NOVA' | 'ACCEPTADA' | 'REBUTJADA'

export interface Bolo {
    id: number
    titol: string | null
    nom_poble: string
    municipi_id?: string | null
    municipi_custom_id?: string | null
    municipi_text?: string | null
    data_bolo: string
    hora_inici: string | null
    estat: BoloStatus
    pressupost?: number | null
    notes: string | null
    client_id?: string | null
    google_event_id?: string | null // Google Calendar Event ID
    client?: Client | null
    tipus_actuacio?: string | null
    concepte?: string | null // Descripció del concepte de l'actuació
    durada?: number | null // Durada en minuts
    hora?: string | null // Legacy or alternate for hora_inici
    ubicacio_detallada?: string | null
    created_at: string
    updated_at: string

    // Phase 1: Sol·licitat
    disponibilitat_comprovada: boolean
    pressupost_enviat: boolean
    enquesta_enviada: boolean
    fitxa_client_completa: boolean

    // Phase 2: En curs (Confirmat)
    pressupost_acceptat: boolean
    convocatoria_enviada: boolean
    enquesta_disponibilitat_musics_enviada: boolean
    calendari_actualitzat: boolean
    material_organitzat: boolean
    actuacio_acabada: boolean
    factura_enviada: boolean

    // Phase 3: Tancat
    pagaments_musics_planificats: boolean
    pagaments_musics_fets: boolean
    bolo_arxivat: boolean

    // Rejection
    estat_rebuig: string | null
    motiu_rebuig: string | null
    origen_rebuig: string | null
    data_rebuig: string | null

    // Automation & Convocatoria
    vestimenta: string | null
    partitures: string | null
    ubicacio_inici: string | null
    notes_fundes: string | null
    ubicacio_aparcament: string | null
    maps_inici: string | null
    maps_fundes: string | null
    maps_aparcament: string | null

    // Automatic Fields (Base 44)
    import_total: number
    preu_per_musica: number
    num_musics: number
    cost_total_musics: number
    pot_delta: number
    ajust_pot_manual: number
    comentari_ajust_pot: string | null
    pot_delta_final: number
    estat_cobrament: string // 'pendent', 'parcial', 'cobrat'
    estat_assistencia: string // 'pendent', 'confirmat', 'incomplet', 'complet'
    tipus_ingres: string
    cobrat: boolean

    // Lineup / Previsió de músics
    lineup_confirmed: boolean
    lineup_no_pot: string | null
    lineup_pendent: string | null
    lineup_notes: string | null

    // Camps informatius de menjar
    menjar_esmorzar: boolean
    menjar_dinar: boolean
    menjar_sopar: boolean
    menjar_barra_lliure: boolean
}

export interface Music {
    id: string
    nom: string
    instruments: string
    instrument_principal: string | null
    talla_samarreta: string | null
    talla_dessuadora: string | null
    tipus?: 'titular' | 'substitut'
    telefon_principal?: string | null
    telefons_addicionals?: string | null
    created_at: string
}


export interface Client {
    id: string
    nom: string
    nif: string | null
    altres: string | null
    rao_social: string | null
    poblacio: string | null
    adreca: string | null
    codi_postal: string | null
    municipi_id?: string | null
    municipi_custom_id?: string | null
    municipi_text?: string | null
    tipus_client: 'ajuntament' | 'associacio' | 'empresa' | 'ampa' | 'altres' | null
    requereix_efactura: boolean
    persona_contacte: string | null
    correu_contacte: string | null
    telefon_contacte: string | null
    telefon_extra: string | null
    // Legacy fields
    telefon: string | null
    correu: string | null
    observacions: string | null
    tipus: 'potencial' | 'real'
    created_at: string
    updated_at: string
}

export interface Solicitud {
    id: string
    estat: SolicitudStatus

    // DADES DE L'ACTE
    concepte: string | null
    tipus_actuacio: string | null
    data_actuacio: string | null
    hora_inici: string | null
    hora_fi: string | null
    municipi: string | null
    ubicacio: string | null
    aparcament: boolean
    espai_fundes: boolean
    altres_acte: string | null

    // DADES DE CONTACTE
    contacte_nom: string
    contacte_email: string
    contacte_telefon: string | null

    // DADES DE PAGAMENT
    responsable_pagament: string | null
    forma_pagament: string | null
    requereix_factura: boolean
    necessita_pressupost: boolean

    // DADES FISCALS
    fact_nom: string | null
    fact_nif: string | null
    fact_rao_social: string | null
    fact_direccio: string | null
    fact_poblacio: string | null
    fact_cp: string | null
    fact_altres: string | null

    // METADATA
    com_ens_has_conegut: string | null
    raw_payload: any
    client_id: string | null
    bolo_id: number | null
    notes_internes: string | null
    created_at: string
    updated_at: string
}

export interface BoloMusic {
    id: string
    bolo_id: number
    music_id: string
    tipus: 'titular' | 'substitut'
    estat: 'pendent' | 'confirmat' | 'no' | 'baixa'
    import_assignat: number
    preu_personalitzat: number | null
    comentari: string | null
    instrument?: string | null // Instrument específic tocat en aquest bolo
    music?: { nom: string } // Joined data
    updated_at: string
}

export interface AdvancePayment {
    id: string
    bolo_id: number
    music_id: string
    import: number
    data_pagament: string
    notes: string | null
    creat_at: string
}

export interface Tasca {
    id: string
    titol: string
    descripcio: string | null
    importancia: 'baixa' | 'mitjana' | 'alta'
    encarregat: string | null
    creada_per: string | null
    estat: 'pendent' | 'en curs' | 'completada'
    data_limit: string | null
    seguiment?: string | null
    created_at: string
    updated_at: string
}

export interface BoloTasca {
    id: string
    bolo_id: number
    titol: string
    descripcio: string | null
    fase_associada: BoloStatus
    completada: boolean
    obligatoria: boolean
    importancia: 'baixa' | 'mitjana' | 'alta'
    origen: 'automatica' | 'manual'
    creada_per: string | null
    data_completada: string | null
    ordre: number
    created_at: string
    updated_at: string
}

export type NoteColor = 'yellow' | 'blue' | 'green' | 'pink' | 'purple' | 'orange' | 'gray' | 'red'
export type NoteCategoria = 'IMPORTANT' | 'RECORDATORI' | 'MATERIAL' | 'LOGÍSTICA' | 'GENERAL'

export interface Note {
    id: string
    title: string | null
    content: string
    color: NoteColor
    pinned: boolean
    archived: boolean
    bolo_id: number | null
    tags: string[]
    categoria: NoteCategoria | null
    ordre: number
    bolos?: { data_bolo: string } | null // Joined data for filtering
    created_at: string
    updated_at: string
}

export interface BoloComentari {
    id: string
    bolo_id: number | string
    autor: string | null
    text: string
    created_at: string
}

export interface BoloHistory {
    id: string
    bolo_id: number
    tipus_event: string
    valor_anterior: string | null
    valor_nou: string | null
    usuari: string | null
    data: string
}

export interface ViewBolosResumAny {
    any: number
    total_bolos: number
    total_ingressos: number
    total_cost_musics: number
    pot_resultant: number
}

// Pressupostos i Factures
export interface DocumentArticle {
    descripcio: string
    preu: number
}

export interface Document {
    id: string
    tipus: 'pressupost' | 'factura'
    bolo_id: number | null
    client_id: string | null
    numero_document: string | null
    data_emissio: string
    articles: DocumentArticle[]
    subtotal: number | null
    iva: number | null
    total: number | null
    pdf_url: string | null
    pdf_storage_path: string | null
    estat: 'pendent' | 'enviat' | 'cobrat' | 'cancel·lat'
    nombre_musics: number | null
    observacions: string | null
    created_at: string
    updated_at: string
}
