# 📝 SISTEMA DE TASQUES I NOTES - GUIA D'IMPLEMENTACIÓ

## 🎯 Objectiu

Crear una pàgina de "Tasques i Notes" que combini:
1. **Tasques pendents** dels bolos (sistema existent de `bolo_tasques`)
2. **Notes ràpides** estil Google Keep per apunts i recordatoris

---

## 📊 Model de Dades

### Taula: `notes`

```sql
CREATE TABLE notes (
    id uuid PRIMARY KEY,
    title text,
    content text NOT NULL,
    color text DEFAULT 'yellow', -- 8 colors disponibles
    pinned boolean DEFAULT false,
    archived boolean DEFAULT false,
    bolo_id bigint REFERENCES bolos(id), -- Opcional: vincular a bolo
    tags text[],
    categoria text, -- IMPORTANT | RECORDATORI | MATERIAL | LOGÍSTICA | GENERAL
    ordre integer DEFAULT 0,
    created_at timestamptz,
    updated_at timestamptz
);
```

**Colors disponibles:**
- `yellow` (groc) - Per defecte
- `blue` (blau)
- `green` (verd)
- `pink` (rosa)
- `purple` (lila)
- `orange` (taronja)
- `gray` (gris)
- `red` (vermell)

**Categories:**
- `IMPORTANT` - Notes crítiques
- `RECORDATORI` - Recordatoris
- `MATERIAL` - Relacionat amb material/instruments
- `LOGÍSTICA` - Transport, organització
- `GENERAL` - Altres

---

## 🎨 Components UI

### 1. `NoteCard` - Targeta de nota individual

**Funcionalitats:**
- Mostra títol (opcional) i contingut
- Color de fons personalitzable
- Pin visible si està ancorada
- Badge de categoria
- Expandir/col·lapsar si el text és llarg (>200 caràcters)
- **Accions hover:**
  - Canviar color (color picker)
  - Ancorar/desancorar
  - Editar
  - Eliminar (amb confirmació)

**UX:**
- Les accions només es mostren quan el ratolí està sobre la nota
- Click a qualsevol lloc de la nota → obre l'editor
- Transicions suaus i hover effects

### 2. `NoteEditor` - Modal per crear/editar notes

**Camps:**
- Títol (opcional)
- Contingut (obligatori)
- Categoria (6 opcions + "Cap")
- Color (8 opcions amb preview visual)
- Pin (checkbox)

**UX:**
- Modal amb fons del color seleccionat
- Autofocus al textarea
- Validació: contingut no pot estar buit
- Botons: Cancel·lar | Guardar

### 3. `NotesGrid` - Graella de notes

**Funcionalitats:**
- Cerca per text (títol, contingut, categoria)
- Separació visual: Notes ancorades a dalt, altres a baix
- Layout responsive:
  - Mobile: 1 columna
  - Tablet: 2 columnes
  - Desktop: 3-4 columnes
- Botó "+ Nova nota" destacat
- Empty state amb missatge amigable

**Gestió:**
- CRUD complet (Create, Read, Update, Delete)
- Actualització automàtica després de cada acció
- Integració amb Supabase

---

## 📱 Pàgina de Tasques i Notes

### Layout

**Desktop (≥1024px):**
```
┌─────────────────────────────────────────────┐
│  Header: Tasques i Notes                    │
├──────────────────────┬──────────────────────┤
│  TASQUES PENDENTS    │  NOTES RÀPIDES       │
│  (Bloc 1)            │  (Bloc 2)            │
│  - Filtres           │  - Cerca             │
│  - Llista tasques    │  - Graella notes     │
│                      │  - Botó nova nota    │
└──────────────────────┴──────────────────────┘
```

**Mobile (<1024px):**
```
┌─────────────────────────────────────────────┐
│  Header: Tasques i Notes                    │
├─────────────────────────────────────────────┤
│  [Tasques] [Notes]  ← Tabs                  │
├─────────────────────────────────────────────┤
│  Contingut actiu segons tab seleccionat     │
│                                              │
└─────────────────────────────────────────────┘
```

### Bloc 1: Tasques Pendents

**Dades:**
- Tasques de `bolo_tasques` que NO estan completades
- Ordenades per: obligatòria → ordre

**Filtres:**
- **Cerca:** Per títol, descripció, nom del bolo, poble
- **Fase:** TOTES | Sol·licitat | Confirmat | Tancat

