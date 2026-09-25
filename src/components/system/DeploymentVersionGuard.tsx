"use client";

import {
  useEffect,
  useRef,
} from "react";


const CLIENT_VERSION =
  process.env
    .NEXT_PUBLIC_APROVUP_DEPLOYMENT_ID ||
  "unknown";


export function DeploymentVersionGuard() {

  const reloadingRef =
    useRef(
      false
    );


  useEffect(
    () => {

      let disposed =
        false;


      async function checkVersion() {

        if (
          disposed ||
          reloadingRef.current
        ) {
          return;
        }


        try {

          const response =
            await fetch(
              "/api/version?t=" +
              Date.now(),
              {
                cache:
                  "no-store",

                credentials:
                  "same-origin",

                headers: {
                  "Cache-Control":
                    "no-cache",
                },
              }
            );


          if (
            !response.ok
          ) {
            return;
          }


          const data =
            await response.json() as {
              version?:
                string;
            };


          const serverVersion =
            String(
              data.version ||
              ""
            ).trim();


          if (
            CLIENT_VERSION !==
              "unknown" &&
            serverVersion &&
            serverVersion !==
              "unknown" &&
            serverVersion !==
              CLIENT_VERSION
          ) {

            reloadingRef.current =
              true;


            console.info(
              "[AprovUP] Nova versao detectada. Recarregando aplicacao."
            );


            window.location.reload();
          }

        }
        catch {

          /*
           * Uma falha temporaria de rede nao deve
           * interromper o uso do sistema.
           */
        }
      }


      function handleFocus() {

        void checkVersion();
      }


      function handleVisibility() {

        if (
          document.visibilityState ===
          "visible"
        ) {

          void checkVersion();
        }
      }


      function handleOnline() {

        void checkVersion();
      }


      void checkVersion();


      window.addEventListener(
        "focus",
        handleFocus
      );


      window.addEventListener(
        "pageshow",
        handleFocus
      );


      window.addEventListener(
        "online",
        handleOnline
      );


      document.addEventListener(
        "visibilitychange",
        handleVisibility
      );


      const timer =
        window.setInterval(
          () => {
            void checkVersion();
          },
          30000
        );


      return () => {

        disposed =
          true;


        window.clearInterval(
          timer
        );


        window.removeEventListener(
          "focus",
          handleFocus
        );


        window.removeEventListener(
          "pageshow",
          handleFocus
        );


        window.removeEventListener(
          "online",
          handleOnline
        );


        document.removeEventListener(
          "visibilitychange",
          handleVisibility
        );
      };
    },
    []
  );


  return null;
}
