"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { Dialog, Flex, Button } from "@radix-ui/themes";

export default function SignUpModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const result = await signIn("signup", {
      redirect: false,
      username,
      email,
      password,
    });

    setLoading(false);

    if (result?.error) {
      setError("Sign up failed. Check your OSU email and password.");
      return;
    }

    window.location.assign("/overview");
  }

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

          <form onSubmit={onSubmit}>
            <Flex direction="column" gap="3" mt="4">
              <input
                className="px-3 py-2 border rounded"
                placeholder="Email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
              <input
                className="px-3 py-2 border rounded"
                placeholder="User Name"
                autoComplete="name"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
              />
              <input
                type="password"
                className="px-3 py-2 border rounded"
                placeholder="Password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                required
              />

              {error && (
                <p className="text-red-600 text-sm" role="alert">
                  {error}
                </p>
              )}

              <Button highContrast type="submit" disabled={loading}>
                {loading ? "Creating account..." : "Sign Up"}
              </Button>
            </Flex>
          </form>
        </Dialog.Content>
      </Dialog.Root>
    </>
  );
}
