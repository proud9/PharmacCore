import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { PasswordForm } from "@/components/auth/PasswordForm";

/** Choose a new password (required after a temporary one from the Parallax team). */
export default async function PasswordPage() {
  const user = await requireUser();
  if (!user) redirect("/api/auth/signout");
  return (
    <div className="flex min-h-screen items-center justify-center bg-parchment p-5">
      <div className="w-full max-w-md rounded-2xl border border-rule bg-white p-6 shadow-panel sm:p-8">
        <h1 className="font-display text-2xl text-pine-900">Choose a new password</h1>
        <p className="mt-1 text-sm text-ink/60">
          {user.mustChangePassword
            ? "You signed in with a temporary password. Choose your own to continue."
            : "Your other signed-in devices will be signed out."}
        </p>
        <PasswordForm />
      </div>
    </div>
  );
}
