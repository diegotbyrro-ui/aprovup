"use client";
import { useState } from "react";
import {
  FISCAL_TAX_REGIMES,
  validateFiscalOnboardingDraft,
  type FiscalOnboardingDraft,
  type FiscalDraftField,
  type FiscalDraftErrors,
} from "@/lib/finance-automation/fiscal-onboarding";

const emptyDraft: FiscalOnboardingDraft = {
  legalName: "", cnpj: "", municipalRegistration: "", municipalityIbgeCode: "",
  stateCode: "", taxRegime: "", serviceCode: "", serviceDescription: "",
};

const stateCodes = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];
const labels: Record<FiscalDraftField, { pt: string; en: string; placeholder?: string }> = {
  legalName: { pt: "Razao social", en: "Registered legal name" },
  cnpj: { pt: "CNPJ", en: "Brazilian business tax ID (CNPJ)", placeholder: "00.000.000/0000-00" },
  municipalRegistration: { pt: "Inscricao municipal (se houver)", en: "Municipal registration (if applicable)" },
  municipalityIbgeCode: { pt: "Codigo IBGE do municipio", en: "Municipality IBGE code", placeholder: "0000000" },
  stateCode: { pt: "UF", en: "State" },
  taxRegime: { pt: "Regime tributario (validar com contador)", en: "Tax regime (verify with accountant)" },
  serviceCode: { pt: "Codigo de servico fiscal", en: "Tax service code" },
  serviceDescription: { pt: "Descricao do servico", en: "Service description" },
};

export function FiscalDraftClient({ language }: { language: "pt" | "en" }) {
  const en = language === "en";
  const [draft, setDraft] = useState<FiscalOnboardingDraft>(emptyDraft);
  const [errors, setErrors] = useState<FiscalDraftErrors>({});
  const [validated, setValidated] = useState(false);
  const setField = (name: FiscalDraftField, value: string) => {
    setDraft((previous) => ({...previous, [name]: value}));
    setValidated(false);
    setErrors({});
  };
  const check = () => {
    const result = validateFiscalOnboardingDraft(draft);
    setErrors(result);
    setValidated(true);
  };
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <h2 className="text-lg font-bold text-slate-900">{en ? "Validate fiscal profile" : "Validar cadastro fiscal"}</h2>
      <p className="mt-2 text-xs text-slate-500">{en ? "Data stays in this open browser form; it is not sent to the server or saved." : "Os dados permanecem apenas neste formulario aberto; nao sao enviados ao servidor nem salvos."}</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {(["legalName", "cnpj", "municipalRegistration", "municipalityIbgeCode"] as FiscalDraftField[]).map((key) => (
          <label key={key} className="block text-sm font-medium text-slate-800">
            <span>{labels[key][language]}</span>
            <input autoComplete="off" type="text" value={draft[key]} placeholder={labels[key].placeholder || ""}
              onChange={(event) => setField(key, event.target.value)}
              className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-600" />
            {errors[key] && <span className="mt-1 block text-xs text-red-700">{en ? "Check this value." : "Confira este valor."}</span>}
          </label>
        ))}
        <label className="block text-sm font-medium text-slate-800">
          <span>{labels.stateCode[language]}</span>
          <select value={draft.stateCode} onChange={(event) => setField("stateCode", event.target.value)} className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm">
            <option value="">{en ? "Select a state" : "Selecione a UF"}</option>
            {stateCodes.map((state) => <option key={state} value={state}>{state}</option>)}
          </select>
          {errors.stateCode && <span className="mt-1 block text-xs text-red-700">{en ? "Select a valid state." : "Selecione uma UF valida."}</span>}
        </label>
        <label className="block text-sm font-medium text-slate-800">
          <span>{labels.taxRegime[language]}</span>
          <select value={draft.taxRegime} onChange={(event) => setField("taxRegime", event.target.value)} className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm">
            <option value="">{en ? "Select tax regime" : "Selecione o regime"}</option>
            {FISCAL_TAX_REGIMES.map((regime) => <option key={regime} value={regime}>{regime.replace(/_/g," ")}</option>)}
          </select>
          {errors.taxRegime && <span className="mt-1 block text-xs text-red-700">{en ? "Select a tax regime." : "Selecione o regime tributario."}</span>}
        </label>
        <label className="block text-sm font-medium text-slate-800 sm:col-span-2">
          <span>{labels.serviceCode[language]}</span>
          <input autoComplete="off" value={draft.serviceCode} onChange={(event) => setField("serviceCode", event.target.value)}
            className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
          {errors.serviceCode && <span className="mt-1 block text-xs text-red-700">{en ? "Check service code." : "Confira o codigo do servico."}</span>}
        </label>
        <label className="block text-sm font-medium text-slate-800 sm:col-span-2">
          <span>{labels.serviceDescription[language]}</span>
          <textarea rows={3} value={draft.serviceDescription} onChange={(event) => setField("serviceDescription", event.target.value)}
            className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
          {errors.serviceDescription && <span className="mt-1 block text-xs text-red-700">{en ? "Enter a fuller service description." : "Informe uma descricao do servico."}</span>}
        </label>
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button type="button" onClick={check} className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800">
          {en ? "Validate draft" : "Validar rascunho"}
        </button>
        <span className="text-xs font-semibold text-amber-700">{en ? "Draft only. No Save button." : "Somente rascunho. Sem botao de salvar."}</span>
      </div>
      {validated && (
        <p role="status" className={`mt-4 rounded-xl border px-4 py-3 text-sm font-semibold ${Object.keys(errors).length ? "border-amber-200 bg-amber-50 text-amber-900" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}>
          {Object.keys(errors).length
            ? (en ? "Some fields need attention. This is not a fiscal authorization." : "Alguns campos precisam de revisao. Isto nao representa autorizacao fiscal.")
            : (en ? "Draft structure validated. Accountant and government verification are still required; nothing was saved." : "Estrutura do rascunho validada. Ainda sao necessarias confirmacoes contabeis e oficiais; nada foi salvo.")}
        </p>
      )}
    </section>
  );
}
