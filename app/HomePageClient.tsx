"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Theme } from "@radix-ui/themes";
import { ArrowRight, Github, Heart, MessageCircle, Search, Send, Handshake } from "lucide-react";
import Header from "./components/Header";
import NewStudentWelcome from "./components/NewStudentWelcome";
import HomeHero from "./components/HomeHero";
import HomeSeasonalCategories from "./components/HomeSeasonalCategories";
import HomeDiscoverySections from "./components/HomeDiscoverySections";
import HomeMarketSignalsCard from "./components/HomeMarketSignalsCard";
import LoginModal from "./components/LoginModal";
import SignUpModal from "./components/SignUpModal";
import { useI18n } from "./i18n";
import { getHomeCtaAction } from "./lib/homeCtaAccess";
import type { HomeSeason } from "./lib/homeSeason";
import type { Product } from "./lib/products";

export default function HomePageClient({
  products,
  heroProducts,
  season,
  discoveryError = false,
}: {
  products: Product[];
  heroProducts: Product[];
  season: HomeSeason;
  discoveryError?: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [redirectPath, setRedirectPath] = useState<string | null>(null);
  const [loginPromptPath, setLoginPromptPath] = useState<string | null>(null);

  useEffect(() => {
    setRedirectPath(new URLSearchParams(window.location.search).get("from"));
  }, []);

  const redirectLabel = useMemo(() => {
    if (!redirectPath) return "";
    if (redirectPath.startsWith("/sell")) return t("nav.sell");
    if (redirectPath.startsWith("/seller")) return t("nav.seller");
    if (redirectPath.startsWith("/cart")) return t("nav.cart");
    if (redirectPath.startsWith("/requests")) return t("nav.requests");
    return t("nav.marketplace");
  }, [redirectPath, t]);

  function handleProtectedCta(path: string) {
    if (status === "loading") return;
    const action = getHomeCtaAction({
      path,
      authStatus: status,
      hasUser: Boolean(session?.user),
    });

    if (action.type === "navigate") {
      router.push(action.path);
    } else {
      setLoginPromptPath(action.path);
    }
  }

  const steps = [
    { icon: Search, title: t("home.stepBrowseTitle"), body: t("home.stepBrowse") },
    { icon: Send, title: t("home.stepRequestTitle"), body: t("home.stepRequest") },
    { icon: Handshake, title: t("home.stepMeetTitle"), body: t("home.stepMeet") },
  ];

  return (
    <Theme appearance="light" accentColor="orange" grayColor="sand" radius="large">
      <Header />
      <NewStudentWelcome />
      <main className="home-modern-page">
        {redirectPath && (
          <section className="home-redirect-notice" role="status">
            <div>
              <strong>{t("auth.requiredTitle")}</strong>
              <p>{t("auth.requiredBody", { destination: redirectLabel })}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <LoginModal redirectTo={redirectPath} />
              <SignUpModal redirectTo={redirectPath} />
            </div>
          </section>
        )}

        <HomeHero
          products={heroProducts}
          season={season}
          disabled={status === "loading"}
          onSell={() => handleProtectedCta("/sell")}
        />

        <div className="home-content-flow">
          <HomeSeasonalCategories season={season} />
          <HomeDiscoverySections products={products} error={discoveryError} />
          <HomeMarketSignalsCard products={products} error={discoveryError} />

          <section className="home-steps" aria-labelledby="how-it-works-title">
            <div className="home-section-heading">
              <p>{t("home.howItWorksIntro")}</p>
              <h2 id="how-it-works-title">{t("home.howItWorks")}</h2>
            </div>
            <ol className="home-step-list">
              {steps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <li key={step.title}>
                    <span className="home-step-number">0{index + 1}</span>
                    <span className="home-step-icon"><Icon className="h-5 w-5" /></span>
                    <h3>{step.title}</h3>
                    <p>{step.body}</p>
                  </li>
                );
              })}
            </ol>
          </section>

          <section className="home-footer-band" aria-labelledby="home-community-title">
            <div>
              <p className="home-footer-kicker">OSUTrade</p>
              <h2 id="home-community-title">{t("home.communityTitle")}</h2>
              <p>{t("home.communityBody")}</p>
            </div>
            <div className="home-footer-links">
              <a href="https://github.com/barrychung1112/OSUTrade" target="_blank" rel="noopener noreferrer">
                <Github className="h-4 w-4" /> GitHub
              </a>
              <a href="https://discord.gg/BqqAmmjJR" target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-4 w-4" /> Discord
              </a>
              <a href="https://buymeacoffee.com/osutrade" target="_blank" rel="noopener noreferrer">
                <Heart className="h-4 w-4" /> {t("home.support")}
              </a>
              <Link href="/overview">
                {t("home.browseDeals")} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </section>
        </div>
      </main>

      <LoginModal
        redirectTo={loginPromptPath ?? "/sell"}
        open={loginPromptPath !== null}
        onOpenChange={(open) => !open && setLoginPromptPath(null)}
        trigger={null}
      />
    </Theme>
  );
}
