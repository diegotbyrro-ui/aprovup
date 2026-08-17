"use client";

import { useRouter } from "next/navigation";

import {
  LeadActionResult,
  updateLeadAction,
} from "@/app/(sales)/crm/actions/lead-actions";
import {
  Building2,
  LoaderCircle,
  Save,
  X,
} from "lucide-react";
import {
  useActionState,
  useEffect,
} from "react";
import type { Lead } from "./crm-board";

const initialState: LeadActionResult = {
  success: false,
  message: "",
};

type EditLeadFormProps = {
  lead: Lead;
  onClose: () => void;
};

export function EditLeadForm({
  lead,
  onClose,
}: EditLeadFormProps) {
  const router = useRouter();

  const [state, formAction, isPending] =
    useActionState(
      updateLeadAction,
      initialState
    );

  useEffect(() => {
    if (!state.success) {
      return;
    }

    const timer = window.setTimeout(() => {
      /*
       * APROVUP_CRM_REFRESH_AFTER_EDIT
       */
      router.refresh();
      onClose();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [state.success, onClose, router]);

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        aria-labelledby="edit-lead-title"
        aria-modal="true"
        className="lead-modal"
        role="dialog"
      >
        <div className="lead-modal-header">
          <div>
            <span className="panel-kicker">
              EDITAR EMPRESA
            </span>

            <h2 id="edit-lead-title">
              {lead.company_name}
            </h2>

            <p>
              Atualize os dados comerciais da empresa.
            </p>
          </div>

          <button
            aria-label="Fechar formulário"
            className="modal-close-button"
            disabled={isPending}
            onClick={onClose}
            type="button"
          >
            <X size={19} />
          </button>
        </div>

        <form action={formAction} className="lead-form">
          <input
            name="lead_id"
            type="hidden"
            value={lead.id}
          />

          <div className="lead-form-section">
            <div className="lead-form-section-title">
              <Building2 size={17} />

              <div>
                <strong>
                  Informações da empresa
                </strong>

                <span>
                  Dados principais da oportunidade.
                </span>
              </div>
            </div>

            <div className="lead-form-grid">
              <label className="field-full">
                Nome da empresa *
                <input
                  defaultValue={lead.company_name}
                  name="company_name"
                  required
                  type="text"
                />
              </label>

              <label>
                Segmento
                <input
                  defaultValue={lead.segment ?? ""}
                  name="segment"
                  type="text"
                />
              </label>

              <label>
                Cidade
                <input
                  defaultValue={lead.city ?? ""}
                  name="city"
                  type="text"
                />
              </label>

              <label>
                Estado
                <input
                  defaultValue={lead.state ?? ""}
                  maxLength={2}
                  name="state"
                  type="text"
                />
              </label>

              <label>
                Site
                <input
                  defaultValue={lead.website ?? ""}
                  name="website"
                  type="text"
                />
              </label>

              <label>
                Instagram
                <input
                  defaultValue={
                    lead.instagram ?? ""
                  }
                  name="instagram"
                  type="text"
                />
              </label>

              <label>
                Telefone
                <input
                  defaultValue={lead.phone ?? ""}
                  name="phone"
                  type="text"
                />
              </label>

              <label>
                WhatsApp
                <input
                  defaultValue={
                    lead.whatsapp ?? ""
                  }
                  name="whatsapp"
                  type="text"
                />
              </label>

              <label className="field-full">
                E-mail
                <input
                  defaultValue={lead.email ?? ""}
                  name="email"
                  type="email"
                />
              </label>
            </div>
          </div>

          <div className="lead-form-section">
            <div className="lead-form-section-title">
              <Building2 size={17} />

              <div>
                <strong>
                  Decisor e negociação
                </strong>

                <span>
                  Dados para priorização comercial.
                </span>
              </div>
            </div>

            <div className="lead-form-grid">
              <label>
                Nome do decisor
                <input
                  defaultValue={
                    lead.decision_maker_name ??
                    ""
                  }
                  name="decision_maker_name"
                  type="text"
                />
              </label>

              <label>
                Cargo
                <input
                  defaultValue={
                    lead.decision_maker_role ??
                    ""
                  }
                  name="decision_maker_role"
                  type="text"
                />
              </label>

              <label>
                Valor estimado mensal
                <input
                  defaultValue={String(
                    lead.estimated_value ?? 0
                  )}
                  inputMode="decimal"
                  name="estimated_value"
                  type="text"
                />
              </label>

              <label>
                Temperatura
                <select
                  defaultValue={lead.temperature}
                  name="temperature"
                >
                  <option value="cold">Frio</option>
                  <option value="warm">Morno</option>
                  <option value="hot">Quente</option>
                </select>
              </label>

              <label>
                Prioridade
                <select
                  defaultValue={lead.priority}
                  name="priority"
                >
                  <option value="low">Baixa</option>
                  <option value="medium">
                    Média
                  </option>
                  <option value="high">Alta</option>
                </select>
              </label>

              <label className="field-full">
                Próxima ação
                <input
                  defaultValue={
                    lead.next_action ?? ""
                  }
                  name="next_action"
                  type="text"
                />
              </label>

              <label className="field-full">
                Observações
                <textarea
                  defaultValue={lead.notes ?? ""}
                  name="notes"
                  rows={4}
                />
              </label>
            </div>
          </div>

          {state.message && !state.success && (
            <div
              className="form-error"
              role="alert"
            >
              {state.message}
            </div>
          )}

          <div className="lead-form-actions">
            <button
              className="secondary-button"
              disabled={isPending}
              onClick={onClose}
              type="button"
            >
              Cancelar
            </button>

            <button
              className="primary-button"
              disabled={isPending}
              type="submit"
            >
              {isPending ? (
                <>
                  <LoaderCircle
                    className="loading-icon"
                    size={17}
                  />
                  Salvando...
                </>
              ) : (
                <>
                  <Save size={17} />
                  Salvar alterações
                </>
              )}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}