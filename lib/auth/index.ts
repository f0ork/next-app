import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      async authorize(credentials) {
        console.log("[Auth] authorize called with:", credentials?.email);
        const email = credentials?.email as string;
        const password = credentials?.password as string;
        if (!email || !password) {
          console.log("[Auth] missing email or password");
          return null;
        }
        const user = await db.query.users.findFirst({
          where: eq(schema.users.email, email),
        });
        console.log("[Auth] user found:", user ? user.email : "none");
        if (!user || !user.isActive) {
          console.log("[Auth] user not found or inactive");
          return null;
        }
        const valid = await bcrypt.compare(password, user.password);
        console.log("[Auth] password valid:", valid);
        if (!valid) return null;
        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (token as any).role = (user as any).role;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (token as any).id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (session.user as any).role = token.role;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (session.user as any).id = token.id;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60,
  },
});
