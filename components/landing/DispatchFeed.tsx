"use client";

import { useEffect, useRef, useState } from "react";
import { CircleCheck, ClipboardList, PackageCheck, Pause, Play, Receipt, Truck } from "lucide-react";
import styles from "@/app/landing.module.css";
import { DISPATCHES, FROM } from "@/components/landing/dispatches";

const STEPS = [
  { text: "Requested", Icon: ClipboardList },
  { text: "Price sent", Icon: Receipt },
  { text: "Accepted", Icon: CircleCheck },
  { text: "Out for delivery", Icon: Truck },
  { text: "Delivered", Icon: PackageCheck },
];

type Phase = "waiting" | "shown" | "gone";

/**
 * The landing page's one orchestrated moment: a steady feed of dispatch labels. Each prints
 * down out of the slot, its status steps through to "Delivered", then it feeds on through and
 * the next one prints. Pauses on hover, when the tab is hidden, or with the Pause button;
 * with reduced motion it shows one finished label, still.
 */
export function DispatchFeed() {
  const [index, setIndex] = useState(0);
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<Phase>("waiting");
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const pausedRef = useRef(false);
  const hoverRef = useRef(false);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setReduced(true);
      setPaused(true);
      setStep(STEPS.length - 1);
      setPhase("shown");
      return;
    }
    let cancelled = false;
    // A wait that stands still while paused (button, hover or hidden tab).
    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        let left = ms;
        const tick = () => {
          if (cancelled) return;
          if (!(pausedRef.current || hoverRef.current || document.hidden)) left -= 100;
          if (left <= 0) resolve();
          else setTimeout(tick, 100);
        };
        setTimeout(tick, 100);
      });

    (async () => {
      let i = 0;
      while (!cancelled) {
        setIndex(i);
        setStep(0);
        setPhase("waiting");
        await wait(200);
        if (cancelled) return;
        setPhase("shown");
        await wait(1300);
        for (let k = 1; k < STEPS.length && !cancelled; k++) {
          await wait(750);
          setStep(k);
        }
        await wait(1600);
        if (cancelled) return;
        setPhase("gone");
        await wait(900);
        i = (i + 1) % DISPATCHES.length;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const item = DISPATCHES[index];
  const { text, Icon } = STEPS[step];
  const phaseClass = reduced ? styles.still : phase === "shown" ? styles.shown : phase === "gone" ? styles.gone : "";

  return (
    <div
      className={styles.shelf}
      aria-label="Example dispatch label"
      onMouseEnter={() => (hoverRef.current = true)}
      onMouseLeave={() => (hoverRef.current = false)}
    >
      <div className={styles.slot} aria-hidden="true" />
      <div className={styles.labelClip}>
        <article className={`${styles.label} ${phaseClass}`}>
          <div className={styles.labelTop}>
            <p className={styles.src}>
              <span>From</span>
              <b>{FROM.name}</b>
              <span>{FROM.place}</span>
            </p>
            <p className={styles.src} style={{ textAlign: "right" }}>
              <span>To</span>
              <b title={item.to}>{item.to}</b>
              <span>{item.dept}</span>
            </p>
          </div>
          <h3 title={item.name}>{item.name}</h3>
          <p className={styles.pack}>{item.pack}</p>
          <dl className={styles.facts}>
            <div>
              <dt>Batch</dt>
              <dd>{item.batch}</dd>
            </div>
            <div>
              <dt>Expires</dt>
              <dd className={styles.exp}>{item.expires}</dd>
            </div>
            <div>
              <dt>Quantity</dt>
              <dd>{item.quantity}</dd>
            </div>
          </dl>
          <div className={styles.status}>
            <span className={styles.now}>
              <Icon aria-hidden="true" />
              {text}
            </span>
            <span className={styles.ref}>
              Order CN-{2041 + index}, {item.amount}
            </span>
          </div>
          <div className={styles.stepsMini} aria-hidden="true">
            {STEPS.map((s, k) => (
              <span key={s.text} className={k <= step ? styles.on : undefined} />
            ))}
          </div>
        </article>
      </div>
      {reduced ? null : (
        <div className={styles.feedControls}>
          <button type="button" className={styles.pause} aria-pressed={paused} onClick={() => setPaused((p) => !p)}>
            {paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
            {paused ? "Play" : "Pause"}
          </button>
        </div>
      )}
    </div>
  );
}
