"use client";

import {
  useState,
  useTransition,
} from "react";

import {
  generatePasswordResetLinkAction,
} from "./actions";


type Props = {
  userId: string;
  userName: string;
};


export function PasswordResetLinkButton({
  userId,
  userName,
}: Props) {

  const [
    isPending,
    startTransition,
  ] =
    useTransition();


  const [
    generatedLink,
    setGeneratedLink,
  ] =
    useState("");


  const [
    expiresAt,
    setExpiresAt,
  ] =
    useState("");


  const [
    message,
    setMessage,
  ] =
    useState("");


  const [
    error,
    setError,
  ] =
    useState("");


  function generateLink() {

    const confirmation =
      window.confirm(
        `Gerar um link de redefinição de senha para ${userName}? O link anterior, se existir, será invalidado.`
      );


    if (!confirmation) {
      return;
    }


    setError("");
    setMessage("");


    startTransition(
      async () => {

        const result =
          await generatePasswordResetLinkAction(
            userId
          );


        if (!result.ok) {

          setGeneratedLink("");
          setExpiresAt("");

          setError(
            result.error
          );

          return;
        }


        const absoluteLink =
          `${window.location.origin}${result.path}`;


        setGeneratedLink(
          absoluteLink
        );


        setExpiresAt(
          result.expiresAt
        );


        try {

          await navigator.clipboard.writeText(
            absoluteLink
          );

          setMessage(
            "Link criado e copiado automaticamente."
          );

        }
        catch {

          setMessage(
            "Link criado. Copie manualmente abaixo."
          );
        }
      }
    );
  }


  async function copyLink() {

    if (!generatedLink) {
      return;
    }


    try {

      await navigator.clipboard.writeText(
        generatedLink
      );

      setMessage(
        "Link copiado."
      );

    }
    catch {

      setMessage(
        "Selecione o endereço e copie manualmente."
      );
    }
  }


  return (

    <div className="space-y-2">

      <button
        type="button"
        disabled={isPending}
        onClick={generateLink}
        className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending
          ? "Gerando..."
          : generatedLink
            ? "Gerar novo link"
            : "Redefinir senha"}
      </button>


      {error ? (

        <div className="max-w-md rounded-lg border border-red-100 bg-red-50 p-2 text-xs font-semibold text-red-700">
          {error}
        </div>

      ) : null}


      {generatedLink ? (

        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-slate-50 p-3">

          <div className="mb-2 flex items-center justify-between gap-3">

            <div>
              <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Link de redefinição
              </div>

              <div className="mt-0.5 text-[11px] font-semibold text-amber-600">
                Válido por 30 minutos
              </div>
            </div>


            <button
              type="button"
              onClick={copyLink}
              className="rounded-md bg-slate-900 px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-slate-700"
            >
              Copiar link
            </button>

          </div>


          <input
            type="text"
            value={generatedLink}
            readOnly
            onFocus={(event) =>
              event.currentTarget.select()
            }
            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-[11px] text-slate-600 outline-none"
          />


          <div className="mt-2 text-[11px] text-slate-500">

            Expira às{" "}

            {new Date(
              expiresAt
            ).toLocaleTimeString(
              "pt-BR",
              {
                hour:
                  "2-digit",

                minute:
                  "2-digit",
              }
            )}

          </div>


          {message ? (

            <div className="mt-2 text-[11px] font-semibold text-emerald-600">
              {message}
            </div>

          ) : null}

        </div>

      ) : null}

    </div>
  );
}