-- ============================================================
-- Master Pengumuman Terjadwal (Announcements)
-- Jalankan di Supabase Dashboard > SQL Editor
-- ============================================================

create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  label text not null default 'Pengumuman',
  audio_url text not null,
  time time not null, -- format HH:MI:SS atau HH:MI
  days_of_week text[] not null default '{}', -- kosong ('{}') = berlaku setiap hari
  repeat_count int not null default 1 check (repeat_count between 1 and 3),
  target_display_ids uuid[] not null default '{}', -- kosong ('{}') = semua layar
  is_enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_announcements_time on announcements(time);

-- Realtime broadcast untuk sinkronisasi live TV player dan dashboard
alter publication supabase_realtime add table announcements;

-- Row Level Security
alter table announcements enable row level security;

-- Anon (TV Player) hanya boleh membaca pengumuman aktif
drop policy if exists "public read announcements" on announcements;
create policy "public read announcements" on announcements for select using (true);

-- Authenticated (Admin) boleh kelola pengumuman (insert, update, delete)
drop policy if exists "auth insert announcements" on announcements;
create policy "auth insert announcements" on announcements
  for insert to authenticated with check (true);

drop policy if exists "auth update announcements" on announcements;
create policy "auth update announcements" on announcements
  for update to authenticated using (true) with check (true);

drop policy if exists "auth delete announcements" on announcements;
create policy "auth delete announcements" on announcements
  for delete to authenticated using (true);

