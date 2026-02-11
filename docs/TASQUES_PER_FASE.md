# 📋 SISTEMA DE TASQUES PER FASE - GUIA D'IMPLEMENTACIÓ

## 🎯 Objectiu

Evolucionar el sistema actual de checklist hardcoded (camps booleans a la taula `bolos`) cap a un sistema flexible de **tasques dinàmiques** associades a fases del workflow, sense perdre cap dada existent.

---

## 📊 Model de Dades

### Taula: `bolo_tasques`

```sql
CREATE TABLE bolo_tasques (
    id uuid PRIMARY KEY,
    bolo_id bigint REFERENCES bolos(id),
    
    -- Informació
    titol text NOT NULL,
    descripcio text,
    
    -- Associació a fase
    fase_associada text NOT NULL, -- 'Sol·licitat' | 'Confirmat' | 'Tancat' | 'Cancel·lat'
    
    -- Estat
    completada boolean DEFAULT false,
    obligatoria boolean DEFAULT false,
    importancia text DEFAULT 'mitjana', -- 'baixa' | 'mitjana' | 'alta'
    
    -- Metadata
    origen text DEFAULT 'manual', -- 'automatica' | 'manual'
    creada_per text,
    data_completada timestamptz,
    ordre integer DEFAULT 0,
    
    created_at timestamptz,
    updated_at timestamptz
);
```

---

## 🔄 Migració de Tasques Existents

### Mapatge de camps booleans → Tasques per fase

| Camp actual                                  | Fase Assignada | Obligatòria |
|----------------------------------------------|----------------|-------------|
| `disponibilitat_comprovada`                  | Sol·licitat    | ✅          |
| `pressupost_enviat`                          | Sol·licitat    | ✅          |
| `enquesta_enviada`                           | Sol·licitat    | ✅          |
| `fitxa_client_completa`                      | Sol·licitat    | ✅          |
| `pressupost_acceptat`                        | Confirmat      | ❌          |
| `convocatoria_enviada`                       | Confirmat      | ❌          |
| `enquesta_disponibilitat_musics_enviada`     | Confirmat      | ❌          |
| `calendari_actualitzat`                      | Confirmat      | ❌          |
| `material_organitzat`                        | Confirmat      | ❌          |
| `actuacio_acabada`                           | Confirmat      | ✅          |
| `factura_enviada`                            | Confirmat      | ✅          |
| `cobrat`                                     | Confirmat      | ✅          |
| `pagaments_musics_planificats`               | Tancat         | ❌          |
| `pagaments_musics_fets`                      | Tancat         | ❌          |
| `bolo_arxivat`                               | Tancat         | ❌          |

### Executar la migració

```sql
-- Executar NOMÉS UNA VEGADA
SELECT migrate_existing_checklist_to_tasques();
```

Aquesta funció:
- Converteix cada camp boolean en un registre de `bolo_tasques`
- **Manté l'estat de completat** (si estava `true`, la tasca es marca com a completada)
- Assigna cada tasca a la seva fase corresponent
- No elimina els camps booleans originals (per compatibilitat)

---

## ⚙️ Creació Automàtica de Tasques

### Quan es crea un bolo nou

**Trigger:** `after_bolo_insert_create_tasks`

Quan s'insereix un nou bolo, automàticament es creen les tasques de la fase inicial (`Sol·licitat`).

### Quan un bolo canvia de fase

**Trigger:** `after_bolo_update_create_tasks`

Quan l'estat d'un bolo canvia (ex: de `Sol·licitat` a `Confirmat`), automàticament es creen les tasques de la nova fase.

### Idempotència

Les funcions de creació automàtica comproven si una tasca ja existeix abans de crear-la, evitant duplicats si:
- El bolo visita la mateixa fase més d'una vegada
- La migració s'executa múltiples vegades per error

---

## 🎨 UX i Visualització

### Component: `TasquesPerFase`

Ubicació: `components/TasquesPerFase.tsx`

#### Funcionalitats:

1. **Visualització per fase actual**
   - Mostra prioritàriament les tasques de la fase actual del bolo
   - Ordenades per `ordre` (definit a la BD)

2. **Tasques pendents d'altres fases**
   - Bloc separat que mostra tasques no completades d'altres fases
   - Amb etiqueta de la fase a la qual pertanyen

3. **Indicadors visuals**
   - ✅ Tasques completades: fons verd, text ratllat
   - ⭐ Tasques obligatòries: marcades amb `*`
   - 🎨 Badges d'importància: baixa (gris), mitjana (blau), alta (vermell)
   - 🔧 Origen: "Manual" si l'ha creat l'usuari

