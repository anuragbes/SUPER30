import imageCompression from "browser-image-compression";

/**
 * Compresses an image file before upload.
 * If compression fails, it returns the original file to prevent blocking the upload.
 * 
 * @param {File} file - The original image file
 * @param {Object} options - Compression options
 * @returns {Promise<File>} - A promise that resolves to the compressed File or the original File on failure
 */
const compressImage = async (file, options) => {
  if (!file) return null;
  
  try {
    const compressedBlob = await imageCompression(file, options);
    // Convert Blob back to File to maintain filename and type
    return new File([compressedBlob], file.name, {
      type: file.type || compressedBlob.type,
      lastModified: Date.now(),
    });
  } catch (error) {
    console.error(`Image compression failed for ${file.name}:`, error);
    // Fallback to original file
    return file;
  }
};

export const compressPassport = async (file) => {
  return compressImage(file, {
    maxSizeMB: 0.25,
    maxWidthOrHeight: 1200,
    useWebWorker: true,
    initialQuality: 0.8,
  });
};

export const compressIdentity = async (file) => {
  return compressImage(file, {
    maxSizeMB: 0.5,
    maxWidthOrHeight: 1600,
    useWebWorker: true,
    initialQuality: 0.85,
  });
};
