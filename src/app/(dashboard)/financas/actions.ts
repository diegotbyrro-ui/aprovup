"use server";

import {
  randomUUID,
} from "node:crypto";

import {
  revalidatePath,
} from "next/cache";

import {
  redirect,
} from "next/navigation";

import {
  prisma,
} from "@/lib/prisma";

import {
  requirePermission,
} from "@/lib/userAccess";


async function requireFinanceAccess() {
  return requirePermission(
    "settings.manage"
  );
}


function field(
  formData:
    FormData,
  name:
    string
) {
  return String(
    formData.get(
      name
    ) ||
    ""
  ).trim();
}


function parseMoneyToCents(
  value:
    string
) {
  let clean =
    String(
      value ||
      ""
    )
      .replace(
        /R\$/gi,
        ""
      )
      .replace(
        /\s/g,
        ""
      );


  if (
    clean.includes(
      ","
    )
  ) {
    clean =
      clean
        .replace(
          /\./g,
          ""
        )
        .replace(
          ",",
          "."
        );
  }


  const amount =
    Number(
      clean
    );


  if (
    !Number.isFinite(
      amount
    ) ||
    amount <=
      0
  ) {
    return null;
  }


  return Math.round(
    amount *
    100
  );
}


function parseDate(
  value:
    string
) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      value
    )
  ) {
    return null;
  }


  const date =
    new Date(
      value +
      "T12:00:00-03:00"
    );


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }


  return date;
}


function addMonths(
  source:
    Date,
  amount:
    number
) {
  const year =
    Number(
      new Intl.DateTimeFormat(
        "en",
        {
          timeZone:
            "America/Maceio",

          year:
            "numeric",
        }
      ).format(
        source
      )
    );


  const month =
    Number(
      new Intl.DateTimeFormat(
        "en",
        {
          timeZone:
            "America/Maceio",

          month:
            "numeric",
        }
      ).format(
        source
      )
    );


  const day =
    Number(
      new Intl.DateTimeFormat(
        "en",
        {
          timeZone:
            "America/Maceio",

          day:
            "numeric",
        }
      ).format(
        source
      )
    );


  const target =
    new Date(
      Date.UTC(
        year,
        month -
          1 +
          amount,
        1,
        15,
        0,
        0
      )
    );


  const targetYear =
    Number(
      new Intl.DateTimeFormat(
        "en",
        {
          timeZone:
            "America/Maceio",

          year:
            "numeric",
        }
      ).format(
        target
      )
    );


  const targetMonth =
    Number(
      new Intl.DateTimeFormat(
        "en",
        {
          timeZone:
            "America/Maceio",

          month:
            "numeric",
        }
      ).format(
        target
      )
    );


  const lastDay =
    new Date(
      Date.UTC(
        targetYear,
        targetMonth,
        0,
        15
      )
    ).getUTCDate();


  const finalDay =
    Math.min(
      day,
      lastDay
    );


  return new Date(
    Date.UTC(
      targetYear,
      targetMonth -
        1,
      finalDay,
      15,
      0,
      0
    )
  );
}


function safeReturnTo(
  value:
    string
) {
  const raw =
    String(
      value ||
      ""
    );


  if (
    raw ===
      "/financas" ||
    raw.startsWith(
      "/financas?"
    )
  ) {
    return raw;
  }


  return "/financas";
}


function withResult(
  returnTo:
    string,
  key:
    string
) {
  return (
    returnTo +
    (
      returnTo.includes(
        "?"
      )
        ? "&"
        : "?"
    ) +
    key +
    "=1"
  );
}


