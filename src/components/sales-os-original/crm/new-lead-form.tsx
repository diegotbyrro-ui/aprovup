"use client";

import { createLeadAction } from "@/app/(sales)/crm/actions/lead-actions";
import {
  Building2,
  LoaderCircle,
  Plus,
  X,
} from "lucide-react";
import {
  useActionState,
  useEffect,
  useState,
} from "react";

const initialState = {
  success: false,
  message: "",
};

export function NewLeadForm() {
  const [isOpen, setIsOpen] = useState(false);

  const [state, formAction, isPending] = useActionState(
    createLeadAction,
    initialState
  );

  useEffect(() => {
    if (!state.success) {
      return;
    }

    const closeTimer = window.setTimeout(() => {
      setIsOpen(false);
    }, 0);

    return () => {
      window.clearTimeout(closeTimer);
    };
  }, [state.success]);

  return (
    <>
      <button
        className="primary-button"
        onClick={() => setIsOpen(true)}
        type="button"
      >
        <Plus size={17} />
        Novo lead
      </button>

      {isOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setIsOpen(false);
            }
          }}
        >
          <section
            aria-labelledby="new-lead-title"
            aria-modal="true"
            className="lead-modal"
            role="dialog"
          >
            <div className="lead-modal-header">
              <div>
                <span className="panel-kicker">
                  NOVA OPORTUNIDADE
                </span>

                <h2 id="new-lead-title">
                  Cadastrar empresa
                </h2>

                <p>
                  Adicione uma empresa ao pipeline comercial.
                </p>
              </div>

              <button
                aria-label="Fechar formulário"
                className="modal-close-button"
                onClick={() => setIsOpen(false)}
                type="button"
              >
                <X size={19} />
              </button>
            </div>

            <form action={formAction} className="lead-form">
              <div className="lead-form-section">
                <div className="lead-form-section-title">
                  <Building2 size={17} />

                  <div>
                    <strong>Informações da empresa</strong>
                    <span>Dados principais da oportunidade.</span>
                  </div>
                </div>

                <div className="lead-form-grid">
                  <label className="field-full">
                    Nome da empresa *
                    <input
                      name="company_name"
                      placeholder="Ex.: Socitech"
                      required
                      type="text"
                    />
                  </label>

                  <label>
                    Segmento
                    <input
                      name="segment"
                      placeholder="Ex.: Construção civil"
                      type="text"
                    />
                  </label>

                  <label>
                    Cidade
                    <input
                      defaultValue="Maceió"
                      name="city"
                      placeholder="Cidade"
                      type="text"
                    />
                  </label>

                  <label>
                    Estado
                    <input
                      defaultValue="AL"
                      maxLength={2}
                      name="state"
                      placeholder="AL"
                      type="text"
                    />
                  </label>

                  <label>
                    Site
                    <input
                      name="website"
                      placeholder="https://empresa.com.br"
                      type="url"
                    />
                  </label>

                  <label>
                    Instagram
                    <input
                      name="instagram"
                      placeholder="@empresa"
                      type="text"
                    />
                  </label>

                  <label>
                    Telefone
                    <input
                      name="phone"
                      placeholder="(82) 0000-0000"
                      type="text"
                    />
                  </label>

                  <label>
                    WhatsApp
                    <input
                      name="whatsapp"
                      placeholder="(82) 90000-0000"
                      type="text"
                    />
                  </label>

                  <label className="field-full">
                    E-mail
                    <input
                      name="email"
                      placeholder="contato@empresa.com.br"
                      type="email"
                    />
                  </label>
                </div>
              </div>

              <div className="lead-form-section">
                <div className="lead-form-section-title">
                  <Building2 size={17} />

                  <div>
                    <strong>Decisor e negociação</strong>
                    <span>
                      Informações comerciais para priorização.
                    </span>
                  </div>
                </div>

                <div className="lead-form-grid">
                  <label>
                    Nome do decisor
                    <input
                      name="decision_maker_name"
                      placeholder="Nome do contato"
                      type="text"
                    />
                  </label>

                  <label>
                    Cargo
                    <input
                      name="decision_maker_role"
                      placeholder="Diretor, proprietário..."
                      type="text"
                    />
                  </label>

                  <label>
                    Valor estimado mensal
                    <input
                      inputMode="decimal"
                      name="estimated_value"
                      placeholder="2500"
                      type="text"
                    />
                  </label>

                  <label>
                    Temperatura
                    <select defaultValue="cold" name="temperature">
                      <option value="cold">Frio</option>
                      <option value="warm">Morno</option>
                      <option value="hot">Quente</option>
                    </select>
                  </label>

                  <label>
                    Prioridade
                    <select defaultValue="medium" name="priority">
                      <option value="low">Baixa</option>
                      <option value="medium">Média</option>
                      <option value="high">Alta</option>
                    </select>
                  </label>

                  <label className="field-full">
                    Próxima ação
                    <input
                      name="next_action"
                      placeholder="Ex.: Ligar na segunda-feira"
                      type="text"
                    />
                  </label>

                  <label className="field-full">
                    Observações
                    <textarea
                      name="notes"
                      placeholder="Informações importantes sobre a empresa..."
                      rows={4}
                    />
                  </label>
                </div>
              </div>

              {state.message && !state.success && (
                <div className="form-error" role="alert">
                  {state.message}
                </div>
              )}

              <div className="lead-form-actions">
                <button
                  className="secondary-button"
                  disabled={isPending}
                  onClick={() => setIsOpen(false)}
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
                      <Plus size={17} />
                      Cadastrar lead
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}