-- Create the bolos table
create table bolos (
  id bigint primary key generated always as identity,
  nom_poble text not null,
  data_bolo date not null,
  estat text not null check (estat in ('Pendent', 'Confirmat', 'Realitzat', 'Cancel·lat')),
  pressupost numeric,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table bolos enable row level security;

-- Create policies
-- For now, we'll allow authenticated users (admins) to do everything.
-- In a real app with multiple roles, you'd restrict this.

create policy "Enable read access for authenticated users"
on bolos for select
to authenticated
using (true);

create policy "Enable insert access for authenticated users"
on bolos for insert
to authenticated
with check (true);

create policy "Enable update access for authenticated users"
on bolos for update
to authenticated
using (true);

create policy "Enable delete access for authenticated users"
on bolos for delete
to authenticated
using (true);
-- Create the musics table
create table musics (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  instruments text not null,
  talla_ropa text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security for musics
alter table musics enable row level security;

-- Create policies for musics
create policy "Enable read access for authenticated users"
on musics for select
to authenticated
using (true);

create policy "Enable insert access for authenticated users"
on musics for insert
to authenticated
with check (true);

create policy "Enable update access for authenticated users"
on musics for update
to authenticated
using (true);

create policy "Enable delete access for authenticated users"
on musics for delete
to authenticated
using (true);
-- Create the tasques table
create table tasques (
  id uuid primary key default gen_random_uuid(),
  titol text not null,
  descripcio text,
  importancia text not null default 'mitjana', -- 'baixa', 'mitjana', 'alta'
  encarregat text,
  creada_per text,
  estat text not null default 'pendent', -- 'pendent', 'en curs', 'completada'
  data_limit date,
  seguiment text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security for tasques
alter table tasques enable row level security;

-- Create policies for tasques
create policy "Enable read access for authenticated users"
on tasques for select
to authenticated
using (true);

create policy "Enable insert access for authenticated users"
on tasques for insert
to authenticated
with check (true);

create policy "Enable update access for authenticated users"
on tasques for update
to authenticated
using (true);

create policy "Enable delete access for authenticated users"
on tasques for delete
to authenticated
using (true);

-- Update musics table
alter table musics add column if not exists tipus text default 'titular';

-- Create bolo_musics table
create table bolo_musics (
  id uuid primary key default gen_random_uuid(),
  bolo_id bigint references bolos(id) on delete cascade not null,
  music_id uuid references musics(id) on delete cascade not null,
  tipus text not null, -- 'titular' or 'substitut'
  estat text default 'pendent', -- 'pendent', 'confirmat', 'no', 'baixa'
  comentari text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(bolo_id, music_id)
);

-- Enable RLS for bolo_musics
alter table bolo_musics enable row level security;

-- Policies for bolo_musics
create policy "Enable read access for authenticated users" on bolo_musics for select to authenticated using (true);
create policy "Enable insert access for authenticated users" on bolo_musics for insert to authenticated with check (true);
create policy "Enable update access for authenticated users" on bolo_musics for update to authenticated using (true);
create policy "Enable delete access for authenticated users" on bolo_musics for delete to authenticated using (true);

-- Update musics table (phones)
alter table musics add column if not exists telefon_principal text;
alter table musics add column if not exists telefons_addicionals text;

-- Create clients table
create table clients (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  telefon text,
  correu text,
  nif text,
  adreca text,
  observacions text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for clients
alter table clients enable row level security;

-- Policies for clients
create policy "Enable read access for authenticated users" on clients for select to authenticated using (true);
create policy "Enable insert access for authenticated users" on clients for insert to authenticated with check (true);
create policy "Enable update access for authenticated users" on clients for update to authenticated using (true);
create policy "Enable delete access for authenticated users" on clients for delete to authenticated using (true);

-- Update bolos table (link to clients)
alter table bolos add column if not exists client_id uuid references clients(id);

-- Update bolos table (tipus actuacio)
alter table bolos add column if not exists tipus_actuacio text;

-- Create bolo_comentaris table
create table bolo_comentaris (
  id uuid primary key default gen_random_uuid(),
  bolo_id bigint references bolos(id) on delete cascade not null,
  autor text,
  text text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for bolo_comentaris
alter table bolo_comentaris enable row level security;

-- Policies for bolo_comentaris
create policy "Enable read access for authenticated users" on bolo_comentaris for select to authenticated using (true);
create policy "Enable insert access for authenticated users" on bolo_comentaris for insert to authenticated with check (true);
create policy "Enable update access for authenticated users" on bolo_comentaris for update to authenticated using (true);
create policy "Enable delete access for authenticated users" on bolo_comentaris for delete to authenticated using (true);
