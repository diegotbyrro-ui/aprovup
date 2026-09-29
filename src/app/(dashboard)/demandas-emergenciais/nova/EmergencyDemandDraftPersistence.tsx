'use client';

import {
  CheckCircle2,
  Clock3,
  FileWarning,
  Trash2,
} from 'lucide-react';

import {
  useEffect,
  useRef,
  useState,
} from 'react';


const DRAFT_MAX_AGE_MS =
  7 *
  24 *
  60 *
  60 *
  1000;


const ACK_COOKIE =
  'aprovup_emergency_draft_ack';


const FIELD_NAMES = [
  'clientId',
  'title',
  'briefing',
  'fileLinks',
  'caption',
  'requester',
  'area',
  'deadline',
] as const;


type DraftPayload = {
  version:
    2;

  savedAt:
    number;

  values:
    Record<
      string,
      string
    >;

  attachmentNames:
    string[];
};


type SaveState =
  | 'READY'
  | 'RESTORED'
  | 'SAVED';


function getField(
  form:
    HTMLFormElement,

  name:
    string
) {

  return form.querySelector<
    | HTMLInputElement
    | HTMLTextAreaElement
    | HTMLSelectElement
  >(
    `[name="${name}"]`
  );
}


function parseDraft(
  raw:
    string | null
) {

  if (!raw) {
    return null;
  }


  try {

    const draft =
      JSON.parse(
        raw
      ) as DraftPayload;


    if (
      !draft ||
      draft.version !==
        2 ||
      !draft.savedAt ||
      !draft.values ||
      Date.now() -
          draft.savedAt >
        DRAFT_MAX_AGE_MS
    ) {

      return null;
    }


    return draft;

  }
  catch {

    return null;
  }
}


function readCookie(
  name:
    string
) {

  const prefix =
    encodeURIComponent(
      name
    ) +
    '=';


  const item =
    document.cookie
      .split(
        '; '
      )
      .find(
        (
          entry
        ) =>
          entry.startsWith(
            prefix
          )
      );


  if (!item) {
    return '';
  }


  try {

    return decodeURIComponent(
      item.slice(
        prefix.length
      )
    );

  }
  catch {

    return item.slice(
      prefix.length
    );
  }
}


function clearCookie(
  name:
    string
) {

  document.cookie =
    encodeURIComponent(
      name
    ) +
    '=; Max-Age=0; Path=/; SameSite=Lax';
}


function formatTime(
  timestamp:
    number | null
) {

  if (!timestamp) {
    return '';
  }


  return new Intl.DateTimeFormat(
    'pt-BR',
    {
      hour:
        '2-digit',

      minute:
        '2-digit',

      second:
        '2-digit',
    }
  ).format(
    new Date(
      timestamp
    )
  );
}


