"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, CircleAlert, User } from "lucide-react";
import { cn } from "@/app/utils/cn";
import { ArrowRight } from "lucide-react";

function MenuAnimation({ menuItems }: { menuItems: { label: string; onClick?: () => void }[] }) {
  return (
    <div className="flex min-w-fit flex-col gap-2 overflow-hidden px-4 py-2">
      {menuItems.map((item, index) => (
        <div
          key={index}
          onClick={item.onClick}
          className="group flex cursor-pointer items-center gap-2"
        >
          <ArrowRight className="size-4 -translate-x-full text-black opacity-0 transition-all duration-300 ease-out group-hover:translate-x-0 group-hover:text-blue-500 group-hover:opacity-100" />
          <h1 className="z-10 -translate-x-6 font-medium text-black transition-transform duration-300 ease-out group-hover:translate-x-0 group-hover:text-blue-500">
            {item.label}
          </h1>
        </div>
      ))}
    </div>
  );
}

export default function Header() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-white/80 px-6 py-4 shadow backdrop-blur">
      <div className="text-xl font-bold">OSU Trade</div>

      <nav className="hidden gap-6 md:flex">
        <a href="#" className="hover:text-indigo-600 font-bold">Second-hand product trading platform for OSU Students</a>
      </nav>

      <div className="relative flex items-center gap-3">
        {isLoggedIn ? (
          <div className="relative">
            <User
              className="cursor-pointer"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            />
            {isUserMenuOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 w-52 rounded-md border bg-white p-3 shadow-lg">
                <MenuAnimation
                  menuItems={[
                    { label: "User Info" },
                    { label: "Logout", onClick: () => setIsLoggedIn(false) },
                  ]}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="relative">
            <Menu
              className="cursor-pointer"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            />
            {isMenuOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 w-52 rounded-md border bg-white p-3 shadow-lg">
                <MenuAnimation
                  menuItems={[
                    { label: "Login", onClick: () => setIsModalOpen(true) },
                    { label: "Sign Up", onClick: () => alert("Sign Up") },
                    { label: "Google Login", onClick: () => alert("Google Login") },
                  ]}
                />
              </div>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div
            onClick={() => setIsModalOpen(false)}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur min-h-screen">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", bounce: 0.3 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-xl bg-white p-6 text-black shadow-lg"
            >
              <div className="flex flex-col gap-4">
                <CircleAlert className="mx-auto text-indigo-600" size={48} />
                <h2 className="text-center text-xl font-bold">Login</h2>
                <input
                  type="User Name"
                  placeholder="user name"
                  className="w-full rounded border p-2"
                />
                <input
                  type="password"
                  placeholder="password"
                  className="w-full rounded border p-2"
                />
                <div className="flex justify-between gap-2">
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="w-full rounded bg-gray-200 py-2"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setIsLoggedIn(true);
                      setIsModalOpen(false);
                      setIsMenuOpen(false);
                    }}
                    className="w-full rounded bg-indigo-600 py-2 text-white hover:opacity-90"
                  >
                    Login
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </header>
  );
}