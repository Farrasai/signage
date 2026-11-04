import type { TableContent } from "@/lib/types";
import { sanitizeText } from "@/lib/sanitize";

/** Ukuran font & padding otomatis menyesuaikan jumlah baris agar tetap terbaca dari jarak jauh. */
function sizingFor(rowCount: number) {
  if (rowCount <= 6) return { fontSize: "1.85rem", pad: "1.15rem 1.5rem" };
  if (rowCount <= 10) return { fontSize: "1.4rem", pad: "0.9rem 1.25rem" };
  if (rowCount <= 16) return { fontSize: "1.1rem", pad: "0.65rem 1rem" };
  return { fontSize: "0.9rem", pad: "0.45rem 0.75rem" };
}

/**
 * Tabel agenda untuk layar TV.
 *
 * Tema TERANG sengaja dipilih (dulu hitam pekat #0a0c10 dengan header oranye
 * transparan) karena sulit dibaca dari jarak jauh:
 * - Background putih + isi sel slate-900 BOLD -> kontras ~17:1.
 * - Header emerald-600 solid + teks putih BOLD -> kontras ~5.5:1 (WCAG AA).
 * - Zebra emerald-50 agar batas antarbaris terlihat tanpa garis berat.
 * Jangan dikembalikan ke latar gelap tanpa menguji ulang di TV.
 */
export default function AgendaTable({ title, columns, rows }: TableContent) {
  const { fontSize, pad } = sizingFor(rows.length || 1);

  return (
    <div className="flex h-full w-full flex-col bg-white px-8 py-8 sm:px-16 sm:py-12">
      {title && (
        <h1 className="mb-6 shrink-0 text-3xl font-bold text-slate-900 sm:text-5xl">
          {sanitizeText(title)}
        </h1>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-slate-200">
        <table className="w-full border-collapse" style={{ fontSize }}>
          <thead>
            <tr>
              {columns.map((col, i) => (
                <th
                  key={i}
                  className="sticky top-0 border-b-2 border-emerald-700 bg-emerald-600 text-left font-bold text-white"
                  style={{ padding: pad }}
                >
                  {sanitizeText(col)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className={ri % 2 === 0 ? "bg-emerald-50" : "bg-white"}>
                {columns.map((_, ci) => (
                  <td
                    key={ci}
                    className="border-b border-slate-200 align-top font-bold text-slate-900"
                    style={{ padding: pad }}
                  >
                    {sanitizeText(row[ci] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
