import "dotenv/config";
import express, { type Express } from "express";
import cors from "cors";
import session from "express-session";
import passport from "passport";
import pinoHttp from "pino-http";
import helmet from "helmet";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
// Trust Replit's reverse proxy so req.protocol and req.hostname are correct
app.set("trust proxy", true);
app.use(cors({ credentials: true, origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Security headers with CSP configuration
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://*.googleapis.com", "https://accounts.google.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://*.googleapis.com"],
        imgSrc: ["'self'", "data:", "https:", "https://*.googleusercontent.com"],
        connectSrc: ["'self'", "https://*.googleapis.com", "https://accounts.google.com", "http://localhost:8080"],
        fontSrc: ["'self'", "data:", "https://*.googleapis.com"],
        frameSrc: ["'self'", "https://accounts.google.com"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

app.use(session({
  secret: process.env["SESSION_SECRET"] ?? "clipup-secret-dev",
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 },
}));

app.use(passport.initialize());

app.use("/api", router);

export default app;
