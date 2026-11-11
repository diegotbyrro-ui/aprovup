import { NextResponse } from "next/server";
import { createCrmAdminClient } from "@/lib/crm-supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// R1: API publica especifica para as quatro LPs da Level UP.
// NUNCA expor CRM_SUPABASE_SECRET_KEY ou TURNSTILE_SECRET no navegador.
const ALLOWED_ORIGINS = new Set([
  "https://mktlevelup.com.br",
  "https://www.mktlevelup.com.br",
]);
const ALLOWED_SOURCES: Record<string, string> = {
  educacao: "Educacao / Escolas",
  imobiliarias: "Imobiliarias",
  consorcios: "Seguros e Consorcios",
  incorporadoras: "Construtoras e Incorporadoras",
};

function corsHeaders(origin: string) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "3600",
    "Vary": "Origin",
    "Cache-Control": "no-store",
  };
}
function json(origin: string, data: Record<string, unknown>, status = 200) {
  return NextResponse.json(data, { status, headers: corsHeaders(origin) });
}
function clean(value: unknown, limit: number): string {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

export function OPTIONS(request: Request) {
  const origin = request.headers.get("origin") || "";
  if (!ALLOWED_ORIGINS.has(origin)) return new Response(null, { status: 403 });
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin") || "";
  if (!ALLOWED_ORIGINS.has(origin)) {
    return NextResponse.json({ ok: false, message: "Origem nao autorizada." }, { status: 403 });
  }
  if (!(request.headers.get("content-type") || "").startsWith("application/json")) {
    return json(origin, { ok: false, message: "Formato invalido." }, 415);
  }
  if (Number(request.headers.get("content-length") || 0) > 12000) {
    return json(origin, { ok: false, message: "Solicitacao muito grande." }, 413);
  }

  const organizationId = process.env.LEVELUP_CRM_ORGANIZATION_ID?.trim() || "";
  const turnstileSecret = process.env.LEVELUP_TURNSTILE_SECRET?.trim() || "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(organizationId) || !turnstileSecret) {
    console.error("levelup-leads: falta configuracao do workspace ou Turnstile");
    return json(origin, { ok: false, message: "Atendimento temporariamente indisponivel." }, 503);
  }

  try {
    const raw = await request.text();
    if (raw.length > 12000) return json(origin, { ok: false, message: "Solicitacao muito grande." }, 413);
    let body: Record<string, unknown>;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("json invalido");
      body = parsed as Record<string, unknown>;
    } catch {
      return json(origin, { ok: false, message: "Formulario invalido." }, 400);
    }
    // Campo antispam oculto: nao revelar a deteccao ao robo.
    if (clean(body.website_honeypot, 100)) return json(origin, { ok: true });

    const source = clean(body.source, 40);
    const name = clean(body.name, 120);
    const company = clean(body.company, 180);
    const whatsapp = clean(body.whatsapp, 40);
    const email = clean(body.email, 180).toLowerCase();
    const objective = clean(body.objective, 850);
    const date = clean(body.date, 12);
    const time = clean(body.time, 6);
    const token = clean(body.turnstileToken, 2048);
    if (!Object.prototype.hasOwnProperty.call(ALLOWED_SOURCES, source) ||
        name.length < 2 || company.length < 2 || whatsapp.replace(/\D/g, "").length < 10 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || body.consent !== true ||
        !/^\d{2}\/\d{2}\/\d{4}$/.test(date) || !/^\d{2}:\d{2}$/.test(time) || !token) {
      return json(origin, { ok: false, message: "Confira os dados e a verificacao de seguranca." }, 400);
    }

    const verification = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret: turnstileSecret, response: token }),
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (!verification.ok) throw new Error("Turnstile temporariamente indisponivel");
    const result = (await verification.json()) as { success?: boolean; hostname?: string; action?: string };
    if (!result.success || !["mktlevelup.com.br", "www.mktlevelup.com.br"].includes(result.hostname || "") || result.action !== "levelup_lp") {
      return json(origin, { ok: false, message: "Verificacao de seguranca invalida. Tente novamente." }, 400);
    }

    // O CRM ja usa o Supabase configurado no AprovUp; nenhum novo banco e criado.
    const supabase = createCrmAdminClient();
    const { data: stage, error: stageError } = await supabase
      .from("pipeline_stages")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("is_closed", false)
      .order("position", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (stageError || !stage) {
      console.error("levelup-leads: primeira etapa nao encontrada", stageError?.code);
      return json(origin, { ok: false, message: "Funil comercial indisponivel no momento." }, 503);
    }

    // Reduz duplicacoes por reenvio proximo no tempo, preservando leads antigos.
    const cutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: existing, error: findError } = await supabase
      .from("leads")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("company_name", company)
      .eq("whatsapp", whatsapp)
      .gte("created_at", cutoff)
      .limit(1);
    if (findError) {
      console.error("levelup-leads: consulta de duplicidade", findError.code);
      return json(origin, { ok: false, message: "Nao foi possivel registrar agora. Tente novamente." }, 503);
    }
    if ((existing || []).length > 0) return json(origin, { ok: true, alreadyReceived: true });

    const notes = [
      `Origem: LP Level UP / ${ALLOWED_SOURCES[source]}`,
      `Pagina: https://mktlevelup.com.br/${source}/`,
      `Preferencia solicitada: ${date} as ${time} (Brasilia)`,
      objective ? `Objetivo declarado: ${objective}` : "",
      "Contato comercial autorizado no formulario; agendamento sujeito a confirmacao.",
    ].filter(Boolean).join("\n");
    const { error } = await supabase.from("leads").insert({
      organization_id: organizationId,
      stage_id: stage.id,
      company_name: company,
      segment: ALLOWED_SOURCES[source],
      phone: whatsapp,
      whatsapp,
      email,
      decision_maker_name: name,
      estimated_value: 0,
      temperature: "warm",
      priority: "medium",
      notes,
      next_action: "Contatar lead da landing page e confirmar preferencia de reuniao",
    });
    if (error) {
      console.error("levelup-leads: falha de insercao", error.code);
      return json(origin, { ok: false, message: "Nao foi possivel registrar agora. Tente novamente." }, 503);
    }
    return json(origin, { ok: true });
  } catch (error) {
    console.error("levelup-leads: falha tecnica", error instanceof Error ? error.name : "unknown");
    return json(origin, { ok: false, message: "Nao foi possivel enviar agora. Tente novamente." }, 503);
  }
}
