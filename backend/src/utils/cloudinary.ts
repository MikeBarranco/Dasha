import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const extractPublicId = (url: string): string | null => {
  if (!url || !url.includes('cloudinary')) return null;
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    const uploadIndex = pathParts.indexOf('upload');
    if (uploadIndex !== -1 && pathParts.length > uploadIndex + 2) {
      let publicIdWithExt = pathParts.slice(uploadIndex + 2).join('/');
      if (!pathParts[uploadIndex + 1].startsWith('v')) {
         publicIdWithExt = pathParts.slice(uploadIndex + 1).join('/');
      }
      return publicIdWithExt.split('.')[0];
    }
    const parts = url.split('/');
    const fileWithExt = parts[parts.length - 1];
    const folder = parts[parts.length - 2];
    const id = fileWithExt.split('.')[0];
    return folder + '/' + id;
  } catch {
    return null;
  }
};

export const deleteCloudinaryFile = async (publicIdOrUrl: string | null | undefined): Promise<void> => {
  if (!publicIdOrUrl) return;
  try {
    let publicId = publicIdOrUrl;
    if (publicIdOrUrl.startsWith('http')) {
      const extracted = extractPublicId(publicIdOrUrl);
      if (!extracted) return;
      publicId = extracted;
    }
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error("Failed to delete cloudinary file publicId=:", error);
  }
};

export const deleteMultipleCloudinaryFiles = async (publicIdsOrUrls: (string | null | undefined)[]): Promise<void> => {
  for (const item of publicIdsOrUrls) {
    if (item) await deleteCloudinaryFile(item);
  }
};
