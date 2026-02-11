# 📋 SISTEMA DE PREVISIÓ DE MÚSICS - RESUM 30 DIES

## 🎯 Objectiu

Crear una pàgina "Resum 30 Dies" dins de "Gestió de bolos" que permeti al Jofre fer la previsió de músics dels propers bolos i compartir-la fàcilment al grup de WhatsApp.

**Característiques clau:**
- ✅ **100% vinculada** amb el sistema actual d'assignació de músics
- ✅ Vista consolidada de tots els bolos dels propers 30 dies
- ✅ Selecció ràpida de músics per seccions
- ✅ Notes per bolo i per músic
- ✅ Generador automàtic de text per WhatsApp
- ✅ Confirmació de lineup independent de l'estat administratiu

---

## 📊 Model de Dades

### Camps afegits a `bolos`

```sql
lineup_confirmed boolean NOT NULL DEFAULT false
-- Indica si el lineup està confirmat (✅ al WhatsApp)

lineup_no_pot text NULL
-- Text lliure: qui no pot assistir

lineup_pendent text NULL
-- Text lliure: qui està pendent de confirmar

lineup_notes text NULL
-- Notes generals sobre el lineup d'aquest bolo
```

### Camp existent a `bolo_musics`

```sql
comentari text NULL
-- Nota específica per aquest músic en aquest bolo
-- Ex: "Fa tenor en lloc d'alto"
```

**IMPORTANT:** No es crea cap taula nova. S'utilitza la taula `bolo_musics` existent per mantenir la vinculació total amb el sistema actual.

---

## 🎨 Funcionalitats de la Pàgina

### 1. Llista de Bolos (Propers 30 dies)

**Filtres aplicats:**
- `data_bolo >= AVUI`
- `data_bolo <= AVUI + 30 dies`
- `estat != 'Cancel·lat'`

**Ordenació:**
- Per `data_bolo` (ascendent)
- Per `hora_inici` (ascendent)

**Informació mostrada per bolo:**
- Nom / Tipus d'actuació
- Data i hora
- Estat (confirmat/pendent)
- ✅ si `lineup_confirmed = true`
- Comptador total de músics assignats (-N)
- Link al detall del bolo

### 2. Seccions d'Instruments

**Seccions definides:**
1. **Percu** (Percussió)
2. **Túba**
3. **Trombó**
4. **Tenor** (al WhatsApp surt com "Terror:")
5. **Alto**
6. **Trompeta**

**Per cada secció:**
- Mostra músics assignats (chips amb nom + nota opcional)
- Botó per eliminar músic (hover)
- Desplegable "+ Afegir músic" amb llista de disponibles
- Els músics es filtren per `instruments` (camp de la taula `musics`)

**Interacció:**
- **Click al chip** → Elimina músic
- **Click a "+ Nom"** → Afegeix músic
- **Canvis** → Actualitzen `bolo_musics` immediatament

### 3. Notes i Camps de Text Lliure

#### A) Notes per Bolo (Generals)
- Camp `lineup_notes` (opcional, no es mostra al WhatsApp)

#### B) Notes per Músic (Assignació)
- Camp `comentari` a `bolo_musics`
- Exemple: "Adrià (normalment Alto) -> avui fa Tenor"
- **Apareix al WhatsApp** entre parèntesis després del nom

#### C) Text Lliure "No pot" i "Pendent"
- Camps `lineup_no_pot` i `lineup_pendent`
- **NO són calculats automàticament**
- Text editable directament a la pàgina
- **Apareixen al WhatsApp** tal qual

### 4. Confirmació de Lineup

**Toggle ✅ "Formació confirmada"**
- Camp `lineup_confirmed` (boolean)
- **Independent** de l'estat administratiu del bolo
- Quan `true` → apareix ✅ al WhatsApp

---

## 📱 Generador de Text WhatsApp

### Format de Sortida

```
NOM BOLO DATA✅ -N

Percu: Nom1, Nom2 (nota)
Túba: Nom3
Trombó: Nom4, Nom5
Terror: Nom6
Alto: Nom7, Nom8
Trompeta: Nom9, Nom10, Nom11

No pot: Text lliure
Pendent: Text lliure

---

[Següent bolo...]
```

### Regles de Generació

1. **Nom del bolo:** `tipus_actuacio` o `municipi_text` o `nom_poble`
2. **Data:** Format curt (ex: "4 feb")
3. **✅:** Només si `lineup_confirmed = true`
4. **-N:** Número total de músics assignats
5. **Seccions:**
   - Només es mostren si tenen músics assignats
   - Noms ordenats alfabèticament
   - Notes entre parèntesis si existeixen
6. **"Terror:"** al WhatsApp (no "Tenor:")
7. **No pot / Pendent:** Text literal dels camps

### Botó "Copiar"

- Copia tot el text al porta-retalls
- Alert de confirmació
- Llest per enganxar a WhatsApp

---

## 🔗 Vinculació amb Sistema Actual

### Font de Veritat Única: `bolo_musics`

**Aquesta pàgina NO crea un sistema paral·lel.**

Utilitza la mateixa taula `bolo_musics` que:
- La pàgina de detall del bolo (`/bolos/[id]`)
- La gestió d'assistència
- Els càlculs de costos

### Sincronització Bidireccional

**Des de "Resum 30 Dies" → Detall del Bolo:**
- Afegir/eliminar músic aquí → es veu al detall del bolo
- Actualitzar nota de músic → es veu al detall del bolo

**Des de Detall del Bolo → "Resum 30 Dies":**
- Afegir/eliminar músic al detall → es veu aquí
- Canviar estat d'assistència → es veu aquí

**Garanties:**
- No hi ha duplicats (constraint `unique(bolo_id, music_id)`)
- Canvis en temps real (refetch després de cada acció)
- Consistència total

