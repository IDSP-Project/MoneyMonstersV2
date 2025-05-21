const bcrypt = require("bcrypt");
const User = require("../db/userModel.js");
const Family = require('../db/familyModel.js');
const { ObjectId } = require('mongodb'); 
const seedLearningModules = require('../db/seeds/learningSeed.js');


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

function ensureParent(req, res, next) {
  if (req.session.user && req.session.user.accountType === "parent") {
    return next();
  }
  setFlashMessage(req, "Only parents can access this feature", "error");
  return res.redirect("/dashboard");
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
      null,
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
  try {
    const existingUser = await User.findByEmail(email);
    return !!existingUser; 
  } catch (error) {
    console.error("Error in checkEmailExists:", error);
    throw new Error(`Unable to verify email availability: ${error.message}`);
  }
}

function validatePassword(password) {
  if (!password || password.length < 8) {
    return {
      valid: false,
      message: "Password must be at least 8 characters long"
    };
  }
  
  const specialChars = "!@#$%^&*()_+-=[]{}\\|;:'\",.<>/?`~";
  
  let hasNumber = false;
  let hasSpecialChar = false;
  
  for (let i = 0; i < password.length; i++) {
    const char = password[i];
    
    if (char >= '0' && char <= '9') {
      hasNumber = true;
    }
    
    if (specialChars.includes(char)) {
      hasSpecialChar = true;
    }
    
    if (hasNumber && hasSpecialChar) {
      break;
    }
  }
  
  if (!hasNumber) {
    return {
      valid: false,
      message: "Password must include at least one number"
    };
  }
  
  if (!hasSpecialChar) {
    return {
      valid: false,
      message: "Password must include at least one special character"
    };
  }
   return {
    valid: true
  };
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


async function validateRegistrationData(email, password, confirmPassword) {
  if (password !== confirmPassword) {
    return { 
      valid: false, 
      error: "Passwords do not match" 
    };
  }
  
  if (email === password) {
    return { 
      valid: false, 
      error: "Your password cannot be the same as your email" 
    };
  }
  
  const emailExists = await checkEmailExists(email);
  if (emailExists) {
    return { 
      valid: false, 
      error: "This email is already registered" 
    };
  }
  
  const passwordCheck = validatePassword(password);
  if (!passwordCheck.valid) {
    return { 
      valid: false, 
      error: passwordCheck.message 
    };
  }
  
  return { valid: true };
}

async function processRegistration(firstName, lastName, email, password, accountType, familyId = null) {
  const result = await registerUser(firstName, lastName, email, password, accountType, familyId);
  
  if (!result.success) {
    return result;
  }
  
  return {
    success: true,
    userId: result.user.id,
    user: result.user
  };
}

async function loginAfterRegistration(req, email, password, accountType, userId) {
  const authResult = await authenticateUser(email, password, req);
  
  if (accountType === 'child' && userId) {
    await seedLearningModules(userId);
  }
  
  return authResult;
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

async function removeUserFromFamily(userId) {
  try {
    const user = await User.findById(userId);
    if (!user) {
      return { success: false, error: "User not found" };
    }
    const result = await User.removeFromFamily(userId);

    if (result.modifiedCount === 0) {
      return { success: false, error: "No changes were made" };
    }     
    return { success: true };
  } catch (error) {
    return {success: false, error: "Error removing user from family"};
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


async function getFamilyWithMembers(familyId, filterType = null) {
  try {
    if (!familyId) {
      return { success: false, error: "Family ID is required" };
    }
    
    const family = await Family.findById(familyId);
    if (!family) {
      return { success: false, error: "Family not found" };
    }
    
    let members = [];
    let errorMessage = "";
    
    if (filterType === 'parent') {
      members = await User.findFamilyParents(familyId);
      errorMessage = "Error retrieving family parents";
    } else if (filterType === 'child') {
      members = await User.findFamilyChildren(familyId);
      errorMessage = "Error retrieving family children";
    } else {
      const result = await getFamilyMembers(familyId);
      if (!result.success) {
        return result;
      }
      
      if (filterType) {
        members = result.members.filter(member => member.accountType === filterType);
      } else {
        members = result.members;
      }
    }
    
    const transformedMembers = members.map(member => {
      let photoUrl = null;
      if (member.profilePhoto) {
        photoUrl = member.profilePhoto.url;
      }
      
      return {
        id: member._id,
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email,
        profilePhotoUrl: photoUrl
      };
    });
    
    let result = { success: true, family };
    
    if (filterType === 'parent') {
      result.parents = transformedMembers;
    } else if (filterType === 'child') {
      result.children = transformedMembers;
    } else {
      result.members = transformedMembers;
    }
    
    return result;
  } catch (error) {
    let errorMessage = "Error retrieving family with members";
    if (error.message) {
      errorMessage = error.message;
    }
    
    return { success: false, error: errorMessage };
  }
}

async function getFamilyParents(familyId) {
  const result = await getFamilyWithMembers(familyId, 'parent');
  if (!result.success) {
    return result;
  }
  
  return {
    success: true,
    parents: result.parents
  };
}

async function getFamilyChildren(familyId) {
  const result = await getFamilyWithMembers(familyId, 'child');
  if (!result.success) {
    return result;
  }
  
  return {
    success: true,
    children: result.children
  };
}

async function getFamilyMemberById(memberId, familyId) {
  try {
    if (!memberId || !familyId) {
      return { 
        success: false, 
        error: "Member ID and Family ID are required" 
      };
    }
    
    const membersResult = await getFamilyMembers(familyId);
    
    if (!membersResult.success) {
      return { 
        success: false, 
        error: "Could not retrieve family members" 
      };
    }
    
    const member = membersResult.members.find(m => {
      let mId = '';
      if (m.id) {
        mId = m.id.toString();
      }
      
      let m_Id = '';
      if (m._id) {
        m_Id = m._id.toString();
      }
      
      const targetId = memberId.toString();
      
      return mId === targetId || m_Id === targetId;
    });
    
    if (!member) {
      return { 
        success: false, 
        error: `Member with ID ${memberId} not found in this family` 
      };
    }
    
    return { 
      success: true, 
      member: member 
    };
  } catch (error) {
    return { 
      success: false, 
      error: error.message || "Error retrieving family member" 
    };
  }
}

async function createFamily(familyName, userId) {
  try {
    const family = new Family(familyName);
    const result = await family.save();
    
    if (!result.insertedId) {
      return { 
        success: false, 
        error: "Failed to create family" 
      };
    }
    
    const assignResult = await assignUserToFamily(userId, result.insertedId);
    
    if (!assignResult.success) {
      return assignResult;
    }
    
    return { 
      success: true, 
      familyId: result.insertedId,
      familyName: familyName
    };
  } catch (error) {
    return { 
      success: false, 
      error: error.message || "Error creating family" 
    };
  }
}

async function updateFamilyInfo(familyId, updateData) {
  try {
    if (!familyId) {
      return { 
        success: false, 
        error: "Family ID is required" 
      };
    }
    
    const result = await Family.updateFamily(familyId, {
      ...updateData,
      updatedAt: new Date()
    });
    
    if (!result || result.modifiedCount === 0) {
      return { 
        success: false, 
        error: "No changes were made" 
      };
    }
    
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error.message || "Error updating family information" 
    };
  }
}

async function addUserToFamilyByEmail(email, familyId) {
  try {
    if (!email || !familyId) {
      return { 
        success: false, 
        error: "Email and Family ID are required" 
      };
    }
    
    const userToAdd = await User.findByEmail(email);
    
    if (!userToAdd) {
      return { 
        success: false, 
        error: "User not found with that email" 
      };
    }
    
    return await assignUserToFamily(userToAdd._id, familyId);
  } catch (error) {
    return { 
      success: false, 
      error: error.message || "Error adding user to family" 
    };
  }
}


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


function generateFamilyInviteLink(req, familyId, accountType = 'child') {
  if (!familyId) {
    return null;
  }
  
  return `${req.protocol}://${req.get('host')}/register/family/${familyId}?type=${accountType}`;
}

function handleResponse(req, res, result, options = {}) {
  const { successRedirect, errorView, viewData = {} } = options;
  const isAjax = isAjaxRequest(req);
  
  if (!result.success) {
    if (isAjax) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }
    return res.render(errorView, {
      ...viewData,
      error: result.error,
      success: null
    });
  }
  
  if (isAjax) {
    return res.json({
      success: true,
      redirect: successRedirect || "/dashboard",
      data: result.data || null
    });
  }
  
  return res.redirect(successRedirect || "/dashboard");
}

function setFlashMessage(req, message, type = 'success') {
  req.session.flash = { message, type };
  return req;
}

function isAjaxRequest(req) {
  return req.xhr || req.headers.accept.indexOf('json') > -1;
}

function renderWithError(res, viewName, error, additionalData = {}) {
  return res.render(viewName, {
    ...additionalData,
    error: error,
    success: null
  });
}

function renderWithSuccess(res, viewName, successMessage, additionalData = {}) {
  return res.render(viewName, {
    ...additionalData,
    error: null,
    success: successMessage
  });
}

// I don't think this is working correctly, but I was trying to hide the users id in the URL.
function hashUserId(userId) {
  const buffer = Buffer.from(userId.toString());
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function unhashUserId(hashedId) {
  try {
    const base64 = hashedId.replace(/-/g, '+').replace(/_/g, '/');
    const paddedBase64 = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');
    const buffer = Buffer.from(paddedBase64, 'base64');
    return buffer.toString();
  } catch (error) {
    return null;
  }
}

function profileUrl(userId) {
  return `/profile/${hashUserId(userId)}`;
}

module.exports = {
  isAuthenticated,
  forwardAuthenticated,
  requireVerification,
  ensureAuthenticated,
  ensureParent,
  
  authenticateUser,
  registerUser,
  checkEmailExists,
  validatePassword,
  changeUserPassword,
  
  validateRegistrationData,
  processRegistration,
  loginAfterRegistration,
  
  retrieveProfile,
  updateUserProfile,
  updateUserPhotoUrl,
  
  assignUserToFamily,
  removeUserFromFamily,
  getFamilyMembers,
  getFamilyParents,
  getFamilyChildren,
  getFamilyMemberById,
  createFamily,
  updateFamilyInfo,
  addUserToFamilyByEmail,
  
  checkViewingAsChild,
  
  generateFamilyInviteLink,
  handleResponse,
  setFlashMessage,
  isAjaxRequest,
  renderWithError,
  renderWithSuccess,
  hashUserId,
  unhashUserId,
  profileUrl
};