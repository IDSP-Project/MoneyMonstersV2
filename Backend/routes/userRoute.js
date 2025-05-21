const express = require("express");
const { ObjectId } = require('mongodb');
const authHelpers = require("../helpers/authHelpers");
const photoHelpers = require('../helpers/photoHelpers');
const router = express.Router();
const User = require("../db/userModel.js");
const Family = require('../db/familyModel.js');

const { ensureAuthenticated } = authHelpers;

router.get("/profile/:id", ensureAuthenticated, async (req, res) => {
  try {
    let idToRetrieve;
    
    try {
      idToRetrieve = new ObjectId(req.params.id);
    } catch (err) {
      const unhashedId = authHelpers.unhashUserId(req.params.id);
      
      if (!unhashedId) {
        throw new Error("Invalid profile ID");
      }
      
      try {
        idToRetrieve = new ObjectId(unhashedId);
      } catch (innerErr) {
        throw new Error("Invalid profile ID format");
      }
    }
    
    const result = await authHelpers.retrieveProfile(idToRetrieve, req.session.user.id);

    if (!result.success) {
      throw new Error(result.error);
    }

    let viewingAsChild = false;
    let viewingChildName = null;
    let child = null;
    
    if (req.viewingChild) {
      viewingAsChild = true;
      viewingChildName = req.viewingChild.firstName;
      child = req.viewingChild;
    }
    
    let success = null;
    if (req.session.flash && req.session.flash.message) {
      success = req.session.flash.message;
      delete req.session.flash;
    }

    res.render("users/userProfile", {
      user: req.session.user,
      profileUser: result.profileUser,
      currentPage: 'profile',
      viewingAsChild: viewingAsChild,
      viewingChildName: viewingChildName,
      child: child,
      error: null,
      success: success
    });
  } catch (error) {
    if (authHelpers.isAjaxRequest(req)) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
    
    return authHelpers.renderWithError(res, "users/userProfile", error.message, {
      user: req.session.user,
      currentPage: 'profile'
    });
  }
});

router.get("/update-profile", ensureAuthenticated, async (req, res) => {
  try {
    const result = await authHelpers.retrieveProfile(req.session.user.id, req.session.user.id);
    
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
    if (authHelpers.isAjaxRequest(req)) {
      return res.status(400).json({
        success: false, 
        error: error.message
      });
    }
    return authHelpers.renderWithError(res, "users/userEdit", error.message, {
      user: req.session.user,
      currentPage: 'profile'
    });
  }
});

router.post("/update-profile", ensureAuthenticated, async (req, res) => {
  try {
    const { fName, lName, email } = req.body;

    const noChange = (
      fName === req.session.user.firstName && 
      lName === req.session.user.lastName && 
      email === req.session.user.email
    );
    
    if (noChange) {
      return res.redirect(authHelpers.profileUrl(req.session.user.id));
    }

    if (email !== req.session.user.email) {
      const emailExists = await authHelpers.checkEmailExists(email);
      if (emailExists) {
        throw new Error("This email is already registered");
      }
    }
    
    const result = await authHelpers.updateUserProfile(req.session.user.id, {
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
    
    const profileResult = await authHelpers.retrieveProfile(req.session.user.id, req.session.user.id);
    
    if (authHelpers.isAjaxRequest(req)) {
      return res.json({
        success: true,
        message: "Profile updated successfully!"
      });
    }
    
    return authHelpers.renderWithSuccess(res, "users/userProfile", "Profile updated successfully!", {
      user: req.session.user,
      profileUser: profileResult.profileUser,
      currentPage: 'profile'
    });
  } catch (error) {
    if (authHelpers.isAjaxRequest(req)) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
    
    const profileResult = await authHelpers.retrieveProfile(req.session.user.id, req.session.user.id);
    
    return authHelpers.renderWithError(res, "users/userEdit", error.message, {
      user: req.session.user,
      profileUser: profileResult.profileUser,
      currentPage: 'profile'
    });
  }
});

router.get('/upload-photo', ensureAuthenticated, async (req, res) => {
  try {
    const result = await authHelpers.retrieveProfile(req.session.user.id, req.session.user.id);
    
    if (!result.success) {
      throw new Error(result.error);
    }
    
    res.render('users/userPhoto', {
      user: req.session.user,
      profileUser: result.profileUser,
      error: null,
      success: null,
      currentPage: 'profile'
    });
  } catch (error) {
    if (authHelpers.isAjaxRequest(req)) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
    return authHelpers.renderWithError(res, "users/userPhoto", error.message, {
      user: req.session.user,
      currentPage: 'profile'
    });
  }
});

router.post('/upload-photo', ensureAuthenticated, photoHelpers.profilePhotoUpload.single('profilePhoto'), async (req, res) => {
  try {
    if (!req.file) {
      throw new Error('Please select an image to upload');
    }
    
    const filePath = req.file.path;
    
    const cloudinaryResult = await photoHelpers.uploadProfileImage(filePath, req.session.user.id);
    
    photoHelpers.cleanupTempFile(filePath);
    
    if (!cloudinaryResult.success) {
      throw new Error('Failed to upload image: ' + cloudinaryResult.error);
    }
    
    const updateResult = await authHelpers.updateUserPhotoUrl(req.session.user.id, {
      url: cloudinaryResult.url,
      publicId: cloudinaryResult.publicId
    });
    
    if (!updateResult.success) {
      throw new Error(updateResult.error);
    }

    if (req.session.user) {
      req.session.user.profilePhoto = {
        url: cloudinaryResult.url,
        publicId: cloudinaryResult.publicId,
        updatedAt: new Date()
      };
      req.session.user.profilePhotoUrl = cloudinaryResult.url;
    }
    
    if (authHelpers.isAjaxRequest(req)) {
      return res.json({
        success: true,
        url: cloudinaryResult.url,
        message: 'Profile photo updated successfully'
      });
    }
    
    authHelpers.setFlashMessage(req, 'Profile photo updated successfully');
    
    res.redirect(authHelpers.profileUrl(req.session.user.id));
  } catch (error) {
    if (req.file && req.file.path) {
      photoHelpers.cleanupTempFile(req.file.path);
    }
    
    if (authHelpers.isAjaxRequest(req)) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
    
    const result = await authHelpers.retrieveProfile(req.session.user.id, req.session.user.id);
    
    return authHelpers.renderWithError(res, 'users/userPhoto', error.message, {
      user: req.session.user,
      profileUser: result.profileUser,
      currentPage: 'profile'
    });
  }
});

module.exports = router;