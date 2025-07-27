// app/components/LoginModal.tsx
"use client";

import { Dialog, Flex, Button } from "@radix-ui/themes";
import { useState } from "react";

export default function LoginModal() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        size="3"
        variant="outline"
        className="border-[#d73f09] text-[#d73f09]"
        onClick={() => setIsOpen(true)}
      >
        Login
      </Button>
      <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
        <Dialog.Content maxWidth="450px">
          <Dialog.Title>Login</Dialog.Title>
          <Flex direction="column" gap="3" mt="4">
            <input className="px-3 py-2 border rounded" placeholder="Email" />
            <input
              type="password"
              className="px-3 py-2 border rounded"
              placeholder="Password"
            />
            <Button highContrast>Login</Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </>
  );
}
