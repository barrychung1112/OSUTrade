"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { signOut, getSession } from "next-auth/react";
import { Avatar, DropdownMenu } from "@radix-ui/themes";
import { RocketIcon } from "@radix-ui/react-icons";
import LoginModal from "./LoginModal";

type HeaderUser = {
  name?: string | null;
  email?: string | null;
};

export default function Header() {
  const [user, setUser] = useState<HeaderUser | null>(null);

  useEffect(() => {
    getSession().then((session) => {
      setUser(session?.user ?? null);
    });
  }, []);

  const fallback = user?.name?.[0] || user?.email?.[0] || "U";
  const navLinkClass =
    "rounded-md px-2 py-1 text-sm font-medium text-gray-700 transition hover:bg-orange-50 hover:text-[#d73f09]";

  return (
    <motion.header
      className="fixed top-0 z-50 w-full border-b border-orange-100 bg-white/85 px-4 py-3 shadow-sm backdrop-blur-md"
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
        <Link href="/" className="text-xl font-bold text-[#d73f09] sm:text-2xl">
          OSUTrade
        </Link>

        <nav className="flex flex-wrap items-center justify-end gap-1 sm:gap-2">
          <Link href="/" className={navLinkClass}>
            Home
          </Link>
          <Link href="/overview" className={navLinkClass}>
            Marketplace
          </Link>
          <Link href="/sell" className={navLinkClass}>
            Sell
          </Link>
          <Link href="/seller" className={navLinkClass}>
            Seller
          </Link>
          <Link href="/requests" className={navLinkClass}>
            Requests
          </Link>
          <Link href="/cart" className={`${navLinkClass} inline-flex items-center`}>
            <RocketIcon className="mr-1" /> Cart
          </Link>

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
                  Logout
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Root>
          )}
        </nav>
      </div>
    </motion.header>
  );
}
