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
 * Em redirects executados por Server Actions, o Next.js
 * pode fazer uma requisicao interna para a pagina de destino.
 *
 * Essa requisicao interna deve acessar diretamente o processo
 * Node via HTTP local e nao retornar pelo reverse proxy HTTPS.
 */

const internalOrigin =
  (
    process.env.__NEXT_PRIVATE_ORIGIN ||
    ''
  ).trim() ||
  (
    'http://127.0.0.1:' +
    port
  );

const env = {
  ...process.env,

  PORT:
    port,

  __NEXT_PRIVATE_ORIGIN:
    internalOrigin,
};

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
      code === null
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