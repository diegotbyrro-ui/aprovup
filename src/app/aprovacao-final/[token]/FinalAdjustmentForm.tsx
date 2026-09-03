'use client';

import {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  useRouter,
} from 'next/navigation';

import {
  createClient,
} from '@supabase/supabase-js';

import {
  Loader2,
  Mic,
  Square,
  Trash2,
} from 'lucide-react';

import {
  requestFinalChangesAction,
} from './actions';


const MAX_AUDIO_MS =
  3 * 60 * 1000;


type PreparedUpload = {
  ok: boolean;
  bucket: string;
  path: string;
  token: string;
  message?: string;
};


function browserStorageClient() {
  const url =
    process.env
      .NEXT_PUBLIC_SUPABASE_URL;

  const key =
    process.env
      .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env
      .NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (
    !url ||
    !key
  ) {
    throw new Error(
      'Storage do AprovUp não está configurado.'
    );
  }

  return createClient(
    url,
    key,
    {
      auth: {
        persistSession:
          false,

        autoRefreshToken:
          false,

        detectSessionInUrl:
          false,
      },
    }
  );
}


function formatTime(
  milliseconds: number
) {
  const totalSeconds =
    Math.floor(
      milliseconds /
      1000
    );

  const minutes =
    Math.floor(
      totalSeconds /
      60
    );

  const seconds =
    totalSeconds %
    60;

  return `${minutes}:${String(
    seconds
  ).padStart(2, '0')}`;
}


function extensionForMime(
  mimeType: string
) {
  const normalized =
    mimeType
      .split(';')[0]
      .toLowerCase();

  if (
    normalized ===
      'audio/mp4' ||
    normalized ===
      'audio/x-m4a'
  ) {
    return 'm4a';
  }

  if (
    normalized ===
    'audio/ogg'
  ) {
    return 'ogg';
  }

  if (
    normalized ===
    'audio/mpeg'
  ) {
    return 'mp3';
  }

  if (
    normalized ===
    'audio/wav'
  ) {
    return 'wav';
  }

  return 'webm';
}


