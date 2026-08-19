"use server";

import bcrypt from "bcryptjs";

import {
  redirect,
} from "next/navigation";

import {
  prisma,
} from "@/lib/prisma";


export async function acceptInviteAction(
  token:
    string,
  formData:
    FormData
) {
  const password =
    String(
      formData.get(
        "password"
      ) || ""
    );


  const confirmation =
    String(
      formData.get(
        "confirmation"
      ) || ""
    );


  if (
    password.length <
    8
  ) {
    redirect(
      `/convite/${token}?error=password`
    );
  }


  if (
    password !==
    confirmation
  ) {
    redirect(
      `/convite/${token}?error=confirmation`
    );
  }


  const user =
    await prisma.user.findUnique({
      where: {
        inviteToken:
          token,
      },
    });


  if (!user) {
    redirect(
      `/convite/${token}?error=invalid`
    );
  }


  if (
    !user.inviteExpiresAt ||
    user.inviteExpiresAt <
      new Date()
  ) {
    redirect(
      `/convite/${token}?error=expired`
    );
  }


  const hashedPassword =
    await bcrypt.hash(
      password,
      10
    );


  await prisma.user.update({
    where: {
      id:
        user.id,
    },

    data: {
      password:
        hashedPassword,

      status:
        "APROVADO",

      approvedAt:
        new Date(),

      inviteToken:
        null,

      inviteExpiresAt:
        null,
    },
  });


  redirect(
    "/login?registered=true"
  );
}