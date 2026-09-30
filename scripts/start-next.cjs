'use strict';

const {
  spawn,
} = require(
  'node:child_process'
);

const port =
  String(
    process.env.PORT ||
    '3000'
  ).trim();

if (
  !/^\d+$/.test(
    port
  )
) {

  throw new Error(
    'PORT invalida: ' +
    port
  );
}


/*
 * AprovUP roda atras do reverse proxy HTTPS da Hostinger.
 *
 * Server Actions do Next podem fazer requisicoes HTTP
 * internas depois de um redirect().
 *
 * A origem interna deve apontar diretamente para o processo
 * Node e nao para o HTTPS publico.
 */

const previousPrivateOrigin =
  String(
    process.env.__NEXT_PRIVATE_ORIGIN ||
    ''
  ).trim();


const internalOrigin =
  'http://127.0.0.1:' +
  port;


const env = {
  ...process.env,

  PORT:
    port,

  __NEXT_PRIVATE_ORIGIN:
    internalOrigin,
};


console.log(
  '[AprovUP] Launcher:',
  'V3.2'
);


console.log(
  '[AprovUP] Node:',
  process.version
);


console.log(
  '[AprovUP] PORT:',
  port
);


console.log(
  '[AprovUP] Previous private origin:',
  previousPrivateOrigin ||
  '(unset)'
);


console.log(
  '[AprovUP] Next internal origin:',
  internalOrigin
);


console.log(
  '[AprovUP] Next listen:',
  '0.0.0.0:' +
  port
);


const nextBinary =
  require.resolve(
    'next/dist/bin/next'
  );


const child =
  spawn(
    process.execPath,
    [
      nextBinary,

      'start',

      '-H',
      '0.0.0.0',

      '-p',
      port,
    ],
    {
      stdio:
        'inherit',

      env,
    }
  );


async function sleep(
  milliseconds
) {

  await new Promise(
    (
      resolve
    ) => {

      setTimeout(
        resolve,
        milliseconds
      );
    }
  );
}


async function probeInternalOrigin() {

  for (
    let attempt = 1;
    attempt <= 10;
    attempt += 1
  ) {

    await sleep(
      1000
    );


    const controller =
      new AbortController();


    const timeout =
      setTimeout(
        () => {

          controller.abort();

        },
        5000
      );


    try {

      const response =
        await fetch(
          internalOrigin +
          '/robots.txt',
          {
            method:
              'GET',

            redirect:
              'manual',

            signal:
              controller.signal,
          }
        );


      clearTimeout(
        timeout
      );


      console.log(
        '[AprovUP] Internal probe: HTTP',
        response.status,
        'attempt',
        attempt
      );


      try {

        if (
          response.body
        ) {

          await response.body.cancel();
        }

      }
      catch {}


      return;

    }
    catch (
      error
    ) {

      clearTimeout(
        timeout
      );


      console.error(
        '[AprovUP] Internal probe attempt failed:',
        attempt,
        error instanceof Error
          ? error.message
          : String(
              error
            )
      );
    }
  }


  console.error(
    '[AprovUP] Internal origin unreachable after 10 attempts.'
  );
}


setTimeout(
  () => {

    void probeInternalOrigin();

  },
  250
);


child.on(
  'error',
  (
    error
  ) => {

    console.error(
      '[AprovUP] Falha ao iniciar Next:',
      error
    );


    process.exit(
      1
    );
  }
);


child.on(
  'exit',
  (
    code,
    signal
  ) => {

    if (
      signal
    ) {

      console.log(
        '[AprovUP] Next encerrado por sinal:',
        signal
      );
    }


    process.exit(
      code ===
        null
        ? 1
        : code
    );
  }
);


for (
  const signal
  of [
    'SIGTERM',
    'SIGINT',
  ]
) {

  process.on(
    signal,
    () => {

      if (
        !child.killed
      ) {

        child.kill(
          signal
        );
      }
    }
  );
}