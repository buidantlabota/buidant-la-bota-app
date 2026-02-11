# Implementació de Pressupostos i Factures - Guia Completa

## ✅ Què s'ha implementat

### 1. **Migracions SQL**
- ✅ Afegits camps `concepte` i `durada` a la taula `bolos`
- ✅ Creada taula `documents` per emmagatzemar pressupostos i factures
- ✅ Configurades polítiques RLS per seguretat
- ✅ Afegits índexs per optimitzar consultes

### 2. **Tipus TypeScript**
- ✅ Actualitzada interfície `Bolo` amb `concepte` i `durada`
- ✅ Creades interfícies `Document` i `DocumentArticle`

### 3. **Pàgina de Pressupostos (`/pressupostos`)**
- ✅ Selecció de bolo amb desplegable
- ✅ Selecció de client amb desplegable
- ✅ Botons per crear bolo/client si no existeixen
- ✅ Validació automàtica de dades del bolo
- ✅ Missatges d'error clars si falten dades
- ✅ Articles dinàmics (afegir/eliminar)
- ✅ Càlcul automàtic de subtotal, IVA i total
- ✅ Integració amb n8n (webhook)
- ✅ Descàrrega de PDF generat
- ✅ Guardat del document a Supabase
- ✅ Suport per factures amb nombre de músics

### 4. **Pàgina de Detall del Bolo (`/bolos/[id]`)**
- ✅ Camps editables per `concepte` i `durada`
- ✅ Actualització en temps real a Supabase
- ✅ Missatges de confirmació (toast)

## 📋 Passos per completar la implementació

### Pas 1: Executar les migracions SQL

Ves al **SQL Editor** del teu panell de Supabase i executa aquests fitxers en ordre:

1. **`supabase/migrations/20241217_add_concepte_durada_bolos.sql`**
   ```sql
   ALTER TABLE bolos 
   ADD COLUMN IF NOT EXISTS concepte TEXT,
   ADD COLUMN IF NOT EXISTS durada INTEGER;
   ```

2. **`supabase/migrations/20241217_create_documents_table.sql`**
   - Crea la taula `documents`
   - Configura RLS
   - Afegeix índexs

### Pas 2: Configurar variables d'entorn

Afegeix al fitxer `.env.local`:

```env
NEXT_PUBLIC_N8N_PRESSUPOST_WEBHOOK_URL=https://teu-n8n.com/webhook/pressupost
NEXT_PUBLIC_N8N_FACTURA_WEBHOOK_URL=https://teu-n8n.com/webhook/factura
```

### Pas 3: Configurar n8n

Crea dos workflows a n8n (un per pressupostos, un per factures) que:

1. Rebin el payload (veure `docs/n8n-integration.md`)
2. Generin el PDF amb les dades
3. Pugin el PDF a Supabase Storage o servei extern
4. Retornin la resposta amb `pdf_url` i `numero_document`

**Exemple de resposta esperada:**
```json
{
  "success": true,
  "pdf_url": "https://storage.example.com/pressupost-001.pdf",
  "numero_document": "PRES-2025-001"
}
```

### Pas 4: Provar el flux complet

1. **Crear un bolo** amb totes les dades:
   - Població (nom_poble)
   - Data
   - Hora
   - **Concepte** (nou camp)
   - **Durada** (nou camp)

2. **Crear un client** si no existeix

3. **Anar a `/pressupostos`**:
   - Seleccionar bolo
   - Seleccionar client
   - Afegir articles
   - Generar pressupost/factura

4. **Verificar**:
   - PDF es descarrega correctament
   - Registre es guarda a la taula `documents`

## 🔍 Validacions implementades

### Dades obligatòries del bolo:
- ✅ Població (lloc)
- ✅ Data
- ✅ Hora
- ✅ Concepte
- ✅ Durada

Si falta qualsevol d'aquestes dades, l'aplicació:
- ❌ Bloqueja la generació del document
- 📢 Mostra un missatge clar amb els camps que falten
- 💡 Suggereix editar el bolo

### Articles:
- ✅ Descripció no buida
- ✅ Preu > 0

## 📊 Diferències entre Pressupost i Factura

| Característica | Pressupost | Factura |
|---------------|------------|---------|
| Nombre de músics | ❌ No s'envia | ✅ Es calcula i s'envia |
| Validació músics | ❌ No requerida | ⚠️ Opcional (pot ser 0) |
| Tipus document | `pressupost` | `factura` |

## 🗄️ Estructura de la BD

### Taula `bolos` (camps nous):
```sql
concepte TEXT        -- Descripció del concepte
durada INTEGER       -- Durada en minuts
```

### Taula `documents` (nova):
```sql
id UUID PRIMARY KEY
tipus TEXT           -- 'pressupost' o 'factura'
bolo_id INTEGER
client_id UUID
articles JSONB       -- [{descripcio, preu}, ...]
subtotal DECIMAL
iva DECIMAL
total DECIMAL
pdf_url TEXT
numero_document TEXT
estat TEXT           -- 'pendent', 'enviat', 'cobrat', 'cancel·lat'
nombre_musics INTEGER -- Només per factures
observacions TEXT
created_at TIMESTAMP
updated_at TIMESTAMP
```

## 🎯 Payload a n8n

Veure fitxer `docs/n8n-integration.md` per exemples complets de:
- Payload de pressupost
- Payload de factura
- Resposta esperada
- Gestió d'errors

## 🚀 Funcionalitats extra implementades

1. **Vista prèvia de dades del bolo**: Quan selecciones un bolo, es mostra un resum de les seves dades amb indicadors visuals (✅/❌) per veure què falta.

2. **Articles dinàmics**: Pots afegir tants articles com necessitis amb botó "Afegir article" i eliminar-los individualment.

3. **Càlcul automàtic**: El subtotal, IVA (21%) i total es calculen automàticament.

4. **Descàrrega directa**: Un cop generat el PDF, apareix un botó per descarregar-lo immediatament.

5. **Historial**: Tots els documents generats es guarden a la taula `documents` per consulta futura.

6. **Nombre de músics automàtic**: Per factures, es consulta automàticament el nombre de músics inscrits al bolo des de la taula `bolo_musics`.

## 🐛 Troubleshooting

### Error: "Falten dades del bolo"
- **Solució**: Edita el bolo i omple els camps: concepte, durada, hora

### Error: "Webhook URL no configurat"
- **Solució**: Afegeix les variables d'entorn al `.env.local`

### Error: "Error del webhook"
- **Solució**: Verifica que n8n està funcionant i retorna la resposta correcta

### No es descarrega el PDF
- **Solució**: Verifica que n8n retorna `pdf_url` a la resposta

## 📝 Notes importants

- **Reutilització de dades**: Tota la informació ve del bolo, no cal reomplir camps manualment
- **Client obligatori**: Sempre cal seleccionar un client (o crear-ne un)
- **Validació estricta**: No es permet generar documents amb dades incompletes
- **Seguretat**: RLS configurat per protegir les dades

## ✨ Pròxims passos recomanats

1. Configurar Supabase Storage per emmagatzemar PDFs
2. Crear plantilles de PDF personalitzades a n8n
3. Afegir numeració automàtica de documents
4. Implementar enviament per email des de n8n
5. Afegir històric de documents a la pàgina del bolo
