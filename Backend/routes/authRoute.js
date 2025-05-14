const express = require("express");
const multer = require('multer');
const crypto = require('crypto');
const {
  ensureAuthenticated,
  forwardAuthenticated,
  registerUser,
  authenticateUser,
  checkEmailExists,
  retrieveProfile,
  updateUserProfile,
  updateUserPhotoUrl, 
  removeUserPhotoUrl,
  assignUserToFamily,
  removeUserFromFamily,
  getFamilyMembers, 
  validatePassword
} = require("../helpers/authHelpers");
const { uploadProfileImage, deleteProfileImage } = require('../helpers/photoHelpers');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const User = require("../db/userModel.js");
const Family = require('../db/familyModel.js');
const { Resend } = require('resend');
const seedLearningModules = require('../db/seeds/learningSeed.js');

const resend = new Resend(process.env.RESEND_API_KEY);
resend.apiKeys.create({ name: 'Production' });


// Login routes
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
      const redirectUrl = req.session.user.accountType === 'parent' ? "/select-child" : "/dashboard";
      return res.json({
        success: true,
        redirect: redirectUrl
      });
    }
    
    if (req.session.user.accountType === 'parent') {
      let familyMembers = [];
      
      if (req.session.user.familyId) {
        const membersResult = await getFamilyMembers(req.session.user.familyId);
        
        if (membersResult.success) {
          familyMembers = membersResult.members.filter(member => 
            member.accountType === "child"
          );
        }
      }
      
      return res.render("dashboard/selectChild", {
        user: req.session.user,
        familyMembers: familyMembers,
        currentPage: 'family',
        error: null,
        success: null
      });
    } else {
      return res.redirect("/dashboard");
    }
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
router.get('/reset-confirmation', forwardAuthenticated, (req, res) => {
  res.render('users/forgotPassword', {
    title: 'Forgot Password',
    success: null, 
    error: null
  });
});

router.post('/password-reset', async (req, res) => {
  try {
    const { email } = req.body;
        const successMessage = 'If an account exists with that email, we have sent password reset instructions.';
    
    const user = await User.findByEmail(email);
    
    if (!user) {
      return res.render('users/forgotPassword', {
        title: 'Reset Confirmation',
        success: successMessage,
        error: null
      });
    }    
    const token = crypto.randomBytes(32).toString('hex');
    const expiryTime = new Date(Date.now() + 3600000); // 1 hour from now
    await User.setPasswordResetToken(user._id, token, expiryTime);
    
    const resetUrl = `${req.protocol}://${req.get('host')}/reset-password/${token}`;
      
    const { data, error } = await resend.emails.send({
      from: process.env.FROM_EMAIL,
      to: user.email,
      subject: 'Reset Your Money Monsters Password',
      html: `
        <h1>Reset Your Password</h1>
        <p>You requested a password reset for your Money Monsters account.</p>
        <p>Click the link below to set a new password:</p>
        <a href="${resetUrl}" style="display: inline-block; background: #4CAF50; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px;">Reset Password</a>
        <p>This link is valid for 1 hour.</p>
        <p>If you didn't request this reset, please ignore this email.</p>
      `
    });
    
    if (error) {
      console.error("Resend error:", error);
      throw new Error("Failed to send email: " + error.message);
    }
    
    res.render('users/forgotPassword', {
      title: 'Reset Confirmation',
      success: successMessage,
      error: null
    });
  } catch (error) {
    console.error('Password reset error:', error);
    res.render('users/forgotPassword', {
      title: 'Forgot Password',
      success: null,
      error: 'There was a problem processing your request. Please try again.'
    });
  }
});

