'use client';

import {
  useEffect,
  useRef,
  useState,
} from 'react';


const DATABASE_NAME =
  'aprovup-local-drafts';

const DATABASE_VERSION =
  1;

const FILE_STORE =
  'new-content-files';


type StoredFile = {
  name:
    string;

  type:
    string;

  lastModified:
    number;

  blob:
    Blob;
};


type FileDraftRecord = {
  key:
    string;

  files:
    StoredFile[];
};


function getDraftKey(
  clientId:
    string
) {
  return (
    'aprovup:new-content:' +
    clientId +
    ':v1'
  );
}


function openDraftDatabase():
  Promise<IDBDatabase> {

  return new Promise(
    (
      resolve,
      reject
    ) => {

      const request =
        indexedDB.open(
          DATABASE_NAME,
          DATABASE_VERSION
        );


      request.onupgradeneeded =
        () => {

          const db =
            request.result;

          if (
            !db.objectStoreNames.contains(
              FILE_STORE
            )
          ) {
            db.createObjectStore(
              FILE_STORE,
              {
                keyPath:
                  'key',
              }
            );
          }
        };


      request.onsuccess =
        () =>
          resolve(
            request.result
          );


      request.onerror =
        () =>
          reject(
            request.error
          );
    }
  );
}


async function saveDraftFiles(
  key:
    string,
  files:
    File[]
) {

  const db =
    await openDraftDatabase();


  try {

    await new Promise<void>(
      (
        resolve,
        reject
      ) => {

        const transaction =
          db.transaction(
            FILE_STORE,
            'readwrite'
          );


        const store =
          transaction.objectStore(
            FILE_STORE
          );


        const record:
          FileDraftRecord = {
            key,

            files:
              files.map(
                (
                  file
                ) => ({
                  name:
                    file.name,

                  type:
                    file.type,

                  lastModified:
                    file.lastModified,

                  blob:
                    file,
                })
              ),
          };


        store.put(
          record
        );


        transaction.oncomplete =
          () =>
            resolve();


        transaction.onerror =
          () =>
            reject(
              transaction.error
            );
      }
    );
  }
  finally {
    db.close();
  }
}


async function loadDraftFiles(
  key:
    string
):
  Promise<File[]> {

  const db =
    await openDraftDatabase();


  try {

    const record =
      await new Promise<
        FileDraftRecord |
        undefined
      >(
        (
          resolve,
          reject
        ) => {

          const transaction =
            db.transaction(
              FILE_STORE,
              'readonly'
            );


          const store =
            transaction.objectStore(
              FILE_STORE
            );


          const request =
            store.get(
              key
            );


          request.onsuccess =
            () =>
              resolve(
                request.result
              );


          request.onerror =
            () =>
              reject(
                request.error
              );
        }
      );


    return (
      record?.files ||
      []
    ).map(
      (
        stored
      ) =>
        new File(
          [
            stored.blob,
          ],
          stored.name,
          {
            type:
              stored.type,

            lastModified:
              stored.lastModified,
          }
        )
    );
  }
  finally {
    db.close();
  }
}


async function removeDraftFiles(
  key:
    string
) {

  const db =
    await openDraftDatabase();


  try {

    await new Promise<void>(
      (
        resolve,
        reject
      ) => {

        const transaction =
          db.transaction(
            FILE_STORE,
            'readwrite'
          );


        transaction
          .objectStore(
            FILE_STORE
          )
          .delete(
            key
          );


        transaction.oncomplete =
          () =>
            resolve();


        transaction.onerror =
          () =>
            reject(
              transaction.error
            );
      }
    );
  }
  finally {
    db.close();
  }
}


function readFormValues(
  form:
    HTMLFormElement
) {

  const values:
    Record<
      string,
      string
    > = {};


  const fields =
    form.querySelectorAll<
      HTMLInputElement |
      HTMLTextAreaElement |
      HTMLSelectElement
    >(
      'input[name], textarea[name], select[name]'
    );


  fields.forEach(
    (
      field
    ) => {

      if (
        field instanceof
          HTMLInputElement &&
        field.type ===
          'file'
      ) {
        return;
      }


      if (
        field instanceof
          HTMLInputElement &&
        (
          field.type ===
            'checkbox' ||
          field.type ===
            'radio'
        )
      ) {
        values[
          field.name
        ] =
          field.checked
            ? field.value
            : '';

        return;
      }


      values[
        field.name
      ] =
        field.value;
    }
  );


  return values;
}


