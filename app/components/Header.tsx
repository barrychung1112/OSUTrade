"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { signOut, useSession } from "next-auth/react";
import { Avatar, DropdownMenu } from "@radix-ui/themes";
import {
  Cross2Icon,
  ExitIcon,
  HamburgerMenuIcon,
  RocketIcon,
} from "@radix-ui/react-icons";
import LoginModal from "./LoginModal";
import { LanguageToggle, useI18n } from "../i18n";

type HeaderUser = {
  name?: string | null;
  email?: string | null;
};

type UserMenuProps = {
  user: HeaderUser;
  fallback: string;
  logoutLabel: string;
  onLogout: () => void;
};

function UserMenu({ user, fallback, logoutLabel, onLogout }: UserMenuProps) {
  const displayName = user.name || user.email || "Profile";

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger aria-label={displayName}>
        <button
          type="button"
          className="inline-flex h-11 max-w-[11rem] shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-md border border-gray-300 bg-white px-1.5 pr-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-orange-50 hover:text-[#d73f09] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d73f09] focus-visible:ring-offset-2"
        >
          <Avatar
            fallback={fallback.toUpperCase()}
            size="2"
            className="header-avatar-control border border-gray-300"
            style={{
              display: "inline-flex",
              flexShrink: 0,
              width: 32,
              minWidth: 32,
              height: 32,
              minHeight: 32,
            }}
          />
          <span className="hidden min-w-0 max-w-24 truncate xl:inline-block">
            {displayName}
          </span>
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content
        align="end"
        className="min-w-[12rem] max-w-[18rem] whitespace-nowrap"
      >
        <DropdownMenu.Item disabled className="max-w-[17rem] truncate">
          {displayName}
        </DropdownMenu.Item>
        <DropdownMenu.Separator />
        <DropdownMenu.Item
          color="red"
          onClick={onLogout}
          className="flex items-center gap-2 whitespace-nowrap"
        >
          <ExitIcon className="shrink-0" />
          <span className="whitespace-nowrap">{logoutLabel}</span>
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}

export default function Header() {
  const { t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const user = (session?.user ?? null) as HeaderUser | null;
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

  async function handleLogout() {
    setMenuOpen(false);
    await signOut({ redirect: false });
    router.push("/");
    router.refresh();
  }

  function renderAuthControl() {
    if (status === "loading") return null;
    if (!user) return <LoginModal />;

    return (
      <UserMenu
        user={user}
        fallback={fallback}
        logoutLabel={t("nav.logout")}
        onLogout={handleLogout}
      />
    );
  }

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

        <nav className="hidden min-w-0 flex-1 items-center justify-end gap-1 lg:flex xl:gap-1.5">
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
          <div className="hidden sm:block lg:hidden">{renderAuthControl()}</div>
          <button
            type="button"
            className="app-action-icon lg:hidden"
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <Cross2Icon /> : <HamburgerMenuIcon />}
          </button>
          <div className="hidden lg:block">{renderAuthControl()}</div>
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
            {renderAuthControl()}
          </div>
        </div>
      )}
    </motion.header>
  );
}
