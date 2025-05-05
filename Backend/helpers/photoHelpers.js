require('dotenv').config();


const { v2: cloudinary } = require('cloudinary');

cloudinary.config({
  cloud_name: 'dgbsivq33', 
  api_key: '552595323275138',
  api_secret: process.env.CLOUDINARY_API_SECRET
});


async function uploadProfileImage(file, userId) {
  try {
    const publicId = `profile-photos/${userId}-${Date.now()}`;
    
    const result = await cloudinary.uploader.upload(file, {
      public_id: publicId,
      folder: 'user-profiles',
      overwrite: true,
      resource_type: 'image',
      transformation: [
        { width: 500, height: 500, crop: 'limit' }, 
        { quality: 'auto', fetch_format: 'auto' }
      ]
    });
    
    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      details: result
    };
  } catch (error) {
    console.error('Error uploading profile image to Cloudinary:', error);
    return {
      success: false,
      error: error.message
    };
  }
}


async function deleteProfileImage(publicId) {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return {
      success: result.result === 'ok',
      result
    };
  } catch (error) {
    console.error('Error deleting profile image from Cloudinary:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

function getProfileImageUrl(publicId, options = {}) {
  const defaultOptions = {
    width: 200,
    height: 200,
    crop: 'fill',
    gravity: 'face',
    fetch_format: 'auto',
    quality: 'auto'
  };
  
  const transformOptions = { ...defaultOptions, ...options };
  
  return cloudinary.url(publicId, transformOptions);
}

module.exports = {
  uploadProfileImage,
  deleteProfileImage,
  getProfileImageUrl
};