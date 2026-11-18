"use client";

import { useEffect, useState } from "react";
import styles from "@/app/landing.module.css";

const LINKS = [
  { id: "supply-chain", label: "Supply chain" },
  { id: "how", label: "How orders work" },
  { id: "included", label: "What's included" },
  { id: "contact", label: "Contact" },
];

/** Centre links; marks the one for the section crossing the middle of the screen (Contact at the very bottom). */
export function LandingNav() {
  const [current, setCurrent] = useState("");

  useEffect(() => {
    const ids = ["supply-chain", "how", "included", "account"];
    function update() {
      if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 4) return setCurrent("contact");
      const middle = window.innerHeight / 2;
      const passed = ids.filter((id) => {
        const el = document.getElementById(id);
        return el ? el.getBoundingClientRect().top <= middle : false;
      });
      setCurrent(passed.pop() ?? "");
    }
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <nav className={styles.navLinks} aria-label="Main">
      {LINKS.map((link) => (
        <a key={link.id} href={`#${link.id}`} aria-current={current === link.id ? "true" : undefined}>
          {link.label}
        </a>
      ))}
    </nav>
  );
}
