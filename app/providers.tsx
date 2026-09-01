"use client";

import { SessionProvider } from "next-auth/react";
import { I18nProvider } from "./i18n";
import TradeRequestCenterProvider from "./components/TradeRequestCenterProvider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <I18nProvider>
        <TradeRequestCenterProvider>{children}</TradeRequestCenterProvider>
      </I18nProvider>
    </SessionProvider>
  );
}
