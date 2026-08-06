import dotenv from "dotenv";
dotenv.config();

import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import { retryWithBackoff } from "../utils/retryWithBackoff.js";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => {
    let folder = "super30/identity";
    let publicId = `student_${Date.now()}`;
    let format;

    if (file.fieldname === "passportPhoto") {
      folder = "super30/passport";
    } else if (file.fieldname === "poster") {
      folder = "super30/posters";
      publicId = `poster_${Date.now()}`;
      format = "webp";
    }

    return { folder, public_id: publicId, ...(format && { format }) };
  },
});

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_FILE_SIZE_MB = 5;

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      Object.assign(new Error("Invalid file type. Only JPEG, PNG, and WebP images are allowed."), {
        code: "INVALID_FILE_TYPE",
        status: 400,
      }),
      false
    );
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE_MB * 1024 * 1024, // 5 MB
  },
  fileFilter,
});

export { cloudinary, MAX_FILE_SIZE_MB };

const memoryStorage = multer.memoryStorage();
export const memoryUpload = multer({
  storage: memoryStorage,
  limits: { fileSize: MAX_FILE_SIZE_MB * 1024 * 1024 },
  fileFilter,
});

const uploadOnce = (buffer, folder) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    uploadStream.end(buffer);
  });
};

// Retried on transient failures only (network blips, rate limits, 5xx) --
// no public_id is set above, so Cloudinary assigns a fresh unique one on
// every call, meaning a retry can only ever create an additional,
// independent asset, never overwrite or corrupt an existing one. `buffer`
// is a plain in-memory Buffer, safe to reuse across retry attempts (unlike
// a single-use stream).
export const uploadBufferToCloudinary = (buffer, folder) => {
  return retryWithBackoff(() => uploadOnce(buffer, folder));
};

export default upload;
