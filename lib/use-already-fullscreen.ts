"use client";

import { useEffect, useState } from "react";

/**
 * true bila viewport SUDAH memenuhi layar penuh, sehingga tombol "Layar penuh"
 * tidak perlu ditampilkan.
 *
 * `display-mode` saja TIDAK cukup: WebView di dalam APK (Capacitor/Cordova/
 * WebView murni) tanpa manifest PWA melaporkan `(display-mode: browser)` walau
 * sebenarnya sudah penuh layar. Karena itu ditambah heuristik ukuran: di APK,
 * `innerWidth/innerHeight` praktis sama dengan `screen.width/height`; di Chrome
 * desktop selisihnya puluhan-ratusan px (ada chrome bar, tab bar, dst).
 */
export function useAlreadyFullscreen() {
  const [already, setAlready] = useState(false);

  useEffect(() => {
    const check = () => {
      const byMode =
        window.matchMedia("(display-mode: fullscreen)").matches ||
        window.matchMedia("(display-mode: standalone)").matches;
      const bySize =
        Math.abs(window.innerWidth - window.screen.width) < 2 &&
        Math.abs(window.innerHeight - window.screen.height) < 2;
      setAlready(byMode || bySize || Boolean(document.fullscreenElement));
    };

    check();
    window.addEventListener("resize", check);
    document.addEventListener("fullscreenchange", check);
    return () => {
      window.removeEventListener("resize", check);
      document.removeEventListener("fullscreenchange", check);
    };
  }, []);

  return already;
}