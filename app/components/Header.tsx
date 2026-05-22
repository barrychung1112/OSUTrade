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

  return (
    <motion.header
      className="fixed top-0 z-50 flex w-full items-center justify-between px-6 py-4 backdrop-blur-md"
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <Link href="/" className="text-2xl font-bold text-[#d73f09]">
        OSUTrade
      </Link>

      <nav className="flex items-center gap-6">
        <Link
          href="/"
          className="text-sm font-medium text-gray-700 hover:text-[#d73f09]"
        >
          Home
        </Link>
        <Link
          href="/overview"
          className="text-sm font-medium text-gray-700 hover:text-[#d73f09]"
        >
          Marketplace
        </Link>
        <Link
          href="/sell"
          className="text-sm font-medium text-gray-700 hover:text-[#d73f09]"
        >
          Sell
        </Link>
        <Link
          href="/seller"
          className="text-sm font-medium text-gray-700 hover:text-[#d73f09]"
        >
          Seller
        </Link>
        <Link
          href="/requests"
          className="text-sm font-medium text-gray-700 hover:text-[#d73f09]"
        >
          Requests
        </Link>
        <Link
          href="/cart"
          className="flex items-center text-sm font-medium text-gray-700 hover:text-[#d73f09]"
        >
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
    </motion.header>
  );
}