router.get('/reset-password/:token', async (req, res) => {
  try {
    const user = await User.findByResetToken(req.params.token);
    
    if (!user) {
      return res.render('users/resetPassword', { 
        valid: false, 
        message: 'Password reset token is invalid or has expired.',
        token: null,
        error: null
      });
    }
    
    res.render('users/resetPassword', { 
      valid: true, 
      message: null,
      token: req.params.token,
      error: null
    });
  } catch (error) {
    console.error(error);
    res.render('users/resetPassword', { 
      valid: false, 
      message: 'An error occurred. Please try again.',
      token: null,
      error: error.message 
    });
  }
});

router.post('/reset-password/:token', async (req, res) => {
  try {
    const { password, confirmPassword } = req.body;
    
    const user = await User.findByResetToken(req.params.token);
    
    if (!user) {
      return res.render('users/resetPassword', { 
        valid: false, 
        message: 'Password reset token is invalid or has expired.',
        token: req.params.token,
        error: null
      });
    }
    
    if (password !== confirmPassword) {
      return res.render('users/resetPassword', { 
        valid: true, 
        message: null,
        token: req.params.token,
        error: 'Passwords do not match'
      });
    }
    
    // Check password validity
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.render('users/resetPassword', {
        valid: true,
        message: null,
        token: req.params.token,
        error: passwordValidation.message
      });
    }
    
    await User.resetPassword(user._id, password);
    
    // Redirect to login with success message
    req.session.flash = {
      message: 'Your password has been reset successfully. Please log in.',
      type: 'success'
    };
    
    res.redirect('/login');
  } catch (error) {
    console.error(error);
    res.render('users/resetPassword', { 
      valid: true, 
      message: null,
      token: req.params.token,
      error: 'An error occurred. Please try again.'
    });
  }
});

router.post("/check-email", async (req, res) => {
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
      exists: exists, 
      message: exists ? "This email is already registered" : null 
    });
  } catch (error) {
    console.error("Error checking email:", error);
    return res.status(500).json({ 
      exists: false, 
      message: "Error checking email availability" 
    });
  }
});

// Registration routes
router.get("/register", forwardAuthenticated, (req, res) => {
  res.render("users/userRegister", { error: null, success: null });
});

router.get("/register/family/:familyId", forwardAuthenticated, async (req, res) => {
  try {
    const family = await Family.findById(req.params.familyId);
    
    if (family) {
      const familyData = {
        id: family._id,
        name: family.name
      };
      
      res.render("users/familyRegister", { 
        error: null, 
        success: null,
        familyData: familyData,
        accountType: req.query.type
      });
    } else {
      return res.redirect('/register');
    }
  } catch (error) {
    return res.redirect('/register');
  }
});

