"use client";

import { useState, useTransition } from "react";
import { Ban, X } from "lucide-react";
import {
  blockProspect,
  type BlockReason,
} from "@/app/(sales)/crm/prospector/actions/blocklist-actions";

const reasons: BlockReason[] = [
  "Ex-cliente",
  "Não temos interesse",
  "Ticket incompatível",
  "Empresa concorrente",
  "Empresa duplicada",
  "Já está no CRM",
  "Outro",
];

type BlockProspectButtonProps = {
  companyName: string;
  website?: string | null;
  onBlocked?: () => void;
};

export function BlockProspectButton({
  companyName,
  website,
  onBlocked,
}: BlockProspectButtonProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] =
    useState<BlockReason>("Não temos interesse");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleBlock() {
    setMessage("");

    startTransition(async () => {
      const result = await blockProspect({
        companyName,
        website,
        reason,
        notes,
      });

      setMessage(result.message);

      if (result.success) {
        setOpen(false);
        onBlocked?.();
      }
    });
  }

  return (
    <>
      <button
        className="prospector-block-button"
        onClick={() => setOpen(true)}
        type="button"
      >
        <Ban size={16} />
        Não prospectar
      </button>

      {open && (
        <div
          className="prospector-block-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setOpen(false);
            }
          }}
        >
          <section
            aria-labelledby="block-prospect-title"
            aria-modal="true"
            className="prospector-block-modal"
            role="dialog"
          >
            <header>
              <div>
                <span>LISTA DE EXCLUSÃO</span>

                <h2 id="block-prospect-title">
                  Não prospectar esta empresa
                </h2>

                <p>
                  A empresa será removida dos resultados e não deverá
                  aparecer nas próximas pesquisas.
                </p>
              </div>

              <button
                aria-label="Fechar"
                className="prospector-block-close"
                onClick={() => setOpen(false)}
                type="button"
              >
                <X size={19} />
              </button>
            </header>

            <div className="prospector-block-company">
              <small>Empresa</small>
              <strong>{companyName}</strong>
            </div>

            <label>
              Motivo da exclusão

              <select
                onChange={(event) =>
                  setReason(event.target.value as BlockReason)
                }
                value={reason}
              >
                {reasons.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Observação opcional

              <textarea
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Ex.: já foi cliente e não queremos retomar o contato."
                rows={3}
                value={notes}
              />
            </label>

            {message && (
              <p className="prospector-block-message">
                {message}
              </p>
            )}

            <footer>
              <button
                className="prospector-block-cancel"
                disabled={isPending}
                onClick={() => setOpen(false)}
                type="button"
              >
                Cancelar
              </button>

              <button
                className="prospector-block-confirm"
                disabled={isPending}
                onClick={handleBlock}
                type="button"
              >
                <Ban size={16} />

                {isPending
                  ? "Bloqueando..."
                  : "Confirmar exclusão"}
              </button>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}