---

## 🎨 UX / UI

### Layout

**Desktop:**
```
┌─────────────────────────────────────────────┐
│  📋 Resum 30 Dies - Previsió de Músics      │
├─────────────────────────────────────────────┤
│  ┌───────────────────────────────────────┐  │
│  │ BOLO 1 (Carnaval Torà) 4 feb ✅ -12  │  │
│  │ [Click per expandir]                  │  │
│  └───────────────────────────────────────┘  │
│                                              │
│  ┌───────────────────────────────────────┐  │
│  │ BOLO 2 (Festa Major) 10 feb -8       │  │
│  │ ☐ Formació confirmada                │  │
│  │                                        │  │
│  │ Percu: [Joan] [+]                     │  │
│  │ + Afegir músic (3 disponibles)        │  │
│  │                                        │  │
│  │ Túba: [Pere] [Maria] [+]              │  │
│  │ ...                                    │  │
│  │                                        │  │
│  │ No pot: [Text lliure]                 │  │
│  │ Pendent: [Text lliure]                │  │
│  └───────────────────────────────────────┘  │
│                                              │
│  ┌───────────────────────────────────────┐  │
│  │ 💬 Resum per WhatsApp    [Copiar]    │  │
│  │ ┌─────────────────────────────────┐   │  │
│  │ │ Carnaval Torà 4 feb✅ -12       │   │  │
│  │ │                                  │   │  │
│  │ │ Percu: Joan, Pere                │   │  │
│  │ │ ...                              │   │  │
│  │ └─────────────────────────────────┘   │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

### Interaccions

**Ràpides (1-2 clics):**
- Afegir músic: 2 clics (expandir secció + click nom)
- Eliminar músic: 1 clic (hover + click X)
- Confirmar lineup: 1 clic (toggle checkbox)
- Copiar WhatsApp: 1 clic (botó copiar)

**Visuals:**
- Chips de colors per músics assignats
- Hover effects per accions
- Transicions suaus
- Comptador visible (-N)
- ✅ destacat quan confirmat

---

## 🚀 Flux d'Ús Típic (Jofre)

### Escenari: Preparar lineup per bolo de dissabte

1. **Obrir pàgina** `/bolos/resum-30-dies`
2. **Veure llista** de bolos propers
3. **Click al bolo** de dissabte (expandir)
4. **Per cada secció:**
   - Click "+ Afegir músic"
   - Seleccionar músics disponibles
   - (Opcional) Afegir nota si fa un instrument diferent
5. **Escriure text lliure:**
   - "No pot: Joan, Maria"
   - "Pendent: Pere"
6. **Marcar ✅** "Formació confirmada"
7. **Scroll avall** al bloc WhatsApp
8. **Click "Copiar"**
9. **Enganxar** al grup de WhatsApp

**Temps total:** ~2-3 minuts per bolo

---

## ✅ Checklist d'Implementació

### Base de dades
- [x] Executar migració `20260204_lineup_system.sql`
- [ ] Verificar que els camps s'han afegit a `bolos`
- [ ] (Opcional) Provar la funció `get_upcoming_bolos_with_musicians()`

### Frontend
- [x] Afegir camps de lineup a `types/index.ts` (interfície `Bolo`)
- [x] Crear pàgina `app/(dashboard)/bolos/resum-30-dies/page.tsx`
- [ ] Afegir link al menú de navegació (opcional)

### Testing
- [ ] Veure llista de bolos propers 30 dies
- [ ] Afegir músic a una secció
- [ ] Eliminar músic d'una secció
- [ ] Escriure text "No pot" i "Pendent"
- [ ] Marcar/desmarcar "Formació confirmada"
- [ ] Verificar que el text WhatsApp es genera correctament
- [ ] Copiar text al porta-retalls
- [ ] **IMPORTANT:** Verificar que els canvis es veuen al detall del bolo
- [ ] **IMPORTANT:** Fer canvis al detall del bolo i verificar que es veuen aquí

---

## 🔮 Futures Millores

1. **Notificacions:**
   - Avisar músics quan se'ls assigna a un bolo
   - Recordatoris automàtics

2. **Estadístiques:**
   - Qui toca més sovint
   - Disponibilitat històrica

3. **Templates:**
   - Guardar formacions típiques
   - Aplicar template a bolo nou

4. **Drag & Drop:**
   - Reordenar músics dins secció
   - Moure músics entre seccions

5. **Historial:**
   - Veure canvis de lineup
   - Qui va fer cada canvi

---

## 📞 Notes Importants

### Nomenclatura "Terror" vs "Tenor"

- **A la UI:** Es mostra com "Tenor" (més clar)
- **Al WhatsApp:** Es genera com "Terror:" (com vol el Jofre)
- Això es controla al camp `whatsappLabel` de cada secció

### Camp `comentari` vs `note`

- S'utilitza el camp existent `comentari` de `bolo_musics`
- No cal crear un camp nou `note`
- Això manté compatibilitat amb el sistema actual

### Independència de Confirmació

- `lineup_confirmed` és **independent** de `estat` del bolo
- Un bolo pot estar "Sol·licitat" però tenir lineup confirmat
- Un bolo pot estar "Confirmat" però lineup encara pendent

---

## 🎯 Objectiu Aconseguit

✅ **Pàgina única** per gestionar tots els bolos propers
✅ **Vinculació total** amb sistema actual (mateixa taula)
✅ **UX ràpida** (2-3 minuts per bolo)
✅ **Text WhatsApp** generat automàticament
✅ **Notes flexibles** (per bolo i per músic)
✅ **Zero duplicats** (constraint unique)
✅ **Sincronització bidireccional** garantida
