import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, filesTable, usersTable } from "@workspace/db";
import multer from "multer";
import path from "path";
import fs from "fs";
import { GetChannelFilesParams } from "@workspace/api-zod";

const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

const router: IRouter = Router();

router.post("/files/upload", upload.single("file"), async (req, res): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }
  const userId = ((req.session as Record<string, unknown>).userId as number) ?? 1;
  const channelId = req.body.channelId ? parseInt(req.body.channelId, 10) : null;
  const url = `/api/files/${req.file.filename}`;

  const [file] = await db.insert(filesTable).values({
    filename: req.file.filename,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    size: req.file.size,
    url,
    channelId,
    uploadedBy: userId,
  }).returning();

  const [uploader] = await db.select().from(usersTable).where(eq(usersTable.id, userId));

  res.status(201).json({ ...file, uploaderName: uploader?.displayName ?? "Unknown" });
});

router.get("/files/:filename", (req, res): void => {
  const filePath = path.join(uploadDir, req.params.filename);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.sendFile(filePath);
});

router.get("/channels/:id/files", async (req, res): Promise<void> => {
  const params = GetChannelFilesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const files = await db.select({
    id: filesTable.id,
    filename: filesTable.filename,
    originalName: filesTable.originalName,
    mimeType: filesTable.mimeType,
    size: filesTable.size,
    url: filesTable.url,
    channelId: filesTable.channelId,
    uploadedBy: filesTable.uploadedBy,
    uploaderName: usersTable.displayName,
    createdAt: filesTable.createdAt,
  })
    .from(filesTable)
    .innerJoin(usersTable, eq(filesTable.uploadedBy, usersTable.id))
    .where(eq(filesTable.channelId, params.data.id));
  res.json(files);
});

export default router;
