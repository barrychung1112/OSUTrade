"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { signOut, getSession } from "next-auth/react";
import { Avatar, DropdownMenu } from "@radix-ui/themes";
import { RocketIcon } from "@radix-ui/react-icons";
import LoginModal from "./LoginModal";
import { LanguageToggle, useI18n } from "../i18n";

type HeaderUser = {
  name?: string | null;
  email?: string | null;
};

export default function Header() {
  const { t } = useI18n();
  const [user, setUser] = useState<HeaderUser | null>(null);

  useEffect(() => {
    getSession().then((session) => {
      setUser(session?.user ?? null);
    });
  }, []);

  const fallback = user?.name?.[0] || user?.email?.[0] || "U";
  const navLinkClass =
    "whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-orange-50 hover:text-[#d73f09]";

  return (
    <motion.header
      className="fixed top-0 z-50 w-full border-b border-orange-100 bg-white/90 px-4 py-3 shadow-sm backdrop-blur-md"
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <div className="mx-auto flex w-full max-w-none flex-col gap-3 px-2 lg:flex-row lg:items-center lg:justify-between">
        <Link
          href="/"
          className="shrink-0 text-xl font-bold text-[#d73f09] sm:text-2xl"
        >
          OSUTrade
        </Link>

        <nav className="flex min-w-0 flex-1 flex-wrap items-center gap-2 lg:flex-nowrap lg:justify-end">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 lg:justify-end">
            <Link href="/" className={navLinkClass}>
              {t("nav.home")}
            </Link>
            <Link href="/overview" className={navLinkClass}>
              {t("nav.marketplace")}
            </Link>
            <Link href="/sell" className={navLinkClass}>
              {t("nav.sell")}
            </Link>
            <Link href="/seller" className={navLinkClass}>
              {t("nav.seller")}
            </Link>
            <Link href="/requests" className={navLinkClass}>
              {t("nav.requests")}
            </Link>
            <Link href="/cart" className={`${navLinkClass} inline-flex items-center`}>
              <RocketIcon className="mr-1 shrink-0" /> {t("nav.cart")}
            </Link>
          </div>

          <div className="flex min-w-max shrink-0 items-center justify-end gap-2">
            <LanguageToggle />

            {!user ? (
              <LoginModal />
            ) : (
              <DropdownMenu.Root>
                <DropdownMenu.Trigger>
                  <Avatar
                    fallback={fallback.toUpperCase()}
                    size="2"
                    className="cursor-pointer border border-gray-300"
                  />
                </DropdownMenu.Trigger>
                <DropdownMenu.Content align="end">
                  <DropdownMenu.Item disabled>
                    {user.name || user.email || "Profile"}
                  </DropdownMenu.Item>
                  <DropdownMenu.Separator />
                  <DropdownMenu.Item color="red" onClick={() => signOut()}>
                    {t("nav.logout")}
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Root>
            )}
          </div>
        </nav>
      </div>
    </motion.header>
  );
}
