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
  AlertCircle,
  Loader2,
  Mic,
  Square,
  Trash2,
} from 'lucide-react';

import {
  requestInternalAdjustmentAction,
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


export function InternalReviewAdjustment({
  contentId,
  clientId,
}: {
  contentId: string;
  clientId: string;
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
    adjustment,
    setAdjustment,
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
    if (
      timerRef.current
    ) {
      clearInterval(
        timerRef.current
      );

      timerRef.current =
        null;
    }

    if (
      timeoutRef.current
    ) {
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
      'undefined'
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
            audio: true,
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
            MediaRecorder
              .isTypeSupported(
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

          const localUrl =
            URL.createObjectURL(
              blob
            );

          setAudioBlob(
            blob
          );

          setPreviewUrl(
            localUrl
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
        `/api/conteudos/${contentId}/upload-review-audio`,
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

    const cleanText =
      adjustment.trim();

    if (
      !cleanText &&
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
        'adjustment',
        cleanText
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

      await requestInternalAdjustmentAction(
        contentId,
        clientId,
        formData
      );

      router.replace(
        `/social-media?cliente=${clientId}`
      );

      router.refresh();
    }
    catch (caught) {
      const message =
        caught instanceof Error
          ? caught.message
          : '';

      setError(
        message ||
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
      className="rounded-lg border border-orange-100 bg-orange-50/60 p-2.5"
    >
      <div className="flex items-center gap-1.5">
        <AlertCircle
          size={11}
          className="text-orange-500"
        />

        <p className="text-[8px] font-bold text-orange-800">
          Revisão interna
        </p>
      </div>

      <p className="mt-1 text-[8px] leading-relaxed text-orange-700/70">
        Escreva o ajuste, grave um áudio ou use os dois.
      </p>

      <textarea
        value={
          adjustment
        }
        onChange={
          (event) => {
            setAdjustment(
              event.target.value
            );
          }
        }
        maxLength={2000}
        rows={2}
        placeholder="Ex: cortar de 00:14 a 00:18, trocar a tela final..."
        disabled={
          submitting
        }
        className="mt-2 w-full resize-none rounded-lg border border-orange-100 bg-white px-2.5 py-2 text-[9px] leading-relaxed text-slate-700 outline-none placeholder:text-slate-300 focus:border-orange-300 focus:ring-2 focus:ring-orange-100 disabled:opacity-60"
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
          className="mt-2 flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 text-[8px] font-bold text-violet-700 transition hover:bg-violet-100 disabled:opacity-50"
        >
          <Mic
            size={12}
          />

          Gravar áudio
        </button>
      ) : null}

      {recording ? (
        <div className="mt-2 rounded-lg border border-red-100 bg-white p-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />

              <span className="text-[8px] font-bold text-red-600">
                Gravando
              </span>

              <span className="text-[8px] font-semibold tabular-nums text-slate-500">
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
              className="flex h-7 items-center gap-1 rounded-md bg-red-50 px-2 text-[8px] font-bold text-red-600 hover:bg-red-100"
            >
              <Square
                size={10}
                fill="currentColor"
              />

              Finalizar
            </button>
          </div>
        </div>
      ) : null}

      {audioBlob &&
      previewUrl &&
      !recording ? (
        <div className="mt-2 rounded-lg border border-violet-100 bg-white p-2">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[8px] font-bold text-violet-700">
                Áudio gravado
              </p>

              <p className="mt-0.5 text-[7px] text-slate-400">
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
              className="flex h-7 w-7 items-center justify-center rounded-md text-red-500 hover:bg-red-50 disabled:opacity-50"
            >
              <Trash2
                size={12}
              />
            </button>
          </div>

          <audio
            controls
            preload="metadata"
            src={
              previewUrl
            }
            className="mt-2 h-8 w-full"
          />
        </div>
      ) : null}

      {error ? (
        <p className="mt-2 rounded-md bg-red-50 px-2 py-1.5 text-[8px] font-semibold text-red-600">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={
          submitting ||
          recording
        }
        className="mt-2 flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-orange-500 bg-orange-500 px-3 text-[8px] font-bold text-white shadow-sm transition hover:border-orange-600 hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? (
          <Loader2
            size={11}
            className="animate-spin"
          />
        ) : (
          <AlertCircle
            size={11}
          />
        )}

        {submitting
          ? 'Enviando ajuste...'
          : 'Solicitar ajuste interno'}
      </button>
    </form>
  );
}