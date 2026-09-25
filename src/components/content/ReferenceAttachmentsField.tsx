'use client';

import {
  ExternalLink,
  ImageIcon,
  Paperclip,
  Plus,
  Trash2,
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


function fileKey(
  file:
    File
) {

  return [
    file.name,
    file.size,
    file.lastModified,
  ].join(
    ':'
  );
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


  const [
    selectedExistingUrls,
    setSelectedExistingUrls,
  ] =
    useState<
      string[]
    >(
      []
    );


  const [
    selectedNewKeys,
    setSelectedNewKeys,
  ] =
    useState<
      string[]
    >(
      []
    );


  const [
    removedExistingUrls,
    setRemovedExistingUrls,
  ] =
    useState<
      string[]
    >(
      []
    );


  const selectedExistingSet =
    useMemo(
      () =>
        new Set(
          selectedExistingUrls
        ),
      [
        selectedExistingUrls,
      ]
    );


  const selectedNewSet =
    useMemo(
      () =>
        new Set(
          selectedNewKeys
        ),
      [
        selectedNewKeys,
      ]
    );


  const removedExistingSet =
    useMemo(
      () =>
        new Set(
          removedExistingUrls
        ),
      [
        removedExistingUrls,
      ]
    );


  const visibleExisting =
    useMemo(
      () =>
        existing.filter(
          (
            image
          ) =>
            !removedExistingSet.has(
              image.url
            )
        ),
      [
        existing,
        removedExistingSet,
      ]
    );


  const previews =
    useMemo(
      () =>
        selectedFiles.map(
          (
            file
          ) => ({
            file,

            key:
              fileKey(
                file
              ),

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


  useEffect(
    () => {

      const currentUrls =
        new Set(
          existing.map(
            (
              image
            ) =>
              image.url
          )
        );


      setRemovedExistingUrls(
        (
          current
        ) =>
          current.filter(
            (
              url
            ) =>
              currentUrls.has(
                url
              )
          )
      );


      setSelectedExistingUrls(
        (
          current
        ) =>
          current.filter(
            (
              url
            ) =>
              currentUrls.has(
                url
              )
          )
      );

    },
    [
      existing,
    ]
  );


  function syncInputFiles(
    nextFiles:
      File[]
  ) {

    if (
      !inputRef.current
    ) {
      return;
    }


    try {

      const transfer =
        new DataTransfer();


      for (
        const file
        of nextFiles
      ) {

        transfer.items.add(
          file
        );
      }


      inputRef.current.files =
        transfer.files;

    }
    catch (
      error
    ) {

      console.warn(
        'Nao foi possivel sincronizar o seletor de arquivos.',
        error
      );
    }
  }


  function appendFiles(
    incoming:
      FileList | null
  ) {

    const newFiles =
      Array.from(
        incoming ||
        []
      );


    if (
      newFiles.length ===
      0
    ) {
      return;
    }


    const merged =
      new Map<
        string,
        File
      >();


    for (
      const file
      of selectedFiles
    ) {

      merged.set(
        fileKey(
          file
        ),
        file
      );
    }


    for (
      const file
      of newFiles
    ) {

      merged.set(
        fileKey(
          file
        ),
        file
      );
    }


    const nextFiles =
      Array.from(
        merged.values()
      );


    setSelectedFiles(
      nextFiles
    );


    syncInputFiles(
      nextFiles
    );
  }


  function toggleExisting(
    url:
      string
  ) {

    setSelectedExistingUrls(
      (
        current
      ) =>
        current.includes(
          url
        )
          ? current.filter(
              (
                item
              ) =>
                item !==
                url
            )
          : [
              ...current,
              url,
            ]
    );
  }


  function toggleNew(
    key:
      string
  ) {

    setSelectedNewKeys(
      (
        current
      ) =>
        current.includes(
          key
        )
          ? current.filter(
              (
                item
              ) =>
                item !==
                key
            )
          : [
              ...current,
              key,
            ]
    );
  }


  function removeSelected() {

    const selectionCount =
      selectedExistingUrls.length +
      selectedNewKeys.length;


    if (
      selectionCount ===
      0
    ) {
      return;
    }


    if (
      !window.confirm(
        `Excluir ${selectionCount} arquivo(s) selecionado(s)?`
      )
    ) {
      return;
    }


    const nextRemoved =
      Array.from(
        new Set([
          ...removedExistingUrls,
          ...selectedExistingUrls,
        ])
      );


    const nextFiles =
      selectedFiles.filter(
        (
          file
        ) =>
          !selectedNewSet.has(
            fileKey(
              file
            )
          )
      );


    setRemovedExistingUrls(
      nextRemoved
    );


    setSelectedFiles(
      nextFiles
    );


    syncInputFiles(
      nextFiles
    );


    setSelectedExistingUrls(
      []
    );


    setSelectedNewKeys(
      []
    );
  }


  const selectionCount =
    selectedExistingUrls.length +
    selectedNewKeys.length;


  const totalVisible =
    visibleExisting.length +
    selectedFiles.length;


  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

      {removedExistingUrls.map(
        (
          url
        ) => (
          <input
            key={
              url
            }
            type="hidden"
            name="removeReferenceUrl"
            value={
              url
            }
          />
        )
      )}


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
            appendFiles(
              event.target.files
            )
        }
        className="sr-only"
      />


      <div className="mt-4 border-t border-slate-100 pt-3">

        <div className="mb-2 flex items-center justify-between gap-3">

          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            Arquivos
          </p>


          <div className="flex items-center gap-2">

            {selectionCount >
            0 ? (
              <button
                type="button"
                onClick={
                  removeSelected
                }
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-[10px] font-black text-red-600 transition hover:bg-red-100"
              >

                <Trash2
                  size={13}
                />

                Excluir selecionados ({
                  selectionCount
                })

              </button>
            ) : null}


            <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-500">
              {totalVisible}
            </span>

          </div>

        </div>


        {visibleExisting.length >
        0 ? (

          <div className="space-y-1">

            {visibleExisting.map(
              (
                image
              ) => {

                const sizeLabel =
                  formatFileSize(
                    image.size
                  );


                const checked =
                  selectedExistingSet.has(
                    image.url
                  );


                return (
                  <div
                    key={
                      image.url
                    }
                    className={
                      checked
                        ? 'group flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50/70 px-2 py-2 transition'
                        : 'group flex items-center gap-3 rounded-xl border border-transparent px-2 py-2 transition hover:bg-slate-50'
                    }
                  >

                    <input
                      type="checkbox"
                      checked={
                        checked
                      }
                      onChange={
                        () =>
                          toggleExisting(
                            image.url
                          )
                      }
                      aria-label={
                        `Selecionar ${image.originalName || image.name}`
                      }
                      className="h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 accent-blue-600"
                    />


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

                      <input
                        type="hidden"
                        name="referenceRenameUrl"
                        value={
                          image.url
                        }
                      />


                      <input
                        type="text"
                        name="referenceRenameName"
                        defaultValue={
                          image.originalName ||
                          image.name
                        }
                        title="Você pode editar o nome do anexo"
                        className="h-8 w-full min-w-0 rounded-lg border border-transparent bg-transparent px-2 text-sm font-black text-slate-800 outline-none transition hover:border-slate-200 hover:bg-white focus:border-blue-300 focus:bg-white"
                      />


                      <p className="mt-0.5 truncate px-2 text-[11px] text-slate-500">
                        Adicionado em {formatAttachmentDate(
                          image.createdAt
                        )}

                        {sizeLabel
                          ? ` ? ${sizeLabel}`
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

                  </div>
                );
              }
            )}

          </div>

        ) : null}


        {previews.length >
        0 ? (

          <div
            className={
              visibleExisting.length >
              0
                ? 'mt-2 space-y-1 border-t border-slate-100 pt-2'
                : 'space-y-1'
            }
          >

            {previews.map(
              (
                preview
              ) => {

                const checked =
                  selectedNewSet.has(
                    preview.key
                  );


                return (
                  <div
                    key={
                      preview.key
                    }
                    className={
                      checked
                        ? 'flex items-center gap-3 rounded-xl border border-blue-300 bg-blue-100/80 px-2 py-2'
                        : 'flex items-center gap-3 rounded-xl border border-transparent bg-blue-50/70 px-2 py-2'
                    }
                  >

                    <input
                      type="checkbox"
                      checked={
                        checked
                      }
                      onChange={
                        () =>
                          toggleNew(
                            preview.key
                          )
                      }
                      aria-label={
                        `Selecionar ${preview.file.name}`
                      }
                      className="h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 accent-blue-600"
                    />


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
                        Pronto para anexar ao salvar ? {formatFileSize(
                          preview.file.size
                        )}
                      </p>

                    </div>


                    <ImageIcon
                      size={16}
                      className="shrink-0 text-blue-400"
                    />

                  </div>
                );
              }
            )}

          </div>

        ) : null}


        {removedExistingUrls.length >
        0 ? (

          <p className="mt-2 text-[10px] font-bold text-red-500">
            {removedExistingUrls.length} anexo(s) existente(s) será(ão) excluído(s) quando você salvar as alterações.
          </p>

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
        Você pode adicionar várias fotos de uma vez ou adicionar novas imagens em etapas. Marque os arquivos desejados e use Excluir selecionados para remover somente os escolhidos.
      </p>

    </section>
  );
}
