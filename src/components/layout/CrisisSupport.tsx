"use client";

/**
 * CrisisSupport
 * -------------
 * Always-available 988 Suicide & Crisis Lifeline widget.
 *
 * Placement: fixed bottom-left, on every page, so it is reachable from
 * anywhere without colliding with the Donate / Join Us actions (top-right).
 *
 * Animation: a slow ~4s "breathing" pulse plus a soft heartbeat. Deliberately
 * calm, never a fast flash, since alarming motion is harmful to people in
 * distress. Fades in gently after load so it does not fight the hero. Honors
 * the visitor's "reduce motion" setting.
 *
 * Self-contained: no external libraries, no trackers, no data collection.
 * Colors pull from the site's brand tokens with safe fallbacks.
 */

import { useEffect, useState } from "react";

export default function CrisisSupport() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className={`cs-root${open ? " cs-open" : ""}`}>
      <style>{CS_STYLES}</style>

      <button
        type="button"
        className="cs-fab"
        aria-expanded={open}
        aria-controls="cs-card"
        aria-label="Open crisis support — 988 Suicide and Crisis Lifeline"
        onClick={() => setOpen(true)}
      >
        <svg className="cs-heart" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 21s-7.5-4.9-10-9.2C.4 8.6 2 5 5.4 5c2 0 3.3 1.1 4.1 2.3.4.6 1.4.6 1.8 0C12.1 6.1 13.4 5 15.4 5 18.8 5 20.4 8.6 22 11.8 19.5 16.1 12 21 12 21z" />
        </svg>
        Need to talk?
      </button>

      <div
        id="cs-card"
        className="cs-card"
        role="dialog"
        aria-modal="false"
        aria-labelledby="cs-title"
      >
        <div className="cs-card-head">
          <button
            type="button"
            className="cs-close"
            aria-label="Close crisis support"
            onClick={() => setOpen(false)}
          >
            &times;
          </button>
          <h3 id="cs-title">You matter. Help is here.</h3>
          <p>
            If you or someone you love is struggling or in crisis, the 988
            Suicide &amp; Crisis Lifeline is free, confidential, and available
            24/7.
          </p>
        </div>

        <div className="cs-actions">
          <a className="cs-btn cs-primary" href="tel:988">
            <svg className="cs-ic" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.6.1.4 0 .8-.3 1l-2.2 2.2z" />
            </svg>
            <span>Call 988<small>Talk to a counselor now</small></span>
          </a>

          <a className="cs-btn" href="sms:988">
            <svg className="cs-ic" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M4 4h16c1.1 0 2 .9 2 2v10c0 1.1-.9 2-2 2H8l-4 4V6c0-1.1.9-2 2-2z" />
            </svg>
            <span>Text 988<small>Prefer to type? Text instead</small></span>
          </a>

          <a
            className="cs-btn"
            href="https://988lifeline.org/chat/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg className="cs-ic" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 3c1.7 0 3 1.6 3 3.5S13.7 12 12 12s-3-1.6-3-3.5S10.3 5 12 5zM6.3 17.4a6.9 6.9 0 0111.4 0A8 8 0 0112 20a8 8 0 01-5.7-2.6z" />
            </svg>
            <span>Chat online<small>988lifeline.org</small></span>
          </a>
        </div>

        <div className="cs-foot">
          988 is available across the U.S. and U.S. territories, including the
          U.S. Virgin Islands. In an immediate emergency, call 911.
        </div>
      </div>
    </div>
  );
}

