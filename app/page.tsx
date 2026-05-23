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
import { LanguageToggle, useI18n } from "./i18n";

export default function HomePage() {
  const { t } = useI18n();

  return (
    <Theme
      appearance="light"
      accentColor="orange"
      grayColor="sand"
      radius="large"
    >
      <div className="min-h-screen bg-gradient-to-br from-white via-[#fff1f1] to-[#ffe6e6] p-8">
        <div className="mx-auto mb-6 flex max-w-screen-xl justify-end">
          <LanguageToggle />
        </div>

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
              <Button size="3" className="rounded-md bg-[#24292f] text-white">
                <GitHubLogoIcon className="mr-2" /> {t("home.github")}
              </Button>
              <a
                href="https://discord.gg/BqqAmmjJR"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button size="3" className="rounded-md bg-[#5865F2] text-white">
                  <ChatBubbleIcon className="mr-2" /> {t("home.discord")}
                </Button>
              </a>
              <Button
                size="3"
                variant="outline"
                className="rounded-md border-[#d73f09] text-[#d73f09]"
              >
                <HeartIcon className="mr-2" /> {t("home.support")}
              </Button>
            </div>
          </div>

          <div className="col-span-1 flex flex-col gap-6">
            <ProductListCard />
            <FundingProgressCard />
            <Card className="border border-orange-300 bg-white/70 p-4 shadow backdrop-blur-md transition-transform hover:scale-[1.02]">
              <Heading size="5" mb="2">
                {t("home.about")}
              </Heading>
              <div className="aspect-w-16 aspect-h-9">
                <iframe
                  className="h-64 w-full rounded-lg"
                  src="https://www.youtube.com/embed/dQw4w9WgXcQ"
                  title="YouTube video player"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
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