export async function createFinanceEntryAction(
  formData:
    FormData
) {
  const user =
    await requireFinanceAccess();


  const type =
    field(
      formData,
      "type"
    );


  const description =
    field(
      formData,
      "description"
    );


  const category =
    field(
      formData,
      "category"
    );


  const clientId =
    field(
      formData,
      "clientId"
    );


  const amountCents =
    parseMoneyToCents(
      field(
        formData,
        "amount"
      )
    );


  const dueDate =
    parseDate(
      field(
        formData,
        "dueDate"
      )
    );


  const paymentMethod =
    field(
      formData,
      "paymentMethod"
    );


  const notes =
    field(
      formData,
      "notes"
    );


  const isRecurring =
    formData.get(
      "isRecurring"
    ) ===
    "on";


  const requestedInstallments =
    Math.floor(
      Number(
        field(
          formData,
          "installments"
        ) ||
        "1"
      )
    );


  const installmentTotal =
    isRecurring
      ? Math.min(
          24,
          Math.max(
            2,
            requestedInstallments ||
            12
          )
        )
      : 1;


  const returnTo =
    safeReturnTo(
      field(
        formData,
        "returnTo"
      )
    );


  if (
    ![
      "RECEITA",
      "DESPESA",
    ].includes(
      type
    ) ||
    !description ||
    !amountCents ||
    !dueDate
  ) {
    redirect(
      withResult(
        returnTo,
        "erro"
      )
    );
  }


  let validClientId:
    string |
    null =
      null;


  if (
    clientId
  ) {
    const client =
      await prisma.client.findFirst({
        where: {
          id:
            clientId,

          agencyId:
            user.agencyId,
        },

        select: {
          id:
            true,
        },
      });


    if (
      client
    ) {
      validClientId =
        client.id;
    }
  }


  const recurrenceGroup =
    isRecurring
      ? randomUUID()
      : null;


  const data =
    Array.from(
      {
        length:
          installmentTotal,
      },
      (
        _,
        index
      ) => ({
        agencyId:
          user.agencyId,

        clientId:
          validClientId,

        type,

        description,

        category:
          category ||
          null,

        amountCents,

        dueDate:
          addMonths(
            dueDate,
            index
          ),

        status:
          "PENDENTE",

        paymentMethod:
          paymentMethod ||
          null,

        notes:
          notes ||
          null,

        isRecurring,

        recurrenceGroup,

        installmentNumber:
          isRecurring
            ? index +
              1
            : null,

        installmentTotal:
          isRecurring
            ? installmentTotal
            : null,

        createdByUserId:
          user.id,
      })
    );


  await prisma.financeEntry
    .createMany({
      data,
    });


  revalidatePath(
    "/financas"
  );


  redirect(
    withResult(
      returnTo,
      "ok"
    )
  );
}


export async function settleFinanceEntryAction(
  entryId:
    string,
  formData:
    FormData
) {
  const user =
    await requireFinanceAccess();


  const returnTo =
    safeReturnTo(
      field(
        formData,
        "returnTo"
      )
    );


  const entry =
    await prisma.financeEntry
      .findFirst({
        where: {
          id:
            entryId,

          agencyId:
            user.agencyId,
        },

        select: {
          id:
            true,
        },
      });


  if (
    !entry
  ) {
    redirect(
      returnTo
    );
  }


  await prisma.financeEntry
    .update({
      where: {
        id:
          entry.id,
      },

      data: {
        status:
          "PAGO",

        paidAt:
          new Date(),
      },
    });


  revalidatePath(
    "/financas"
  );


  redirect(
    returnTo
  );
}


export async function reopenFinanceEntryAction(
  entryId:
    string,
  formData:
    FormData
) {
  const user =
    await requireFinanceAccess();


  const returnTo =
    safeReturnTo(
      field(
        formData,
        "returnTo"
      )
    );


  const entry =
    await prisma.financeEntry
      .findFirst({
        where: {
          id:
            entryId,

          agencyId:
            user.agencyId,
        },

        select: {
          id:
            true,
        },
      });


  if (
    !entry
  ) {
    redirect(
      returnTo
    );
  }


  await prisma.financeEntry
    .update({
      where: {
        id:
          entry.id,
      },

      data: {
        status:
          "PENDENTE",

        paidAt:
          null,
      },
    });


  revalidatePath(
    "/financas"
  );


  redirect(
    returnTo
  );
}