4. **Accions**
   - Toggle checkbox: marcar/desmarcar tasca com a completada
   - Afegir tasca manual: botó "+" que obre modal
   - Eliminar tasca manual: només per tasques creades manualment

---

## 🚀 Integració a la Pàgina de Detall del Bolo

### Pas 1: Carregar tasques del bolo

```typescript
const [tasques, setTasques] = useState<BoloTasca[]>([]);

const fetchTasques = async () => {
    const { data, error } = await supabase
        .from('bolo_tasques')
        .select('*')
        .eq('bolo_id', boloId)
        .order('ordre', { ascending: true });
    
    if (!error && data) {
        setTasques(data);
    }
};

useEffect(() => {
    if (bolo) {
        fetchTasques();
    }
}, [bolo]);
```

### Pas 2: Afegir el component a la UI

```tsx
<TasquesPerFase
    boloId={bolo.id}
    faseActual={bolo.estat}
    tasques={tasques}
    onTasquesChange={fetchTasques}
    isEditable={true}
/>
```

### Pas 3: Validació abans de canviar de fase

```typescript
const canAdvanceToNextPhase = () => {
    const tasquesObligatories = tasques.filter(
        t => t.fase_associada === bolo.estat && t.obligatoria
    );
    const totsCompletades = tasquesObligatories.every(t => t.completada);
    
    if (!totsCompletades) {
        alert('Hi ha tasques obligatòries pendents!');
        return false;
    }
    return true;
};
```

---

## 📝 Exemple d'Ús

### Escenari: Bolo en fase "Sol·licitat"

**Tasques mostrades:**

**Tasques de "Sol·licitat"** (prioritat alta)
- ☐ Disponibilitat comprovada *
- ☑ Pressupost enviat *
- ☐ Enquesta al client enviada *
- ☐ Fitxa de client completa *

**Tasques pendents d'altres fases** (secundari)
- _(cap, perquè encara no s'han creat)_

### Escenari: Bolo passa a "Confirmat"

**Què passa:**
1. El trigger detecta el canvi d'estat
2. Es creen automàticament les tasques de "Confirmat"
3. Les tasques de "Sol·licitat" es mantenen (historial)

**Tasques mostrades:**

**Tasques de "Confirmat"**
- ☐ Pressupost acceptat
- ☐ Convocatòria enviada als músics
- ☐ Enquesta de disponibilitat als músics enviada
- ☐ Calendari actualitzat
- ☐ Material i logística organitzats
- ☐ Actuació acabada *
- ☐ Factura enviada *
- ☐ Cobrat *

**Tasques pendents d'altres fases**
- ☐ Enquesta al client enviada * (Sol·licitat)
- ☐ Fitxa de client completa * (Sol·licitat)

---

## ✅ Checklist d'Implementació

### Base de dades
- [ ] Executar migració `20260204_bolo_tasques_per_fase.sql`
- [ ] Executar funció `migrate_existing_checklist_to_tasques()`
- [ ] Verificar que els triggers funcionen (crear bolo de prova)

### Frontend
- [ ] Afegir tipus `BoloTasca` a `types/index.ts` ✅
- [ ] Crear component `TasquesPerFase.tsx` ✅
- [ ] Integrar component a `app/(dashboard)/bolos/[id]/page.tsx`
- [ ] Afegir validació de tasques obligatòries abans de canviar estat
- [ ] Provar creació de tasques manuals
- [ ] Provar toggle de tasques

### Testing
- [ ] Crear bolo nou → verificar tasques automàtiques
- [ ] Canviar estat → verificar creació de noves tasques
- [ ] Marcar tasques com a completades
- [ ] Afegir tasca manual
- [ ] Eliminar tasca manual
- [ ] Verificar que tasques pendents d'altres fases es mostren

---

## 🔮 Futures Millores

1. **Notificacions automàtiques**
   - Enviar recordatoris quan hi ha tasques obligatòries pendents

2. **Assignació de tasques**
   - Permetre assignar tasques a membres específics de la xaranga

3. **Dates límit**
   - Afegir dates límit a tasques i alertes

4. **Templates de tasques**
   - Permetre personalitzar les tasques automàtiques per tipus d'actuació

5. **Estadístiques**
   - Dashboard amb percentatge de tasques completades per fase

---

## 📞 Suport

Si tens dubtes o problemes durant la implementació, revisa:
- Migració SQL: `supabase/migrations/20260204_bolo_tasques_per_fase.sql`
- Component: `components/TasquesPerFase.tsx`
- Tipus: `types/index.ts`
