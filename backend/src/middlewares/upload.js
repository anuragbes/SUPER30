import dotenv from "dotenv";
dotenv.config();

import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";

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

    if (file.fieldname === "passportPhoto") {
      folder = "super30/passport";
    } else if (file.fieldname === "poster") {
      folder = "super30/posters";
      publicId = `poster_${Date.now()}`;
    }

    return { folder, public_id: publicId };
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

export const uploadBufferToCloudinary = (buffer, folder) => {
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

export default upload;
