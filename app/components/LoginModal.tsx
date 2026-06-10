"use client";

import { FormEvent, type ReactNode, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Dialog, Flex, Button } from "@radix-ui/themes";
import { useI18n } from "../i18n";
import GoogleAuthDialogCta from "./GoogleAuthDialogCta";

type LoginModalProps = {
  redirectTo?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: ReactNode;
};

export default function LoginModal({
  redirectTo = "/overview",
  open,
  onOpenChange,
  trigger,
}: LoginModalProps) {
  const { t } = useI18n();
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isOpen = open ?? internalOpen;

  function setIsOpen(nextOpen: boolean) {
    onOpenChange?.(nextOpen);
    if (open === undefined) {
      setInternalOpen(nextOpen);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signIn("login", {
      redirect: false,
      email,
      password,
    });

    setLoading(false);

    if (result?.error) {
      setError(t("auth.loginError"));
      return;
    }

    setIsOpen(false);
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <>
      {trigger !== undefined ? trigger : (
        <Button
          size="3"
          variant="outline"
          className="min-w-[76px] shrink-0 whitespace-nowrap border-[#d73f09] px-3 text-[#d73f09]"
          style={{
            flexShrink: 0,
            minWidth: "76px",
            width: "auto",
            whiteSpace: "nowrap",
          }}
          onClick={() => setIsOpen(true)}
        >
          {t("auth.login")}
        </Button>
      )}
      <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
        <Dialog.Content maxWidth="450px">
          <Dialog.Title>{t("auth.login")}</Dialog.Title>
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
                type="password"
                className="app-input"
                placeholder={t("auth.password")}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              {error && (
                <p className="text-sm text-red-600" role="alert">
                  {error}
                </p>
              )}
              <Button highContrast type="submit" disabled={loading}>
                {loading ? t("auth.loggingIn") : t("auth.login")}
              </Button>
            </Flex>
          </form>
        </Dialog.Content>
      </Dialog.Root>
    </>
  );
}
