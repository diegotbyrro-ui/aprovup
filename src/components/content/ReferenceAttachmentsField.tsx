'use client';

import {
  ExternalLink,
  ImageIcon,
  Paperclip,
  Plus,
  X,
} from 'lucide-react';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';


export type ReferenceAttachmentItem = {
  name:
    string;

  originalName:
    string;

  url:
    string;

  mimeType:
    string;

  size:
    number;

  createdAt:
    string | null;
};


function formatAttachmentDate(
  value:
    string | null
) {
  if (
    !value
  ) {
    return 'Data não informada';
  }

  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return 'Data não informada';
  }

  return new Intl.DateTimeFormat(
    'pt-BR',
    {
      day:
        '2-digit',

      month:
        'short',

      year:
        'numeric',

      hour:
        '2-digit',

      minute:
        '2-digit',
    }
  ).format(
    date
  );
}


function formatFileSize(
  bytes:
    number
) {
  if (
    !Number.isFinite(
      bytes
    ) ||
    bytes <=
      0
  ) {
    return '';
  }

  if (
    bytes <
    1024 * 1024
  ) {
    return `${Math.max(
      1,
      Math.round(
        bytes /
        1024
      )
    )} KB`;
  }

  return `${(
    bytes /
    (
      1024 *
      1024
    )
  ).toFixed(
    1
  )} MB`;
}


export function ReferenceAttachmentsField({
  existing,
}: {
  existing:
    ReferenceAttachmentItem[];
}) {
  const inputRef =
    useRef<
      HTMLInputElement | null
    >(
      null
    );

  const [
    selectedFiles,
    setSelectedFiles,
  ] =
    useState<
      File[]
    >(
      []
    );

  const previews =
    useMemo(
      () =>
        selectedFiles.map(
          (
            file
          ) => ({
            file,

            url:
              URL.createObjectURL(
                file
              ),
          })
        ),
      [
        selectedFiles,
      ]
    );


  useEffect(
    () => {
      return () => {
        for (
          const preview
          of previews
        ) {
          URL.revokeObjectURL(
            preview.url
          );
        }
      };
    },
    [
      previews,
    ]
  );


  function clearSelection() {
    if (
      inputRef.current
    ) {
      inputRef.current.value =
        '';
    }

    setSelectedFiles(
      []
    );
  }


  const totalVisible =
    existing.length +
    selectedFiles.length;


  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Paperclip
            size={17}
            className="text-slate-500"
          />

          <div>
            <p className="text-sm font-black text-slate-900">
              Anexos de referência
            </p>

            <p className="mt-0.5 text-[11px] text-slate-500">
              Fotos para Design ou Filmmaker usar na criação.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={
            () =>
              inputRef.current
                ?.click()
          }
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-100"
        >
          <Plus
            size={14}
          />

          Adicionar
        </button>
      </div>

      <input
        ref={
          inputRef
        }
        name="referenceImages"
        type="file"
        accept="image/*"
        multiple
        onChange={
          (
            event
          ) =>
            setSelectedFiles(
              Array.from(
                event.target.files ||
                []
              )
            )
        }
        className="sr-only"
      />

      <div className="mt-4 border-t border-slate-100 pt-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            Arquivos
          </p>

          <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-500">
            {totalVisible}
          </span>
        </div>

        {existing.length >
        0 ? (
          <div className="space-y-1">
            {existing.map(
              (
                image
              ) => {
                const sizeLabel =
                  formatFileSize(
                    image.size
                  );

                return (
                  <div
                    key={
                      image.url
                    }
                    className="group flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-slate-50"
                  >
                    <a
                      href={
                        image.url
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="h-12 w-16 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-100"
                    >
                      <img
                        src={
                          image.url
                        }
                        alt={
                          image.originalName ||
                          'Anexo'
                        }
                        className="h-full w-full object-cover"
                      />
                    </a>

                    <div className="min-w-0 flex-1">
                      <a
                        href={
                          image.url
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="block truncate text-sm font-black text-slate-800 underline decoration-slate-300 underline-offset-2 transition hover:text-blue-700"
                        title={
                          image.originalName
                        }
                      >
                        {image.originalName ||
                          image.name}
                      </a>

                      <p className="mt-0.5 truncate text-[11px] text-slate-500">
                        Adicionado em {formatAttachmentDate(
                          image.createdAt
                        )}
                        {sizeLabel
                          ? ` • ${sizeLabel}`
                          : ''}
                      </p>
                    </div>

                    <a
                      href={
                        image.url
                      }
                      target="_blank"
                      rel="noreferrer"
                      aria-label="Abrir anexo"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white hover:text-blue-600"
                    >
                      <ExternalLink
                        size={15}
                      />
                    </a>

                    <label
                      title="Remover este anexo ao salvar"
                      className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                    >
                      <input
                        type="checkbox"
                        name="removeReferenceUrl"
                        value={
                          image.url
                        }
                        className="peer sr-only"
                      />

                      <X
                        size={16}
                        className="peer-checked:text-red-600"
                      />
                    </label>
                  </div>
                );
              }
            )}
          </div>
        ) : null}

        {previews.length >
        0 ? (
          <div className={existing.length > 0 ? 'mt-2 space-y-1 border-t border-slate-100 pt-2' : 'space-y-1'}>
            {previews.map(
              (
                preview
              ) => (
                <div
                  key={
                    `${preview.file.name}-${preview.file.size}-${preview.file.lastModified}`
                  }
                  className="flex items-center gap-3 rounded-xl bg-blue-50/70 px-2 py-2"
                >
                  <div className="h-12 w-16 shrink-0 overflow-hidden rounded-md border border-blue-100 bg-white">
                    <img
                      src={
                        preview.url
                      }
                      alt={
                        preview.file.name
                      }
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate text-sm font-black text-slate-800"
                      title={
                        preview.file.name
                      }
                    >
                      {preview.file.name}
                    </p>

                    <p className="mt-0.5 truncate text-[11px] font-bold text-blue-600">
                      Pronto para anexar ao salvar • {formatFileSize(
                        preview.file.size
                      )}
                    </p>
                  </div>

                  <ImageIcon
                    size={16}
                    className="shrink-0 text-blue-400"
                  />
                </div>
              )
            )}

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={
                  clearSelection
                }
                className="text-[11px] font-black text-slate-500 hover:text-red-600"
              >
                Limpar seleção
              </button>
            </div>
          </div>
        ) : null}

        {totalVisible ===
        0 ? (
          <button
            type="button"
            onClick={
              () =>
                inputRef.current
                  ?.click()
            }
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm font-bold text-slate-500 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
          >
            <Paperclip
              size={16}
            />

            Anexar fotos de referência
          </button>
        ) : null}
      </div>

      <p className="mt-3 text-[10px] leading-4 text-slate-400">
        Até 8 fotos por envio, máximo de 8 MB por foto e 18 MB no total. Para excluir um anexo existente, marque o X e salve as alterações.
      </p>
    </section>
  );
}
