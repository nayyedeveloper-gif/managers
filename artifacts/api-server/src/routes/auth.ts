import { Router, type IRouter, type Request } from "express";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";

const router: IRouter = Router();

const GOOGLE_CLIENT_ID = process.env["GOOGLE_CLIENT_ID"];
const GOOGLE_CLIENT_SECRET = process.env["GOOGLE_CLIENT_SECRET"];
const GOOGLE_CALLBACK_URL = process.env["GOOGLE_CALLBACK_URL"];

function googleEnabled() {
  return !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);
}

// Build the callback URL from the incoming request's host so it works on
// any domain: dev Replit domain, .replit.app, or managers.29jewellery.com
function buildCallbackUrl(req: Request) {
  const proto = req.headers["x-forwarded-proto"] ?? req.protocol ?? "https";
  const host = req.headers["x-forwarded-host"] ?? req.headers["host"] ?? "";
  return `${proto}://${host}/api/auth/google/callback`;
}

if (googleEnabled()) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: GOOGLE_CLIENT_ID!,
        clientSecret: GOOGLE_CLIENT_SECRET!,
        callbackURL: GOOGLE_CALLBACK_URL || "/api/auth/google/callback",
        proxy: true,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value ?? null;
          const photoUrl = profile.photos?.[0]?.value ?? null;

          // Try to find existing user by googleId or email
          let user = null;
          // Query by googleId first
          const googleResult = await db
            .select({ id: usersTable.id, googleId: usersTable.googleId, email: usersTable.email, avatarUrl: usersTable.avatarUrl })
            .from(usersTable)
            .where(eq(usersTable.googleId, profile.id));
          user = googleResult[0] ?? null;

          // If not found, query by email
          if (!user && email) {
            const emailResult = await db
              .select({ id: usersTable.id, googleId: usersTable.googleId, email: usersTable.email, avatarUrl: usersTable.avatarUrl })
              .from(usersTable)
              .where(eq(usersTable.email, email));
            user = emailResult[0] ?? null;
          }

          if (user) {
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

// GET /api/auth/google/status
router.get("/auth/google/status", (_req, res) => {
  res.json({ enabled: googleEnabled() });
});

// GET /api/auth/google — start OAuth, passing the dynamic callback URL
router.get("/auth/google", (req, res, next) => {
  if (!googleEnabled()) {
    res.status(503).json({ error: "Google login is not configured." });
    return;
  }
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
    callbackURL: buildCallbackUrl(req),
  } as any)(req, res, next);
});

// GET /api/auth/google/callback
router.get("/auth/google/callback", (req, res, next) => {
  if (!googleEnabled()) {
    res.redirect(`/?error=google_not_configured`);
    return;
  }
  passport.authenticate(
    "google",
    { session: false, callbackURL: buildCallbackUrl(req) } as any,
    async (err: Error | null, user: { id: number } | false) => {
      if (err || !user) {
        const msg = err?.message ?? "google_auth_failed";
        res.redirect(`/?error=${encodeURIComponent(msg)}`);
        return;
      }
      (req.session as unknown as Record<string, unknown>).userId = user.id;
      req.session.save(() => {
        res.redirect(`/?googleUserId=${user.id}`);
      });
    }
  )(req, res, next);
});

export default router;
