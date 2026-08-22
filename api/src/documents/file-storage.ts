import crypto from "node:crypto";
import { v2 as cloudinary } from "cloudinary";
import env from "../config.js";

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  timeout: 120000,
});

export async function saveUpload(userId: string, chatId: string, file: Express.Multer.File) {
  const id = crypto.randomUUID();
  const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
  const publicId = `rag99/${userId}/${chatId}/${id}-${safeName}`;
  const isPdf = safeName.toLowerCase().endsWith(".pdf");
  const result = await uploadRaw(file.buffer, publicId, isPdf ? "image" : "raw");

  return {
    id,
    filePath: result.secure_url,
    storedName: result.public_id,
  };
}

export async function deleteUpload(publicId: string) {
  const isPdf = publicId.toLowerCase().endsWith(".pdf");
  await cloudinary.uploader.destroy(publicId, {
    resource_type: isPdf ? "image" : "raw",
  });
}

function uploadRaw(buffer: Buffer, publicId: string, resourceType: "image" | "raw") {
  return new Promise<{ public_id: string; secure_url: string }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        public_id: publicId,
        resource_type: resourceType,
        overwrite: false,
        timeout: 120000,
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Cloudinary upload failed"));
          return;
        }

        resolve({
          public_id: result.public_id,
          secure_url: result.secure_url,
        });
      },
    );

    stream.end(buffer);
  });
}
