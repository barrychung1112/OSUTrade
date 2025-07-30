// app/components/SignUpModal.tsx
"use client";

import { Dialog, Flex, Button } from "@radix-ui/themes";
import { useState } from "react";

export default function SignUpModal() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        size="3"
        highContrast
        className="bg-[#1a1a1a] text-white hover:bg-[#333]"
        onClick={() => setIsOpen(true)}
      >
        Sign Up
      </Button>
      <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
        <Dialog.Content maxWidth="450px">
          <Dialog.Title>Sign Up</Dialog.Title>
          <Flex direction="column" gap="3" mt="4">
            <input className="px-3 py-2 border rounded" placeholder="Email" />
            <input
              className="px-3 py-2 border rounded"
              placeholder="User Name"
            />
            <input
              type="password"
              className="px-3 py-2 border rounded"
              placeholder="Password"
            />
            <Button highContrast>Sign Up</Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </>
  );
}
