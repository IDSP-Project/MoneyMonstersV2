require('dotenv').config();
const { v2: cloudinary } = require('cloudinary');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const tempDir = path.join(__dirname, '../temp-uploads');
    if (!fs.existsSync(tempDir)){
      fs.mkdirSync(tempDir, { recursive: true });
    }
    cb(null, tempDir);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const profilePhotoUpload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: fileFilter
});

function cleanupTempFile(filePath) {
  if (filePath && fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

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
  getProfileImageUrl,
  profilePhotoUpload, 
  cleanupTempFile
};