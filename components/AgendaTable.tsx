"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { TableContent } from "@/lib/types";
import { sanitizeText } from "@/lib/sanitize";

/** Batas bawah font: di bawah ini sudah tidak terbaca dari jarak jauh. */
const MIN_FONT_PX = 10;
/** Batas atas font: tanpa ini tabel 2 baris jadi raksasa. */
const MAX_FONT_PX = 44;
/** Perkiraan tinggi satu baris = 2.4 x font (line-height 1.25 + padding em 1.0). */
const ROW_FACTOR = 2.4;
/** Pengaman agar loop pengukuran tidak pernah berjalan tanpa henti. */
const MAX_SHRINK_STEPS = 40;

/**
 * Tabel agenda untuk layar TV — selalu FIT, tidak di-scroll.
 *
 * Kenapa font TIDAK lagi memakai angka rem tetap:
 * Smart TV / Android TV WebView sering melaporkan CSS viewport hanya 540-720 px
 * (lalu meng-upscale internal), sementara nilai rem tetap membuat tabel jadi
 * 1.5-2x kebesaran di sana sehingga overflow dan harus digulir. Sebaliknya di
 * panel 1080p angka rem yang sama justru membuat teks terlalu kecil dan ruang
 * terbuang. Solusinya: ukur tinggi panel yang benar-benar tersedia, lalu
 * turunkan font sampai muat. Ini juga menangani sel dengan teks panjang yang
 * wrap jadi 2-3 baris — sesuatu yang tidak bisa diprediksi dari jumlah baris.
 *
 * Tema TERANG sengaja dipilih (dulu hitam pekat #0a0c10 dengan header oranye
 * transparan) karena sulit dibaca dari jarak jauh:
 * - Background putih + isi sel slate-900 BOLD -> kontras ~17:1.
 * - Header emerald-600 solid + teks putih BOLD -> kontras ~5.5:1 (WCAG AA).
 * - Zebra emerald-50 agar batas antarbaris terlihat tanpa garis berat.
 * Jangan dikembalikan ke latar gelap tanpa menguji ulang di TV.
 */
export default function AgendaTable({ title, columns, rows }: TableContent) {
  const boxRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  /** null = belum diukur; selama null tabel memakai ukuran berbasis viewport. */
  const [fontPx, setFontPx] = useState<number | null>(null);

  useLayoutEffect(() => {
    const box = boxRef.current;
    const table = tableRef.current;
    if (!box || !table) return;

    const availH = box.clientHeight;
    // Panel belum ter-layout (mis. lapis prefetch) -> biarkan ukuran CSS default.
    if (availH <= 0) return;

    // 1) Estimasi awal dari tinggi panel, bukan dari rem tetap.
    const rowCount = Math.max(1, rows.length);
    let px = Math.min(MAX_FONT_PX, availH / ((rowCount + 1) * ROW_FACTOR));
    px = Math.max(MIN_FONT_PX, px);
    table.style.fontSize = `${px}px`;

    // 2) Perkecil bertahap sampai benar-benar muat (menangani sel yang wrap).
    let guard = 0;
    while (box.scrollHeight > availH && px > MIN_FONT_PX && guard < MAX_SHRINK_STEPS) {
      px = Math.max(MIN_FONT_PX, px * 0.94);
      table.style.fontSize = `${px}px`;
      guard++;
    }

    // 3) Komit sekali agar tidak memicu render berulang.
    setFontPx(px);
  }, [rows, columns, title]);

  return (
    <div className="flex h-full w-full flex-col bg-white px-6 py-4 sm:px-12 sm:py-6">
      {title && (
        <h1
          className="mb-3 shrink-0 overflow-hidden font-bold text-slate-900"
          style={{
            fontSize: "clamp(1.25rem, 3.2vh, 3rem)",
            lineHeight: 1.15,
            display: "-webkit-box",
            WebkitLineClamp: 1,
            WebkitBoxOrient: "vertical",
          }}
        >
          {sanitizeText(title)}
        </h1>
      )}
      {/* Failsafe: scroll hanya aktif bila font sudah menyentuh batas minimum. */}
      <div ref={boxRef} className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-slate-200">
        <table
          ref={tableRef}
          className="w-full border-collapse"
          style={{
            // Sebelum terukur: perkiraan berbasis viewport supaya tidak ada lonjakan.
            fontSize: fontPx ? `${fontPx}px` : "clamp(0.7rem, 2.2vh, 2.6rem)",
            lineHeight: 1.25,
          }}
        >
          <thead>
            <tr>
              {columns.map((col, i) => (
                <th
                  key={i}
                  className="sticky top-0 border-b-2 border-emerald-700 bg-emerald-600 text-left font-bold text-white"
                  style={{ padding: "0.5em 0.9em", overflowWrap: "anywhere" }}
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
                    style={{ padding: "0.5em 0.9em", overflowWrap: "anywhere" }}
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