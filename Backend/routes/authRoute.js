const express = require("express");
const multer = require('multer');
const {
  ensureAuthenticated,
  forwardAuthenticated,
  registerUser,
  authenticateUser,
  checkEmailExists,
  retrieveProfile,
  updateUserProfile,
  updateUserPhotoUrl, removeUserPhotoUrl
} = require("../helpers/authHelpers");
const { uploadProfileImage, deleteProfileImage } = require('../helpers/photoHelpers');
const fs = require('fs');
const path = require('path');
const router = express.Router();


router.get("/login", forwardAuthenticated, (req, res) => {
  let error = null;
  
  if (req.session.flash) {
    error = req.session.flash.message;
    delete req.session.flash;
  }
  
  res.render("users/userLogin", { error });
});

router.post("/login", forwardAuthenticated, async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const isAjax = req.xhr || req.headers.accept.indexOf('json') > -1;
    
    const result = await authenticateUser(email, password, req);
    
    if (!result.success) {
      if (isAjax) {
        return res.status(400).json({
          success: false,
          error: "Incorrect login details"
        });
      }
      throw new Error("Incorrect login details");
    }
    
    if (isAjax) {
      return res.json({
        success: true,
        redirect: "/"
      });
    }
    
    res.redirect("/dashboard");
  } catch (error) {
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
    res.render("users/userLogin", { error: error.message });
  }
});

router.post("/check-email", forwardAuthenticated, async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        exists: false,
        message: "Email is required"
      });
    }
    
    const exists = await checkEmailExists(email);
    
    return res.json({
      exists,
      message: exists ? "This email is already registered" : "Email is available"
    });
  } catch (error) {
    return res.status(500).json({
      error: true,
      message: error.message
    });
  }
});

router.get("/register", forwardAuthenticated, (req, res) => {
  res.render("users/userRegister", { error: null, success: null });
});

router.post("/register", forwardAuthenticated, async (req, res) => {
  try {
    const { fName, lName, email, password, confirmPassword, accountType, parentId } = req.body;
    
    const isAjax = req.xhr || req.headers.accept.indexOf('json') > -1;
    
    if (password !== confirmPassword) {
      if (isAjax) {
        return res.status(400).json({
          success: false,
          error: "Passwords do not match"
        });
      }
      return res.render("users/userRegister", {
        error: "Passwords do not match",
        success: null,
      });
    }

    if (email === password) {
      if (isAjax) {
        return res.status(400).json({
          success: false,
          error: "Your password cannot be the same as your email"
        });
      }
      return res.render("users/userRegister", {
        error: "Your password cannot be the same as your email",
        success: null,
      });
    }
    
    const emailExists = await checkEmailExists(email);
    if (emailExists) {
      if (isAjax) {
        return res.status(400).json({
          success: false,
          error: "This email is already registered"
        });
      }
      return res.render("users/userRegister", {
        error: "This email is already registered",
        success: null,
      });
    }
    
    const result = await registerUser(fName, lName, email, password, accountType, parentId);
    
    if (!result.success) {
      if (isAjax) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }
      return res.render("users/userRegister", {
        error: result.error,
        success: null,
      });
    }
    
    if (result.success) {
      await authenticateUser(email, password, req);
      
      if (isAjax) {
        return res.json({
          success: true,
          redirect: "/"
        });
      }
    }

    res.redirect("/dashboard");
  } catch (error) {
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
    res.render("users/userRegister", {
      error: error.message,
      success: null,
    });
  }
});

router.get("/profile/:id", ensureAuthenticated, async (req, res) => {
  try {
    const result = await retrieveProfile(req.params.id, req.session.user.id);

    if (!result.success) {
      throw new Error(result.error);
    }


    res.render("users/userProfile", {
      user: req.session.user,
      profileUser: result.profileUser,
      currentPage: 'profile'
    });
  } catch (error) {
    res.status(404).send(error.message);
  }
});

router.get("/update-profile", ensureAuthenticated, async (req, res) => {
  try {
    const result = await retrieveProfile(req.session.user.id, req.session.user.id);
    
    if (!result.success) {
      throw new Error(result.error);
    }
    
    res.render("users/userEdit", {
      user: req.session.user,
      profileUser: result.profileUser,
      error: null,
      success: null,
      currentPage: 'profile'
    });
  } catch (error) {
    res.status(500).send(`Error loading profile: ${error.message}`);
  }
});

router.post("/update-profile", ensureAuthenticated, async (req, res) => {
  try {
    const { fName, lName, email } = req.body;

    if (fName === req.session.user.firstName && 
      lName === req.session.user.lastName && 
      email === req.session.user.email) {
    return res.redirect(`/profile/${req.session.user.id}`);
  }


    if (email !== req.session.user.email) {
      const emailExists = await checkEmailExists(email);
      if (emailExists) {
        throw new Error("This email is already registered");
      }
    }
    
    const result = await updateUserProfile(req.session.user.id, {
      firstName: fName,
      lastName: lName,
      email
    });
    
    if (!result.success) {
      throw new Error(result.error);
    }
    
    if (req.session.user) {
      req.session.user.firstName = fName;
      req.session.user.lastName = lName;
      req.session.user.email = email;
    }
    
    const profileResult = await retrieveProfile(req.session.user.id);
    
    res.render("users/userProfile", {
      user: req.session.user,
      profileUser: profileResult.profileUser,
      error: null,
      success: "Profile updated successfully!",
      currentPage: 'profile',
    });
  } catch (error) {
    const profileResult = await retrieveProfile(req.session.user.id, req.session.user.id);
    
    res.render("users/userEdit", {
      user: req.session.user,
      profileUser: profileResult.profileUser,
      error: error.message,
      success: null,
      currentPage: 'profile',
    });
  }
});


