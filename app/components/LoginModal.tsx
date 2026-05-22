"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Dialog, Flex, Button } from "@radix-ui/themes";
import { useI18n } from "../i18n";

export default function LoginModal() {
  const { t } = useI18n();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    router.push("/overview");
    router.refresh();
  }

  return (
    <>
      <Button
        size="3"
        variant="outline"
        className="min-w-[76px] shrink-0 whitespace-nowrap border-[#d73f09] px-3 text-[#d73f09]"
        onClick={() => setIsOpen(true)}
      >
        {t("auth.login")}
      </Button>
      <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
        <Dialog.Content maxWidth="450px">
          <Dialog.Title>{t("auth.login")}</Dialog.Title>
          <form onSubmit={onSubmit}>
            <Flex direction="column" gap="3" mt="4">
              <input
                className="px-3 py-2 border rounded"
                placeholder={t("auth.email")}
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
              <input
                type="password"
                className="px-3 py-2 border rounded"
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