**Visualització:**
- Checkbox per marcar com a completada
- Títol de la tasca (amb * si és obligatòria)
- Descripció (si n'hi ha)
- Badges: Fase, Importància
- Link al bolo associat (amb icona + nom poble + data)

**Accions:**
- Toggle checkbox → marca/desmarca tasca
- Click al link del bolo → navega a `/bolos/[id]`

### Bloc 2: Notes Ràpides

**Dades:**
- Notes de la taula `notes` que NO estan arxivades
- Ordenades per: pinned → created_at (desc)

**Funcionalitats:**
- Cerca per text
- Botó "+ Nova nota" (sempre visible)
- Graella responsive amb `NoteCard`
- Separació visual: Ancorades vs. Altres

**Accions:**
- Click a nota → obre `NoteEditor`
- Hover → mostra accions (color, pin, editar, eliminar)
- Botó "+ Nova nota" → obre `NoteEditor` buit

---

## 🚀 Flux d'Ús

### Crear una nota (Zero fricció - 2 clics)

1. **Click** al botó "+ Nova nota"
2. **Escriure** el contingut
3. **Click** a "Guardar"

**Opcional:**
- Afegir títol
- Seleccionar categoria
- Canviar color
- Ancorar

### Editar una nota

1. **Click** a qualsevol lloc de la nota
2. **Modificar** els camps
3. **Click** a "Guardar"

### Marcar tasca com a completada

1. **Click** al checkbox de la tasca
2. La tasca desapareix de la llista (perquè filtra per `completada = false`)

### Filtrar tasques

1. **Escriure** a la cerca o **click** a un filtre de fase
2. La llista s'actualitza automàticament

---

## 🔧 Decisions UX

### Per què aquest disseny?

1. **Layout 2 columnes (desktop):**
   - Permet veure tasques i notes simultàniament
   - Aprofita millor l'espai en pantalles grans
   - Facilita copiar info entre tasques i notes

2. **Tabs (mobile):**
   - Evita scroll infinit
   - Cada secció té espai complet
   - Navegació clara i ràpida

3. **Notes estil Google Keep:**
   - Familiar per a la majoria d'usuaris
   - Visual i intuïtiu
   - Colors ajuden a categoritzar visualment
   - Pins permeten destacar notes importants

4. **Tasques amb filtres:**
   - Evita sobrecàrrega visual
   - Permet focalitzar en una fase concreta
   - Cerca ràpida per trobar tasques específiques

5. **Zero fricció:**
   - Crear nota: 2 clics
   - Marcar tasca: 1 clic
   - Editar nota: 1 clic
   - Canviar color: 2 clics (hover + seleccionar)

---

## ✅ Checklist d'Implementació

### Base de dades
- [x] Executar migració `20260204_notes_system.sql`
- [ ] Verificar que la taula `notes` s'ha creat correctament
- [ ] (Opcional) Inserir notes de mostra per provar

### Frontend
- [x] Afegir tipus `Note`, `NoteColor`, `NoteCategoria` a `types/index.ts`
- [x] Crear component `NoteCard.tsx`
- [x] Crear component `NoteEditor.tsx`
- [x] Crear component `NotesGrid.tsx`
- [x] Actualitzar pàgina `app/(dashboard)/tasques/page.tsx`

### Testing
- [ ] Crear una nota nova
- [ ] Editar una nota existent
- [ ] Canviar color d'una nota
- [ ] Ancorar/desancorar una nota
- [ ] Eliminar una nota
- [ ] Cercar notes per text
- [ ] Filtrar tasques per fase
- [ ] Marcar tasca com a completada
- [ ] Verificar responsive (mobile + desktop)

---

## 🎨 Personalització

### Afegir més colors

Edita `COLOR_MAP` a `NoteCard.tsx` i `NoteEditor.tsx`:

```typescript
const COLOR_MAP: Record<NoteColor, { bg: string; border: string }> = {
    // ... colors existents
    teal: { bg: 'bg-teal-100', border: 'border-teal-300', hover: 'hover:shadow-teal-200' },
};
```

I actualitza el tipus a `types/index.ts`:

```typescript
export type NoteColor = 'yellow' | 'blue' | ... | 'teal'
```

### Afegir més categories

Edita `CATEGORIES` a `NoteEditor.tsx`:

```typescript
const CATEGORIES: (NoteCategoria | null)[] = [
    null, 
    'IMPORTANT', 
    'RECORDATORI', 
    'MATERIAL', 
    'LOGÍSTICA', 
    'GENERAL',
    'URGENT' // Nova categoria
];
```

I actualitza el tipus a `types/index.ts`:

```typescript
export type NoteCategoria = 'IMPORTANT' | ... | 'URGENT'
```

---

## 🔮 Futures Millores

1. **Drag & Drop:**
   - Reordenar notes manualment
   - Biblioteca: `react-beautiful-dnd` o `dnd-kit`

2. **Checkboxes dins notes:**
   - Llistes de tasques mini dins d'una nota
   - Markdown support

3. **Recordatoris:**
   - Afegir data/hora de recordatori
   - Notificacions push

4. **Compartir notes:**
   - Assignar notes a músics específics
   - Col·laboració en temps real

5. **Arxiu:**
   - Vista d'arxiu per notes antigues
   - Restaurar notes arxivades

6. **Export:**
   - Exportar notes a PDF/TXT
   - Backup automàtic

---

## 📞 Suport

Si tens dubtes o problemes durant la implementació, revisa:
- Migració SQL: `supabase/migrations/20260204_notes_system.sql`
- Components: `components/NoteCard.tsx`, `NoteEditor.tsx`, `NotesGrid.tsx`
- Pàgina: `app/(dashboard)/tasques/page.tsx`
- Tipus: `types/index.ts`
