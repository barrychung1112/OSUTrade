"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { Dialog, Flex, Button } from "@radix-ui/themes";
import { useI18n } from "../i18n";
import GoogleAuthDialogCta from "./GoogleAuthDialogCta";

type SignupResponse = {
  id?: string;
  email?: string;
  message?: string;
  errorCode?: string;
  status?: "confirmation_required";
};

export default function SignUpModal({ redirectTo = "/overview" }: { redirectTo?: string }) {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username, email, password }),
    });
    const payload = (await res.json().catch(() => ({}))) as SignupResponse;

    if (!res.ok && res.status !== 202) {
      setLoading(false);
      setError(payload.message || t("auth.signupError"));
      return;
    }

    if (res.status === 202 || payload.status === "confirmation_required") {
      setLoading(false);
      setSuccess(payload.message || t("auth.confirmEmail"));
      return;
    }

    const loginResult = await signIn("login", {
      redirect: false,
      email,
      password,
    });

    setLoading(false);

    if (loginResult?.error) {
      setSuccess(t("auth.createdConfirm"));
      return;
    }

    window.location.assign(redirectTo);
  }

  return (
    <>
      <Button
        size="3"
        highContrast
        className="min-w-[92px] shrink-0 whitespace-nowrap bg-[#1a1a1a] px-3 text-white hover:bg-[#333]"
        style={{
          flexShrink: 0,
          minWidth: "92px",
          width: "auto",
          whiteSpace: "nowrap",
        }}
        onClick={() => setIsOpen(true)}
      >
        {t("auth.signup")}
      </Button>

      <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
        <Dialog.Content maxWidth="450px">
          <Dialog.Title>{t("auth.signup")}</Dialog.Title>
          <GoogleAuthDialogCta redirectTo={redirectTo} />

          <form onSubmit={onSubmit}>
            <Flex direction="column" gap="3" mt="4">
              <input
                className="app-input"
                placeholder={t("auth.email")}
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
              <input
                className="app-input"
                placeholder={t("auth.username")}
                autoComplete="name"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
              />
              <input
                type="password"
                className="app-input"
                placeholder={t("auth.password")}
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                required
              />

              {error && (
                <p className="text-red-600 text-sm" role="alert">
                  {error}
                </p>
              )}
              {success && (
                <p className="text-green-700 text-sm" role="status">
                  {success}
                </p>
              )}

              <Button highContrast type="submit" disabled={loading}>
                {loading ? t("auth.creating") : t("auth.signup")}
              </Button>
            </Flex>
          </form>
        </Dialog.Content>
      </Dialog.Root>
    </>
  );
}
