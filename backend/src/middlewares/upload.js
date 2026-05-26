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

const upload = multer({ storage });
export { cloudinary };
export default upload;