router.get("/logout/:id", ensureAuthenticated, async (req, res) => {
  try {
    const result = await retrieveProfile(req.params.id, req.session.user.id);
    if (!result.success) {
      throw new Error(result.error);
    }
    res.render("users/userLogout", {
      user: req.session.user,
      profileUser: result.profileUser,
      currentPage: 'profile'
    });
  } catch (error) {
    res.status(404).send(error.message);
  }
});

router.post("/logout", ensureAuthenticated, (req, res) => {
  try {
    req.session = null;
    res.redirect("/");
  } catch (error) {
    res.status(500).send("Error logging out");
  }
});

// Profile photos

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

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, 
  fileFilter: fileFilter
});

router.get('/upload-photo', ensureAuthenticated, async (req, res) => {
  try {
    const result = await retrieveProfile(req.session.user.id, req.session.user.id);
    
    if (!result.success) {
      throw new Error(result.error);
    }
    
    res.render('users/userPhoto', {
      user: req.session.user,
      profileUser: result.profileUser,
      error: null,
      success: null
    });
  } catch (error) {
    res.status(500).send(`Error loading profile: ${error.message}`);
  }
});

router.post('/upload-photo', ensureAuthenticated, upload.single('profilePhoto'), async (req, res) => {
  try {
    if (!req.file) {
      throw new Error('Please select an image to upload');
    }
    
    const filePath = req.file.path;
    
    const cloudinaryResult = await uploadProfileImage(filePath, req.session.user.id);
    
    fs.unlinkSync(filePath);
    
    if (!cloudinaryResult.success) {
      throw new Error('Failed to upload image: ' + cloudinaryResult.error);
    }
    
    const updateResult = await updateUserPhotoUrl(req.session.user.id, {
      url: cloudinaryResult.url,
      publicId: cloudinaryResult.publicId
    });
    
    if (!updateResult.success) {
      throw new Error(updateResult.error);
    }

    if (updateResult.success) {
      if (req.session.user) {
        req.session.user.profilePhoto = {
          url: cloudinaryResult.url,
          publicId: cloudinaryResult.publicId,
          updatedAt: new Date()
        };
      }
    
    if (req.session.user) {
      req.session.user.profilePhotoUrl = cloudinaryResult.url;
    }
    
    const isAjax = req.xhr || req.headers['content-type']?.includes('multipart/form-data');
    
    if (isAjax) {
      return res.json({
        success: true,
        url: cloudinaryResult.url,
        message: 'Profile photo updated successfully'
      });
    }
    
    req.session.flash = {
      message: 'Profile photo updated successfully',
      type: 'success'
    };

    req.session.save(err => {
      if (err) console.error("Error saving session:", err);
    });
  }
    
    res.redirect(`/profile/${req.session.user.id}`);
  } catch (error) {
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    const isAjax = req.xhr || req.headers.accept.indexOf('json') > -1;
    
    if (req.xhr || req.headers['content-type']?.includes('multipart/form-data')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
    const result = await retrieveProfile(req.session.user.id, req.session.user.id);
    
    res.render('users/userPhoto', {
      user: req.session.user,
      profileUser: result.profileUser,
      error: error.message,
      success: null
    });
  }
});

router.post('/remove-photo', ensureAuthenticated, async (req, res) => {
  try {
    const profileResult = await retrieveProfile(req.session.user.id, req.session.user.id);
    
    if (!profileResult.success) {
      throw new Error(profileResult.error);
    }
    
    const profilePhoto = profileResult.profileUser.profilePhotoUrl;
    
    if (profilePhoto && profilePhoto.publicId) {
      await deleteProfileImage(profilePhoto.publicId);
    }
    
    const updateResult = await removeUserPhotoUrl(req.session.user.id);
    
    if (!updateResult.success) {
      throw new Error(updateResult.error);
    }
    
    if (req.session.user) {
      req.session.user.profilePhotoUrl = null;
    }
    
    const isAjax = req.xhr || req.headers.accept.indexOf('json') > -1;
    
    if (isAjax) {
      return res.json({
        success: true,
        message: 'Profile photo removed successfully'
      });
    }
    
    req.session.flash = {
      message: 'Profile photo removed successfully',
      type: 'success'
    };
    
    res.redirect(`/profile/${req.session.user.id}`);
  } catch (error) {
    const isAjax = req.xhr || req.headers.accept.indexOf('json') > -1;
    
    if (isAjax) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
    
    const result = await retrieveProfile(req.session.user.id, req.session.user.id);
    
    res.render('users/userPhoto', {
      user: req.session.user,
      profileUser: result.profileUser,
      error: error.message,
      success: null
    });
  }
});

module.exports = router;