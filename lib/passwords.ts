import { randomInt } from "node:crypto";

/** A temporary password the owner must change at first sign-in. Readable over the phone. */
export function temporaryPassword() {
  const words = ["Maize", "River", "Copper", "Falls", "Baobab", "Kafue", "Zambezi", "Lusaka", "Savanna", "Sunrise"];
  const pick = () => words[randomInt(words.length)];
  return `${pick()}-${pick()}-${randomInt(1000, 10000)}`;
}
