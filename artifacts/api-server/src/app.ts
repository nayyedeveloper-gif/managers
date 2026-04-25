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

// app.use(
//   pinoHttp({
//     logger,
//     serializers: {
//       req(req) {
//         return {
//           id: req.id,
//           method: req.method,
//           url: req.url?.split("?")[0],
//         };
//       },
//       res(res) {
//         return {
//           statusCode: res.statusCode,
//         };
//       },
//     },
//   }),
// );
// Trust Replit's reverse proxy so req.protocol and req.hostname are correct
app.set("trust proxy", true);
// app.use(cors({ credentials: true, origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Test with minimal middleware
app.use("/api", router);

export default app;
