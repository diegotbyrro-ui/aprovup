"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export function CalendarBackButton() {
  const router = useRouter();

  function handleBack() {
    if (
      typeof window !== "undefined" &&
      window.history.length > 1
    ) {
      router.back();
      return;
    }

    router.push("/clientes");
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 transition hover:text-blue-700 hover:underline"
    >
      <ArrowLeft size={14} />

      Voltar
    </button>
  );
}