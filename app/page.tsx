// app/page.tsx
import "@radix-ui/themes/styles.css";
import { Theme, Heading, Text, Button, Card } from "@radix-ui/themes";
import {
  GitHubLogoIcon,
  ChatBubbleIcon,
  HeartIcon,
} from "@radix-ui/react-icons";
import dynamic from "next/dynamic";
import TimezoneCards from "./components/TimezoneCards";
import OnlineUsersCard from "./components/OnlineUsersCard";
import LoginModal from "./components/LoginModal";
import SignUpModal from "./components/SignUpModal";
import ProductListCard from "./components/ProductListCard";
import FundingProgressCard from "./components/FundingProgressCard";

export default function HomePage() {
  return (
    <Theme
      appearance="light"
      accentColor="orange"
      grayColor="sand"
      radius="large"
    >
      <div className="min-h-screen bg-gradient-to-br from-white via-[#fff1f1] to-[#ffe6e6] p-8">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 max-w-screen-xl mx-auto align-middle">
          {/* Left Column */}
          <div className="col-span-1 flex flex-col gap-6">
            <Heading size="9" weight="bold" className="text-[#d73f09]">
              OSUTrade
            </Heading>
            <Text size="3" className="text-gray-700">
              Looking to declutter or find great deals? Our secondhand trading
              platform is made just for OSU students! Easily upload photos of
              your items, browse listings from fellow students, and meet up
              using built-in location maps. Start trading smart—join the
              community today!
            </Text>
            <div className="flex gap-4">
              <SignUpModal />
              <LoginModal />
            </div>
            <div className="flex gap-4">
              <Button size="3" className="bg-[#24292f] text-white rounded-md">
                <GitHubLogoIcon className="mr-2" /> GitHub
              </Button>
              <Button size="3" className="bg-[#5865F2] text-white rounded-md">
                <ChatBubbleIcon className="mr-2" /> Discord
              </Button>
              <Button
                size="3"
                variant="outline"
                className="rounded-md border-[#d73f09] text-[#d73f09]"
              >
                <HeartIcon className="mr-2" /> Support Us
              </Button>
            </div>
          </div>

          {/* Center Column */}
          <div className="col-span-1 flex flex-col gap-6">
            <ProductListCard />
            <FundingProgressCard />
            <Card className="bg-white/70 backdrop-blur-md p-4 border border-orange-300 shadow hover:scale-[1.02] transition-transform">
              <Heading size="5" mb="2">
                About Us
              </Heading>
              <div className="aspect-w-16 aspect-h-9">
                <iframe
                  className="rounded-lg w-full h-64"
                  src="https://www.youtube.com/embed/dQw4w9WgXcQ"
                  title="YouTube video player"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
            </Card>
          </div>

          {/* Right Column */}
          <div className="col-span-1 flex flex-col gap-6">
            <OnlineUsersCard />
            <TimezoneCards />
          </div>
        </div>
      </div>
    </Theme>
  );
}
