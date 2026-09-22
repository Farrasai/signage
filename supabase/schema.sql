-- ============================================================
-- Digital Signage CMS — Supabase schema
-- Jalankan seluruh file ini di Supabase Dashboard > SQL Editor
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- TABLES ----------

create table if not exists playlists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists displays (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  default_playlist_id uuid references playlists(id) on delete set null,
  marquee_text text not null default '',
  marquee_enabled boolean not null default true,
  is_paused boolean not null default false,
  last_seen timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists media (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('image','video','youtube_video','youtube_playlist','table')),
  url text not null,
  duration integer not null default 10,
  thumbnail_url text,
  -- Dipakai khusus untuk type = 'table': { title, columns: string[], rows: string[][] }
  content jsonb,
  created_at timestamptz not null default now()
);

create table if not exists playlist_items (
  id uuid primary key default gen_random_uuid(),
  playlist_id uuid not null references playlists(id) on delete cascade,
  media_id uuid not null references media(id) on delete cascade,
  sort_order integer not null default 0,
  duration_override integer
);

create table if not exists schedules (
  id uuid primary key default gen_random_uuid(),
  display_id uuid not null references displays(id) on delete cascade,
  playlist_id uuid not null references playlists(id) on delete cascade,
  -- kosong ('{}') artinya berlaku setiap hari. Nilai: mon,tue,wed,thu,fri,sat,sun
  days_of_week text[] not null default '{}',
  start_time time not null,
  end_time time not null,
  priority integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists remote_commands (
  id uuid primary key default gen_random_uuid(),
  display_id uuid not null references displays(id) on delete cascade,
  command text not null check (command in ('refresh','next','prev','play','pause')),
  executed boolean not null default false,
  created_at timestamptz not null default now()
);

-- Status darurat global (singleton — selalu tepat satu baris, id = 1).
-- target_display_ids kosong ('{}') berarti tayang ke SEMUA layar.
create table if not exists emergency_notice (
  id int primary key default 1 check (id = 1),
  title text not null default 'PENGUMUMAN DARURAT LAYANAN',
  message text not null default '',
  is_active boolean not null default false,
  target_display_ids uuid[] not null default '{}',
  published_at timestamptz,
  created_at timestamptz not null default now()
);
insert into emergency_notice (id) values (1) on conflict (id) do nothing;

create index if not exists idx_playlist_items_playlist on playlist_items(playlist_id, sort_order);
create index if not exists idx_schedules_display on schedules(display_id);
create index if not exists idx_remote_commands_display on remote_commands(display_id, executed);

-- ---------- REALTIME ----------
-- Aktifkan realtime broadcast untuk tabel yang perlu dipantau layar TV secara live.
-- Jika error "already member of publication", boleh diabaikan.
alter publication supabase_realtime add table displays;
alter publication supabase_realtime add table remote_commands;
alter publication supabase_realtime add table emergency_notice;

-- ---------- ROW LEVEL SECURITY ----------

alter table displays enable row level security;
alter table media enable row level security;
alter table playlists enable row level security;
alter table playlist_items enable row level security;
alter table schedules enable row level security;
alter table remote_commands enable row level security;
alter table emergency_notice enable row level security;

-- Layar TV (anonymous) hanya perlu baca konten & menulis status dirinya sendiri.
create policy "public read displays" on displays for select using (true);
create policy "public update displays" on displays for update using (true);

create policy "public read media" on media for select using (true);
create policy "public read playlists" on playlists for select using (true);
create policy "public read playlist_items" on playlist_items for select using (true);
create policy "public read schedules" on schedules for select using (true);

create policy "public read remote_commands" on remote_commands for select using (true);
create policy "public update remote_commands" on remote_commands for update using (true);

create policy "public read emergency_notice" on emergency_notice for select using (true);

-- Hanya admin yang login (authenticated) yang boleh membuat/mengubah/menghapus konten.
create policy "auth insert displays" on displays for insert to authenticated with check (true);
create policy "auth delete displays" on displays for delete to authenticated using (true);

create policy "auth insert media" on media for insert to authenticated with check (true);
create policy "auth update media" on media for update to authenticated using (true);
create policy "auth delete media" on media for delete to authenticated using (true);

create policy "auth insert playlists" on playlists for insert to authenticated with check (true);
create policy "auth update playlists" on playlists for update to authenticated using (true);
create policy "auth delete playlists" on playlists for delete to authenticated using (true);

create policy "auth insert playlist_items" on playlist_items for insert to authenticated with check (true);
create policy "auth update playlist_items" on playlist_items for update to authenticated using (true);
create policy "auth delete playlist_items" on playlist_items for delete to authenticated using (true);

create policy "auth insert schedules" on schedules for insert to authenticated with check (true);
create policy "auth update schedules" on schedules for update to authenticated using (true);
create policy "auth delete schedules" on schedules for delete to authenticated using (true);

create policy "auth insert remote_commands" on remote_commands for insert to authenticated with check (true);
create policy "auth delete remote_commands" on remote_commands for delete to authenticated using (true);

-- Hanya admin yang bisa mengubah (tayangkan/tutup) pengumuman darurat.
create policy "auth update emergency_notice" on emergency_notice
  for update to authenticated using (true) with check (true);

-- ---------- STORAGE (dipakai sebagai "CDN" untuk foto/video yang diupload) ----------

insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

create policy "public read media bucket" on storage.objects for select
  using (bucket_id = 'media');

create policy "auth upload media bucket" on storage.objects for insert to authenticated
  with check (bucket_id = 'media');

create policy "auth delete media bucket" on storage.objects for delete to authenticated
  using (bucket_id = 'media');