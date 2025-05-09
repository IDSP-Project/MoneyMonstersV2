// Helper functions for login, registration and user profile management

const bcrypt = require("bcrypt");
const User = require("../db/userModel.js");
const { ObjectId } = require('mongodb'); 

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
    familyId: user.familyId 
    };
  
  return { success: true };
}

async function registerUser(firstName, lastName, email, password, accountType, familyId = null) {
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

    let familyObjectId = null;
    if (familyId) {
      familyObjectId = typeof familyId === 'string' ? new ObjectId(familyId) : familyId;
    }
    
    const newUser = new User(
      firstName || "",
      lastName || "",
      email,
      password,
      accountType || "parent",
      null, //profilephoto not set at registration
      familyObjectId || null,
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
        familyId 
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
        familyId : profileUser.familyId  || null
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
        familyId : updatedUser.familyId  || null
      }
    };
  } catch (error) {
    return { success: false, error: error.message || "Error updating user profile" };
  }
}

async function assignUserToFamily(userId, familyId) {
  try {
    const user = await User.findById(userId);
    if (!user) {
      return { success: false, error: "User not found" };
    }
    const result = await User.assignToFamily(userId, familyId);

    if (result.modifiedCount === 0) {
      return { success: false, error: "No changes were made"}
    }
    return { success: true };

  } catch (error) {
    return {success: false, error: "Error assigning user to family"};
  }
  }

  async function getFamilyParents(familyId) {
    try {
      if (!familyId) {
        return { success: false, error: "Family ID is required" };
      }
      
      const parents = await User.findFamilyParents(familyId);
      
      return { 
        success: true, 
        parents: parents.map(parent => ({
          id: parent._id,
          firstName: parent.firstName,
          lastName: parent.lastName,
          email: parent.email,
          profilePhotoUrl: parent.profilePhoto ? parent.profilePhoto.url : null
        }))
      };
    } catch (error) {
      return { success: false, error: error.message || "Error retrieving family parents" };
    }
  }
  
  async function getFamilyChildren(familyId) {
    try {
      if (!familyId) {
        return { success: false, error: "Family ID is required" };
      }
      
      const children = await User.findFamilyChildren(familyId);
      
      return { 
        success: true, 
        children: children.map(child => ({
          id: child._id,
          firstName: child.firstName,
          lastName: child.lastName,
          email: child.email,
          profilePhotoUrl: child.profilePhoto ? child.profilePhoto.url : null
        }))
      };
    } catch (error) {
      return { success: false, error: error.message || "Error retrieving family children" };
    }
  }
  
    
  async function removeUserFromFamily(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return { success: false, error: "User not found" };
      }
      const result = await User.removeFromFamily(userId);

      if (result.modifiedCount === 0) {
        return { success: false, error: "No changes were made" };
      }     return { success: true };

    } catch (error) {
      return {success: false, error: "Error removing user from family" 

      };
    }
    }

    async function getFamilyMembers(familyId) {
      try {
        if (!familyId){
          return { success: false, error: "Family ID is required" };
        }
        const members = await User.findFamilyMembers(familyId);
    
        return {
          success: true,
          members: members
        };
      } catch (error) {
        return { success: false, error: "Error retrieving family members" };
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


// Parent helpers
const checkViewingAsChild = async (req, res, next) => {
  if (!req.session.user) {
    return next();
  }
  
  if (req.session.user.accountType !== 'parent') {
    return next();
  }
  
  if (req.session.viewingAsChild) {
    try {
      const childId = req.session.viewingAsChild;
      
      const childUser = await User.findById(childId);
      
      if (!childUser) {
        delete req.session.viewingAsChild;
      } else {
        req.viewingChild = childUser;
        
        res.locals.viewingAsChild = true;
        res.locals.viewingChildName = childUser.firstName;
      }
    } catch (error) {
      console.error('Error in checkViewingAsChild middleware:', error);
      delete req.session.viewingAsChild;
    }
  }
  
  next();
};



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
  checkEmailExists,
  assignUserToFamily,
  removeUserFromFamily,
  getFamilyMembers,
  getFamilyParents,
  getFamilyChildren, checkViewingAsChild
};