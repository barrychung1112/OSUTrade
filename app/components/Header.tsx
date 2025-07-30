// app/components/animata/overlay/header.tsx
"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Avatar, DropdownMenu, Button, Dialog, Flex } from "@radix-ui/themes";
import { RocketIcon } from "@radix-ui/react-icons";
import { useState } from "react";

export default function Header() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  return (
    <motion.header
      className="fixed top-0 w-full px-6 py-4 flex justify-between items-center backdrop-blur-md z-50"
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <Link href="/" className="text-[#d73f09] font-bold text-2xl">
        OSUTrade
      </Link>

      <nav className="flex items-center gap-6">
        <Link
          href="/"
          className="text-gray-700 hover:text-[#d73f09] text-sm font-medium"
        >
          Home
        </Link>
        <Link
          href="/product"
          className="text-gray-700 hover:text-[#d73f09] text-sm font-medium"
        >
          Marketplace
        </Link>
        <Link
          href="/about"
          className="text-gray-700 hover:text-[#d73f09] text-sm font-medium"
        >
          About
        </Link>
        <Link
          href="/cart"
          className="text-gray-700 hover:text-[#d73f09] text-sm font-medium flex items-center"
        >
          <RocketIcon className="mr-1" /> Cart
        </Link>

        {!isLoggedIn ? (
          <>
            <Button
              variant="outline"
              size="2"
              className="border-[#d73f09] text-[#d73f09]"
              onClick={() => setIsLoginOpen(true)}
            >
              Login
            </Button>
            <Dialog.Root open={isLoginOpen} onOpenChange={setIsLoginOpen}>
              <Dialog.Content maxWidth="450px">
                <Dialog.Title>Login</Dialog.Title>
                <Flex direction="column" gap="3" mt="4">
                  <input
                    className="px-3 py-2 border rounded"
                    placeholder="Email"
                  />
                  <input
                    type="password"
                    className="px-3 py-2 border rounded"
                    placeholder="Password"
                  />
                  <Button highContrast onClick={() => setIsLoggedIn(true)}>
                    Login
                  </Button>
                </Flex>
              </Dialog.Content>
            </Dialog.Root>
          </>
        ) : (
          <DropdownMenu.Root>
            <DropdownMenu.Trigger>
              <Avatar
                fallback="U"
                size="2"
                className="cursor-pointer border border-gray-300"
              />
            </DropdownMenu.Trigger>
            <DropdownMenu.Content align="end">
              <DropdownMenu.Item shortcut="⌘P">Profile</DropdownMenu.Item>
              <DropdownMenu.Item shortcut="⌘S">Settings</DropdownMenu.Item>
              <DropdownMenu.Separator />
              <DropdownMenu.Item
                color="red"
                onClick={() => setIsLoggedIn(false)}
              >
                Logout
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        )}
      </nav>
    </motion.header>
  );
}
