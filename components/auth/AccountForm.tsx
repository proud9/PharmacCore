"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

type AccountFormProps = {
  allowRegistration?: boolean;
  initialMode?: "login" | "register";
};

export default function AccountForm({
  allowRegistration = false,
  initialMode = "login",
}: AccountFormProps) {
  const router = useRouter();
  const [mode, setMode] = useState(initialMode);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const isRegistration = allowRegistration && mode === "register";

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
      setError("Unable to reach PharmaCore. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-3xl border border-pine-900/10 bg-white p-6 shadow-panel sm:p-8">
      {allowRegistration ? (
        <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-sage-100 p-1" role="group" aria-label="Account action">
          <button
            type="button"
            aria-pressed={!isRegistration}
            onClick={() => {
              setMode("login");
              setError("");
            }}
            className={`rounded-lg px-3 py-2 text-sm font-semibold ${
              !isRegistration ? "bg-white text-pine-950" : "text-ink/65 hover:text-pine-900"
            }`}
          >
            Sign in
          </button>
          <button
            id="create-account"
            type="button"
            aria-pressed={isRegistration}
            onClick={() => {
              setMode("register");
              setError("");
            }}
            className={`rounded-lg px-3 py-2 text-sm font-semibold ${
              isRegistration ? "bg-white text-pine-950" : "text-ink/65 hover:text-pine-900"
            }`}
          >
            Create account
          </button>
        </div>
      ) : null}

      <form onSubmit={onSubmit}>
        <h2 className="font-display text-2xl text-pine-900 sm:text-3xl">
          {isRegistration ? "Create an account" : "Sign in"}
        </h2>
        <p className="mt-1 text-sm text-ink/60">
          {isRegistration
            ? "Create an institution account for a pharmacy, hospital, or clinic."
            : "Use your work email and password."}
        </p>

        <div className="mt-6 space-y-4">
          {isRegistration ? (
            <>
              <div>
                <RequiredLabel htmlFor="account-name">Your name</RequiredLabel>
                <input id="account-name" name="name" type="text" required minLength={2} maxLength={100} autoComplete="name" />
              </div>
              <div>
                <RequiredLabel htmlFor="institution-name">Organization name</RequiredLabel>
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
                <RequiredLabel htmlFor="institution-kind">Organization type</RequiredLabel>
                <select id="institution-kind" name="kind" required defaultValue="">
                  <option value="" disabled>
                    Select an organization type
                  </option>
                  <option value="PHARMACY">Pharmacy</option>
                  <option value="HOSPITAL">Hospital</option>
                  <option value="CLINIC">Clinic</option>
                </select>
              </div>
            </>
          ) : null}

          <div>
            <RequiredLabel htmlFor="account-email">Email</RequiredLabel>
            <input id="account-email" name="email" type="email" required autoComplete="username" />
          </div>
          <div>
            <RequiredLabel htmlFor="account-password">Password</RequiredLabel>
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
                className="absolute inset-y-0 right-0 flex items-center px-3 text-pine-700/70 hover:text-pine-900"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {isRegistration ? <p className="mt-1 text-xs text-ink/60">Use at least 8 characters.</p> : null}
          </div>
        </div>

        {error ? (
          <p className="mt-3 text-sm text-rust" role="alert">
            {error}
          </p>
        ) : null}
        <button className="btn btn-primary mt-6 w-full" disabled={loading}>
          {loading ? (isRegistration ? "Creating account…" : "Signing in…") : isRegistration ? "Create account" : "Sign in"}
        </button>
      </form>
    </div>
  );
}

function RequiredLabel({ htmlFor, children }: { htmlFor: string; children: string }) {
  return (
    <label htmlFor={htmlFor}>
      {children}
      <span className="ml-1 text-rust" aria-hidden="true">
        *
      </span>
    </label>
  );
}
