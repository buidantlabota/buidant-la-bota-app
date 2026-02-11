# Integració n8n - Pressupostos i Factures

## Variables d'entorn necessàries

Afegeix aquestes variables al teu fitxer `.env.local`:

```env
NEXT_PUBLIC_N8N_PRESSUPOST_WEBHOOK_URL=https://teu-n8n.com/webhook/pressupost
NEXT_PUBLIC_N8N_FACTURA_WEBHOOK_URL=https://teu-n8n.com/webhook/factura
```

## Payload enviat a n8n

### Pressupost

```json
{
  "tipus_document": "pressupost",
  "bolo_id": 123,
  "client_id": "uuid-del-client",
  "dades_bolo": {
    "poblacio": "Barcelona",
    "data": "2025-01-15",
    "hora": "18:00",
    "concepte": "Cercavila de Festa Major",
    "durada": 120
  },
  "articles": [
    {
      "descripcio": "Actuació musical - Cercavila",
      "preu": 1500.00
    },
    {
      "descripcio": "Desplaçament i logística",
      "preu": 200.00
    }
  ],
  "nombre_musics": null,
  "observacions": "Notes addicionals opcionals",
  "subtotal": 1700.00,
  "iva": 357.00,
  "total": 2057.00
}
```

### Factura

```json
{
  "tipus_document": "factura",
  "bolo_id": 123,
  "client_id": "uuid-del-client",
  "dades_bolo": {
    "poblacio": "Barcelona",
    "data": "2025-01-15",
    "hora": "18:00",
    "concepte": "Cercavila de Festa Major",
    "durada": 120
  },
  "articles": [
    {
      "descripcio": "Actuació musical - Cercavila",
      "preu": 1500.00
    },
    {
      "descripcio": "Desplaçament i logística",
      "preu": 200.00
    }
  ],
  "nombre_musics": 25,
  "observacions": "Factura amb 25 músics inscrits",
  "subtotal": 1700.00,
  "iva": 357.00,
  "total": 2057.00
}
```

## Resposta esperada de n8n

n8n ha de retornar un JSON amb aquesta estructura:

```json
{
  "success": true,
  "pdf_url": "https://storage.example.com/documents/pressupost-2025-001.pdf",
  "pdf_storage_path": "documents/pressupost-2025-001.pdf",
  "numero_document": "PRES-2025-001",
  "message": "Document generat correctament"
}
```

### Camps de la resposta:

- **success** (boolean): Indica si el document s'ha generat correctament
- **pdf_url** (string): URL pública del PDF generat (per descàrrega)
- **pdf_storage_path** (string, opcional): Path al storage de Supabase si s'ha guardat allà
- **numero_document** (string, opcional): Número de pressupost/factura generat
- **message** (string, opcional): Missatge informatiu

## Workflow recomanat a n8n

1. **Webhook Trigger**: Rebre el payload de l'aplicació
2. **Validar dades**: Comprovar que tots els camps obligatoris estan presents
3. **Generar PDF**: 
   - Utilitzar un node de generació de PDF (ex: Puppeteer, PDFMonkey, etc.)
   - Aplicar plantilla amb les dades del bolo, client i articles
   - Incloure nombre de músics si és factura
4. **Guardar PDF**:
   - Opció A: Pujar a Supabase Storage i retornar URL pública
   - Opció B: Pujar a un servei extern (S3, Cloudinary, etc.)
5. **Generar número de document**: 
   - Consultar últim número a BD
   - Incrementar i assignar nou número
6. **Retornar resposta**: JSON amb pdf_url, numero_document, etc.

## Gestió d'errors

Si n8n retorna un error, l'aplicació mostrarà un missatge a l'usuari.

Exemple de resposta d'error:

```json
{
  "success": false,
  "error": "Error en generar el PDF",
  "message": "Falten dades obligatòries: concepte"
}
```

## Taula documents a Supabase

L'aplicació guarda automàticament un registre del document generat a la taula `documents`:

```sql
SELECT * FROM documents WHERE bolo_id = 123;
```

Camps principals:
- `tipus`: 'pressupost' o 'factura'
- `bolo_id`: ID del bolo
- `client_id`: ID del client
- `articles`: JSON amb els articles
- `total`: Import total
- `pdf_url`: URL del PDF
- `numero_document`: Número de document
- `estat`: 'pendent', 'enviat', 'cobrat', 'cancel·lat'

## Migracions SQL necessàries

Executa aquestes migracions a Supabase (en ordre):

1. `20241217_add_concepte_durada_bolos.sql` - Afegeix camps al bolo
2. `20241217_create_documents_table.sql` - Crea taula documents

Pots executar-les des del SQL Editor de Supabase o amb la CLI:

```bash
supabase db push
```
