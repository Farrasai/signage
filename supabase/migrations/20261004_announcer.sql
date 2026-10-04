-- ============================================================
-- Announcer Queue — antrean pengumuman bersuara
-- Jalankan di Supabase Dashboard > SQL Editor
-- ============================================================

-- Storage bucket untuk file audio (terpisah dari bucket media)
insert into storage.buckets (id, name, public)
values ('announcer', 'announcer', true)
on conflict (id) do nothing;

drop policy if exists "public read announcer bucket" on storage.objects;
create policy "public read announcer bucket" on storage.objects for select
  using (bucket_id = 'announcer');

drop policy if exists "auth upload announcer bucket" on storage.objects;
create policy "auth upload announcer bucket" on storage.objects for insert to authenticated
  with check (bucket_id = 'announcer');

drop policy if exists "auth delete announcer bucket" on storage.objects;
create policy "auth delete announcer bucket" on storage.objects for delete to authenticated
  using (bucket_id = 'announcer');

-- Tabel antrean FIFO: setiap baris = satu pengumuman
create table if not exists announcer_queue (
  id uuid primary key default gen_random_uuid(),
  label text not null default 'Pengumuman',
  audio_url text not null,
  -- Berapa kali audio diputar sebelum otomatis berhenti: 1, 2, atau 3
  repeat_count int not null default 1 check (repeat_count between 1 and 3),
  -- Kosong ('{}') = semua layar. Tidak kosong = hanya layar yang terdaftar.
  target_display_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_announcer_queue_created
  on announcer_queue(created_at asc);

-- Realtime: player TV perlu tahu INSERT (item baru) dan DELETE (dibatalkan)
alter publication supabase_realtime add table announcer_queue;

-- RLS
alter table announcer_queue enable row level security;

drop policy if exists "public read announcer_queue" on announcer_queue;
create policy "public read announcer_queue" on announcer_queue for select using (true);

drop policy if exists "auth insert announcer_queue" on announcer_queue;
create policy "auth insert announcer_queue" on announcer_queue
  for insert to authenticated with check (true);

drop policy if exists "auth delete announcer_queue" on announcer_queue;
create policy "auth delete announcer_queue" on announcer_queue
  for delete to authenticated using (true);

