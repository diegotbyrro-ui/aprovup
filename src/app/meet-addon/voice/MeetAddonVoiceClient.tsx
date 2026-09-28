'use client';

import {
  AlertTriangle,
  LoaderCircle,
  Mic,
} from 'lucide-react';

import {
  useEffect,
  useRef,
  useState,
} from 'react';


type VoiceMode =
  | 'settings'
  | 'capture';


type VoiceStatus =
  | 'CHECKING'
  | 'NEED_PERMISSION'
  | 'READY'
  | 'ARMING'
  | 'RECORDING'
  | 'TRANSCRIBING'
  | 'ERROR';


const MICROPHONE_STORAGE_KEY =
  'aprovup_liv_microphone_device_id';


const MICROPHONE_GAIN_STORAGE_KEY =
  'aprovup_liv_microphone_gain';


const DEFAULT_MICROPHONE_GAIN =
  2.2;


export function MeetAddonVoiceClient() {

  const [
    mode,
    setMode,
  ] =
    useState<VoiceMode>(
      'settings'
    );


  const [
    status,
    setStatus,
  ] =
    useState<VoiceStatus>(
      'CHECKING'
    );


  const [
    error,
    setError,
  ] =
    useState(
      ''
    );


  const [
    microphones,
    setMicrophones,
  ] =
    useState<
      MediaDeviceInfo[]
    >(
      []
    );


  const [
    selectedDeviceId,
    setSelectedDeviceId,
  ] =
    useState(
      ''
    );


  const [
    microphoneGain,
    setMicrophoneGain,
  ] =
    useState(
      DEFAULT_MICROPHONE_GAIN
    );


  const [
    level,
    setLevel,
  ] =
    useState(
      0
    );


  const modeRef =
    useRef<VoiceMode>(
      'settings'
    );


  const sourceStreamRef =
    useRef<
      MediaStream |
      null
    >(
      null
    );


  const processedStreamRef =
    useRef<
      MediaStream |
      null
    >(
      null
    );


  const recorderRef =
    useRef<
      MediaRecorder |
      null
    >(
      null
    );


  const audioContextRef =
    useRef<
      AudioContext |
      null
    >(
      null
    );


  const gainNodeRef =
    useRef<
      GainNode |
      null
    >(
      null
    );


  const microphoneGainRef =
    useRef(
      DEFAULT_MICROPHONE_GAIN
    );


  const animationFrameRef =
    useRef<
      number |
      null
    >(
      null
    );


  const chunksRef =
    useRef<
      Blob[]
    >(
      []
    );


  const maxLevelRef =
    useRef(
      0
    );


  const recordingStartedAtRef =
    useRef(
      0
    );


  const recordingActiveRef =
    useRef(
      false
    );


  function sendToMeet(
    type:
      string,

    payload:
      Record<
        string,
        unknown
      > =
        {}
  ) {

    if (!window.opener) {
      return;
    }


    window.opener.postMessage(
      {
        type,
        ...payload,
      },
      window.location.origin
    );
  }


  function stopAudioPipeline() {

    if (
      animationFrameRef.current !==
      null
    ) {

      window.cancelAnimationFrame(
        animationFrameRef.current
      );


      animationFrameRef.current =
        null;
    }


    sourceStreamRef.current
      ?.getTracks()
      .forEach(
        (
          track
        ) =>
          track.stop()
      );


    processedStreamRef.current
      ?.getTracks()
      .forEach(
        (
          track
        ) =>
          track.stop()
      );


    sourceStreamRef.current =
      null;


    processedStreamRef.current =
      null;


    gainNodeRef.current =
      null;


    const context =
      audioContextRef.current;


    audioContextRef.current =
      null;


    if (context) {

      void context
        .close()
        .catch(
          () =>
            null
        );
    }


    setLevel(
      0
    );
  }


  async function refreshMicrophones(
    preferredDeviceId?:
      string
  ) {

    const devices =
      await navigator
        .mediaDevices
        .enumerateDevices();


    const inputs =
      devices.filter(
        (
          device
        ) =>
          device.kind ===
          'audioinput'
      );


    setMicrophones(
      inputs
    );


    const saved =
      preferredDeviceId ||
      window.localStorage
        .getItem(
          MICROPHONE_STORAGE_KEY
        ) ||
      '';


    const selected =
      inputs.find(
        (
          device
        ) =>
          device.deviceId ===
          saved
      ) ||
      inputs.find(
        (
          device
        ) =>
          device.deviceId ===
          'default'
      ) ||
      inputs[0];


    if (selected) {

      setSelectedDeviceId(
        selected.deviceId
      );


      window.localStorage
        .setItem(
          MICROPHONE_STORAGE_KEY,
          selected.deviceId
        );
    }


    return inputs;
  }


  async function createAudioPipeline(
    stream:
      MediaStream
  ) {

    const context =
      new AudioContext();


    audioContextRef.current =
      context;


    try {

      await context.resume();

    }
    catch {
      // Continua normalmente.
    }


    const source =
      context.createMediaStreamSource(
        stream
      );


    const gainNode =
      context.createGain();


    gainNode.gain.value =
      microphoneGainRef.current;


    gainNodeRef.current =
      gainNode;


    const compressor =
      context.createDynamicsCompressor();


    compressor.threshold.value =
      -22;


    compressor.knee.value =
      18;


    compressor.ratio.value =
      5;


    compressor.attack.value =
      0.003;


    compressor.release.value =
      0.2;


    const analyser =
      context.createAnalyser();


    analyser.fftSize =
      256;


    analyser.smoothingTimeConstant =
      0.7;


    const destination =
      context.createMediaStreamDestination();


    source.connect(
      gainNode
    );


    gainNode.connect(
      compressor
    );


    compressor.connect(
      analyser
    );


    compressor.connect(
      destination
    );


    processedStreamRef.current =
      destination.stream;


    const data =
      new Uint8Array(
        analyser.fftSize
      );


    const updateLevel =
      () => {

        analyser.getByteTimeDomainData(
          data
        );


        let sum =
          0;


        for (
          let index = 0;
          index <
          data.length;
          index += 1
        ) {

          const sample =
            (
              data[index] -
              128
            ) /
            128;


          sum +=
            sample *
            sample;
        }


        const rms =
          Math.sqrt(
            sum /
            data.length
          );


        const db =
          rms >
          0.000001
            ? 20 *
              Math.log10(
                rms
              )
            : -100;


        const nextLevel =
          Math.max(
            0,
            Math.min(
              100,
              Math.round(
                (
                  (
                    db +
                    60
                  ) /
                  48
                ) *
                100
              )
            )
          );


        setLevel(
          nextLevel
        );


        if (
          recordingActiveRef.current
        ) {

          maxLevelRef.current =
            Math.max(
              maxLevelRef.current,
              nextLevel
            );
        }


        animationFrameRef.current =
          window.requestAnimationFrame(
            updateLevel
          );
      };


    updateLevel();


    return destination.stream;
  }


  async function openMicrophone(
    requestedDeviceId?:
      string
  ) {

    stopAudioPipeline();


    const saved =
      requestedDeviceId ||
      window.localStorage
        .getItem(
          MICROPHONE_STORAGE_KEY
        ) ||
      '';


    const constraints:
      MediaStreamConstraints =
      {
        audio: {
          deviceId:
            saved &&
            saved !==
              'default'
              ? {
                  exact:
                    saved,
                }
              : undefined,

          echoCancellation:
            true,

          noiseSuppression:
            true,

          autoGainControl:
            true,
        },
      };


    let stream:
      MediaStream;


    try {

      stream =
        await navigator.mediaDevices
          .getUserMedia(
            constraints
          );

    }
    catch (
      firstError
    ) {

      if (
        saved &&
        firstError instanceof
          DOMException &&
        (
          firstError.name ===
            'OverconstrainedError' ||
          firstError.name ===
            'NotFoundError'
        )
      ) {

        stream =
          await navigator.mediaDevices
            .getUserMedia({
              audio: {
                echoCancellation:
                  true,

                noiseSuppression:
                  true,

                autoGainControl:
                  true,
              },
            });

      }
      else {

        throw firstError;
      }
    }


    sourceStreamRef.current =
      stream;


    const track =
      stream
        .getAudioTracks()
        [0];


    const actualDeviceId =
      String(
        track
          ?.getSettings()
          .deviceId ||
        saved ||
        ''
      );


    await refreshMicrophones(
      actualDeviceId
    );


    return await createAudioPipeline(
      stream
    );
  }


  function changeMicrophoneGain(
    value:
      number
  ) {

    const nextGain =
      Math.max(
        1,
        Math.min(
          3,
          value
        )
      );


    microphoneGainRef.current =
      nextGain;


    setMicrophoneGain(
      nextGain
    );


    window.localStorage
      .setItem(
        MICROPHONE_GAIN_STORAGE_KEY,
        String(
          nextGain
        )
      );


    const gainNode =
      gainNodeRef.current;


    const context =
      audioContextRef.current;


    if (
      gainNode &&
      context
    ) {

      gainNode.gain
        .setTargetAtTime(
          nextGain,
          context.currentTime,
          0.025
        );
    }
  }


  async function transcribe(
    blob:
      Blob
  ) {

    setStatus(
      'TRANSCRIBING'
    );


    try {

      const data =
        new FormData();


      const extension =
        blob.type.includes(
          'ogg'
        )
          ? 'ogg'
          : 'webm';


      data.append(
        'audio',
        blob,
        'comando-liv.' +
          extension
      );


      const response =
        await fetch(
          '/api/secretaria/audio',
          {
            method:
              'POST',

            body:
              data,
          }
        );


      const payload =
        await response.json() as {
          ok?:
            boolean;

          text?:
            string;

          message?:
            string;
        };


      if (
        !response.ok ||
        !payload.ok
      ) {

        throw new Error(
          payload.message ||
          'Não foi possível transcrever o áudio.'
        );
      }


      const text =
        String(
          payload.text ||
          ''
        ).trim();


      if (!text) {

        throw new Error(
          'A Liv não conseguiu identificar nenhuma fala.'
        );
      }


      sendToMeet(
        'APROVUP_MEET_VOICE_RESULT',
        {
          text,
        }
      );


      window.setTimeout(
        () =>
          window.close(),
        250
      );

    }
    catch (
      transcriptionError
    ) {

      const message =
        transcriptionError instanceof Error
          ? transcriptionError.message
          : 'Erro ao processar o áudio.';


      sendToMeet(
        'APROVUP_MEET_VOICE_ERROR',
        {
          message,
        }
      );


      setError(
        message
      );


      setStatus(
        'ERROR'
      );


      if (
        modeRef.current ===
        'capture'
      ) {

        window.setTimeout(
          () =>
            window.close(),
          1200
        );
      }
    }
  }


  function startRecording(
    stream:
      MediaStream
  ) {

    if (
      typeof MediaRecorder ===
      'undefined'
    ) {

      throw new Error(
        'Este navegador não possui suporte ao gravador de áudio.'
      );
    }


    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
    ];


    const mimeType =
      candidates.find(
        (
          candidate
        ) =>
          MediaRecorder
            .isTypeSupported(
              candidate
            )
      );


    const recorder =
      mimeType
        ? new MediaRecorder(
            stream,
            {
              mimeType,
            }
          )
        : new MediaRecorder(
            stream
          );


    recorderRef.current =
      recorder;


    chunksRef.current =
      [];


    maxLevelRef.current =
      0;


    recordingStartedAtRef.current =
      Date.now();


    recordingActiveRef.current =
      true;


    recorder.ondataavailable =
      (
        event
      ) => {

        if (
          event.data.size >
          0
        ) {

          chunksRef.current.push(
            event.data
          );
        }
      };


    recorder.onerror =
      () => {

        recordingActiveRef.current =
          false;


        const message =
          'A gravação foi interrompida pelo navegador.';


        sendToMeet(
          'APROVUP_MEET_VOICE_ERROR',
          {
            message,
          }
        );


        setError(
          message
        );


        setStatus(
          'ERROR'
        );
      };


    recorder.onstop =
      () => {

        const duration =
          Date.now() -
          recordingStartedAtRef.current;


        const peak =
          maxLevelRef.current;


        const chunks =
          chunksRef.current;


        chunksRef.current =
          [];


        recordingActiveRef.current =
          false;


        stopAudioPipeline();


        if (
          duration <
          700
        ) {

          const message =
            'A fala ficou muito curta. Tente novamente.';


          sendToMeet(
            'APROVUP_MEET_VOICE_ERROR',
            {
              message,
            }
          );


          setError(
            message
          );


          setStatus(
            'ERROR'
          );


          return;
        }


        if (
          peak <
          10
        ) {

          const message =
            'A voz chegou muito baixa. Abra as configurações da Liv e ajuste a sensibilidade.';


          sendToMeet(
            'APROVUP_MEET_VOICE_ERROR',
            {
              message,
            }
          );


          setError(
            message
          );


          setStatus(
            'ERROR'
          );


          return;
        }


        if (
          chunks.length ===
          0
        ) {

          const message =
            'Nenhum áudio foi capturado.';


          sendToMeet(
            'APROVUP_MEET_VOICE_ERROR',
            {
              message,
            }
          );


          setError(
            message
          );


          setStatus(
            'ERROR'
          );


          return;
        }


        const blob =
          new Blob(
            chunks,
            {
              type:
                recorder.mimeType ||
                'audio/webm',
            }
          );


        void transcribe(
          blob
        );
      };


    recorder.start(
      180
    );


    setStatus(
      'ARMING'
    );


    window.setTimeout(
      () => {

        if (
          recorder.state ===
          'recording'
        ) {

          setStatus(
            'RECORDING'
          );


          sendToMeet(
            'APROVUP_MEET_VOICE_RECORDING'
          );


          try {

            window.blur();


            window.opener
              ?.focus();

          }
          catch {
            // O navegador pode ignorar.
          }
        }

      },
      350
    );
  }


  async function prepareSettings() {

    try {

      const permission =
        navigator.permissions
          ?.query
          ? await navigator.permissions
              .query({
                name:
                  'microphone' as
                    PermissionName,
              })
          : null;


      if (
        permission?.state ===
        'denied'
      ) {

        throw new Error(
          'O microfone está bloqueado para aprovup.com.br. Altere a permissão do site para Permitir.'
        );
      }


      if (
        permission?.state ===
        'granted'
      ) {

        await openMicrophone();


        setStatus(
          'READY'
        );


        return;
      }


      await refreshMicrophones();


      setStatus(
        'NEED_PERMISSION'
      );

    }
    catch (
      settingsError
    ) {

      setError(
        settingsError instanceof Error
          ? settingsError.message
          : 'Não foi possível preparar o microfone.'
      );


      setStatus(
        'ERROR'
      );
    }
  }


  async function requestPermission() {

    try {

      setError(
        ''
      );


      setStatus(
        'CHECKING'
      );


      await openMicrophone();


      setStatus(
        'READY'
      );

    }
    catch (
      permissionError
    ) {

      setError(
        permissionError instanceof Error
          ? permissionError.message
          : 'Não foi possível abrir o microfone.'
      );


      setStatus(
        'ERROR'
      );
    }
  }


  async function changeMicrophone(
    deviceId:
      string
  ) {

    setSelectedDeviceId(
      deviceId
    );


    window.localStorage
      .setItem(
        MICROPHONE_STORAGE_KEY,
        deviceId
      );


    try {

      setStatus(
        'CHECKING'
      );


      await openMicrophone(
        deviceId
      );


      setStatus(
        'READY'
      );

    }
    catch (
      deviceError
    ) {

      setError(
        deviceError instanceof Error
          ? deviceError.message
          : 'Não foi possível selecionar este microfone.'
      );


      setStatus(
        'ERROR'
      );
    }
  }


  useEffect(
    () => {

      let active =
        true;


      const nextMode:
        VoiceMode =
        new URLSearchParams(
          window.location.search
        ).get(
          'mode'
        ) ===
          'capture'
          ? 'capture'
          : 'settings';


      modeRef.current =
        nextMode;


      setMode(
        nextMode
      );


      const storedGain =
        Number(
          window.localStorage
            .getItem(
              MICROPHONE_GAIN_STORAGE_KEY
            )
        );


      if (
        Number.isFinite(
          storedGain
        ) &&
        storedGain >=
          1 &&
        storedGain <=
          3
      ) {

        microphoneGainRef.current =
          storedGain;


        setMicrophoneGain(
          storedGain
        );
      }


      function handleControlMessage(
        event:
          MessageEvent
      ) {

        if (
          event.origin !==
          window.location.origin
        ) {
          return;
        }


        if (
          event.data?.type !==
          'APROVUP_MEET_VOICE_STOP'
        ) {
          return;
        }


        const recorder =
          recorderRef.current;


        if (
          recorder &&
          recorder.state !==
            'inactive'
        ) {

          recorder.stop();
        }
      }


      window.addEventListener(
        'message',
        handleControlMessage
      );


      void (
        async () => {

          if (
            !navigator.mediaDevices
              ?.getUserMedia
          ) {

            const message =
              'Este navegador não disponibilizou acesso ao microfone.';


            setError(
              message
            );


            setStatus(
              'ERROR'
            );


            if (
              nextMode ===
              'capture'
            ) {

              sendToMeet(
                'APROVUP_MEET_VOICE_ERROR',
                {
                  message,
                }
              );
            }


            return;
          }


          if (
            nextMode ===
            'settings'
          ) {

            await prepareSettings();


            return;
          }


          try {

            const stream =
              await openMicrophone();


            if (!active) {
              return;
            }


            startRecording(
              stream
            );

          }
          catch (
            captureError
          ) {

            const message =
              captureError instanceof Error
                ? captureError.message
                : 'Não foi possível iniciar o microfone da Liv.';


            setError(
              message
            );


            setStatus(
              'ERROR'
            );


            sendToMeet(
              'APROVUP_MEET_VOICE_ERROR',
              {
                message:
                  message +
                  ' Abra as três bolinhas para revisar o microfone.',
              }
            );


            window.setTimeout(
              () =>
                window.close(),
              1400
            );
          }

        }
      )();


      return () => {

        active =
          false;


        window.removeEventListener(
          'message',
          handleControlMessage
        );


        recordingActiveRef.current =
          false;


        stopAudioPipeline();
      };

    },
    []
  );


  const selectedMicrophone =
    microphones.find(
      (
        microphone
      ) =>
        microphone.deviceId ===
        selectedDeviceId
    );


  const microphoneName =
    selectedMicrophone
      ?.label ||
    'Microfone selecionado';


  if (
    mode ===
    'capture'
  ) {

    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-3 text-white">

        <div className="w-full rounded-2xl border border-white/10 bg-white/5 p-4">

          {
            status ===
              'TRANSCRIBING'
              ? (
                <div className="flex items-center gap-3">

                  <LoaderCircle
                    size={17}
                    className="animate-spin text-blue-300"
                  />

                  <div>

                    <p className="text-xs font-black">
                      Liv está entendendo...
                    </p>

                    <p className="text-[9px] text-slate-500">
                      Convertendo sua fala.
                    </p>

                  </div>

                </div>
              )
              : status ===
                  'ERROR'
                ? (
                  <div className="flex items-start gap-2">

                    <AlertTriangle
                      size={15}
                      className="mt-0.5 shrink-0 text-red-300"
                    />

                    <p className="text-[10px] leading-relaxed text-red-100">
                      {error}
                    </p>

                  </div>
                )
                : (
                  <div className="flex items-center gap-3">

                    <span className="relative flex h-3 w-3 shrink-0">

                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-60" />

                      <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />

                    </span>

                    <div>

                      <p className="text-xs font-black">
                        Liv ouvindo
                      </p>

                      <p className="text-[9px] text-slate-500">
                        Finalize pelo botão vermelho.
                      </p>

                    </div>

                  </div>
                )
          }

        </div>

      </main>
    );
  }


  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-3 text-white">

      <section className="w-full rounded-2xl border border-white/10 bg-white/5 p-4 shadow-xl">

        <div className="flex items-center gap-3">

          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/20 text-violet-300">

            <Mic
              size={17}
            />

          </div>

          <div>

            <p className="text-[9px] font-black uppercase tracking-[0.15em] text-violet-300">
              Liv · Voz
            </p>

            <p className="text-sm font-black">
              Configurações
            </p>

          </div>

        </div>


        {
          status ===
          'CHECKING'
            ? (
              <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">

                <LoaderCircle
                  size={15}
                  className="animate-spin"
                />

                Preparando microfone...

              </div>
            )
            : null
        }


        {
          status ===
          'NEED_PERMISSION'
            ? (
              <button
                type="button"
                onClick={
                  () =>
                    void requestPermission()
                }
                className="mt-4 h-10 w-full rounded-xl bg-blue-600 text-xs font-black"
              >
                Permitir microfone
              </button>
            )
            : null
        }


        {
          status ===
          'READY'
            ? (
              <div className="mt-4 space-y-3">

                <div>

                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                    Microfone
                  </label>

                  <select
                    value={
                      selectedDeviceId
                    }
                    onChange={
                      (
                        event
                      ) =>
                        void changeMicrophone(
                          event.target.value
                        )
                    }
                    className="mt-1.5 h-10 w-full rounded-xl border border-white/10 bg-slate-900 px-3 text-[11px] font-bold text-white outline-none"
                  >

                    {
                      microphones.map(
                        (
                          microphone,
                          index
                        ) => (
                          <option
                            key={
                              microphone.deviceId ||
                              index
                            }
                            value={
                              microphone.deviceId
                            }
                          >
                            {
                              microphone.label ||
                              'Microfone ' +
                                String(
                                  index +
                                  1
                                )
                            }
                          </option>
                        )
                      )
                    }

                  </select>

                </div>


                <div>

                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                    Sensibilidade
                  </label>

                  <select
                    value={
                      String(
                        microphoneGain
                      )
                    }
                    onChange={
                      (
                        event
                      ) =>
                        changeMicrophoneGain(
                          Number(
                            event.target.value
                          )
                        )
                    }
                    className="mt-1.5 h-10 w-full rounded-xl border border-white/10 bg-slate-900 px-3 text-[11px] font-bold text-white outline-none"
                  >

                    <option value="1">
                      Normal
                    </option>

                    <option value="1.6">
                      Leve · +4 dB
                    </option>

                    <option value="2.2">
                      Reforçado · +7 dB
                    </option>

                    <option value="3">
                      Forte · +9.5 dB
                    </option>

                  </select>

                </div>


                <div>

                  <div className="flex items-center justify-between">

                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                      Teste do microfone
                    </span>

                    <span className="text-[9px] font-bold text-slate-500">
                      {
                        level <
                        20
                          ? 'baixo'
                          : level <
                              80
                            ? 'ideal'
                            : 'alto'
                      }
                    </span>

                  </div>

                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10">

                    <div
                      className="h-full rounded-full bg-emerald-500 transition-[width] duration-75"
                      style={{
                        width:
                          Math.max(
                            1,
                            level
                          ) +
                          '%',
                      }}
                    />

                  </div>

                  <p className="mt-1.5 truncate text-[9px] text-slate-500">
                    {microphoneName}
                  </p>

                </div>


                <p className="text-[9px] leading-relaxed text-slate-500">
                  Microfone e sensibilidade ficam salvos automaticamente.
                </p>

              </div>
            )
            : null
        }


        {
          status ===
          'ERROR'
            ? (
              <div className="mt-4">

                <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3">

                  <AlertTriangle
                    size={15}
                    className="mt-0.5 shrink-0 text-red-300"
                  />

                  <p className="text-[10px] leading-relaxed text-red-100">
                    {error}
                  </p>

                </div>

                <button
                  type="button"
                  onClick={
                    () =>
                      void requestPermission()
                  }
                  className="mt-3 h-9 w-full rounded-xl border border-white/10 text-[10px] font-black"
                >
                  Tentar novamente
                </button>

              </div>
            )
            : null
        }

      </section>

    </main>
  );
}