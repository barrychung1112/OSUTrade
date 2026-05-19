"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Dialog, Flex, Button } from "@radix-ui/themes";

export default function LoginModal() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signIn("login", {
      redirect: false,
      email,
      password,
    });

    setLoading(false);

    if (result?.error) {
      setError("The email or password is incorrect.");
      return;
    }

    setIsOpen(false);
    router.push("/overview");
    router.refresh();
  }

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
                type="password"
                className="px-3 py-2 border rounded"
                placeholder="Password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              {error && (
                <p className="text-sm text-red-600" role="alert">
                  {error}
                </p>
              )}
              <Button highContrast type="submit" disabled={loading}>
                {loading ? "Logging in..." : "Login"}
              </Button>
            </Flex>
          </form>
        </Dialog.Content>
      </Dialog.Root>
    </>
  );
}
