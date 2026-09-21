"use client";

import { SessionProvider } from "next-auth/react";
import { I18nProvider } from "./i18n";
import FavoriteProvider from "./components/FavoriteProvider";
import TradeRequestCenterProvider from "./components/TradeRequestCenterProvider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <I18nProvider>
        <FavoriteProvider>
          <TradeRequestCenterProvider>{children}</TradeRequestCenterProvider>
        </FavoriteProvider>
      </I18nProvider>
    </SessionProvider>
  );
}
