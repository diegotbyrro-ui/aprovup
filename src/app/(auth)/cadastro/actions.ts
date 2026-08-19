"use server";

import {
  redirect,
} from "next/navigation";


export async function registerAction(
  _formData:
    FormData
) {
  redirect(
    "/login?invite=required"
  );
}