const express = require("express");
const crypto = require('crypto');
const authHelpers = require("../helpers/authHelpers");
const router = express.Router();
const User = require("../db/userModel.js");
const Family = require('../db/familyModel.js');
const { Resend } = require('resend');
const session = require("express-session");

const { forwardAuthenticated } = authHelpers;


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
    const result = await authHelpers.authenticateUser(email, password, req);
    
    if (!result.success) {
      if (authHelpers.isAjaxRequest(req)) {
        return res.status(400).json({
          success: false,
          error: "Incorrect login details"
        });
      }
      return authHelpers.renderWithError(res, "users/userLogin", "Incorrect login details");
    }
    
    if (authHelpers.isAjaxRequest(req)) {
      let redirectUrl;
      if (req.session.user.accountType === 'parent') {
        redirectUrl = "/select-child";
      } else {
        redirectUrl = "/dashboard";
      }
      return res.json({
        success: true,
        redirect: redirectUrl
      });
    }
    
    if (req.session.user.accountType === 'parent') {
      const result = await authHelpers.getFamilyWithFilteredMembers(req.session.user.familyId, 'child');
      
      return res.render("dashboard/selectChild", {
        user: req.session.user,
        familyMembers: result.children || [],
        currentPage: 'family',
        error: null,
        success: null
      });
    } else {
      return res.redirect("/dashboard");
    }
  } catch (error) {
    if (authHelpers.isAjaxRequest(req)) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
    return authHelpers.renderWithError(res, "users/userLogin", error.message);
  }
});


// forgotten password routes
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
      return authHelpers.renderWithSuccess(res, 'users/forgotPassword', successMessage, { title: 'Reset Confirmation' });
    }    
    
    const token = crypto.randomBytes(32).toString('hex');
    const expiryTime = new Date(Date.now() + 3600000);
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
    
    return authHelpers.renderWithSuccess(res, 'users/forgotPassword', successMessage, { title: 'Reset Confirmation' });
  } catch (error) {
    console.error('Password reset error:', error);
    return authHelpers.renderWithError(res, 'users/forgotPassword', 'There was a problem processing your request. Please try again.', { title: 'Forgot Password' });
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
    
    const passwordValidation = authHelpers.validatePassword(password);
    if (!passwordValidation.valid) {
      return res.render('users/resetPassword', {
        valid: true,
        message: null,
        token: req.params.token,
        error: passwordValidation.message
      });
    }
    
    await User.resetPassword(user._id, password);
    
    authHelpers.setFlashMessage(req, 'Your password has been reset successfully. Please log in.');
    
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

// Email and password matching using AJAX

router.post("/check-email", async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        exists: false, 
        message: "Email is required" 
      });
    }
    
    const exists = await authHelpers.checkEmailExists(email);

    let message = null;
    
  if (exists) {
        message = "This email is already registered";
      }
      
      return res.json({ 
        exists: exists, 
        message: message 
      });
  } catch (error) {
    console.error("Error checking email:", error);
    return res.status(500).json({ 
      exists: false, 
      message: "Error checking email availability" 
    });
  }
});

router.post("/validate-password", async (req, res) => {
  try {
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({ 
        valid: false, 
        message: "Password is required" 
      });
    }
    
    const validation = authHelpers.validatePassword(password);
    
    return res.json({ 
      valid: validation.valid, 
      message: validation.valid ? null : validation.message 
    });
  } catch (error) {
    console.error("Error validating password:", error);
    return res.status(500).json({ 
      valid: false, 
      message: "Error validating password" 
    });
  }
});

router.post("/validate-password-match", async (req, res) => {
  try {
    const { password, confirmPassword } = req.body;
    
    if (!password || !confirmPassword) {
      return res.status(400).json({ 
        valid: false, 
        message: "Both passwords are required" 
      });
    }
    
    const valid = password === confirmPassword;
    
    return res.json({ 
      valid: valid, 
      message: valid ? null : "Passwords do not match" 
    });
  } catch (error) {
    console.error("Error validating password match:", error);
    return res.status(500).json({ 
      valid: false, 
      message: "Error validating password match" 
    });
  }
});

