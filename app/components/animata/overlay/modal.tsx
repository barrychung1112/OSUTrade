"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CircleAlert } from "lucide-react";
import { cn } from "@/app/utils/cn";

export default function Modal() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div>
            <button
                onClick={() => setIsOpen(true)}
                className="rounded bg-indigo-700 px-4 py-2 text-white hover:opacity-90 relative z-10"
            >
                Login
            </button>

            <AnimatePresence>
                {isOpen && (
                    <div
                        onClick={() => setIsOpen(false)}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur"
                    >
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
                                <h2 className="text-center text-xl font-bold">User Name</h2>
                                <input
                                    type="text"
                                    placeholder="UserName"
                                    className="w-full rounded border p-2"
                                />
                                <input
                                    type="password"
                                    placeholder="password"
                                    className="w-full rounded border p-2"
                                />
                                <div className="flex justify-between gap-2">
                                    <button
                                        onClick={() => setIsOpen(false)}
                                        className="w-full rounded bg-gray-200 py-2"
                                    >
                                        cancel
                                    </button>
                                    <button className="w-full rounded bg-indigo-600 py-2 text-white hover:opacity-90"
                                        onClick={() => setIsOpen(false)}>
                                        login
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
