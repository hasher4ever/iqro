import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";

/** Returns true if the identifier looks like a phone number */
export function isPhone(identifier: string): boolean {
  const cleaned = identifier.replace(/[\s\-\(\)]/g, "");
  return /^\+?\d{7,15}$/.test(cleaned);
}

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      profile(params) {
        const identifier = (params.email as string) || "";
        const name = (params.name as string) || "";
        const profile: Record<string, string> & { email: string } = {
          email: identifier,
          name,
        };
        if (isPhone(identifier)) {
          profile.phone = identifier;
        }
        return profile;
      },
    }),
  ],
});