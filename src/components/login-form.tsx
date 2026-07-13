"use client";

import { useActionState } from "react";
import { LoaderCircle, LogIn } from "lucide-react";
import { loginWithPasswordAction, type LoginState } from "@/app/access/actions";

const initialLoginState: LoginState = { error: null };

function SubmitButton({ pending }: { pending: boolean }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[var(--bb-black)] px-5 text-sm font-extrabold text-white shadow-[0_16px_34px_rgba(0,0,0,0.14)] transition hover:bg-[var(--bb-primary)] hover:text-[var(--bb-black)] disabled:cursor-wait disabled:opacity-70"
    >
      {pending ? (
        <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
      ) : (
        <LogIn className="size-4" aria-hidden="true" />
      )}
      Entrar
    </button>
  );
}

export function LoginForm({ initialState = initialLoginState }: { initialState?: LoginState }) {
  const [state, formAction, pending] = useActionState(loginWithPasswordAction, initialState);

  return (
    <form action={formAction} className="grid gap-4">
      <label className="grid gap-2 text-sm font-bold">
        Email
        <input
          name="email"
          type="email"
          autoComplete="email"
          autoFocus
          required
          className="min-h-12 rounded-[14px] border border-[var(--bb-border)] bg-white/80 px-4 text-base font-semibold outline-none transition focus:border-[var(--bb-primary)] focus:ring-4 focus:ring-[rgba(83,183,223,0.18)]"
        />
      </label>
      <label className="grid gap-2 text-sm font-bold">
        Password
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="min-h-12 rounded-[14px] border border-[var(--bb-border)] bg-white/80 px-4 text-base font-semibold outline-none transition focus:border-[var(--bb-primary)] focus:ring-4 focus:ring-[rgba(83,183,223,0.18)]"
        />
      </label>
      {state.error ? <p className="text-sm font-bold text-[#8a2530]">{state.error}</p> : null}
      <SubmitButton pending={pending} />
    </form>
  );
}
