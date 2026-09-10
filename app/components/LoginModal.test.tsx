import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import LoginModal from "./LoginModal";

const signIn = vi.hoisted(() => vi.fn());

vi.mock("next-auth/react", () => ({ signIn }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("../i18n", () => ({
  useI18n: () => ({
    t: (key: string) =>
      ({
        "auth.email": "Email",
        "auth.password": "Password",
        "auth.login": "Log in",
        "auth.loggingIn": "Logging in...",
        "auth.loginError": "The email or password is incorrect.",
        "auth.loginUnavailable":
          "Login is temporarily unavailable. Please try again later.",
      })[key] ?? key,
  }),
}));
vi.mock("./GoogleAuthDialogCta", () => ({
  default: () => null,
}));
vi.mock("@radix-ui/themes", () => ({
  Button: ({
    children,
    highContrast: _highContrast,
    size: _size,
    variant: _variant,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    highContrast?: boolean;
    size?: string;
    variant?: string;
  }) => <button {...props}>{children}</button>,
  Dialog: {
    Root: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Content: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Title: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  },
  Flex: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe("LoginModal", () => {
  test("shows a safe unavailable message for the Credentials provider outage code", async () => {
    signIn.mockResolvedValue({
      error: "CredentialsSignin",
      code: "login_unavailable",
      status: 200,
      ok: true,
      url: null,
    });

    render(<LoginModal open />);
    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "student@osu.edu" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "password" },
    });
    fireEvent.submit(screen.getByPlaceholderText("Email").closest("form")!);

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toBe(
        "Login is temporarily unavailable. Please try again later."
      );
    });

    expect(signIn).toHaveBeenCalledWith("login", {
      redirect: false,
      email: "student@osu.edu",
      password: "password",
    });
  });
});
