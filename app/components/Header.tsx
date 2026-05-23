"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { signOut, getSession } from "next-auth/react";
import { Avatar, DropdownMenu } from "@radix-ui/themes";
import { Cross2Icon, HamburgerMenuIcon, RocketIcon } from "@radix-ui/react-icons";
import LoginModal from "./LoginModal";
import { LanguageToggle, useI18n } from "../i18n";

type HeaderUser = {
  name?: string | null;
  email?: string | null;
};

export default function Header() {
  const { t } = useI18n();
  const pathname = usePathname();
  const [user, setUser] = useState<HeaderUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    getSession().then((session) => {
      setUser(session?.user ?? null);
    });
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const fallback = user?.name?.[0] || user?.email?.[0] || "U";
  const navItems = [
    { href: "/", label: t("nav.home") },
    { href: "/overview", label: t("nav.marketplace") },
    { href: "/sell", label: t("nav.sell") },
    { href: "/seller", label: t("nav.seller") },
    { href: "/requests", label: t("nav.requests") },
  ];
  const navLinkClass = (href: string) => {
    const active =
      href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

    return [
      "whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition",
      active
        ? "bg-orange-50 text-[#d73f09]"
        : "text-gray-700 hover:bg-orange-50 hover:text-[#d73f09]",
    ].join(" ");
  };

  const authControl = !user ? (
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
  );

  return (
    <motion.header
      className="fixed top-0 z-50 w-full border-b border-orange-100 bg-white/95 px-4 py-3 shadow-sm backdrop-blur-md"
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3">
        <Link
          href="/"
          className="shrink-0 text-xl font-bold text-[#d73f09] sm:text-2xl"
        >
          OSUTrade
        </Link>

        <nav className="hidden min-w-0 flex-1 items-center justify-end gap-1.5 lg:flex">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className={navLinkClass(item.href)}>
              {item.label}
            </Link>
          ))}
          <Link
            href="/cart"
            className={`${navLinkClass("/cart")} inline-flex items-center gap-1`}
          >
            <RocketIcon className="shrink-0" /> {t("nav.cart")}
          </Link>
        </nav>

        <div className="flex min-w-max shrink-0 items-center justify-end gap-2">
          <LanguageToggle />
          <div className="hidden sm:block lg:hidden">{authControl}</div>
          <button
            type="button"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-orange-200 text-gray-700 transition hover:bg-orange-50 hover:text-[#d73f09] lg:hidden"
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <Cross2Icon /> : <HamburgerMenuIcon />}
          </button>
          <div className="hidden lg:block">{authControl}</div>
        </div>
      </div>

      {menuOpen && (
        <div className="mx-auto mt-3 w-full max-w-7xl rounded-lg border border-orange-100 bg-white p-3 shadow-lg lg:hidden">
          <nav className="grid gap-1">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className={navLinkClass(item.href)}>
                {item.label}
              </Link>
            ))}
            <Link
              href="/cart"
              className={`${navLinkClass("/cart")} inline-flex items-center gap-1`}
            >
              <RocketIcon className="shrink-0" /> {t("nav.cart")}
            </Link>
          </nav>
          <div className="mt-3 border-t border-orange-100 pt-3 sm:hidden">
            {authControl}
          </div>
        </div>
      )}
    </motion.header>
  );
}
