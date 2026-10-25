"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Display, PairingCode, Playlist, Profile, Bidang } from "@/lib/types";
import { BIDANG_OPTIONS } from "@/lib/types";
import { PAIRING_CODE_TTL_MINUTES, generatePairingCode, generateSlug, playerUrlFor, formatDateTime, isOnline } from "@/lib/utils";
import { canEditDisplay, isAdmin } from "@/lib/auth";
import Modal from "@/components/Modal";
import RemoteControls from "@/components/RemoteControls";

export default function DisplaysPage() {
  const [displays, setDisplays] = useState<Display[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newBidang, setNewBidang] = useState<Bidang>("TU");
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Display | null>(null);
  const [pairingCodes, setPairingCodes] = useState<Record<string, PairingCode>>({});
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const [{ data: d }, { data: p }, { data: c }, { data: prof }] = await Promise.all([
      supabase.from("displays").select("*").order("created_at", { ascending: false }),
      supabase.from("playlists").select("*").order("name"),
      supabase.from("display_pairing_codes").select("*"),
      supabase.from("profiles").select("*").eq("id", (await supabase.auth.getUser()).data.user?.id ?? "").maybeSingle(),
    ]);
    setDisplays(d ?? []);
    setPlaylists(p ?? []);
    const codeMap: Record<string, PairingCode> = {};
    (c ?? []).forEach((row) => { codeMap[row.display_id] = row as PairingCode; });
    setPairingCodes(codeMap);
    if (prof) setProfile(prof as Profile);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const supabase = createClient();
    const channel = supabase.channel("displays-pairing-codes").on("postgres_changes", { event: "*", schema: "public", table: "display_pairing_codes" }, load).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  async function generateCode(displayId: string) {
    setGeneratingId(displayId);
    const supabase = createClient();
    await supabase.from("display_pairing_codes").delete().eq("display_id", displayId);
    const expiresAt = new Date(Date.now() + PAIRING_CODE_TTL_MINUTES * 60_000).toISOString();
    for (let attempt = 0; attempt < 5; attempt++) {
      const { error } = await supabase.from("display_pairing_codes").insert({ display_id: displayId, code: generatePairingCode(), expires_at: expiresAt });
      if (!error) break;
    }
    setGeneratingId(null); load();
  }
  async function copyCode(code: string, displayId: string) {
    await navigator.clipboard.writeText(code);
    setCopiedCodeId(displayId); setTimeout(() => setCopiedCodeId(null), 1500);
  }
  async function createDisplay(e: React.FormEvent) {
    e.preventDefault(); if (!newName.trim()) return;
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const bidangVal = isAdmin(profile) ? newBidang : (profile?.bidang ?? null);
    await supabase.from("displays").insert({ name: newName.trim(), slug: generateSlug(newName), owner_id: user?.id ?? null, bidang: bidangVal });
    setSaving(false); setNewName(""); setShowAdd(false); load();
  }
  async function updateDisplay(id: string, patch: Partial<Display>) {
    const supabase = createClient();
    await supabase.from("displays").update(patch).eq("id", id);
    setDisplays((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  }
  async function deleteDisplay(id: string) {
    const supabase = createClient();
    await supabase.from("displays").delete().eq("id", id);
    setConfirmDelete(null); load();
  }
  async function copyUrl(slug: string, id: string) {
    await navigator.clipboard.writeText(playerUrlFor(slug));
    setCopiedId(id); setTimeout(() => setCopiedId(null), 1500);
  }

  return (
    <div>
      <div className="bg-emerald-600 mb-6 rounded-2xl p-6 text-white shadow-lg">
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-extrabold">Kelola Layar & TV</h2>
            <p className="mt-1 max-w-xl text-sm text-white/80">Buka URL-nya langsung di browser TV, atau pasangkan lewat kode PIN dari <span className="font-mono font-bold text-lime-200">/display</span> — praktis untuk TV yang dikendalikan remote.</p>
          </div>
          <button data-testid="add-display-button" onClick={() => setShowAdd(true)} className="cursor-pointer rounded-xl bg-lime-400 px-4 py-2.5 text-sm font-extrabold text-emerald-950 shadow hover:bg-lime-300">+ Tambah Layar Baru</button>
        </div>
      </div>

      {!loading && displays.length === 0 && (
        <div data-testid="displays-empty" className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-slate-500 dark:border-slate-800 dark:bg-slate-900">Belum ada layar. Klik &ldquo;Tambah Layar Baru&rdquo; untuk mulai.</div>
      )}

      <div className="space-y-5">
        {displays.map((d) => {
          const online = isOnline(d.last_seen);
          const code = pairingCodes[d.id];
          const canEdit = !profile || canEditDisplay(profile, d);
          return (
            <div key={d.id} data-testid={`display-row-${d.id}`} className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm min-w-0 dark:border-slate-800 dark:bg-slate-900">
              <div className={`relative flex items-center justify-between px-4 py-3 ${online ? "emerald-wave-pattern text-white" : "emerald-wave-offline text-white"}`}>
                <div className="relative min-w-0">
                  <input defaultValue={d.name} onBlur={(e)=>{ if(e.target.value.trim() && e.target.value!==d.name) updateDisplay(d.id,{name:e.target.value.trim()}); }} className="w-full max-w-xs bg-transparent font-extrabold text-white placeholder:text-white/60 outline-none" placeholder="Nama layar" disabled={!canEdit} title={canEdit?"":"Hanya pemilik bidang dapat mengedit"} />
                  <p className="font-mono text-xs text-lime-200/90">{d.slug} {d.bidang ? ` · ${d.bidang}` : ""}</p>
                </div>
                <span className={`relative shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${online?"bg-white text-emerald-700":"bg-slate-700 text-slate-200"}`}>● {online?"Online":"Offline"}</span>
              </div>
              <div className="space-y-4 p-4">
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-500 dark:text-slate-400">Playlist default</label>
                    <select value={d.default_playlist_id ?? ""} onChange={(e)=>updateDisplay(d.id,{default_playlist_id: e.target.value || null})} className="w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                      <option value="">— Belum diatur —</option>
                      {playlists.map((p)=>(<option key={p.id} value={p.id}>{p.name}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                      <span>Teks berjalan (marquee)</span>
                      <button type="button" onClick={()=>updateDisplay(d.id,{marquee_enabled: !d.marquee_enabled})} className={`cursor-pointer rounded-full px-2 py-0.5 text-[10px] font-bold ${d.marquee_enabled?"bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300":"bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"}`}>{d.marquee_enabled?"Aktif":"Nonaktif"}</button>
                    </label>
                    <input defaultValue={d.marquee_text} placeholder="Contoh: Selamat datang" onBlur={(e)=>{ if(e.target.value!==d.marquee_text) updateDisplay(d.id,{marquee_text: e.target.value}); }} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none placeholder:text-slate-400 focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                  <div className="flex items-center gap-2"><RemoteControls displayId={d.id} isPaused={d.is_paused} /></div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-slate-400">Terakhir aktif: {formatDateTime(d.last_seen)}</span>
                    <button onClick={()=>copyUrl(d.slug, d.id)} className="cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">{copiedId===d.id?"Tersalin!":"Salin URL"}</button>
                    <a href={`/display/${d.slug}`} target="_blank" rel="noreferrer" className="cursor-pointer rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">Buka ↗</a>
                    <button data-testid={`delete-display-${d.id}`} onClick={()=>setConfirmDelete(d)} className="cursor-pointer rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 font-semibold text-rose-600 hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">Hapus</button>
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 p-3.5 dark:bg-slate-800/50">
                  <p className="text-xs font-bold tracking-wide text-slate-500 dark:text-slate-400">Kode Pairing (/display)</p>
                  {code ? (
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <span className="rounded-xl bg-white px-4 py-2 font-mono text-lg font-extrabold tracking-widest text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white">{code.code}</span>
                      <span className="text-xs text-slate-500">kedaluwarsa {formatDateTime(code.expires_at)}</span>
                      <div className="ml-auto flex gap-2">
                        <button onClick={()=>copyCode(code.code, d.id)} disabled={!canEdit} className="cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">{copiedCodeId===d.id?"Tersalin!":"Salin kode"}</button>
                        <button onClick={()=>generateCode(d.id)} disabled={generatingId===d.id || !canEdit} className="cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">Buat kode baru</button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <p className="text-xs text-slate-500">Belum ada kode pairing aktif untuk layar ini.</p>
                      <button data-testid={`generate-pairing-code-${d.id}`} onClick={()=>generateCode(d.id)} disabled={generatingId===d.id || !canEdit} className="cursor-pointer rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">{generatingId===d.id?"Membuat...":"Buat Kode Pairing"}</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {showAdd && (
        <Modal title="Tambah layar baru" onClose={() => setShowAdd(false)}>
          <form onSubmit={createDisplay} className="space-y-4">
            <div>
              {isAdmin(profile) && (
                <div className="mb-3">
                  <label className="mb-1.5 block text-sm font-medium text-slate-600 dark:text-slate-300">Bidang</label>
                  <select value={newBidang} onChange={(e)=>setNewBidang(e.target.value as Bidang)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                    {BIDANG_OPTIONS.map((o)=>(<option key={o.value} value={o.value}>{o.label}</option>))}
                  </select>
                </div>
              )}
              <label className="mb-1.5 block text-sm font-medium text-slate-600 dark:text-slate-300">Nama layar</label>
              <input data-testid="display-name-input" autoFocus value={newName} onChange={(e)=>setNewName(e.target.value)} placeholder="Contoh: TV Lobby Utama" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
            </div>
            <button data-testid="display-submit" type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 w-full cursor-pointer rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow hover:opacity-95 disabled:opacity-50">{saving ? "Menyimpan..." : "Buat layar"}</button>
          </form>
        </Modal>
      )}
      {confirmDelete && (
        <Modal title="Hapus layar?" onClose={() => setConfirmDelete(null)}>
          <p className="text-sm text-slate-500 dark:text-slate-400"><span className="font-semibold text-slate-900 dark:text-white">{confirmDelete.name}</span> akan dihapus permanen. Jadwal yang terhubung ke layar ini juga akan terhapus.</p>
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={()=>setConfirmDelete(null)} className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300">Batal</button>
            <button onClick={()=>deleteDisplay(confirmDelete.id)} className="cursor-pointer rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-500">Hapus</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
