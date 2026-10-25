"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type ToastKind = "success" | "error" | "info";

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
  /** true saat mulai animasi keluar */
  leaving?: boolean;
}

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const AUTO_DISMISS_MS = 4000;
const LEAVE_MS = 200;

/**
 * Kunci sessionStorage untuk pesan yang harus tampil setelah navigasi penuh
 * (mis. sukses login yang langsung redirect ke /dashboard, atau logout).
 */
export const PENDING_TOAST_KEY = "siaran:pending-toast";

interface PendingToast {
  kind: ToastKind;
  message: string;
}

/** Antrekan toast untuk ditampilkan pada halaman berikutnya (setelah redirect). */
export function queueToast(kind: ToastKind, message: string) {
  try {
    const payload: PendingToast = { kind, message };
    sessionStorage.setItem(PENDING_TOAST_KEY, JSON.stringify(payload));
  } catch {
    // sessionStorage tidak tersedia - abaikan, toast hanya hilang
  }
}

function readPendingToast(): PendingToast | null {
  try {
    const raw = sessionStorage.getItem(PENDING_TOAST_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(PENDING_TOAST_KEY);
    const parsed = JSON.parse(raw) as PendingToast;
    if (!parsed || typeof parsed.message !== "string") return null;
    if (parsed.kind !== "success" && parsed.kind !== "error" && parsed.kind !== "info") return null;
    return parsed;
  } catch {
    return null;
  }
}

const ICONS: Record<ToastKind, string> = {
  success: "\u2713",
  error: "\u26a0",
  info: "\u2139",
};

const ACCENT: Record<ToastKind, { bar: string; icon: string }> = {
  success: { bar: "bg-emerald-500", icon: "text-emerald-600 dark:text-emerald-400" },
  error: { bar: "bg-rose-500", icon: "text-rose-600 dark:text-rose-400" },
  info: { bar: "bg-sky-500", icon: "text-sky-600 dark:text-sky-400" },
};

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const remove = useCallback((id: number) => {
    // tandai leaving agar animasi keluar berjalan, lalu buang dari state
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    const existing = timers.current.get(id);
    if (existing) clearTimeout(existing);
    const leaveTimer = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      timers.current.delete(id);
    }, LEAVE_MS);
    timers.current.set(id, leaveTimer);
  }, []);

  const push = useCallback(
    (kind: ToastKind, message: string) => {
      const id = nextId++;
      setToasts((prev) => [...prev, { id, kind, message }]);
      const timer = setTimeout(() => remove(id), AUTO_DISMISS_MS);
      timers.current.set(id, timer);
    },
    [remove]
  );

  // Bersihkan semua timer saat unmount
  useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach((t) => clearTimeout(t));
      map.clear();
    };
  }, []);

  // Tampilkan toast "pending" (hasil navigasi penuh, mis. login/logout)
  useEffect(() => {
    const pending = readPendingToast();
    if (pending) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      push(pending.kind, pending.message);
    }
  }, [push]);

  const api = useMemo<ToastApi>(
    () => ({
      success: (m) => push("success", m),
      error: (m) => push("error", m),
      info: (m) => push("info", m),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={remove} />
    </ToastContext.Provider>
  );
}

function ToastViewport({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div
      data-testid="toast-viewport"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-4 sm:items-end sm:px-0"
      aria-live="polite"
      role="status"
    >
      {toasts.map((t) => {
        const accent = ACCENT[t.kind];
        return (
          <div
            key={t.id}
            data-testid={`toast-${t.kind}`}
            className={`pointer-events-auto relative flex w-full max-w-sm items-start gap-3 overflow-hidden rounded-xl border border-slate-200 bg-white p-3.5 pl-4 shadow-lg transition-all duration-200 dark:border-slate-700 dark:bg-slate-900 ${
              t.leaving ? "translate-y-2 opacity-0" : "translate-y-0 opacity-100"
            }`}
          >
            <span className={`absolute left-0 top-0 h-full w-1 ${accent.bar}`} aria-hidden />
            <span className={`mt-0.5 text-base font-bold leading-none ${accent.icon}`} aria-hidden>
              {ICONS[t.kind]}
            </span>
            <p className="flex-1 text-sm leading-snug text-slate-800 dark:text-slate-100">{t.message}</p>
            <button
              type="button"
              onClick={() => onDismiss(t.id)}
              className="shrink-0 cursor-pointer rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              aria-label="Tutup notifikasi"
            >
              {"\u2715"}
            </button>
          </div>
        );
      })}
    </div>
  );
}

/** Hook untuk memicu toast dari komponen client mana pun di bawah ToastProvider. */
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fallback aman: jangan crash kalau dipakai di luar provider (mis. test).
    return {
      success: (m) => console.log("[toast:success]", m),
      error: (m) => console.error("[toast:error]", m),
      info: (m) => console.log("[toast:info]", m),
    };
  }
  return ctx;
}
