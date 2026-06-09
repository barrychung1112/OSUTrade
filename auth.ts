import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import {
  upsertGoogleUserProfile,
  type AppAuthUser,
} from "@/utils/auth/googleProfile";

type User = AppAuthUser;

type GoogleProfile = {
  sub?: string;
  email?: string;
  name?: string;
  email_verified?: boolean;
};

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

function getBaseUrl() {
  const baseUrl =
    process.env.AUTH_BASE_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000";

  return baseUrl.replace(/\/$/, "");
}

export const { auth, handlers } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/" },
  trustHost: true,
  providers: [
    ...(googleClientId && googleClientSecret
      ? [
          Google({
            clientId: googleClientId,
            clientSecret: googleClientSecret,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    Credentials({
      id: "login",
      name: "Login",
      credentials: {
        email: { label: "Email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials): Promise<User | null> {
        const email = String(credentials?.email ?? "");
        const password = String(credentials?.password ?? "");

        const res = await fetch(`${getBaseUrl()}/api/auth/login`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email, password }),
          cache: "no-store",
        });

        if (!res.ok) return null;

        const user = (await res.json()) as User;
        return user?.id ? user : null;
      },
    }),
    Credentials({
      id: "signup",
      name: "Signup",
      credentials: {
        username: { label: "Name" },
        email: { label: "Email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials): Promise<User | null> {
        const payload = {
          username: String(credentials?.username ?? ""),
          email: String(credentials?.email ?? ""),
          password: String(credentials?.password ?? ""),
        };

        const res = await fetch(`${getBaseUrl()}/api/auth/signup`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
          cache: "no-store",
        });

        if (!res.ok) return null;

        const user = (await res.json()) as User;
        return user?.id ? user : null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account, profile }) {
      if (account?.provider === "google") {
        const googleProfile = profile as GoogleProfile | undefined;
        const authUser = await upsertGoogleUserProfile({
          email: googleProfile?.email ?? user?.email,
          name: googleProfile?.name ?? user?.name,
          emailVerified: googleProfile?.email_verified === true,
        });

        token.sub = authUser.id;
        token.email = authUser.email;
        token.name = authUser.name;
        token.role = authUser.role;

        return token;
      }

      if (user) {
        const authUser = user as User;
        token.sub = authUser.id;
        token.email = authUser.email;
        token.name = authUser.name;
        token.role = authUser.role;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const sessionUser = session.user as typeof session.user & {
          id?: string;
          role?: string;
        };

        sessionUser.id = token.sub as string;
        sessionUser.email = token.email as string;
        sessionUser.name = token.name as string;
        sessionUser.role = token.role as string | undefined;
      }

      return session;
    },
  },
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
});