const CS_STYLES = `
.cs-root {
  position: fixed;
  left: 20px;
  bottom: 20px;
  z-index: 9999;
  font-family: var(--font-public-sans), system-ui, sans-serif;
  --cs-primary: var(--color-primary, #0047ab);
  --cs-teal: var(--color-secondary, #006a6a);
  --cs-teal-light: #2bb3ab;
  --cs-gold: var(--color-harvest-gold, #e5b80b);
  --cs-ink: #191c1d;
}
.cs-fab {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 13px 18px 13px 16px;
  border: none;
  border-radius: 999px;
  cursor: pointer;
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.2px;
  background: linear-gradient(135deg, var(--cs-teal-light) 0%, var(--cs-teal) 55%, var(--cs-primary) 100%);
  box-shadow: 0 10px 26px rgba(0,71,171,0.34), 0 2px 6px rgba(0,0,0,0.18);
  opacity: 0;
  transform: translateY(16px);
  animation: cs-enter 700ms cubic-bezier(.16,.84,.44,1) 1200ms forwards;
}
.cs-fab:focus-visible { outline: 3px solid var(--cs-primary); outline-offset: 3px; }
.cs-fab::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: 999px;
  background: var(--cs-teal-light);
  z-index: -1;
  animation: cs-breathe 4.2s ease-in-out infinite;
}
@keyframes cs-breathe {
  0%   { transform: scale(1);    opacity: 0.55; }
  50%  { transform: scale(1.28); opacity: 0;    }
  100% { transform: scale(1);    opacity: 0;    }
}
@keyframes cs-enter { to { opacity: 1; transform: translateY(0); } }
.cs-heart { width: 20px; height: 20px; flex: none; animation: cs-heartbeat 4.2s ease-in-out infinite; }
@keyframes cs-heartbeat {
  0%, 46%, 58%, 100% { transform: scale(1); }
  52% { transform: scale(1.18); }
}
.cs-card {
  position: absolute;
  left: 0;
  bottom: 0;
  width: min(340px, calc(100vw - 40px));
  background: #fff;
  color: var(--cs-ink);
  border-radius: 18px;
  box-shadow: 0 18px 48px rgba(0,25,70,0.30), 0 3px 10px rgba(0,0,0,0.14);
  border-top: 4px solid var(--cs-gold);
  overflow: hidden;
  transform-origin: left bottom;
  opacity: 0;
  transform: translateY(10px) scale(0.96);
  pointer-events: none;
  transition: opacity 220ms ease, transform 260ms cubic-bezier(.16,.84,.44,1);
}
.cs-open .cs-card { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }
.cs-open .cs-fab { display: none; }
.cs-card-head {
  position: relative;
  background: linear-gradient(135deg, var(--cs-primary) 0%, var(--cs-teal) 130%);
  color: #fff;
  padding: 18px 18px 16px;
}
.cs-card-head h3 { margin: 0 0 4px; font-size: 18px; font-weight: 800; }
.cs-card-head p { margin: 0; font-size: 13px; opacity: 0.92; line-height: 1.45; }
.cs-close {
  position: absolute; top: 10px; right: 10px;
  width: 32px; height: 32px; border-radius: 50%;
  border: none; cursor: pointer;
  background: rgba(255,255,255,0.18); color: #fff;
  font-size: 18px; line-height: 1; display: grid; place-items: center;
}
.cs-close:hover { background: rgba(255,255,255,0.30); }
.cs-close:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
.cs-actions { padding: 14px; display: grid; gap: 10px; }
.cs-btn {
  display: flex; align-items: center; gap: 12px;
  text-decoration: none;
  padding: 12px 14px;
  border-radius: 12px;
  font-weight: 700; font-size: 15px;
  border: 1.5px solid #e2e5ea;
  color: var(--cs-ink);
  background: #f8f9fa;
  transition: transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease;
}
.cs-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(0,71,171,0.12); border-color: var(--cs-teal); }
.cs-btn:focus-visible { outline: 3px solid var(--cs-teal); outline-offset: 2px; }
.cs-btn .cs-ic { width: 22px; height: 22px; flex: none; color: var(--cs-teal); }
.cs-btn small { display: block; font-weight: 500; font-size: 12px; opacity: 0.75; }
.cs-primary { background: linear-gradient(135deg, var(--cs-teal) 0%, var(--cs-primary) 130%); color: #fff; border-color: transparent; }
.cs-primary .cs-ic { color: #fff; }
.cs-foot { padding: 0 16px 16px; font-size: 11.5px; color: #5a5f6a; line-height: 1.45; }
@media (prefers-reduced-motion: reduce) {
  .cs-fab, .cs-fab::before, .cs-heart, .cs-card { animation: none !important; transition: none !important; }
  .cs-fab { opacity: 1; transform: none; }
}
`;
