
import express from "express";
import cors from "cors";
import multer from "multer";
import dotenv from "dotenv";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.AWS_BUCKET;

const upload = multer({ storage: multer.memoryStorage() });

app.post("/upload", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const fileName = `${Date.now()}-${req.file.originalname}`;

    const params = {
      Bucket: BUCKET,
      Key: fileName,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    };

    await s3.send(new PutObjectCommand(params));

    const url = `https://${BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
    res.json({ filename: fileName, url });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ message: "Failed to upload file" });
  }
});

app.get("/images", async (_, res) => {
  try {
    const data = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET }));

    const files = await Promise.all(
      (data.Contents || []).map(async (file) => {
        const command = new GetObjectCommand({ Bucket: BUCKET, Key: file.Key });
        const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
        return { name: file.Key, url };
      })
    );

    res.json(files);
  } catch (err) {
    console.error("List error:", err);
    res.status(500).json({ message: "Failed to list images" });
  }
});

app.get("/search", async (req, res) => {
  try {
    const q = (req.query.q || "").toLowerCase();
    const data = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET }));

    const matched = (data.Contents || []).filter((file) =>
      file.Key.toLowerCase().includes(q)
    );

    const results = await Promise.all(
      matched.map(async (file) => {
        const command = new GetObjectCommand({ Bucket: BUCKET, Key: file.Key });
        const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
        return { name: file.Key, url };
      })
    );

    res.json(results);
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ message: "Search failed" });
  }
});

app.get("/download/:name", async (req, res) => {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET,
      Key: req.params.name,
    });

    const url = await getSignedUrl(s3, command, { expiresIn: 60 });
    res.json({ downloadUrl: url });
  } catch (err) {
    console.error("Download error:", err);
    res.status(404).json({ message: "File not found" });
  }
});

app.delete("/:name", async (req, res) => {
  try {
    const params = {
      Bucket: BUCKET,
      Key: req.params.name,
    };

    await s3.send(new DeleteObjectCommand(params));
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(404).json({ message: "File not found" });
  }
});

app.listen(5000, () => console.log(" Backend running on http://localhost:5000"));
