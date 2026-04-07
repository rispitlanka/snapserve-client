"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const LOTTIE_ANIMATION_URL =
  "https://lottie.host/fde6671f-7321-419a-8a09-b2c930c4c1a0/5WQICui6gO.lottie";

const DOTLOTTIE_WC_CDN =
  "https://unpkg.com/@lottiefiles/dotlottie-wc@latest/dist/dotlottie-wc.js";

const LOAD_DURATION_MS = 2500;
const FADE_MS = 320;

/**
 * Button-triggered loading flow using the `dotlottie-wc` web component (LottieFiles CDN).
 * Overlay and animation stay hidden until "Load Data" is clicked.
 */
export default function LoadDataLottieOverlay() {
  const [isBusy, setIsBusy] = useState(false);
  const [overlayMounted, setOverlayMounted] = useState(false);
  const [overlayShown, setOverlayShown] = useState(false);
  const loadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (document.querySelector("script[data-dotlottie-wc]")) return;

    const script = document.createElement("script");
    script.type = "module";
    script.src = DOTLOTTIE_WC_CDN;
    script.async = true;
    script.dataset.dotlottieWc = "";
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    return () => {
      if (loadTimerRef.current) clearTimeout(loadTimerRef.current);
    };
  }, []);

  const finishClosing = useCallback(() => {
    setOverlayMounted(false);
    setIsBusy(false);
  }, []);

  const handleOverlayTransitionEnd = useCallback(
    (event: React.TransitionEvent<HTMLDivElement>) => {
      if (event.target !== event.currentTarget) return;
      if (event.propertyName !== "opacity") return;
      if (!overlayShown && overlayMounted) finishClosing();
    },
    [overlayShown, overlayMounted, finishClosing]
  );

  const handleLoadData = useCallback(() => {
    if (isBusy) return;

    setIsBusy(true);
    setOverlayMounted(true);
    setOverlayShown(false);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => setOverlayShown(true));
    });

    if (loadTimerRef.current) clearTimeout(loadTimerRef.current);
    loadTimerRef.current = setTimeout(() => {
      loadTimerRef.current = null;
      setOverlayShown(false);
    }, LOAD_DURATION_MS);
  }, [isBusy]);

  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center gap-6 p-8">
      <button
        type="button"
        onClick={handleLoadData}
        disabled={isBusy}
        className="rounded-xl bg-slate-900 px-8 py-3.5 text-sm font-semibold tracking-tight text-white shadow-lg shadow-slate-900/25 transition hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:opacity-45 dark:bg-brand-500 dark:shadow-brand-500/20 dark:hover:bg-brand-600 dark:focus-visible:outline-brand-500"
      >
        Load Data
      </button>

      {overlayMounted ? (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center bg-slate-900/45 p-6 backdrop-blur-[2px] transition-opacity duration-320 ease-out dark:bg-black/55"
          style={{ opacity: overlayShown ? 1 : 0 }}
          onTransitionEnd={handleOverlayTransitionEnd}
          role="status"
          aria-live="polite"
          aria-busy={overlayShown}
        >
          <div
            className="flex max-w-[min(100%,20rem)] flex-col items-center justify-center rounded-2xl bg-white/95 px-10 py-8 shadow-2xl ring-1 ring-black/6 transition-all duration-320 ease-out dark:bg-gray-900/95 dark:ring-white/10"
            style={{
              opacity: overlayShown ? 1 : 0,
              transform: overlayShown ? "translateY(0) scale(1)" : "translateY(8px) scale(0.98)",
              transitionDuration: `${FADE_MS}ms`,
            }}
          >
            <div className="flex h-44 w-44 items-center justify-center [&_dotlottie-wc]:block [&_dotlottie-wc]:h-full [&_dotlottie-wc]:w-full">
              <dotlottie-wc
                src={LOTTIE_ANIMATION_URL}
                autoplay
                loop
                suppressHydrationWarning
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