router.post("/register", forwardAuthenticated, async (req, res) => {
  try {
    const { fName, lName, email, password, confirmPassword, accountType, familyId } = req.body;
    
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

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      if (isAjax) {
        return res.status(400).json({
          success: false,
          error: passwordValidation.message
        });
      }
      return res.render("users/userRegister", {
        error: passwordValidation.message,
        success: null,
      });
    }
    
    const result = await registerUser(fName, lName, email, password, accountType, familyId);
    
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

        if (accountType === 'child') {
        await seedLearningModules(result.userId);
      }
      
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

router.post("/register/family", forwardAuthenticated, async (req, res) => {
  try {
    const { fName, lName, email, password, confirmPassword, accountType, familyId } = req.body;
    
    const isAjax = req.xhr || req.headers.accept.indexOf('json') > -1;
    
    const family = await Family.findById(familyId);
    if (!family) {
      return res.redirect('/register');
    }
    
    const familyData = {
      id: family._id,
      name: family.name
    };
    
    if (password !== confirmPassword) {
      if (isAjax) {
        return res.status(400).json({
          success: false,
          error: "Passwords do not match"
        });
      }
      return res.render("users/familyRegister", {
        error: "Passwords do not match",
        success: null,
        familyData: familyData,
        accountType: accountType
      });
    }

    if (email === password) {
      if (isAjax) {
        return res.status(400).json({
          success: false,
          error: "Your password cannot be the same as your email"
        });
      }
      return res.render("users/familyRegister", {
        error: "Your password cannot be the same as your email",
        success: null,
        familyData: familyData,
        accountType: accountType
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
      return res.render("users/familyRegister", {
        error: "This email is already registered",
        success: null,
        familyData: familyData,
        accountType: accountType
      });
    }
    
    const result = await registerUser(fName, lName, email, password, accountType, familyId);
    
    if (!result.success) {
      if (isAjax) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }
      return res.render("users/familyRegister", {
        error: result.error,
        success: null,
        familyData: familyData,
        accountType: accountType
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
    
    let familyData = null;
    try {
      const family = await Family.findById(req.body.familyId);
      if (family) {
        familyData = {
          id: family._id,
          name: family.name
        };
      }
    } catch (err) {
      return res.redirect('/register');
    }
    
    if (!familyData) {
      return res.redirect('/register');
    }
    
    res.render("users/familyRegister", {
      error: error.message,
      success: null,
      familyData: familyData,
      accountType: req.body.accountType
    });
  }
});


router.get("/profile/:id", ensureAuthenticated, async (req, res) => {
  try {
let idToRetrieve;
    
    if (req.params.id === 'me') {
      if (req.viewingChild) {
        idToRetrieve = req.viewingChild._id || req.viewingChild.id;
      } else {
        idToRetrieve = req.session.user.id;
      }
    } else {
      idToRetrieve = req.params.id;
    }
    
    const result = await retrieveProfile(idToRetrieve, req.session.user.id);

    if (!result.success) {
      throw new Error(result.error);
    }

    res.render("users/userProfile", {
      user: req.session.user,
      profileUser: result.profileUser,
      currentPage: 'profile',
       viewingAsChild: req.viewingChild ? true : false,
      viewingChildName: req.viewingChild ? req.viewingChild.firstName : null,
      child: req.viewingChild
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

// Logout routes
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

// Profile photo handling
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

// Family management routes
router.get("/family", ensureAuthenticated, async (req, res) => {
  try {
    let family = null;
    let familyMembers = [];
    
    if (req.session.user.familyId) {
      family = await Family.findById(req.session.user.familyId);
      
      if (family) {
        const membersResult = await getFamilyMembers(req.session.user.familyId);
        
        if (membersResult.success) {
          familyMembers = membersResult.members;
        }
      }
    }
    
    res.render("users/viewFamily", {
      user: req.session.user,
      family: family,
      familyMembers: familyMembers,
      error: null,
      success: null,
      currentPage: 'family'
    });
  } catch (error) {
    res.status(500).send(`Error loading family: ${error.message}`);
  }
});

router.post("/create-family", ensureAuthenticated, async (req, res) => {
  try {
    if (req.session.user.accountType !== "parent") {
      return res.status(403).send("Only parents can create families");
    }
    
    const { familyName } = req.body;
    
    const family = new Family(familyName);
    const result = await family.save();
    
    await assignUserToFamily(req.session.user.id, result.insertedId);
    
    req.session.user.familyId = result.insertedId;
    
    req.session.flash = {
      message: "Family created successfully!",
      type: "success"
    };
    
    res.redirect("/family");
  } catch (error) {
    res.status(500).send(`Error creating family: ${error.message}`);
  }
});

router.post("/update-family", ensureAuthenticated, async (req, res) => {
  try {
    if (req.session.user.accountType !== "parent") {
      return res.status(403).send("Only parents can update family information");
    }
    
    if (!req.session.user.familyId) {
      throw new Error("You need to create a family first");
    }
    
    const { familyName } = req.body;
    
    await Family.updateFamily(req.session.user.familyId, {
      name: familyName,
      updatedAt: new Date()
    });
    
    req.session.flash = {
      message: "Family name updated successfully!",
      type: "success"
    };
    
    res.redirect("/family");
  } catch (error) {
    res.status(500).send(`Error updating family: ${error.message}`);
  }
});

router.post("/add-family-member", ensureAuthenticated, async (req, res) => {
  try {
    if (req.session.user.accountType !== "parent") {
      return res.status(403).send("Only parents can add family members");
    }
    
    if (!req.session.user.familyId) {
      throw new Error("You need to create a family first");
    }
    
    const { email } = req.body;
    
    const User = require("../db/userModel");
    const userToAdd = await User.findByEmail(email);
    
    if (!userToAdd) {
      throw new Error("User not found with that email");
    }
    
    await assignUserToFamily(userToAdd._id, req.session.user.familyId);

    req.session.flash = {
      message: "Family member added successfully!",
      type: "success"
    };
    
    res.redirect("/family");
  } catch (error) {
    let family = null;
    let familyMembers = [];
    
    if (req.session.user.familyId) {
      family = await Family.findById(req.session.user.familyId);
      
      if (family) {
        const membersResult = await getFamilyMembers(req.session.user.familyId);
        
        if (membersResult.success) {
          familyMembers = membersResult.members;
        }
      }
    }
    
    res.render("users/viewFamily", {
      user: req.session.user,
      family: family,
      familyMembers: familyMembers,
      error: error.message,
      success: null,
      currentPage: 'family'
    });
  }
});

router.get("/remove-from-family/:id", ensureAuthenticated, async (req, res) => {
  try {
    if (req.session.user.accountType !== "parent") {
      return res.status(403).send("Only parents can remove family members");
    }
    
    const userId = req.params.id;
    
    const membersResult = await getFamilyMembers(req.session.user.familyId);
    
    if (!membersResult.success) {
      throw new Error("Could not retrieve family members");
    }
    
    const memberToRemove = membersResult.members.find(member => {
      const memberId = member.id ? member.id.toString() : '';
      const member_Id = member._id ? member._id.toString() : '';
      const paramId = userId.toString();
      
      return memberId === paramId || member_Id === paramId;
    });
    
    if (!memberToRemove) {
      throw new Error(`User with ID ${userId} not found in this family`);
    }
    
    const family = await Family.findById(req.session.user.familyId);
    
    if (!family) {
      throw new Error("Family not found");
    }
    
    res.render("users/removeFamily", {
      user: req.session.user,
      memberToRemove: memberToRemove,
      family: family,
      error: null,
      currentPage: 'family'
    });
  } catch (error) {
    console.error("Error in remove-from-family route:", error);
    req.session.flash = {
      message: error.message,
      type: "error"
    };
    res.redirect("/family");
  }
});

router.post("/remove-from-family", ensureAuthenticated, async (req, res) => {
  try {
    if (req.session.user.accountType !== "parent") {
      return res.status(403).send("Only parents can remove family members");
    }
    
    const { userId } = req.body;
    
    await removeUserFromFamily(userId);
    
    req.session.flash = {
      message: "Family member removed successfully!",
      type: "success"
    };
    
    res.redirect("/family");
  } catch (error) {
    req.session.flash = {
      message: error.message,
      type: "error"
    };
    res.redirect("/family");
  }
});

router.get("/generate-invite-link", ensureAuthenticated, async (req, res) => {
  try {
    if (req.session.user.accountType !== "parent") {
      return res.status(403).send("Only parents can generate invite links");
    }
    
    if (!req.session.user.familyId) {
      const familyName = `${req.session.user.lastName} Family`;
      const family = new Family(familyName);
      const result = await family.save();
      
      await assignUserToFamily(req.session.user.id, result.insertedId);
      
      req.session.user.familyId = result.insertedId;
    }
    
    const inviteLink = `${req.protocol}://${req.get('host')}/register/family/${req.session.user.familyId}?type=child`;
    
    res.render("users/inviteFamily", {
      user: req.session.user,
      inviteLink: inviteLink,
      currentPage: 'family'
    });
  } catch (error) {
    res.status(500).send(`Error generating invite link: ${error.message}`);
  }
});

router.post("/register/family/:familyId", forwardAuthenticated, async (req, res) => {
  try {
    const { fName, lName, email, password, confirmPassword, accountType } = req.body;
    const familyId = req.params.familyId;
    
    const isAjax = req.xhr || req.headers.accept.indexOf('json') > -1;

    const family = await Family.findById(familyId);
    if (!family) {
      if (isAjax) {
        return res.status(400).json({
          success: false,
          error: "Family not found"
        });
      }
      return res.redirect('/register');
    }

    const familyData = {
      id: family._id,
      name: family.name
    };
    
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
        familyData: familyData,
        accountType: accountType
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
        familyData: familyData,
        accountType: accountType
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
        familyData: familyData,
        accountType: accountType
      });
    }
    
    const result = await registerUser(fName, lName, email, password, accountType, familyId);
    
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
        familyData: familyData,
        accountType: accountType
      });
    }
    
    if (result.success) {
      await authenticateUser(email, password, req);

       if (accountType === 'child') {
        await seedLearningModules(result.userId);
      }
      
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
    let familyData = null;
    try {
      const family = await Family.findById(req.params.familyId);
      if (family) {
        familyData = {
          id: family._id,
          name: family.name
        };
      }
    } catch (err) {
      return res.redirect('/register');
    }
    
    if (!familyData) {
      return res.redirect('/register');
    }
    
    res.render("users/familyRegister", {
      error: error.message,
      success: null,
      familyData: familyData,
      accountType: req.body.accountType
    });
  }
});

// Parent routes
router.get("/select-child", ensureAuthenticated, async (req, res) => {
  try {
    if (req.session.user.accountType !== "parent") {
      return res.redirect("/dashboard");
    }
    
    let familyMembers = [];
    
    if (req.session.user.familyId) {
      const membersResult = await getFamilyMembers(req.session.user.familyId);
      
      if (membersResult.success) {
        familyMembers = membersResult.members.filter(member => 
          member.accountType === "child"
        );
      }
    }
    
    res.render("dashboard/selectChild", {
      user: req.session.user,
      familyMembers: familyMembers,
      currentPage: 'family',
      error: null,
      success: null
    });
  } catch (error) {
    req.session.flash = {
      message: error.message,
      type: "error"
    };
    res.redirect("/dashboard");
  }
});

router.post("/view-as-child", ensureAuthenticated, async (req, res) => {
  try {
    if (req.session.user.accountType !== "parent") {
      return res.status(403).send("Only parents can use this feature");
    }
    
    const { childId } = req.body;
    
    if (childId === "none") {
      if (req.session.viewingAsChild) {
        delete req.session.viewingAsChild;
      }
      
      req.session.flash = {
        message: "Now viewing as yourself",
        type: "success"
      };
      
      return res.redirect("/dashboard");
    }
    
    const membersResult = await getFamilyMembers(req.session.user.familyId);
    
    if (!membersResult.success) {
      throw new Error("Could not retrieve family members");
    }
    
    const childExists = membersResult.members.some(member => 
      (member.id === childId || member._id?.toString() === childId) && 
      member.accountType === "child"
    );
    
    if (!childExists) {
      throw new Error("Child not found in your family");
    }
    
    req.session.viewingAsChild = childId;
    
    const childMember = membersResult.members.find(member => 
      (member.id === childId || member._id?.toString() === childId)
    );
    
    req.session.flash = {
      message: `Now viewing as ${childMember.firstName}`,
      type: "success"
    };
    
    res.redirect("/dashboard");
  } catch (error) {
    req.session.flash = {
      message: error.message,
      type: "error"
    };
    res.redirect("/select-child");
  }
});

router.get("/clear-view-as", ensureAuthenticated, (req, res) => {
  if (req.session.viewingAsChild) {
    delete req.session.viewingAsChild;
    
    req.session.flash = {
      message: "Now viewing as yourself",
      type: "success"
    };
  }
  
  res.redirect("/dashboard");
});

module.exports = router;