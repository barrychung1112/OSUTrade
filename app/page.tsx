"use client";

import "@radix-ui/themes/styles.css";
import { Theme, Heading, Text, Button, Card } from "@radix-ui/themes";
import {
  GitHubLogoIcon,
  ChatBubbleIcon,
  HeartIcon,
} from "@radix-ui/react-icons";
import TimezoneCards from "./components/TimezoneCards";
import OnlineUsersCard from "./components/OnlineUsersCard";
import LoginModal from "./components/LoginModal";
import SignUpModal from "./components/SignUpModal";
import ProductListCard from "./components/ProductListCard";
import FundingProgressCard from "./components/FundingProgressCard";
import Header from "./components/Header";
import { useI18n } from "./i18n";

export default function HomePage() {
  const { t } = useI18n();

  return (
    <Theme
      appearance="light"
      accentColor="orange"
      grayColor="sand"
      radius="large"
    >
      <div className="min-h-screen bg-gradient-to-br from-white via-[#fff1f1] to-[#ffe6e6] px-4 pb-8 pt-28 sm:px-8">
        <Header />
        <div className="mx-auto grid max-w-screen-xl grid-cols-1 gap-8 align-middle xl:grid-cols-3">
          <div className="col-span-1 flex flex-col gap-6">
            <Heading size="9" weight="bold" className="text-[#d73f09]">
              OSUTrade
            </Heading>
            <Text size="3" className="text-gray-700">
              {t("home.description")}
            </Text>
            <div className="flex gap-4">
              <SignUpModal />
              <LoginModal />
            </div>
            <div className="flex flex-wrap gap-4">
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
                href="https://github.com/barrychung1112/OSUTrade"
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

          <div className="col-span-1 flex flex-col gap-6">
            <ProductListCard />
            <FundingProgressCard />
            <Card className="border border-orange-300 bg-white/70 p-4 shadow backdrop-blur-md transition-transform hover:scale-[1.02]">
              <Heading size="5" mb="2">
                {t("home.howItWorks")}
              </Heading>
              <div className="space-y-3 text-sm text-gray-700">
                <p>{t("home.howItWorksIntro")}</p>
                <ol className="space-y-2">
                  <li className="rounded-md bg-orange-50 px-3 py-2">
                    {t("home.stepBrowse")}
                  </li>
                  <li className="rounded-md bg-orange-50 px-3 py-2">
                    {t("home.stepRequest")}
                  </li>
                  <li className="rounded-md bg-orange-50 px-3 py-2">
                    {t("home.stepMeet")}
                  </li>
                </ol>
              </div>
            </Card>
          </div>

          <div className="col-span-1 flex flex-col gap-6">
            <OnlineUsersCard />
            <TimezoneCards />
          </div>
        </div>
      </div>
    </Theme>
  );
}