export function FinalAdjustmentForm({
  token,
  contentId,
}: {
  token: string;
  contentId: string;
}) {
  const router =
    useRouter();

  const recorderRef =
    useRef<MediaRecorder | null>(
      null
    );

  const streamRef =
    useRef<MediaStream | null>(
      null
    );

  const chunksRef =
    useRef<Blob[]>([]);

  const startedAtRef =
    useRef(0);

  const timerRef =
    useRef<
      ReturnType<typeof setInterval> |
      null
    >(null);

  const timeoutRef =
    useRef<
      ReturnType<typeof setTimeout> |
      null
    >(null);

  const [
    message,
    setMessage,
  ] =
    useState('');

  const [
    recording,
    setRecording,
  ] =
    useState(false);

  const [
    elapsedMs,
    setElapsedMs,
  ] =
    useState(0);

  const [
    audioBlob,
    setAudioBlob,
  ] =
    useState<Blob | null>(
      null
    );

  const [
    previewUrl,
    setPreviewUrl,
  ] =
    useState('');

  const [
    audioDurationMs,
    setAudioDurationMs,
  ] =
    useState(0);

  const [
    submitting,
    setSubmitting,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState('');


  function clearTimers() {
    if (timerRef.current) {
      clearInterval(
        timerRef.current
      );

      timerRef.current =
        null;
    }

    if (timeoutRef.current) {
      clearTimeout(
        timeoutRef.current
      );

      timeoutRef.current =
        null;
    }
  }


  function stopTracks() {
    streamRef.current
      ?.getTracks()
      .forEach(
        (track) => {
          track.stop();
        }
      );

    streamRef.current =
      null;
  }


  function clearAudio() {
    if (previewUrl) {
      URL.revokeObjectURL(
        previewUrl
      );
    }

    setAudioBlob(
      null
    );

    setPreviewUrl(
      ''
    );

    setAudioDurationMs(
      0
    );

    setElapsedMs(
      0
    );
  }


  async function startRecording() {
    setError('');

    if (
      typeof MediaRecorder ===
      'undefined' ||
      !navigator.mediaDevices
    ) {
      setError(
        'Este navegador não oferece suporte à gravação de áudio.'
      );

      return;
    }

    try {
      clearAudio();

      const stream =
        await navigator.mediaDevices
          .getUserMedia({
            audio:
              true,
          });

      streamRef.current =
        stream;

      const candidates = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus',
      ];

      const selectedMime =
        candidates.find(
          (candidate) =>
            MediaRecorder.isTypeSupported(
              candidate
            )
        );

      const recorder =
        selectedMime
          ? new MediaRecorder(
              stream,
              {
                mimeType:
                  selectedMime,
              }
            )
          : new MediaRecorder(
              stream
            );

      recorderRef.current =
        recorder;

      chunksRef.current =
        [];

      recorder.ondataavailable =
        (event) => {
          if (
            event.data.size >
            0
          ) {
            chunksRef.current.push(
              event.data
            );
          }
        };

      recorder.onstop =
        () => {
          clearTimers();
          stopTracks();

          const duration =
            Math.min(
              Date.now() -
                startedAtRef.current,
              MAX_AUDIO_MS
            );

          const blob =
            new Blob(
              chunksRef.current,
              {
                type:
                  recorder.mimeType ||
                  selectedMime ||
                  'audio/webm',
              }
            );

          setRecording(
            false
          );

          setElapsedMs(
            duration
          );

          if (
            blob.size ===
            0
          ) {
            setError(
              'A gravação ficou vazia. Grave novamente.'
            );

            return;
          }

          const url =
            URL.createObjectURL(
              blob
            );

          setAudioBlob(
            blob
          );

          setPreviewUrl(
            url
          );

          setAudioDurationMs(
            duration
          );
        };

      recorder.onerror =
        () => {
          clearTimers();
          stopTracks();

          setRecording(
            false
          );

          setError(
            'Não foi possível concluir a gravação.'
          );
        };

      startedAtRef.current =
        Date.now();

      recorder.start(
        250
      );

      setRecording(
        true
      );

      setElapsedMs(
        0
      );

      timerRef.current =
        setInterval(
          () => {
            setElapsedMs(
              Math.min(
                Date.now() -
                  startedAtRef.current,
                MAX_AUDIO_MS
              )
            );
          },
          250
        );

      timeoutRef.current =
        setTimeout(
          () => {
            if (
              recorder.state ===
              'recording'
            ) {
              recorder.stop();
            }
          },
          MAX_AUDIO_MS
        );
    }
    catch {
      clearTimers();
      stopTracks();

      setRecording(
        false
      );

      setError(
        'Não foi possível acessar o microfone. Verifique a permissão do navegador.'
      );
    }
  }


  function stopRecording() {
    const recorder =
      recorderRef.current;

    if (
      recorder &&
      recorder.state ===
        'recording'
    ) {
      recorder.stop();
    }
  }


  async function uploadAudio(
    blob: Blob
  ) {
    const mimeType =
      blob.type ||
      'audio/webm';

    const extension =
      extensionForMime(
        mimeType
      );

    const file =
      new File(
        [
          blob,
        ],
        `ajuste-${Date.now()}.${extension}`,
        {
          type:
            mimeType,
        }
      );

    const response =
      await fetch(
        `/api/aprovacao-final/${encodeURIComponent(
          token
        )}/${encodeURIComponent(
          contentId
        )}/upload-audio`,
        {
          method:
            'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body:
            JSON.stringify({
              fileName:
                file.name,

              fileSize:
                file.size,

              contentType:
                file.type,
            }),
        }
      );

    const prepared =
      await response.json() as
        PreparedUpload;

    if (
      !response.ok ||
      !prepared.ok
    ) {
      throw new Error(
        prepared.message ||
        'Não foi possível preparar o áudio.'
      );
    }

    const supabase =
      browserStorageClient();

    const {
      error:
        uploadError,
    } =
      await supabase.storage
        .from(
          prepared.bucket
        )
        .uploadToSignedUrl(
          prepared.path,
          prepared.token,
          file,
          {
            contentType:
              file.type,

            cacheControl:
              '3600',
          }
        );

    if (uploadError) {
      throw new Error(
        uploadError.message ||
        'Não foi possível enviar o áudio.'
      );
    }

    return {
      path:
        prepared.path,

      mimeType:
        file.type
          .split(';')[0]
          .toLowerCase(),
    };
  }


  async function handleSubmit(
    event:
      React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError('');

    const cleanMessage =
      message.trim();

    if (
      !cleanMessage &&
      !audioBlob
    ) {
      setError(
        'Escreva o ajuste ou grave um áudio.'
      );

      return;
    }

    if (recording) {
      setError(
        'Finalize a gravação antes de enviar.'
      );

      return;
    }

    setSubmitting(
      true
    );

    try {
      let uploadedAudio:
        | {
            path: string;
            mimeType: string;
          }
        | null =
        null;

      if (audioBlob) {
        uploadedAudio =
          await uploadAudio(
            audioBlob
          );
      }

      const formData =
        new FormData();

      formData.set(
        'message',
        cleanMessage
      );

      if (uploadedAudio) {
        formData.set(
          'audioPath',
          uploadedAudio.path
        );

        formData.set(
          'audioMimeType',
          uploadedAudio.mimeType
        );

        formData.set(
          'audioDurationMs',
          String(
            audioDurationMs
          )
        );
      }

      const result =
        await requestFinalChangesAction(
          token,
          contentId,
          formData
        );

      if (
        result &&
        !result.ok
      ) {
        throw new Error(
          result.message ||
          'Não foi possível enviar o ajuste.'
        );
      }

      router.replace(
        `/aprovacao-final/${token}?feedback=alteracao`
      );

      router.refresh();
    }
    catch (caught) {
      const errorMessage =
        caught instanceof Error
          ? caught.message
          : '';

      setError(
        errorMessage ||
        'Não foi possível enviar o ajuste.'
      );

      setSubmitting(
        false
      );
    }
  }


  useEffect(
    () => {
      return () => {
        clearTimers();
        stopTracks();
      };
    },
    []
  );


  return (
    <form
      onSubmit={
        handleSubmit
      }
      className="mt-4 space-y-3"
    >
      <textarea
        value={
          message
        }
        onChange={
          (event) => {
            setMessage(
              event.target.value
            );
          }
        }
        rows={5}
        maxLength={2000}
        disabled={
          submitting
        }
        placeholder="Ex.: trocar a foto, ajustar uma palavra da arte, alterar um trecho da legenda..."
        className="w-full resize-none rounded-2xl border border-slate-300 bg-white p-4 text-sm leading-relaxed text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50 disabled:opacity-60"
      />

      {!recording &&
      !audioBlob ? (
        <button
          type="button"
          onClick={
            startRecording
          }
          disabled={
            submitting
          }
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-violet-200 bg-violet-50 px-5 py-3 text-sm font-bold text-violet-700 transition hover:bg-violet-100 disabled:opacity-50"
        >
          <Mic
            size={17}
          />

          Gravar áudio
        </button>
      ) : null}

      {recording ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-red-100 bg-red-50 p-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />

            <span className="text-xs font-bold text-red-600">
              Gravando
            </span>

            <span className="text-xs font-semibold tabular-nums text-slate-500">
              {formatTime(
                elapsedMs
              )}
              {' / 3:00'}
            </span>
          </div>

          <button
            type="button"
            onClick={
              stopRecording
            }
            className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-bold text-red-600 shadow-sm"
          >
            <Square
              size={12}
              fill="currentColor"
            />

            Finalizar
          </button>
        </div>
      ) : null}

      {audioBlob &&
      previewUrl &&
      !recording ? (
        <div className="rounded-2xl border border-violet-100 bg-violet-50/50 p-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black text-violet-700">
                Áudio gravado
              </p>

              <p className="mt-0.5 text-[11px] tabular-nums text-violet-500">
                {formatTime(
                  audioDurationMs
                )}
              </p>
            </div>

            <button
              type="button"
              onClick={
                clearAudio
              }
              disabled={
                submitting
              }
              title="Excluir áudio"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-red-500 shadow-sm transition hover:bg-red-50 disabled:opacity-50"
            >
              <Trash2
                size={15}
              />
            </button>
          </div>

          <audio
            controls
            preload="metadata"
            src={
              previewUrl
            }
            className="h-10 w-full"
          />
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-bold text-red-600">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={
          submitting ||
          recording
        }
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 py-4 text-sm font-black text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? (
          <>
            <Loader2
              size={16}
              className="animate-spin"
            />

            Enviando ajuste...
          </>
        ) : (
          'Enviar pedido de ajuste'
        )}
      </button>
    </form>
  );
}