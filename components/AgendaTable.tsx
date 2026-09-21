import type { TableContent } from "@/lib/types";

/** Ukuran font & padding otomatis menyesuaikan jumlah baris agar tetap terbaca dari jarak jauh. */
function sizingFor(rowCount: number) {
  if (rowCount <= 6) return { fontSize: "1.85rem", pad: "1.15rem 1.5rem" };
  if (rowCount <= 10) return { fontSize: "1.4rem", pad: "0.9rem 1.25rem" };
  if (rowCount <= 16) return { fontSize: "1.1rem", pad: "0.65rem 1rem" };
  return { fontSize: "0.9rem", pad: "0.45rem 0.75rem" };
}

export default function AgendaTable({ title, columns, rows }: TableContent) {
  const { fontSize, pad } = sizingFor(rows.length || 1);

  return (
    <div className="flex h-full w-full flex-col bg-[#0a0c10] px-8 py-8 sm:px-16 sm:py-12">
      {title && (
        <h1 className="mb-6 shrink-0 font-display text-3xl font-semibold text-white sm:text-5xl">
          {title}
        </h1>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-white/10">
        <table className="w-full border-collapse" style={{ fontSize }}>
          <thead>
            <tr>
              {columns.map((col, i) => (
                <th
                  key={i}
                  className="sticky top-0 border-b border-white/10 bg-[#ff6a3d]/15 text-left font-semibold text-[#ff6a3d]"
                  style={{ padding: pad }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className={ri % 2 === 0 ? "bg-white/[0.03]" : ""}>
                {columns.map((_, ci) => (
                  <td
                    key={ci}
                    className="border-b border-white/5 align-top text-white/90"
                    style={{ padding: pad }}
                  >
                    {row[ci] ?? ""}
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