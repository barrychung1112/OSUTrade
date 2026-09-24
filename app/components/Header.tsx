"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { signOut, useSession } from "next-auth/react";
import { Avatar } from "@radix-ui/themes";
import {
  Cross2Icon,
  ExitIcon,
  HamburgerMenuIcon,
  RocketIcon,
} from "@radix-ui/react-icons";
import LoginModal from "./LoginModal";
import NotificationBell from "./NotificationBell";
import { LanguageToggle, useI18n } from "../i18n";
import {
  guidePath,
  productPath,
  publicLocaleFromClientLocale,
} from "../lib/publicLocale";

type HeaderUser = {
  id?: string | null;
  name?: string | null;
  email?: string | null;
};

type UserMenuProps = {
  user: HeaderUser;
  fallback: string;
  logoutLabel: string;
  viewSellerProfileLabel: string;
  editDisplayNameLabel: string;
  displayNameLabel: string;
  saveDisplayNameLabel: string;
  savingDisplayNameLabel: string;
  cancelLabel: string;
  displayNameTakenLabel: string;
  displayNameSaveErrorLabel: string;
  onDisplayNameUpdated: (name: string) => Promise<void>;
  onLogout: () => void;
};

function UserMenu({
  user,
  fallback,
  logoutLabel,
  viewSellerProfileLabel,
  editDisplayNameLabel,
  displayNameLabel,
  saveDisplayNameLabel,
  savingDisplayNameLabel,
  cancelLabel,
  displayNameTakenLabel,
  displayNameSaveErrorLabel,
  onDisplayNameUpdated,
  onLogout,
}: UserMenuProps) {
  const displayName = user.name || user.email || "Profile";
  const [open, setOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(displayName);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savingName, setSavingName] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function handleLogoutClick() {
    setOpen(false);
    await onLogout();
  }

  function openDisplayNameEditor() {
    setOpen(false);
    setDraftName(displayName);
    setSaveError(null);
    setEditingName(true);
  }

  async function handleDisplayNameSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingName(true);
    setSaveError(null);

    try {
      const response = await fetch("/api/account/display-name", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: draftName }),
      });
      const payload = (await response.json().catch(() => null)) as {
        data?: { name?: unknown };
      } | null;

      if (!response.ok) {
        setSaveError(response.status === 409 ? displayNameTakenLabel : displayNameSaveErrorLabel);
        return;
      }

      const updatedName = typeof payload?.data?.name === "string" ? payload.data.name : null;
      if (!updatedName) {
        setSaveError(displayNameSaveErrorLabel);
        return;
      }

      await onDisplayNameUpdated(updatedName);
      setEditingName(false);
    } catch {
      setSaveError(displayNameSaveErrorLabel);
    } finally {
      setSavingName(false);
    }
  }

  return (
    <div ref={menuRef} className="relative inline-flex shrink-0">
      <button
        type="button"
        aria-label={displayName}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
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

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-[calc(100%+0.5rem)] z-[70] w-56 rounded-lg border border-orange-100 bg-white p-1.5 text-sm shadow-xl ring-1 ring-black/5 sm:left-auto sm:right-0"
        >
          <div className="block w-full truncate whitespace-nowrap px-3 py-2 text-left font-semibold text-gray-700">
            {displayName}
          </div>
          <div className="my-1 h-px bg-orange-100" />
          {user.id && (
            <Link
              href={`/sellers/${encodeURIComponent(user.id)}`}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex h-10 w-full items-center rounded-md px-3 font-semibold text-gray-700 transition hover:bg-orange-50 hover:text-[#d73f09] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-200"
            >
              {viewSellerProfileLabel}
            </Link>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={openDisplayNameEditor}
            className="flex h-10 w-full items-center rounded-md px-3 text-left font-semibold text-gray-700 transition hover:bg-orange-50 hover:text-[#d73f09] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-200"
          >
            {editDisplayNameLabel}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={handleLogoutClick}
            className="flex h-10 w-full items-center gap-2 whitespace-nowrap rounded-md px-3 text-left font-semibold text-red-600 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200"
          >
            <ExitIcon className="h-4 w-4 shrink-0" />
            <span className="whitespace-nowrap">{logoutLabel}</span>
          </button>
        </div>
      )}

      {editingName && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label={editDisplayNameLabel}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4"
        >
          <form
            onSubmit={handleDisplayNameSubmit}
            className="w-full max-w-md rounded-lg border border-orange-100 bg-white p-5 shadow-2xl"
          >
            <label htmlFor="display-name" className="block text-sm font-semibold text-gray-800">
              {displayNameLabel}
            </label>
            <input
              id="display-name"
              name="display-name"
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              autoFocus
              minLength={2}
              maxLength={32}
              required
              className="mt-2 h-11 w-full rounded-md border border-gray-300 px-3 text-gray-900 outline-none transition focus:border-[#d73f09] focus:ring-2 focus:ring-orange-100"
            />
            {saveError && <p className="mt-2 text-sm font-medium text-red-600">{saveError}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={savingName}
                onClick={() => setEditingName(false)}
                className="h-10 rounded-md border border-gray-300 px-4 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {cancelLabel}
              </button>
              <button
                type="submit"
                disabled={savingName}
                className="h-10 rounded-md bg-[#d73f09] px-4 text-sm font-semibold text-white transition hover:bg-[#b83208] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingName ? savingDisplayNameLabel : saveDisplayNameLabel}
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}
    </div>
  );
}

export default function Header() {
  const { t, locale } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status, update: updateSession } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [updatedDisplayName, setUpdatedDisplayName] = useState<string | null>(null);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id) return;

    let cancelled = false;

    async function refreshDisplayName() {
      try {
        const response = await fetch("/api/account/display-name", {
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => null)) as {
          data?: { name?: unknown };
        } | null;
        const name = typeof payload?.data?.name === "string" ? payload.data.name : null;

        if (!cancelled && name && name !== session.user?.name) {
          setUpdatedDisplayName(name);
          await updateSession({ name });
        }
      } catch {
        // Keep the JWT name as a fallback if the profile refresh is unavailable.
      }
    }

    void refreshDisplayName();

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id, session?.user?.name, status, updateSession]);

  const sessionUser = (session?.user ?? null) as HeaderUser | null;
  const user = sessionUser
    ? { ...sessionUser, name: updatedDisplayName ?? sessionUser.name }
    : null;
  const fallback = user?.name?.[0] || user?.email?.[0] || "U";
  const navItems = [
    { href: "/", label: t("nav.home") },
    {
      href: guidePath(publicLocaleFromClientLocale(locale), "move-in"),
      label: t("nav.guides"),
    },
    { href: "/overview", label: t("nav.marketplace") },
    { href: "/sell", label: t("nav.sell") },
    { href: "/seller", label: t("nav.seller") },
    { href: "/requests", label: t("nav.requests") },
  ];
  const navLinkClass = (href: string) => {
    const isGuidesNavigation = /^\/(?:en|zh-tw|zh-cn)\/guides\/move-in$/.test(href);
    const active =
      href === "/"
        ? pathname === "/"
        : isGuidesNavigation
          ? /^\/(?:en|zh-tw|zh-cn)\/guides(?:\/(?:move-in|move-out))?$/.test(pathname)
          : pathname === href || pathname.startsWith(`${href}/`);

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

  async function handleDisplayNameUpdated(name: string) {
    setUpdatedDisplayName(name);
    await updateSession({ name });
    router.refresh();
  }

  function handleLocaleChange(locale: "en" | "zh" | "zhCn") {
    const publicLocale = publicLocaleFromClientLocale(locale);
    const guideMatch = pathname.match(/^\/(?:en|zh-tw|zh-cn)\/guides(?:\/(move-in|move-out))?$/);
    if (guideMatch) {
      router.push(
        guideMatch[1]
          ? guidePath(publicLocale, guideMatch[1] as "move-in" | "move-out")
          : `/${publicLocale}/guides`
      );
      return;
    }

    const productMatch = pathname.match(/^\/(?:en|zh-tw|zh-cn)\/product\/(.+)$/);
    if (!productMatch) return;

    router.push(
      productPath(
        publicLocale,
        decodeURIComponent(productMatch[1])
      )
    );
  }

  function renderAuthControl() {
    if (status === "loading") return null;
    if (!user) return <LoginModal />;

    return (
      <UserMenu
        user={user}
        fallback={fallback}
        logoutLabel={t("nav.logout")}
        viewSellerProfileLabel={t("account.viewSellerProfile")}
        editDisplayNameLabel={t("account.editDisplayName")}
        displayNameLabel={t("account.displayName")}
        saveDisplayNameLabel={t("account.saveDisplayName")}
        savingDisplayNameLabel={t("account.savingDisplayName")}
        cancelLabel={t("account.cancel")}
        displayNameTakenLabel={t("account.displayNameTaken")}
        displayNameSaveErrorLabel={t("account.displayNameSaveError")}
        onDisplayNameUpdated={handleDisplayNameUpdated}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <motion.header
      className="fixed left-0 right-0 top-0 z-50 w-full border-b border-orange-100 bg-white/95 px-4 py-3 shadow-sm backdrop-blur-md"
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <div className="mx-auto flex w-full max-w-[96rem] items-center justify-between gap-3">
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
          <LanguageToggle onLocaleChange={handleLocaleChange} />
          {user && <NotificationBell />}
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
        <div className="mx-auto mt-3 w-full max-w-[96rem] rounded-lg border border-orange-100 bg-white p-3 shadow-lg lg:hidden">
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
