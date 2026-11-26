"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { CircleCheck, X } from "lucide-react";
import styles from "@/app/landing.module.css";

/**
 * One "Request a demo" dialog for the whole landing page. Any element with a `data-demo`
 * attribute opens it (hero, account aside, footer), so those buttons can stay server-rendered.
 */
export function DemoRequestDialog() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [state, setState] = useState<"form" | "sending" | "done">("form");
  const [error, setError] = useState("");

  useEffect(() => {
    function onClick(event: MouseEvent) {
      const trigger = (event.target as HTMLElement).closest("[data-demo]");
      if (!trigger) return;
      event.preventDefault();
      setState("form");
      setError("");
      dialog.current?.showModal();
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setState("sending");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/demo-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(form.entries())),
    }).catch(() => null);
    if (!response) {
      setError("Couldn't send your request. Check your connection and try again.");
      setState("form");
      return;
    }
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? "Couldn't send your request. Try again.");
      setState("form");
      return;
    }
    setState("done");
  }

  return (
    <dialog
      ref={dialog}
      className={styles.demo}
      aria-labelledby="demo-title"
      onClick={(event) => {
        if (event.target === dialog.current) dialog.current?.close();
      }}
    >
      <div className={styles.demoForm}>
        <div className={styles.demoHead}>
          <h2 id="demo-title">Request a demo</h2>
          <button type="button" className={styles.close} aria-label="Close" onClick={() => dialog.current?.close()}>
            <X aria-hidden="true" />
          </button>
        </div>

        {state === "done" ? (
          <>
            <p className={styles.demoDone} role="status">
              <CircleCheck aria-hidden="true" />
              Thanks. We&apos;ll be in touch within one working day.
            </p>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnQuiet}`}
              style={{ width: "100%", marginTop: 16 }}
              onClick={() => dialog.current?.close()}
            >
              Close
            </button>
          </>
        ) : (
          <form onSubmit={onSubmit}>
            <p className={styles.demoIntro}>Tell us about your business and we&apos;ll arrange a time to show you Parallax.</p>
            <div className={styles.field}>
              <label htmlFor="d-name">Your name</label>
              <input id="d-name" name="name" required minLength={2} maxLength={100} autoComplete="name" />
            </div>
            <div className={styles.field}>
              <label htmlFor="d-company">Business name</label>
              <input id="d-company" name="company" required minLength={2} maxLength={150} autoComplete="organization" />
            </div>
            <div className={styles.two}>
              <div className={styles.field}>
                <label htmlFor="d-phone">Phone</label>
                <input id="d-phone" name="phone" type="tel" required minLength={6} maxLength={30} autoComplete="tel" />
              </div>
              <div className={styles.field}>
                <label htmlFor="d-email">Work email</label>
                <input id="d-email" name="email" type="email" required maxLength={254} autoComplete="email" />
              </div>
            </div>
            <div className={styles.field}>
              <label htmlFor="d-notes">
                Anything we should know? <span className={styles.opt}>Optional</span>
              </label>
              <textarea id="d-notes" name="notes" rows={3} maxLength={1000} placeholder="e.g. a wholesaler with 2 warehouses and about 1,200 items" />
            </div>
            <div className={styles.honeypot} aria-hidden="true">
              <label htmlFor="d-website">Website</label>
              <input id="d-website" name="website" tabIndex={-1} autoComplete="off" />
            </div>
            {error ? (
              <p className={styles.demoError} role="alert">
                {error}
              </p>
            ) : null}
            <button className={`${styles.btn} ${styles.btnPrimary}`} disabled={state === "sending"}>
              {state === "sending" ? "Sending…" : "Request a demo"}
            </button>
          </form>
        )}
      </div>
    </dialog>
  );
}