function restoreFormValues(
  form:
    HTMLFormElement,
  values:
    Record<
      string,
      string
    >
) {

  for (
    const [
      name,
      value,
    ]
    of Object.entries(
      values
    )
  ) {

    const field =
      form.elements.namedItem(
        name
      );


    if (
      !field ||
      field instanceof
        RadioNodeList
    ) {
      continue;
    }


    if (
      !(
        field instanceof
          HTMLInputElement ||
        field instanceof
          HTMLTextAreaElement ||
        field instanceof
          HTMLSelectElement
      )
    ) {
      continue;
    }


    if (
      field instanceof
        HTMLInputElement &&
      field.type ===
        'file'
    ) {
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
}


function configureDeadlineValidation(
  form:
    HTMLFormElement
) {

  const area =
    form.elements.namedItem(
      'area'
    );


  const plannedDate =
    form.elements.namedItem(
      'plannedDate'
    );


  const deadline =
    form.elements.namedItem(
      'productionDeadline'
    );


  const deadlineTime =
    form.elements.namedItem(
      'productionDeadlineTime'
    );


  if (
    !(
      area instanceof
        HTMLSelectElement
    ) ||
    !(
      plannedDate instanceof
        HTMLInputElement
    ) ||
    !(
      deadline instanceof
        HTMLInputElement
    ) ||
    !(
      deadlineTime instanceof
        HTMLInputElement
    )
  ) {
    return;
  }


  const productionArea =
    area.value ===
      'DESIGN' ||
    area.value ===
      'FILMMAKER';


  const needsDeadline =
    productionArea &&
    Boolean(
      plannedDate.value
    );


  deadline.required =
    needsDeadline ||
    Boolean(
      deadlineTime.value
    );


  deadlineTime.required =
    needsDeadline ||
    Boolean(
      deadline.value
    );


  deadline.setCustomValidity(
    ''
  );


  if (
    plannedDate.value &&
    deadline.value &&
    deadline.value >=
      plannedDate.value
  ) {
    deadline.setCustomValidity(
      'A data de entrega precisa ser anterior à data de publicação.'
    );
  }
}


export function NewContentDraftGuard({
  clientId,
}: {
  clientId:
    string;
}) {

  const markerRef =
    useRef<
      HTMLDivElement |
      null
    >(
      null
    );


  const timeoutRef =
    useRef<
      number |
      null
    >(
      null
    );


  const restoringRef =
    useRef(
      true
    );


  const [
    status,
    setStatus,
  ] =
    useState(
      'Preparando rascunho...'
    );


  useEffect(
    () => {

      const marker =
        markerRef.current;


      const formCandidate =
        marker?.closest(
          'form'
        );


      if (
        !(
          formCandidate instanceof
            HTMLFormElement
        )
      ) {
        setStatus(
          'Rascunho indisponível'
        );

        return;
      }


      /*
       * Depois desta verificacao, mantemos uma referencia
       * definitivamente tipada como HTMLFormElement.
       * Isso evita o TypeScript perder o narrowing dentro
       * das funcoes async e dos event handlers abaixo.
       */
      const form:
        HTMLFormElement =
          formCandidate;


      const key =
        getDraftKey(
          clientId
        );


      let active =
        true;


      async function restore() {

        try {

          const raw =
            window.localStorage.getItem(
              key
            );


          if (
            raw
          ) {

            const parsed =
              JSON.parse(
                raw
              );


            if (
              parsed &&
              typeof parsed.values ===
                'object'
            ) {
              restoreFormValues(
                form,
                parsed.values
              );
            }
          }


          const storedFiles =
            await loadDraftFiles(
              key
            );


          if (
            active &&
            storedFiles.length >
              0
          ) {

            const fileInput =
              form.querySelector<
                HTMLInputElement
              >(
                'input[name="referenceImages"]'
              );


            if (
              fileInput
            ) {

              const transfer =
                new DataTransfer();


              storedFiles.forEach(
                (
                  file
                ) =>
                  transfer.items.add(
                    file
                  )
              );


              fileInput.files =
                transfer.files;


              fileInput.dispatchEvent(
                new Event(
                  'change',
                  {
                    bubbles:
                      true,
                  }
                )
              );
            }
          }


          configureDeadlineValidation(
            form
          );


          if (
            active
          ) {
            setStatus(
              raw ||
              storedFiles.length >
                0
                ? 'Rascunho recuperado automaticamente'
                : 'Rascunho automático ativo'
            );
          }
        }
        catch (
          error
        ) {

          console.error(
            'AprovUp draft restore:',
            error
          );


          if (
            active
          ) {
            setStatus(
              'Rascunho automático ativo'
            );
          }
        }
        finally {

          restoringRef.current =
            false;
        }
      }


      function saveValues() {

        if (
          restoringRef.current
        ) {
          return;
        }


        if (
          timeoutRef.current
        ) {
          window.clearTimeout(
            timeoutRef.current
          );
        }


        timeoutRef.current =
          window.setTimeout(
            () => {

              try {

                const values =
                  readFormValues(
                    form
                  );


                window.localStorage.setItem(
                  key,
                  JSON.stringify({
                    savedAt:
                      Date.now(),

                    values,
                  })
                );


                setStatus(
                  'Rascunho salvo automaticamente'
                );
              }
              catch (
                error
              ) {

                console.error(
                  'AprovUp draft save:',
                  error
                );


                setStatus(
                  'Não foi possível salvar o rascunho'
                );
              }
            },
            250
          );
      }


      async function saveFiles() {

        const input =
          form.querySelector<
            HTMLInputElement
          >(
            'input[name="referenceImages"]'
          );


        if (
          !input
        ) {
          return;
        }


        try {

          await saveDraftFiles(
            key,
            Array.from(
              input.files ||
              []
            )
          );


          setStatus(
            'Fotos e rascunho salvos automaticamente'
          );
        }
        catch (
          error
        ) {

          console.error(
            'AprovUp file draft save:',
            error
          );


          setStatus(
            'Texto salvo; não foi possível guardar as fotos localmente'
          );
        }
      }


      function handleInput() {

        configureDeadlineValidation(
          form
        );

        saveValues();
      }


      function handleChange(
        event:
          Event
      ) {

        configureDeadlineValidation(
          form
        );

        saveValues();


        const target =
          event.target;


        if (
          target instanceof
            HTMLInputElement &&
          target.name ===
            'referenceImages'
        ) {
          void saveFiles();
        }
      }


      function handleSubmit() {

        configureDeadlineValidation(
          form
        );

        try {

          const values =
            readFormValues(
              form
            );


          window.localStorage.setItem(
            key,
            JSON.stringify({
              savedAt:
                Date.now(),

              values,
            })
          );
        }
        catch (
          error
        ) {

          console.error(
            'AprovUp submit draft save:',
            error
          );
        }
      }


      form.addEventListener(
        'input',
        handleInput
      );


      form.addEventListener(
        'change',
        handleChange
      );


      form.addEventListener(
        'submit',
        handleSubmit
      );


      void restore();


      return () => {

        active =
          false;


        if (
          timeoutRef.current
        ) {
          window.clearTimeout(
            timeoutRef.current
          );
        }


        form.removeEventListener(
          'input',
          handleInput
        );


        form.removeEventListener(
          'change',
          handleChange
        );


        form.removeEventListener(
          'submit',
          handleSubmit
        );
      };
    },
    [
      clientId,
    ]
  );


  return (
    <div
      ref={
        markerRef
      }
      className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3"
    >

      <p className="text-xs font-black text-blue-700">
        Rascunho automático
      </p>


      <p className="mt-1 text-[11px] text-blue-600">
        {status}. Se a página atualizar ou ocorrer um erro, seus textos e fotos serão recuperados.
      </p>

    </div>
  );
}


export function ClearNewContentDraft({
  clientId,
}: {
  clientId:
    string;
}) {

  useEffect(
    () => {

      const key =
        getDraftKey(
          clientId
        );


      try {
        window.localStorage.removeItem(
          key
        );
      }
      catch (
        error
      ) {
        console.error(
          'AprovUp clear draft:',
          error
        );
      }


      void removeDraftFiles(
        key
      ).catch(
        (
          error
        ) =>
          console.error(
            'AprovUp clear draft files:',
            error
          )
      );
    },
    [
      clientId,
    ]
  );


  return null;
}
