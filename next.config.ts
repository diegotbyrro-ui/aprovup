import type { NextConfig } from "next";

import {
  execSync,
} from "node:child_process";

import {
  createHash,
} from "node:crypto";

import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";

import {
  join,
  relative,
} from "node:path";


function getGitDeploymentId() {
  try {
    const value =
      execSync(
        "git rev-parse HEAD",
        {
          cwd:
            process.cwd(),

          encoding:
            "utf8",

          stdio: [
            "ignore",
            "pipe",
            "ignore",
          ],
        }
      )
        .trim();


    return value ||
      null;
  }
  catch {
    return null;
  }
}


function getSourceDeploymentId() {

  const hash =
    createHash(
      "sha256"
    );


  function visit(
    target:
      string
  ) {

    if (
      !existsSync(
        target
      )
    ) {
      return;
    }


    const stat =
      statSync(
        target
      );


    if (
      stat.isDirectory()
    ) {

      const entries =
        readdirSync(
          target
        )
          .sort();


      for (
        const entry
        of entries
      ) {

        visit(
          join(
            target,
            entry
          )
        );
      }


      return;
    }


    const relativePath =
      relative(
        process.cwd(),
        target
      );


    hash.update(
      relativePath
    );


    hash.update(
      readFileSync(
        target
      )
    );
  }


  const sources = [
    "package.json",
    "package-lock.json",
    "next.config.ts",
    "src",
    "prisma/schema.prisma",
  ];


  for (
    const source
    of sources
  ) {

    visit(
      join(
        process.cwd(),
        source
      )
    );
  }


  return hash
    .digest(
      "hex"
    )
    .slice(
      0,
      40
    );
}


const deploymentId =
  process.env
    .NEXT_DEPLOYMENT_ID
    ?.trim() ||
  getGitDeploymentId() ||
  getSourceDeploymentId();


console.log(
  "[AprovUP] deploymentId:",
  deploymentId
);


const nextConfig: NextConfig = {

  deploymentId,


  generateBuildId:
    async () =>
      deploymentId,


  experimental: {

    serverActions: {

      bodySizeLimit:
        "150mb",
    },
  },
};


export default nextConfig;
