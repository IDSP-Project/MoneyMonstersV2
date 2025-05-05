// Helper functions for login, registration and user profile management

const bcrypt = require("bcrypt");
const User = require("../db/userModel.js");

function isAuthenticated(req) {
  return req.session && req.session.user;
}

function ensureAuthenticated(req, res, next) {
  if (!isAuthenticated(req)) {
    req.session.flash = {
      message: 'Please login to view this page',
      type: 'error'
    };
    
    return res.redirect("/login");
  }
  next();
}

function forwardAuthenticated(req, res, next) {
  if (!isAuthenticated(req)) {
    return next();
  }
  res.redirect("/dashboard");
}

function requireVerification(req, res, next) {
  if (!isAuthenticated(req)) {
    return res.status(403).send("Access denied. You must verify your account.");
  }
  next();
}

async function authenticateUser(email, password, req) {
  if (!email || !password) {
    return {
      success: false,
      error: "Email and password are required",
    };
  }

  email = email.toLowerCase();
  
  const user = await User.findByEmail(email);
  if (!user) {
    return { success: false, error: "Invalid email or password" };
  }
  
  const isMatch = await User.comparePassword(password, user.password);
  if (!isMatch) {
    return { success: false, error: "Invalid email or password" };
  }
  
  await User.updateLastLogin(user._id);
  
  req.session.user = {
    id: user._id,
    email: user.email,
    verified: true,
    firstName: user.firstName || "",
    lastName: user.lastName || "",
    profilePhotoUrl: user.profilePhoto || null,
    accountType: user.accountType,
    parentId: user.parentId 
  };
  
  return { success: true };
}

async function registerUser(firstName, lastName, email, password, accountType, parentId = null) {
  if (!email || !password) {
    return {
      success: false,
      error: "Email and password are required",
    };
  }

  email = email.toLowerCase();
  
  try {
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return { success: false, error: "Email address already registered" };
    }
    
    const newUser = new User(
      firstName || "",
      lastName || "",
      email,
      password,
      accountType || "parent",
      null, //profilephoto not set at registration
      parentId || null,
    );
    
    const result = await newUser.save();
    
    return { 
      success: true, 
      user: {
        id: result.insertedId,
        firstName,
        lastName,
        email,
        accountType: accountType || "parent",
        parentId
      } 
    };
  } catch (error) {
    return { success: false, error: error.message || "Error creating user" };
  }
}

async function checkEmailExists(email) {
  if (!email) {
    return false;
  }
  
  email = email.toLowerCase();
  
  try {
    const existingUser = await User.findByEmail(email);
    return !!existingUser; 
  } catch (error) {
    console.error("Error checking email existence:", error);
    throw new Error("Unable to verify email availability");
  }
}

async function retrieveProfile(profileId, currentUserId) {
  try {
    const profileUser = await User.findById(profileId);

    if (!profileUser) {
      return { success: false, error: "User not found" };
    }
    
    return {
      success: true,
      profileUser: {
        id: profileUser._id,
        firstName: profileUser.firstName,
        lastName: profileUser.lastName,
        email: profileUser.email,
        profilePhoto: profileUser.profilePhoto, 
        profilePhotoUrl: profileUser.profilePhoto ? profileUser.profilePhoto.url : null,
        accountType: profileUser.accountType,
        parentId: profileUser.parentId || null
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || "Error retrieving profile",
    };
  }
}

async function updateUserProfile(userId, updateData) {
  try {
    const user = await User.findById(userId);
    if (!user) {
      return { success: false, error: "User not found" };
    }

    const updateFields = {
      firstName: updateData.firstName || user.firstName,
      lastName: updateData.lastName || user.lastName,
    };

    if (updateData.email) {
      updateFields.email = updateData.email.toLowerCase();
    }
    
    const result = await User.updateUser(userId, updateFields);

    if (result.modifiedCount === 0) {
      return { success: false, error: "No changes were made" };
    }
    
    const updatedUser = await User.findById(userId);
    
    return { 
      success: true, 
      user: {
        id: updatedUser._id,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        profilePhotoUrl: updatedUser.profilePhoto ? updatedUser.profilePhoto.url : null,
        accountType: updatedUser.accountType,
        parentId: updatedUser.parentId || null
      }
    };
  } catch (error) {
    return { success: false, error: error.message || "Error updating user profile" };
  }
}

async function updateUserPhotoUrl(userId, photoUrl) {
  try {
    const user = await User.findById(userId);
    if (!user) {
      return { success: false, error: "User not found" };
    }
    
    const result = await User.updateProfilePhoto(userId, photoUrl);
    
    if (result.modifiedCount === 0) {
      return { success: false, error: "No changes were made" };
    }
    
    const updatedUser = await User.findById(userId);
    
    return { 
      success: true, 
      user: {
        id: updatedUser._id,
        profilePhotoUrl: updatedUser.profilePhoto ? updatedUser.profilePhoto.url : null,
        profilePhotoData: updatedUser.profilePhoto || null
      }
    };
  } catch (error) {
    return { success: false, error: error.message || "Error updating profile photo URL" };
  }
}

async function removeUserPhotoUrl(userId) {
  try {
    const user = await User.findById(userId);
    if (!user) {
      return { success: false, error: "User not found" };
    }
    
    const result = await User.updateProfilePhoto(userId, null);
    
    if (result.modifiedCount === 0) {
      return { success: false, error: "No changes were made" };
    }
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message || "Error removing profile photo URL" };
  }
}

async function changeUserPassword(userId, currentPassword, newPassword) {
  try {
    const user = await User.findById(userId);
    if (!user) {
      return { success: false, error: "User not found" };
    }
    
    const isMatch = await User.comparePassword(currentPassword, user.password);
    if (!isMatch) {
      return { success: false, error: "Current password is incorrect" };
    }
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    const result = await User.updateUser(userId, {
      password: hashedPassword
    });
    
    if (result.modifiedCount === 0) {
      return { success: false, error: "No changes were made" };
    }
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message || "Error changing password" };
  }
}

module.exports = {
  isAuthenticated,
  forwardAuthenticated,
  requireVerification,
  ensureAuthenticated,
  authenticateUser,
  registerUser,
  retrieveProfile,
  updateUserProfile,
  updateUserPhotoUrl,
  removeUserPhotoUrl,
  changeUserPassword,
  checkEmailExists 
};