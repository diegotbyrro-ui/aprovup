"use client";

import {
  importLeadsAction,
  type ImportLeadsActionResult,
} from "@/app/(sales)/crm/actions/import-leads-action";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardPaste,
  FileSpreadsheet,
  LoaderCircle,
  Upload,
  X,
} from "lucide-react";
import {
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";

const initialState: ImportLeadsActionResult = {
  success: false,
  message: "",
  imported: 0,
  skipped: 0,
  errors: [],
};

const exampleContent = `Socitec;Construção;https://socitec.com.br;@socitec;+5582999999999;+5582999999999;contato@socitec.com.br;Maceió;AL;Rodrigo;Diretor;2800;warm;high;Apresentação inicial enviada
Reycon Empreendimentos;Construção;https://site.com.br;@reycon;+5582999999999;+5582999999999;contato@reycon.com.br;Maceió;AL;Nome do decisor;Diretor;4000;warm;high;Empresa pesquisada para prospecção`;

export function ImportLeadsForm() {
  const [open, setOpen] = useState(false);

  const [state, action, isPending] =
    useActionState(
      importLeadsAction,
      initialState
    );

  const formRef = useRef<HTMLFormElement>(null);
  const textAreaRef =
    useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state.success]);

  function useExample() {
    if (!textAreaRef.current) {
      return;
    }

    textAreaRef.current.value =
      exampleContent;
  }

  return (
    <>
      <button
        className="secondary-button import-leads-open-button"
        onClick={() => setOpen(true)}
        type="button"
      >
        <Upload size={16} />
        Importar empresas
      </button>

      {open && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setOpen(false);
            }
          }}
        >
          <section className="lead-modal import-leads-modal">
            <div className="lead-modal-header">
              <div>
                <span className="panel-kicker">
                  IMPORTAÇÃO EM MASSA
                </span>

                <h2>
                  Cadastrar várias empresas
                </h2>

                <p>
                  Cole uma empresa por linha,
                  separando os campos com
                  ponto e vírgula.
                </p>
              </div>

              <button
                aria-label="Fechar importação"
                className="modal-close-button"
                onClick={() => setOpen(false)}
                type="button"
              >
                <X size={18} />
              </button>
            </div>

            <form
              action={action}
              className="import-leads-form"
              ref={formRef}
            >
              <div className="import-format-card">
                <div>
                  <FileSpreadsheet size={20} />

                  <div>
                    <strong>
                      Ordem das colunas
                    </strong>

                    <span>
                      Os campos não obrigatórios
                      podem ficar vazios.
                    </span>
                  </div>
                </div>

                <code>
                  empresa; segmento; site;
                  instagram; telefone; whatsapp;
                  email; cidade; estado; decisor;
                  cargo; valor; temperatura;
                  prioridade; observações
                </code>
              </div>

              <label className="import-textarea-label">
                Empresas para importar

                <textarea
                  name="companies"
                  placeholder="Cole aqui uma empresa por linha..."
                  ref={textAreaRef}
                  required
                  rows={12}
                />
              </label>

              <div className="import-help-grid">
                <article>
                  <strong>Temperatura</strong>
                  <span>
                    cold, warm ou hot
                  </span>
                </article>

                <article>
                  <strong>Prioridade</strong>
                  <span>
                    low, medium ou high
                  </span>
                </article>

                <article>
                  <strong>Valor</strong>
                  <span>
                    Ex.: 2800 ou 2.800
                  </span>
                </article>
              </div>

              <button
                className="text-button import-example-button"
                onClick={useExample}
                type="button"
              >
                <ClipboardPaste size={15} />
                Inserir exemplo
              </button>

              {state.message && (
                <div
                  className={
                    state.success
                      ? "form-success"
                      : "form-error"
                  }
                  role="status"
                >
                  {state.success ? (
                    <CheckCircle2 size={16} />
                  ) : (
                    <AlertCircle size={16} />
                  )}

                  <div>
                    <strong>
                      {state.message}
                    </strong>

                    {state.skipped > 0 && (
                      <span>
                        {state.skipped} duplicada
                        {state.skipped !== 1
                          ? "s"
                          : ""}{" "}
                        ignorada
                        {state.skipped !== 1
                          ? "s"
                          : ""}.
                      </span>
                    )}
                  </div>
                </div>
              )}

              {state.errors.length > 0 && (
                <div className="import-error-list">
                  {state.errors
                    .slice(0, 5)
                    .map((error) => (
                      <span key={error}>
                        {error}
                      </span>
                    ))}
                </div>
              )}

              <div className="lead-form-actions">
                <button
                  className="secondary-button"
                  onClick={() =>
                    setOpen(false)
                  }
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
                      Importando...
                    </>
                  ) : (
                    <>
                      <Upload size={16} />
                      Importar empresas
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