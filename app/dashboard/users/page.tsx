"use client";
import { useCallback, useEffect, useState } from "react";
import type { Profile } from "@/lib/types";
import { BIDANG_OPTIONS } from "@/lib/types";
import Modal from "@/components/Modal";
import Pagination from "@/components/Pagination";
import { useToast } from "@/lib/toast";
export default function UsersPage() {
  const toast = useToast();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [bidang, setBidang] = useState("TU");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Profile | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [page, setPage] = useState(1);
  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/admin/users", { cache: "no-store" });
    const j = await r.json();
    if (r.ok) setProfiles(j.profiles ?? []);
    else setError(j.error ?? "Gagal memuat user.");
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(()=>{ if(page>Math.max(1, Math.ceil(profiles.length/10))) setPage(Math.max(1, Math.ceil(profiles.length/10))); }, [profiles.length, page]);
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setError(null); setSaving(true);
    const r = await fetch("/api/admin/create-user", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password, bidang }) });
    const j = await r.json(); setSaving(false);
    if (!r.ok) { setError(j.error ?? "Gagal"); toast.error(j.error ?? "Gagal membuat user."); return; }
    toast.success(`Operator ${email} berhasil dibuat.`);
    setEmail(""); setPassword(""); setBidang("TU"); setShowAdd(false); load();
  }
  async function handleDelete(p: Profile) {
    setDeleting(true);
    const r = await fetch("/api/admin/users/" + p.id, { method: "DELETE" });
    const j = await r.json(); setDeleting(false);
    if (!r.ok) { toast.error(j.error ?? "Gagal menghapus user."); return; }
    toast.success(`User ${p.email} dihapus.`);
    setConfirmDelete(null); load();
  }
  return (
    <div>
      <div className="mb-5 flex justify-end"><button data-testid="add-user-button" onClick={() => setShowAdd(true)} className="bg-emerald-600 hover:bg-emerald-700 cursor-pointer rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow">+ Buat Operator</button></div>
      {error && <p data-testid="user-form-error" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</p>}
      {loading ? <p className="text-sm text-slate-500">Memuat...</p> : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto"><table className="min-w-[640px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-bold uppercase dark:bg-slate-800">
              <tr><th className="px-4 py-3">Email</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Bidang</th><th className="px-4 py-3 text-right">Aksi</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {(() => { const _ps=10; const _tp=Math.max(1,Math.ceil(profiles.length/_ps)); const paginated=profiles.slice((Math.min(page,_tp)-1)*_ps, Math.min(page,_tp)*_ps); return (<>{paginated.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3">{p.email}</td>
                  <td className="px-4 py-3"><span className={p.role === "admin" ? "bg-slate-900 text-white rounded-full px-2.5 py-1 text-xs font-bold" : "bg-emerald-600 text-white rounded-full px-2.5 py-1 text-xs font-bold"}>{p.role === "admin" ? "Administrator" : "Operator Bidang"}</span></td>
                  <td className="px-4 py-3">{p.bidang ?? "-"}</td>
                  <td className="px-4 py-3 text-right">{p.role !== "admin" ? <button onClick={() => setConfirmDelete(p)} className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-bold text-rose-600">Hapus</button> : <span>-</span>}</td>
                </tr>
              ))} </>);})()}
            </tbody>
          </table></div>
          <div className="border-t border-slate-100 px-4 py-3 dark:border-slate-800"><Pagination page={page} totalPages={Math.max(1, Math.ceil(profiles.length/10))} onPageChange={setPage} /></div>
        </div>
      )}
      {showAdd && (
        <Modal title="Buat Operator Bidang" onClose={() => setShowAdd(false)}>
          <form onSubmit={handleCreate} className="space-y-4" noValidate>
            <input data-testid="user-email-input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email" className="w-full rounded-xl border px-3 py-2" />
            <input data-testid="user-password-input" type="text" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password min 6" className="w-full rounded-xl border px-3 py-2" />
            <select data-testid="user-bidang-select" value={bidang} onChange={(e) => setBidang(e.target.value)} className="w-full rounded-xl border px-3 py-2">
              {BIDANG_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
            </select>
            <button data-testid="user-submit" type="submit" disabled={saving} className="w-full bg-emerald-600 text-white rounded-xl py-2 font-bold">{saving ? "Membuat..." : "Buat Operator"}</button>
          </form>
        </Modal>
      )}
      {confirmDelete && (
        <Modal title="Hapus operator?" onClose={() => setConfirmDelete(null)}>
          <p>Hapus {confirmDelete.email}?</p>
          <button onClick={() => handleDelete(confirmDelete)} disabled={deleting} className="bg-rose-600 text-white rounded-xl px-4 py-2">Hapus</button>
        </Modal>
      )}
    </div>
  );
}