// General Registration routes (for anyone)
router.get("/register", authHelpers.forwardAuthenticated, (req, res) => {
  res.render("users/userRegister", { error: null, success: null });
});

router.post("/register", forwardAuthenticated, async (req, res) => {
  try {
    const { fName, lName, email, password, confirmPassword, accountType, familyId } = req.body;
    
    const validation = await authHelpers.validateRegistrationData(email, password, confirmPassword);
    if (!validation.valid) {
      if (authHelpers.isAjaxRequest(req)) {
        return res.status(400).json({
          success: false,
          error: validation.error
        });
      }
      return authHelpers.renderWithError(res, "users/userRegister", validation.error);
    }
    
    const regResult = await authHelpers.processRegistration(fName, lName, email, password, accountType, familyId);
    if (!regResult.success) {
      if (authHelpers.isAjaxRequest(req)) {
        return res.status(400).json({
          success: false,
          error: regResult.error
        });
      }
      return authHelpers.renderWithError(res, "users/userRegister", regResult.error);
    }
    
    await authHelpers.loginAfterRegistration(req, email, password, accountType, regResult.userId);
    
    if (authHelpers.isAjaxRequest(req)) {
      return res.json({
        success: true,
        redirect: "/"
      });
    }
    
    return res.redirect("/dashboard");
  } catch (error) {
    if (authHelpers.isAjaxRequest(req)) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
    return authHelpers.renderWithError(res, "users/userRegister", error.message);
  }
});


// Family Registration (using join family shared link)
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


router.post("/register/family/:familyId", forwardAuthenticated, async (req, res) => {
  try {
    const { fName, lName, email, password, confirmPassword, accountType } = req.body;
    const familyIdFromParams = req.params.familyId;

    const family = await Family.findById(familyIdFromParams);
    if (!family) {
      return res.redirect('/register');
    }
    
    const familyData = {
      id: family._id,
      name: family.name
    };
    
    const validation = await authHelpers.validateRegistrationData(email, password, confirmPassword);
    if (!validation.valid) {
      if (authHelpers.isAjaxRequest(req)) {
        return res.status(400).json({
          success: false,
          error: validation.error
        });
      }
      return authHelpers.renderWithError(res, "users/familyRegister", validation.error, {
        familyData,
        accountType
      });
    }
    
    const regResult = await authHelpers.processRegistration(fName, lName, email, password, accountType, familyIdFromParams);
    if (!regResult.success) {
      if (authHelpers.isAjaxRequest(req)) {
        return res.status(400).json({
          success: false,
          error: regResult.error
        });
      }
      return authHelpers.renderWithError(res, "users/familyRegister", regResult.error, {
        familyData,
        accountType
      });
    }
    
    await authHelpers.loginAfterRegistration(req, email, password, accountType, regResult.userId);
    
    if (authHelpers.isAjaxRequest(req)) {
      return res.json({
        success: true,
        redirect: "/"
      });
    }
    
    return res.redirect("/dashboard");
  } catch (error) {
    if (authHelpers.isAjaxRequest(req)) {
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
    
    return authHelpers.renderWithError(res, "users/familyRegister", error.message, {
      familyData,
      accountType: req.body.accountType
    });
  }
});

// Logout routes
router.get("/logout/:id", authHelpers.ensureAuthenticated, async (req, res) => {
  try {
    const result = await authHelpers.retrieveProfile(req.params.id, req.session.user.id);
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

router.post("/logout", authHelpers.ensureAuthenticated, (req, res) => {
  try {
    req.session.destroy(err => {
    if (err) {
      return res.status(500).send("Error logging out");
    }
    res.clearCookie('session');
    res.redirect("/");
  });
  } catch (error) {
    res.status(500).send("Error logging out");
  }
});


module.exports = router;