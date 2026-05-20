"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { Dialog, Flex, Button } from "@radix-ui/themes";

type SignupResponse = {
  id?: string;
  email?: string;
  message?: string;
  errorCode?: string;
  status?: "confirmation_required";
};

export default function SignUpModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username, email, password }),
    });
    const payload = (await res.json().catch(() => ({}))) as SignupResponse;

    if (!res.ok && res.status !== 202) {
      setLoading(false);
      setError(payload.message || "Sign up failed. Check your OSU email and password.");
      return;
    }

    if (res.status === 202 || payload.status === "confirmation_required") {
      setLoading(false);
      setSuccess(payload.message || "Please check your OSU email to confirm your account.");
      return;
    }

    const loginResult = await signIn("login", {
      redirect: false,
      email,
      password,
    });

    setLoading(false);

    if (loginResult?.error) {
      setSuccess("Account created. Please log in after confirming your OSU email.");
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
              {success && (
                <p className="text-green-700 text-sm" role="status">
                  {success}
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
