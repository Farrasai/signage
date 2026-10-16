"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = saved ? saved === "dark" : prefersDark;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  return (
    <button
      onClick={toggle}
      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-text-muted transition-colors hover:bg-surface-2 hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal"
      aria-label={dark ? "Aktifkan mode terang" : "Aktifkan mode gelap"}
      title={dark ? "Mode terang" : "Mode gelap"}
    >
      <span aria-hidden>{dark ? "☀" : "◑"}</span>
      {dark ? "Mode Terang" : "Mode Gelap"}
    </button>
  );
}
