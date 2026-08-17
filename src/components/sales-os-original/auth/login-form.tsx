"use client";

import { createClient } from "@/lib/sales-os-original/supabase/client";
import { ArrowRight, Eye, EyeOff, LoaderCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMessage(
          error.message === "Invalid login credentials"
            ? "E-mail ou senha incorretos."
            : error.message
        );

        return;
      }

      const requestedDestination =
        searchParams.get("redirectTo") ?? "/crm/cockpit";

      const safeDestination = requestedDestination.startsWith("/")
        ? requestedDestination
        : "/crm/cockpit";

      router.replace(safeDestination);
      router.refresh();
    } catch {
      setErrorMessage(
        "Não foi possível acessar o sistema. Verifique a conexão e tente novamente."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <div>
        <span className="panel-kicker">BEM-VINDO</span>
        <h2>Acesse sua conta</h2>
        <p>Entre para continuar no Level UP Sales OS.</p>
      </div>

      <label>
        E-mail

        <input
          autoComplete="email"
          disabled={isSubmitting}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="seuemail@empresa.com"
          required
          type="email"
          value={email}
        />
      </label>

      <label>
        Senha

        <div className="password-field">
          <input
            autoComplete="current-password"
            disabled={isSubmitting}
            minLength={6}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Digite sua senha"
            required
            type={showPassword ? "text" : "password"}
            value={password}
          />

          <button
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            disabled={isSubmitting}
            onClick={() => setShowPassword((current) => !current)}
            type="button"
          >
            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
      </label>

      {errorMessage && (
        <div className="login-error" role="alert">
          {errorMessage}
        </div>
      )}

      <button
        className="primary-button login-button"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? (
          <>
            <LoaderCircle className="loading-icon" size={17} />
            Entrando...
          </>
        ) : (
          <>
            Entrar
            <ArrowRight size={17} />
          </>
        )}
      </button>

      <small>
        Acesso restrito aos usuários autorizados pela Level UP.
      </small>
    </form>
  );
}