"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

type Mode = "login" | "register";

type AccountFormProps = {
  allowRegistration?: boolean;
  initialMode?: Mode;
};

/** Hash links elsewhere on the page pick the tab: #sign-in or #create-account. */
const HASH_MODE: Record<string, Mode> = { "#sign-in": "login", "#create-account": "register" };

const labelClass = "mb-1.5 block text-[15px] font-semibold normal-case tracking-normal text-ink";

export default function AccountForm({ allowRegistration = false, initialMode = "login" }: AccountFormProps) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const isRegistration = allowRegistration && mode === "register";

  useEffect(() => {
    if (!allowRegistration) return;
    const sync = () => {
      const next = HASH_MODE[window.location.hash];
      if (next) {
        setMode(next);
        setError("");
      }
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [allowRegistration]);

  function choose(next: Mode) {
    setMode(next);
    setError("");
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(event.currentTarget);
    const body = isRegistration
      ? {
          name: form.get("name"),
          institutionName: form.get("institutionName"),
          kind: form.get("kind"),
          email: form.get("email"),
          password: form.get("password"),
        }
      : {
          email: form.get("email"),
          password: form.get("password"),
        };

    try {
      const response = await fetch(isRegistration ? "/api/auth/register" : "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data: { error?: string; home?: string } = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(
          data.error ??
            (isRegistration ? "Could not create your account." : "Could not sign in. Check your email and password."),
        );
        return;
      }

      const requestedPath = new URLSearchParams(window.location.search).get("next");
      const safePath = requestedPath?.startsWith("/") && !requestedPath.startsWith("//") ? requestedPath : null;
      router.push(safePath ?? data.home ?? (isRegistration ? "/portal" : "/dashboard"));
      router.refresh();
    } catch {
      setError("Unable to reach Parallax. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-rule bg-white p-6 shadow-panel sm:p-8">
      {allowRegistration ? (
        <div className="mb-6 flex gap-6 border-b border-rule" role="tablist" aria-label="Account">
          {(
            [
              ["register", "Create an account"],
              ["login", "Sign in"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={mode === value}
              onClick={() => choose(value)}
              className={`-mb-px border-b-2 pb-3 text-[17px] font-semibold transition-colors ${
                mode === value ? "border-pine-800 text-pine-800" : "border-transparent text-foil hover:text-pine-800"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      ) : (
        <div className="mb-6">
          <h2 className="font-display text-2xl text-pine-800">Sign in</h2>
          <p className="mt-1 text-sm text-ink/60">Use your work email and password.</p>
        </div>
      )}

      <form onSubmit={onSubmit}>
        <div className="space-y-4">
          {isRegistration ? (
            <>
              <div>
                <label htmlFor="institution-kind" className={labelClass}>
                  Organisation type
                </label>
                <select id="institution-kind" name="kind" required defaultValue="PHARMACY">
                  <option value="PHARMACY">Pharmacy</option>
                  <option value="HOSPITAL">Hospital</option>
                  <option value="CLINIC">Clinic</option>
                </select>
              </div>
              <div>
                <label htmlFor="institution-name" className={labelClass}>
                  Organisation name
                </label>
                <input
                  id="institution-name"
                  name="institutionName"
                  type="text"
                  required
                  minLength={2}
                  maxLength={150}
                  autoComplete="organization"
                />
              </div>
              <div>
                <label htmlFor="account-name" className={labelClass}>
                  Your name
                </label>
                <input id="account-name" name="name" type="text" required minLength={2} maxLength={100} autoComplete="name" />
              </div>
            </>
          ) : null}

          <div>
            <label htmlFor="account-email" className={labelClass}>
              Work email
            </label>
            <input id="account-email" name="email" type="email" required autoComplete="username" />
          </div>
          <div>
            <label htmlFor="account-password" className={labelClass}>
              Password
            </label>
            <div className="relative">
              <input
                id="account-password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                minLength={isRegistration ? 8 : 6}
                maxLength={isRegistration ? 72 : undefined}
                autoComplete={isRegistration ? "new-password" : "current-password"}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-foil hover:text-pine-800"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {isRegistration ? <p className="mt-1.5 text-sm text-foil">At least 8 characters.</p> : null}
          </div>
        </div>

        {error ? (
          <p className="mt-3 text-sm text-rust" role="alert">
            {error}
          </p>
        ) : null}
        <button className="btn btn-primary mt-6 h-12 w-full text-base" disabled={loading}>
          {loading ? (isRegistration ? "Creating account…" : "Signing in…") : isRegistration ? "Create account" : "Sign in"}
        </button>
        {allowRegistration ? (
          <p className="mt-4 text-center text-[15px] text-foil">
            {isRegistration ? "Already have an account? " : "New to Parallax? "}
            <button
              type="button"
              onClick={() => choose(isRegistration ? "login" : "register")}
              className="font-semibold text-pine-800 underline underline-offset-4"
            >
              {isRegistration ? "Sign in" : "Create an account"}
            </button>
          </p>
        ) : null}
      </form>
    </div>
  );
}
