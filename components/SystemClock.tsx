"use client";

import { useEffect, useState } from "react";

const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

export default function SystemClock() {
  const [now, setNow] = useState<Date | null>(null);
  const [serverOffsetMs, setServerOffsetMs] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;
    
    // Sinkronisasi dengan server time untuk offset
    const fetchTime = async () => {
      try {
        const clientSent = Date.now();
        const res = await fetch("/api/time", { cache: "no-store" });
        if (res.ok && !cancelled) {
          const { time } = await res.json();
          const serverTime = new Date(time).getTime();
          const roundtrip = Date.now() - clientSent;
          setServerOffsetMs(serverTime - (clientSent + roundtrip / 2));
        }
      } catch (e) {
        console.warn("Gagal sinkronisasi waktu server", e);
      }
    };

    fetchTime();
    
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    // Tick tiap detik
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(new Date(Date.now() + serverOffsetMs));
    const interval = setInterval(() => {
      setNow(new Date(Date.now() + serverOffsetMs));
    }, 1000);
    return () => clearInterval(interval);
  }, [serverOffsetMs]);

  if (!now) return null;

  const dayName = DAYS[now.getDay()];
  const dateNum = now.getDate();
  const monthName = MONTHS[now.getMonth()];
  const year = now.getFullYear();

  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");

  const formattedTime = `${dayName}, ${dateNum} ${monthName} ${year} ${hours}:${minutes}:${seconds} WIB`;

  return (
    <div className="px-1 py-2 text-xs text-text-muted" title="Waktu Server Sistem">
      {formattedTime}
    </div>
  );
}