export function EmergencyDemandDraftPersistence({
  draftKey,
}: {
  draftKey:
    string;
}) {

  const timerRef =
    useRef<
      number |
      null
    >(
      null
    );


  const [
    saveState,
    setSaveState,
  ] =
    useState<SaveState>(
      'READY'
    );


  const [
    lastSavedAt,
    setLastSavedAt,
  ] =
    useState<
      number |
      null
    >(
      null
    );


  const [
    attachmentNames,
    setAttachmentNames,
  ] =
    useState<
      string[]
    >(
      []
    );


  useEffect(
    () => {

      const foundForm =
        document.querySelector<
          HTMLFormElement
        >(
          '[data-emergency-demand-form]'
        );


      if (!foundForm) {
        return;
      }


      /*
       * Esta atribuicao explicita resolve
       * a checagem de null do TypeScript
       * dentro das callbacks abaixo.
       */
      const form:
        HTMLFormElement =
        foundForm;


      const backupKey =
        `${draftKey}:submit-backup`;


      function captureDraft():
        DraftPayload {

        const values:
          Record<
            string,
            string
          > =
          {};


        for (
          const name
          of FIELD_NAMES
        ) {

          const field =
            getField(
              form,
              name
            );


          values[name] =
            field
              ?.value ||
            '';
        }


        const fileInput =
          form.querySelector<
            HTMLInputElement
          >(
            'input[name="referenceImages"]'
          );


        const selectedFiles =
          Array.from(
            fileInput
              ?.files ||
            []
          ).map(
            (
              file
            ) =>
              file.name
          );


        return {
          version:
            2,

          savedAt:
            Date.now(),

          values,

          attachmentNames:
            selectedFiles,
        };
      }


      function saveDraft(
        updateInterface:
          boolean
      ) {

        const draft =
          captureDraft();


        try {

          window.localStorage
            .setItem(
              draftKey,
              JSON.stringify(
                draft
              )
            );


          if (
            updateInterface
          ) {

            setLastSavedAt(
              draft.savedAt
            );


            setSaveState(
              'SAVED'
            );
          }

        }
        catch (
          error
        ) {

          console.warn(
            'Nao foi possivel salvar o rascunho da demanda emergencial.',
            error
          );
        }
      }


      function scheduleSave() {

        if (
          timerRef.current !==
          null
        ) {

          window.clearTimeout(
            timerRef.current
          );
        }


        timerRef.current =
          window.setTimeout(
            () => {

              timerRef.current =
                null;


              saveDraft(
                true
              );

            },
            300
          );
      }


      function restoreDraft(
        draft:
          DraftPayload
      ) {

        for (
          const name
          of FIELD_NAMES
        ) {

          const value =
            draft.values?.[
              name
            ];


          if (
            typeof value !==
            'string'
          ) {
            continue;
          }


          const field =
            getField(
              form,
              name
            );


          if (!field) {
            continue;
          }


          field.value =
            value;


          field.dispatchEvent(
            new Event(
              'input',
              {
                bubbles:
                  true,
              }
            )
          );


          field.dispatchEvent(
            new Event(
              'change',
              {
                bubbles:
                  true,
              }
            )
          );
        }


        setLastSavedAt(
          draft.savedAt
        );


        setSaveState(
          'RESTORED'
        );


        setAttachmentNames(
          Array.isArray(
            draft.attachmentNames
          )
            ? draft.attachmentNames
            : []
        );
      }


      const acknowledgedDraft =
        readCookie(
          ACK_COOKIE
        );


      if (
        acknowledgedDraft ===
        draftKey
      ) {

        try {

          window.localStorage
            .removeItem(
              draftKey
            );


          window.sessionStorage
            .removeItem(
              backupKey
            );

        }
        catch {
          // Storage indisponivel.
        }


        clearCookie(
          ACK_COOKIE
        );


        setSaveState(
          'READY'
        );


        setLastSavedAt(
          null
        );


        setAttachmentNames(
          []
        );

      }
      else {

        const persistentDraft =
          parseDraft(
            window.localStorage
              .getItem(
                draftKey
              )
          );


        const submitBackup =
          parseDraft(
            window.sessionStorage
              .getItem(
                backupKey
              )
          );


        const draft =
          persistentDraft ||
          submitBackup;


        if (draft) {

          restoreDraft(
            draft
          );


          try {

            window.localStorage
              .setItem(
                draftKey,
                JSON.stringify(
                  draft
                )
              );

          }
          catch {
            // Ignora storage indisponivel.
          }
        }
      }


      function handleFieldEvent(
        event:
          Event
      ) {

        const target =
          event.target;


        if (
          !(
            target instanceof
              HTMLInputElement ||
            target instanceof
              HTMLTextAreaElement ||
            target instanceof
              HTMLSelectElement
          )
        ) {
          return;
        }


        if (
          target instanceof
            HTMLInputElement &&
          target.type ===
            'file' &&
          target.files &&
          target.files.length >
            0
        ) {

          setAttachmentNames(
            []
          );
        }


        scheduleSave();
      }


      function handleSubmit() {

        /*
         * Faz backup ANTES do envio.
         * O rascunho nao e apagado.
         */
        const draft =
          captureDraft();


        try {

          window.localStorage
            .setItem(
              draftKey,
              JSON.stringify(
                draft
              )
            );


          window.sessionStorage
            .setItem(
              backupKey,
              JSON.stringify(
                draft
              )
            );

        }
        catch {
          // O envio continua normalmente.
        }
      }


      function handlePageHide() {

        saveDraft(
          false
        );
      }


      function handleVisibilityChange() {

        if (
          document.visibilityState ===
          'hidden'
        ) {

          saveDraft(
            false
          );
        }
      }


      form.addEventListener(
        'input',
        handleFieldEvent
      );


      form.addEventListener(
        'change',
        handleFieldEvent
      );


      form.addEventListener(
        'submit',
        handleSubmit,
        true
      );


      window.addEventListener(
        'pagehide',
        handlePageHide
      );


      document.addEventListener(
        'visibilitychange',
        handleVisibilityChange
      );


      return () => {

        form.removeEventListener(
          'input',
          handleFieldEvent
        );


        form.removeEventListener(
          'change',
          handleFieldEvent
        );


        form.removeEventListener(
          'submit',
          handleSubmit,
          true
        );


        window.removeEventListener(
          'pagehide',
          handlePageHide
        );


        document.removeEventListener(
          'visibilitychange',
          handleVisibilityChange
        );


        if (
          timerRef.current !==
          null
        ) {

          window.clearTimeout(
            timerRef.current
          );
        }


        saveDraft(
          false
        );
      };

    },
    [
      draftKey,
    ]
  );


  function clearDraft() {

    if (
      !window.confirm(
        'Descartar este rascunho e limpar a demanda atual?'
      )
    ) {
      return;
    }


    const backupKey =
      `${draftKey}:submit-backup`;


    try {

      window.localStorage
        .removeItem(
          draftKey
        );


      window.sessionStorage
        .removeItem(
          backupKey
        );

    }
    catch {
      // Continua com reload.
    }


    window.location.reload();
  }


  const savedTime =
    formatTime(
      lastSavedAt
    );


  return (
    <div className="space-y-3">

      <section
        className={[
          'flex flex-col gap-3 rounded-2xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between',

          saveState ===
            'RESTORED'
            ? 'border-amber-200 bg-amber-50'
            : 'border-emerald-100 bg-emerald-50/70',
        ].join(
          ' '
        )}
      >

        <div className="flex min-w-0 items-start gap-3">

          <div
            className={[
              'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl',

              saveState ===
                'RESTORED'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-emerald-100 text-emerald-700',
            ].join(
              ' '
            )}
          >

            {
              saveState ===
              'RESTORED'
                ? (
                  <Clock3
                    size={15}
                  />
                )
                : (
                  <CheckCircle2
                    size={15}
                  />
                )
            }

          </div>


          <div className="min-w-0">

            <p
              className={[
                'text-xs font-black',

                saveState ===
                  'RESTORED'
                  ? 'text-amber-900'
                  : 'text-emerald-900',
              ].join(
                ' '
              )}
            >

              {
                saveState ===
                'RESTORED'
                  ? 'Rascunho recuperado automaticamente'
                  : saveState ===
                      'SAVED'
                    ? 'Rascunho salvo automaticamente'
                    : 'Rascunho automático ativado'
              }

            </p>


            <p
              className={[
                'mt-0.5 text-[11px] leading-relaxed',

                saveState ===
                  'RESTORED'
                  ? 'text-amber-700'
                  : 'text-emerald-700',
              ].join(
                ' '
              )}
            >

              {
                savedTime
                  ? `Salvo às ${savedTime}. Você pode sair desta página sem perder o texto.`
                  : 'Cliente, briefing, legenda, links, área e prazo serão salvos enquanto você digita.'
              }

            </p>

          </div>

        </div>


        {
          lastSavedAt
            ? (
              <button
                type="button"
                onClick={
                  clearDraft
                }
                className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 text-[10px] font-black text-red-600 transition hover:bg-red-50"
              >

                <Trash2
                  size={13}
                />

                Limpar rascunho

              </button>
            )
            : null
        }

      </section>


      {
        attachmentNames.length >
        0
          ? (
            <section className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">

              <FileWarning
                size={16}
                className="mt-0.5 shrink-0 text-amber-600"
              />


              <div>

                <p className="text-xs font-black text-amber-900">
                  Recoloque os anexos antes de enviar
                </p>


                <p className="mt-1 text-[11px] leading-relaxed text-amber-700">
                  O texto foi recuperado, mas o navegador não permite restaurar automaticamente arquivos locais selecionados anteriormente.
                </p>


                <p className="mt-1 text-[10px] font-bold text-amber-700">
                  Arquivos anteriores: {
                    attachmentNames.join(
                      ', '
                    )
                  }
                </p>

              </div>

            </section>
          )
          : null
      }

    </div>
  );
}