"use client";

import { useActionState } from "react";
import { KeyRound, LoaderCircle } from "lucide-react";
import { setPasswordAction, type SetPasswordState } from "@/app/access/actions";

const initialState: SetPasswordState = { error: null };

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
        <KeyRound className="size-4" aria-hidden="true" />
      )}
      Definir password
    </button>
  );
}

export function SetPasswordForm() {
  const [state, formAction, pending] = useActionState(setPasswordAction, initialState);

  return (
    <form action={formAction} className="grid gap-4">
      <label className="grid gap-2 text-sm font-bold">
        Nova password
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          className="min-h-12 rounded-[14px] border border-[var(--bb-border)] bg-white/80 px-4 text-base font-semibold outline-none transition focus:border-[var(--bb-primary)] focus:ring-4 focus:ring-[rgba(83,183,223,0.18)]"
        />
      </label>
      <label className="grid gap-2 text-sm font-bold">
        Confirmar password
        <input
          name="password_confirm"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          className="min-h-12 rounded-[14px] border border-[var(--bb-border)] bg-white/80 px-4 text-base font-semibold outline-none transition focus:border-[var(--bb-primary)] focus:ring-4 focus:ring-[rgba(83,183,223,0.18)]"
        />
      </label>
      {state.error ? <p className="text-sm font-bold text-[#8a2530]">{state.error}</p> : null}
      <SubmitButton pending={pending} />
    </form>
  );
}
