import { Router, type IRouter } from "express";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { eq, or } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";

const router: IRouter = Router();

const GOOGLE_CLIENT_ID = process.env["GOOGLE_CLIENT_ID"];
const GOOGLE_CLIENT_SECRET = process.env["GOOGLE_CLIENT_SECRET"];
const REPLIT_DOMAIN = process.env["REPLIT_DOMAINS"]?.split(",")[0] ?? "";
const CALLBACK_URL = `https://${REPLIT_DOMAIN}/api/auth/google/callback`;

function googleEnabled() {
  return !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);
}

if (googleEnabled()) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: GOOGLE_CLIENT_ID!,
        clientSecret: GOOGLE_CLIENT_SECRET!,
        callbackURL: CALLBACK_URL,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value ?? null;
          const photoUrl = profile.photos?.[0]?.value ?? null;

          // Try to find existing user by googleId or email
          let user = null;
          if (email) {
            const [found] = await db
              .select()
              .from(usersTable)
              .where(or(eq(usersTable.googleId, profile.id), eq(usersTable.email, email)));
            user = found ?? null;
          } else {
            const [found] = await db
              .select()
              .from(usersTable)
              .where(eq(usersTable.googleId, profile.id));
            user = found ?? null;
          }

          if (user) {
            // Link Google ID and verify email if not already done
            await db
              .update(usersTable)
              .set({
                googleId: user.googleId ?? profile.id,
                emailVerified: true,
                avatarUrl: user.avatarUrl ?? photoUrl,
                status: "online",
              })
              .where(eq(usersTable.id, user.id));
            return done(null, { id: user.id });
          }

          // Create new user from Google profile
          if (!email) {
            return done(new Error("No email from Google profile"), false as any);
          }

          // Generate a unique username from email
          let baseUsername = email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase();
          let username = baseUsername;
          let attempt = 0;
          while (true) {
            const [existing] = await db
              .select({ id: usersTable.id })
              .from(usersTable)
              .where(eq(usersTable.username, username));
            if (!existing) break;
            attempt++;
            username = `${baseUsername}_${attempt}`;
          }

          const displayName = profile.displayName || username;

          const [newUser] = await db
            .insert(usersTable)
            .values({
              username,
              displayName,
              email,
              passwordHash: null,
              avatarUrl: photoUrl,
              role: "member",
              status: "online",
              googleId: profile.id,
              emailVerified: true,
            })
            .returning();

          return done(null, { id: newUser.id });
        } catch (err) {
          return done(err as Error, false as any);
        }
      }
    )
  );
}

// GET /api/auth/google/status — check if Google auth is enabled
router.get("/auth/google/status", (_req, res) => {
  res.json({ enabled: googleEnabled() });
});

// GET /api/auth/google — start OAuth flow
router.get("/auth/google", (req, res, next) => {
  if (!googleEnabled()) {
    res.status(503).json({ error: "Google login is not configured." });
    return;
  }
  passport.authenticate("google", { scope: ["profile", "email"], session: false })(req, res, next);
});

// GET /api/auth/google/callback — handle OAuth callback
router.get(
  "/auth/google/callback",
  (req, res, next) => {
    if (!googleEnabled()) {
      res.redirect(`/?error=google_not_configured`);
      return;
    }
    passport.authenticate("google", { session: false }, async (err: Error | null, user: { id: number } | false) => {
      if (err || !user) {
        const msg = err?.message ?? "google_auth_failed";
        res.redirect(`/?error=${encodeURIComponent(msg)}`);
        return;
      }
      // Store in session
      (req.session as Record<string, unknown>).userId = user.id;
      req.session.save(() => {
        res.redirect(`/?googleUserId=${user.id}`);
      });
    })(req, res, next);
  }
);

export default router;
