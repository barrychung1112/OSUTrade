"use client";

import "@radix-ui/themes/styles.css";
import { useEffect, useMemo, useState } from "react";
import { Theme, Heading, Text, Button, Card } from "@radix-ui/themes";
import {
  GitHubLogoIcon,
  ChatBubbleIcon,
  HeartIcon,
  LockClosedIcon,
} from "@radix-ui/react-icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import TimezoneCards from "./components/TimezoneCards";
import OnlineUsersCard from "./components/OnlineUsersCard";
import LoginModal from "./components/LoginModal";
import SignUpModal from "./components/SignUpModal";
import ProductListCard from "./components/ProductListCard";
import TipProgressCard from "./components/TipProgressCard";
import Header from "./components/Header";
import { useI18n } from "./i18n";

export default function HomePage() {
  const { t } = useI18n();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [redirectPath, setRedirectPath] = useState<string | null>(null);
  const [loginPromptPath, setLoginPromptPath] = useState<string | null>(null);

  useEffect(() => {
    const from = new URLSearchParams(window.location.search).get("from");
    setRedirectPath(from);
  }, []);

  const redirectLabel = useMemo(() => {
    if (!redirectPath) return "";
    if (redirectPath.startsWith("/sell")) return t("nav.sell");
    if (redirectPath.startsWith("/seller")) return t("nav.seller");
    if (redirectPath.startsWith("/cart")) return t("nav.cart");
    if (redirectPath.startsWith("/requests")) return t("nav.requests");
    if (redirectPath.startsWith("/overview")) return t("nav.marketplace");
    return "OSUTrade";
  }, [redirectPath, t]);

  function handleProtectedCta(path: string) {
    if (status === "loading") return;

    if (status === "authenticated" && session?.user) {
      router.push(path);
      return;
    }

    setLoginPromptPath(path);
  }

  return (
    <Theme
      appearance="light"
      accentColor="orange"
      grayColor="sand"
      radius="large"
    >
      <div className="app-page">
        <Header />
        <div className="app-container space-y-6">
          {redirectPath && (
            <Card className="app-card border-amber-200 bg-amber-50 p-4">
              <Text size="2" weight="bold" className="text-amber-950">
                {t("auth.requiredTitle")}
              </Text>
              <Text size="2" className="mt-1 block leading-6 text-amber-900">
                {t("auth.requiredBody", { destination: redirectLabel })}
              </Text>
              <div className="mt-4 flex flex-wrap gap-3">
                <LoginModal redirectTo={redirectPath} />
                <SignUpModal redirectTo={redirectPath} />
              </div>
            </Card>
          )}

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
            <div className="flex flex-col gap-6">
              <div className="app-hero mb-0 overflow-hidden">
                <Text
                  size="2"
                  weight="bold"
                  className="app-eyebrow block"
                >
                  {t("nav.marketplace")}
                </Text>
                <Heading size="9" weight="bold" className="text-gray-950">
                  OSUTrade
                </Heading>
                <Text size="3" className="mt-4 block max-w-2xl leading-6 text-gray-700">
                  {t("home.description")}
                </Text>

                <div className="mt-6 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <Button
                    size="4"
                    highContrast
                    className="h-12 w-full justify-center rounded-md px-5"
                    disabled={status === "loading"}
                    onClick={() => handleProtectedCta("/overview")}
                  >
                    {t("nav.marketplace")}
                  </Button>
                  <Button
                    size="4"
                    variant="outline"
                    className="h-12 w-full justify-center rounded-md border-[#d73f09] px-5 text-[#d73f09] sm:w-auto"
                    disabled={status === "loading"}
                    onClick={() => handleProtectedCta("/sell")}
                  >
                    {t("marketplace.listItem")}
                  </Button>
                </div>
                <LoginModal
                  redirectTo={loginPromptPath ?? "/overview"}
                  open={loginPromptPath !== null}
                  onOpenChange={(open) => {
                    if (!open) setLoginPromptPath(null);
                  }}
                  trigger={null}
                />
              </div>

              <Card className="app-card p-4">
                <div className="flex gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100 text-[#d73f09]">
                    <LockClosedIcon />
                  </div>
                  <div>
                    <Text size="2" weight="bold" className="text-gray-900">
                      {t("product.contactAfterRequest")}
                    </Text>
                    <Text size="2" className="mt-1 block text-gray-600">
                      {t("home.safetyNote")}
                    </Text>
                  </div>
                </div>
              </Card>

              <div className="app-panel">
                <Text size="2" weight="medium" className="mb-3 block text-gray-700">
                  {t("auth.signup")} / {t("auth.login")}
                </Text>
                <div className="flex flex-wrap gap-3">
                  <SignUpModal />
                  <LoginModal />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <ProductListCard />
              <Card className="app-card p-4 backdrop-blur">
                <Heading size="5" mb="2">
                  {t("home.howItWorks")}
                </Heading>
                <div className="space-y-3 text-sm text-gray-700">
                  <p>{t("home.howItWorksIntro")}</p>
                  <ol className="space-y-2">
                    <li className="rounded-md border border-orange-100 bg-orange-50/80 px-3 py-2">
                      {t("home.stepBrowse")}
                    </li>
                    <li className="rounded-md border border-orange-100 bg-orange-50/80 px-3 py-2">
                      {t("home.stepRequest")}
                    </li>
                    <li className="rounded-md border border-orange-100 bg-orange-50/80 px-3 py-2">
                      {t("home.stepMeet")}
                    </li>
                  </ol>
                </div>
              </Card>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
            <div className="grid gap-6 md:grid-cols-2">
              <TipProgressCard />
              <OnlineUsersCard />
            </div>
            <div className="flex flex-col gap-6">
              <div className="app-panel">
                <Text size="2" weight="medium" className="mb-3 block text-gray-700">
                  {t("home.about")}
                </Text>
                <div className="flex flex-wrap gap-3">
                  <a
                    href="https://github.com/barrychung1112/OSUTrade"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button size="3" className="rounded-md bg-[#24292f] text-white">
                      <GitHubLogoIcon className="mr-2" /> {t("home.github")}
                    </Button>
                  </a>
                  <a
                    href="https://discord.gg/BqqAmmjJR"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button size="3" className="rounded-md bg-[#5865F2] text-white">
                      <ChatBubbleIcon className="mr-2" /> {t("home.discord")}
                    </Button>
                  </a>
                  <a
                    href="https://buymeacoffee.com/osutrade"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button
                      size="3"
                      variant="outline"
                      className="rounded-md border-[#d73f09] text-[#d73f09]"
                    >
                      <HeartIcon className="mr-2" /> {t("home.support")}
                    </Button>
                  </a>
                </div>
              </div>
            </div>
          </section>

          <section>
            <TimezoneCards />
          </section>
        </div>
      </div>
    </Theme>
  );
}
