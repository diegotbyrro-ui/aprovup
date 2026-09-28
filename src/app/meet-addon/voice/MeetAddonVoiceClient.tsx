'use client';

import {
  AlertTriangle,
  CheckCircle2,
  LoaderCircle,
  Mic,
  Square,
} from 'lucide-react';

import {
  useEffect,
  useRef,
  useState,
} from 'react';


type VoiceStatus =
  | 'CHECKING'
  | 'NEED_PERMISSION'
  | 'READY'
  | 'ARMING'
  | 'RECORDING'
  | 'TRANSCRIBING'
  | 'DONE'
  | 'ERROR';


const MICROPHONE_STORAGE_KEY =
  'aprovup_liv_microphone_device_id';


const MICROPHONE_GAIN_STORAGE_KEY =
  'aprovup_liv_microphone_gain';


const DEFAULT_MICROPHONE_GAIN =
  2.2;


export function MeetAddonVoiceClient() {

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
    level,
    setLevel,
  ] =
    useState(
      0
    );


  const [
    microphoneGain,
    setMicrophoneGain,
  ] =
    useState(
      DEFAULT_MICROPHONE_GAIN
    );


  const recorderRef =
    useRef<
      MediaRecorder |
      null
    >(
      null
    );


  const streamRef =
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
      >
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


  function stopLevelMeter() {

    processedStreamRef.current
      ?.getTracks()
      .forEach(
        (
          track
        ) =>
          track.stop()
      );


    processedStreamRef.current =
      null;


    gainNodeRef.current =
      null;


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


  function stopCurrentStream() {

    streamRef.current
      ?.getTracks()
      .forEach(
        (
          track
        ) =>
          track.stop()
      );


    streamRef.current =
      null;


    stopLevelMeter();
  }


  async function refreshMicrophones(
    preferredDeviceId?:
      string
  ) {

    if (
      !navigator.mediaDevices
        ?.enumerateDevices
    ) {

      return [];
    }


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


    const savedDeviceId =
      preferredDeviceId ||
      window.localStorage
        .getItem(
          MICROPHONE_STORAGE_KEY
        ) ||
      '';


    const exists =
      inputs.some(
        (
          device
        ) =>
          device.deviceId ===
          savedDeviceId
      );


    if (
      exists
    ) {

      setSelectedDeviceId(
        savedDeviceId
      );

      return inputs;
    }


    const defaultDevice =
      inputs.find(
        (
          device
        ) =>
          device.deviceId ===
          'default'
      ) ||
      inputs[0];


    if (defaultDevice) {

      setSelectedDeviceId(
        defaultDevice.deviceId
      );
    }


    return inputs;
  }


  async function startLevelMeter(
    stream:
      MediaStream
  ) {

    stopLevelMeter();


    const context =
      new AudioContext();


    audioContextRef.current =
      context;


    try {

      await context.resume();

    }
    catch {
      // O browser pode iniciar o contexto logo depois.
    }


    const source =
      context.createMediaStreamSource(
        stream
      );


    /*
     * Ganho digital real.
     *
     * Diferente de apenas aumentar a barra visual,
     * este audio amplificado sera efetivamente
     * gravado e enviado para a transcricao.
     */
    const gainNode =
      context.createGain();


    gainNode.gain.value =
      microphoneGainRef.current;


    gainNodeRef.current =
      gainNode;


    /*
     * O compressor segura picos quando o usuario
     * chega perto do microfone ou fala mais alto,
     * evitando distorcao depois do aumento de ganho.
     */
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


    const tick =
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


        /*
         * Medidor em escala aproximadamente logaritmica.
         *
         * -60 dB = quase silencio.
         * -30 dB = voz confortavel.
         * -12 dB = bastante forte.
         *
         * Portanto o usuario nao precisa chegar a 100%.
         */
        const db =
          rms >
          0.000001
            ? 20 *
              Math.log10(
                rms
              )
            : -100;


        const visualLevel =
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
          visualLevel
        );


        if (
          recordingActiveRef.current
        ) {

          maxLevelRef.current =
            Math.max(
              maxLevelRef.current,
              visualLevel
            );
        }


        animationFrameRef.current =
          window.requestAnimationFrame(
            tick
          );
      };


    tick();
  }

  async function openMicrophone(
    requestedDeviceId?:
      string
  ) {

    setError(
      ''
    );


    setStatus(
      'CHECKING'
    );


    stopCurrentStream();


    const savedDeviceId =
      requestedDeviceId ||
      window.localStorage
        .getItem(
          MICROPHONE_STORAGE_KEY
        ) ||
      '';


    const makeConstraints =
      (
        deviceId?:
          string
      ): MediaStreamConstraints => ({
        audio: {
          deviceId:
            deviceId &&
            deviceId !==
              'default'
              ? {
                  exact:
                    deviceId,
                }
              : undefined,

          echoCancellation:
            true,

          noiseSuppression:
            true,

          autoGainControl:
            true,
        },
      });


    let stream:
      MediaStream;


    try {

      stream =
        await navigator.mediaDevices
          .getUserMedia(
            makeConstraints(
              savedDeviceId
            )
          );

    }
    catch (
      firstError
    ) {

      /*
       * Caso o microfone salvo tenha sido
       * desconectado, tentamos o padrao.
       */
      if (
        savedDeviceId &&
        firstError instanceof DOMException &&
        (
          firstError.name ===
            'OverconstrainedError' ||
          firstError.name ===
            'NotFoundError'
        )
      ) {

        stream =
          await navigator.mediaDevices
            .getUserMedia(
              makeConstraints()
            );

      }
      else {

        throw firstError;
      }
    }


    streamRef.current =
      stream;


    const audioTrack =
      stream
        .getAudioTracks()
        [0];


    const actualDeviceId =
      String(
        audioTrack
          ?.getSettings()
          .deviceId ||
        savedDeviceId ||
        ''
      );


    const inputs =
      await refreshMicrophones(
        actualDeviceId
      );


    const selectedExists =
      inputs.some(
        (
          device
        ) =>
          device.deviceId ===
          actualDeviceId
      );


    const finalDeviceId =
      selectedExists
        ? actualDeviceId
        : (
            inputs.find(
              (
                device
              ) =>
                device.deviceId ===
                'default'
            )
              ?.deviceId ||
            inputs[0]
              ?.deviceId ||
            actualDeviceId
          );


    if (
      finalDeviceId
    ) {

      setSelectedDeviceId(
        finalDeviceId
      );


      window.localStorage
        .setItem(
          MICROPHONE_STORAGE_KEY,
          finalDeviceId
        );
    }


    await startLevelMeter(
      stream
    );


    setStatus(
      'READY'
    );


    return stream;
  }


  async function requestMicrophonePermission() {

    try {

      await openMicrophone();

    }
    catch (
      permissionError
    ) {

      const denied =
        permissionError instanceof DOMException &&
        permissionError.name ===
          'NotAllowedError';


      setError(
        denied
          ? (
              'O Chrome bloqueou o microfone. ' +
              'No aprovup.com.br, deixe Microfone como Permitir e tente novamente.'
            )
          : (
              permissionError instanceof Error
                ? permissionError.message
                : 'Não foi possível abrir o microfone.'
            )
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

      await openMicrophone(
        deviceId
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


    setError(
      ''
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


      setStatus(
        'DONE'
      );


      sendToMeet(
        'APROVUP_MEET_VOICE_RESULT',
        {
          text,
        }
      );


      window.setTimeout(
        () => {

          window.close();

        },
        650
      );

    }
    catch (
      transcribeError
    ) {

      setError(
        transcribeError instanceof Error
          ? transcribeError.message
          : 'Erro ao processar o áudio.'
      );


      setStatus(
        'ERROR'
      );
    }
  }


  function startRecording() {

    const stream =
      processedStreamRef.current ||
      streamRef.current;


    if (
      !stream ||
      status !==
        'READY'
    ) {

      return;
    }


    if (
      typeof MediaRecorder ===
      'undefined'
    ) {

      setError(
        'Este navegador não possui suporte ao gravador de áudio.'
      );


      setStatus(
        'ERROR'
      );


      return;
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


        setError(
          'A gravação foi interrompida pelo navegador.'
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


        recordingActiveRef.current =
          false;


        const chunks =
          chunksRef.current;


        chunksRef.current =
          [];


        stopCurrentStream();


        if (
          duration <
          900
        ) {

          setError(
            'O áudio ficou muito curto. Fale por pelo menos 1 segundo.'
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

          setError(
            'A voz chegou muito baixa. Aumente o ganho da Liv ou o volume do microfone e tente novamente.'
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

          setError(
            'Nenhum áudio foi capturado.'
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
      200
    );


    /*
     * Gravamos desde já para não perder
     * a primeira sílaba, mas o usuário
     * recebe 450 ms de preparação visual.
     */
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
        }

      },
      450
    );
  }


  function stopRecording() {

    const recorder =
      recorderRef.current;


    if (
      !recorder ||
      recorder.state ===
        'inactive'
    ) {

      return;
    }


    recorder.stop();
  }


  useEffect(
    () => {

      let active =
        true;


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


      void (
        async () => {

          try {

            if (
              !navigator.mediaDevices
                ?.getUserMedia
            ) {

              throw new Error(
                'Este navegador não disponibilizou acesso ao microfone.'
              );
            }


            /*
             * Se a permissão já estiver salva como
             * "Permitir", abrimos automaticamente o
             * microfone salvo. Não aparece nova
             * solicitação do Chrome.
             */
            if (
              navigator.permissions
                ?.query
            ) {

              try {

                const permission =
                  await navigator.permissions
                    .query({
                      name:
                        'microphone' as PermissionName,
                    });


                if (
                  !active
                ) {
                  return;
                }


                if (
                  permission.state ===
                  'granted'
                ) {

                  await openMicrophone();

                  return;
                }


                if (
                  permission.state ===
                  'denied'
                ) {

                  setError(
                    'O microfone está bloqueado para aprovup.com.br. Altere a permissão do site para Permitir.'
                  );


                  setStatus(
                    'ERROR'
                  );


                  return;
                }

              }
              catch {
                // Browser sem suporte completo à Permissions API.
              }
            }


            await refreshMicrophones();


            if (
              active
            ) {

              setStatus(
                'NEED_PERMISSION'
              );
            }

          }
          catch (
            initializationError
          ) {

            if (
              active
            ) {

              setError(
                initializationError instanceof Error
                  ? initializationError.message
                  : 'Não foi possível preparar os microfones.'
              );


              setStatus(
                'ERROR'
              );
            }
          }

        }
      )();


      const handleDeviceChange =
        () => {

          void refreshMicrophones(
            selectedDeviceId
          );
        };


      navigator.mediaDevices
        ?.addEventListener(
          'devicechange',
          handleDeviceChange
        );


      return () => {

        active =
          false;


        navigator.mediaDevices
          ?.removeEventListener(
            'devicechange',
            handleDeviceChange
          );


        recordingActiveRef.current =
          false;


        stopCurrentStream();
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


  const selectedMicrophoneName =
    selectedMicrophone
      ?.label ||
    'Microfone selecionado';


  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-3 text-white">

      <section className="w-full rounded-2xl border border-white/10 bg-white/5 p-4 shadow-xl">

        <div className="flex items-center gap-3">

          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/20 text-violet-300">

            <Mic
              size={17}
            />

          </div>


          <div className="min-w-0">

            <p className="text-[9px] font-black uppercase tracking-[0.15em] text-violet-300">
              Liv · AprovUp
            </p>

            <p className="truncate text-sm font-black text-white">
              Comando por voz
            </p>

          </div>

        </div>


        {
          status ===
          'CHECKING'
            ? (
              <div className="mt-4 flex items-center gap-3 rounded-xl bg-white/5 p-3">

                <LoaderCircle
                  size={17}
                  className="animate-spin text-violet-300"
                />

                <p className="text-xs font-bold text-slate-300">
                  Preparando microfone...
                </p>

              </div>
            )
            : null
        }


        {
          status ===
          'NEED_PERMISSION'
            ? (
              <div className="mt-4">

                <p className="text-[11px] leading-relaxed text-slate-300">
                  Na primeira utilização, permita o acesso ao microfone para aprovup.com.br.
                </p>


                <button
                  type="button"
                  onClick={
                    () =>
                      void requestMicrophonePermission()
                  }
                  className="mt-3 h-10 w-full rounded-xl bg-blue-600 px-4 text-xs font-black text-white hover:bg-blue-700"
                >
                  Permitir microfone
                </button>

              </div>
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
                    className="mt-1.5 h-10 w-full rounded-xl border border-white/10 bg-slate-900 px-3 text-[11px] font-bold text-white outline-none focus:border-blue-500"
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
                              (
                                'Microfone ' +
                                String(
                                  index +
                                  1
                                )
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
                    Ganho da voz
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
                    className="mt-1.5 h-10 w-full rounded-xl border border-white/10 bg-slate-900 px-3 text-[11px] font-bold text-white outline-none focus:border-blue-500"
                  >

                    <option value="1">
                      Normal · 1.0x
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
                      Nível de entrada
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
                    {selectedMicrophoneName}
                  </p>


                  <p className="mt-1 text-[9px] text-slate-500">
                    Para voz normal, tente manter o nível entre 35% e 75%. Não precisa chegar a 100%.
                  </p>

                </div>


                <button
                  type="button"
                  onClick={
                    startRecording
                  }
                  className="h-10 w-full rounded-xl bg-blue-600 px-4 text-xs font-black text-white hover:bg-blue-700"
                >
                  Começar a falar
                </button>

              </div>
            )
            : null
        }


        {
          status ===
          'ARMING'
            ? (
              <div className="mt-5 flex items-center gap-3">

                <LoaderCircle
                  size={17}
                  className="animate-spin text-amber-300"
                />

                <div>

                  <p className="text-sm font-black">
                    Preparando...
                  </p>

                  <p className="text-[10px] text-slate-400">
                    Pode falar quando aparecer “Ouvindo”.
                  </p>

                </div>

              </div>
            )
            : null
        }


        {
          status ===
          'RECORDING'
            ? (
              <div className="mt-4">

                <div className="flex items-center gap-3">

                  <span className="relative flex h-3 w-3 shrink-0">

                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-60" />

                    <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />

                  </span>


                  <div className="min-w-0 flex-1">

                    <p className="text-sm font-black">
                      Liv está ouvindo
                    </p>

                    <p className="truncate text-[9px] text-slate-500">
                      {selectedMicrophoneName}
                    </p>

                  </div>

                </div>


                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">

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


                <button
                  type="button"
                  onClick={
                    stopRecording
                  }
                  className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-white px-4 text-xs font-black text-slate-950 hover:bg-slate-100"
                >
                  <Square
                    size={12}
                  />

                  Finalizar
                </button>

              </div>
            )
            : null
        }


        {
          status ===
          'TRANSCRIBING'
            ? (
              <div className="mt-5 flex items-center gap-3">

                <LoaderCircle
                  size={18}
                  className="animate-spin text-blue-300"
                />


                <div>

                  <p className="text-sm font-black">
                    Entendendo...
                  </p>

                  <p className="text-[10px] text-slate-400">
                    Transformando sua fala em texto.
                  </p>

                </div>

              </div>
            )
            : null
        }


        {
          status ===
          'DONE'
            ? (
              <div className="mt-5 flex items-center gap-3">

                <CheckCircle2
                  size={19}
                  className="text-emerald-300"
                />


                <div>

                  <p className="text-sm font-black">
                    Comando reconhecido
                  </p>

                  <p className="text-[10px] text-slate-400">
                    Voltando para a Liv...
                  </p>

                </div>

              </div>
            )
            : null
        }


        {
          status ===
          'ERROR'
            ? (
              <div className="mt-4">

                <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3">

                  <AlertTriangle
                    size={16}
                    className="mt-0.5 shrink-0 text-red-300"
                  />


                  <p className="text-[10px] font-semibold leading-relaxed text-red-100">
                    {error}
                  </p>

                </div>


                <button
                  type="button"
                  onClick={
                    () =>
                      void requestMicrophonePermission()
                  }
                  className="mt-3 h-9 w-full rounded-xl border border-white/10 text-[10px] font-black text-slate-200 hover:bg-white/5"
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