const express = require("express");
const authHelpers = require("../helpers/authHelpers.js");
const router = express.Router();
const User = require("../db/userModel.js");
const Family = require('../db/familyModel.js');

const { ensureAuthenticated } = authHelpers;

router.get("/family", ensureAuthenticated, async (req, res) => {
  try {
    const { family, members } = await authHelpers.getFamilyWithFilteredMembers(req.session.user.familyId);
    
    res.render("users/viewFamily", {
      user: req.session.user,
      family: family,
      familyMembers: members,
      error: null,
      success: null,
      currentPage: 'family'
    });
  } catch (error) {
    if (authHelpers.isAjaxRequest(req)) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
    return authHelpers.renderWithError(res, "users/viewFamily", `Error loading family: ${error.message}`, {
      user: req.session.user,
      currentPage: 'family'
    });
  }
});

router.post("/create-family", ensureAuthenticated, authHelpers.ensureParent, async (req, res) => {
  try {
    const { familyName } = req.body;
    
    const family = new Family(familyName);
    const result = await family.save();
    
    await authHelpers.assignUserToFamily(req.session.user.id, result.insertedId);
    
    req.session.user.familyId = result.insertedId;
    
    authHelpers.setFlashMessage(req, "Family created successfully!");
    
    res.redirect("/family");
  } catch (error) {
    if (authHelpers.isAjaxRequest(req)) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
    return authHelpers.renderWithError(res, "users/viewFamily", `Error creating family: ${error.message}`, {
      user: req.session.user,
      currentPage: 'family',
      familyMembers: []
    });
  }
});

router.post("/update-family", ensureAuthenticated, authHelpers.ensureParent, async (req, res) => {
  try {
    if (!req.session.user.familyId) {
      throw new Error("You need to create a family first");
    }
    
    const { familyName } = req.body;
    
    await Family.updateFamily(req.session.user.familyId, {
      name: familyName,
      updatedAt: new Date()
    });
    
    authHelpers.setFlashMessage(req, "Family name updated successfully!");
    
    res.redirect("/family");
  } catch (error) {
    if (authHelpers.isAjaxRequest(req)) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
    const { family, members } = await authHelpers.getFamilyWithFilteredMembers(req.session.user.familyId);
    
    return authHelpers.renderWithError(res, "users/viewFamily", `Error updating family: ${error.message}`, {
      user: req.session.user,
      currentPage: 'family',
      family,
      familyMembers: members
    });
  }
});

router.post("/add-family-member", ensureAuthenticated, authHelpers.ensureParent, async (req, res) => {
  try {
    if (!req.session.user.familyId) {
      throw new Error("You need to create a family first");
    }
    
    const { email } = req.body;
    
    const userToAdd = await User.findByEmail(email);
    
    if (!userToAdd) {
      throw new Error("User not found with that email");
    }
    
    await authHelpers.assignUserToFamily(userToAdd._id, req.session.user.familyId);

    authHelpers.setFlashMessage(req, "Family member added successfully!");
    
    res.redirect("/family");
  } catch (error) {
    if (authHelpers.isAjaxRequest(req)) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
    
    const { family, members } = await authHelpers.getFamilyWithFilteredMembers(req.session.user.familyId);
    
    return authHelpers.renderWithError(res, "users/viewFamily", error.message, {
      user: req.session.user,
      family: family,
      familyMembers: members,
      currentPage: 'family'
    });
  }
});

router.get("/remove-from-family/:id", ensureAuthenticated, authHelpers.ensureParent, async (req, res) => {
  try {
    const userId = req.params.id;
    
    const membersResult = await authHelpers.getFamilyMembers(req.session.user.familyId);
    
    if (!membersResult.success) {
      throw new Error("Could not retrieve family members");
    }
    
    const memberToRemove = membersResult.members.find(member => {
      let memberId = '';
      if (member.id) {
        memberId = member.id.toString();
      }
      
      let member_Id = '';
      if (member._id) {
        member_Id = member._id.toString();
      }
      
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
    authHelpers.setFlashMessage(req, error.message, "error");
    res.redirect("/family");
  }
});

router.post("/remove-from-family", ensureAuthenticated, authHelpers.ensureParent, async (req, res) => {
  try {
    const { userId } = req.body;
    
    await authHelpers.removeUserFromFamily(userId);
    
    authHelpers.setFlashMessage(req, "Family member removed successfully!");
    
    res.redirect("/family");
  } catch (error) {
    authHelpers.setFlashMessage(req, error.message, "error");
    res.redirect("/family");
  }
});

router.get("/generate-invite-link", ensureAuthenticated, authHelpers.ensureParent, async (req, res) => {
  try {
    if (!req.session.user.familyId) {
      const familyName = `${req.session.user.lastName} Family`;
      const family = new Family(familyName);
      const result = await family.save();
      
      await authHelpers.assignUserToFamily(req.session.user.id, result.insertedId);
      
      req.session.user.familyId = result.insertedId;
    }
    
    const inviteLink = `${req.protocol}://${req.get('host')}/register/family/${req.session.user.familyId}?type=child`;
    
    res.render("users/inviteFamily", {
      user: req.session.user,
      inviteLink: inviteLink,
      currentPage: 'family'
    });
  } catch (error) {
    if (authHelpers.isAjaxRequest(req)) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
    return authHelpers.renderWithError(res, "users/viewFamily", `Error generating invite link: ${error.message}`, {
      user: req.session.user,
      currentPage: 'family'
    });
  }
});

router.get("/select-child", ensureAuthenticated, authHelpers.ensureParent, async (req, res) => {
  try {
    const { family, members } = await authHelpers.getFamilyWithFilteredMembers(req.session.user.familyId, 'child');
    
    res.render("dashboard/selectChild", {
      user: req.session.user,
      familyMembers: members,
      currentPage: 'family',
      error: null,
      success: null
    });
  } catch (error) {
    authHelpers.setFlashMessage(req, error.message, "error");
    res.redirect("/dashboard");
  }
});

router.post("/view-as-child", ensureAuthenticated, authHelpers.ensureParent, async (req, res) => {
  try {
    const { childId } = req.body;
    
    if (childId === "none") {
      if (req.session.viewingAsChild) {
        delete req.session.viewingAsChild;
      }
      
      authHelpers.setFlashMessage(req, "Now viewing as yourself");
      
      return res.redirect("/dashboard");
    }
    
    const membersResult = await authHelpers.getFamilyMembers(req.session.user.familyId);
    
    if (!membersResult.success) {
      throw new Error("Could not retrieve family members");
    }
    
    const childExists = membersResult.members.some(member => {
      let idMatches = false;
      
      if (member.id === childId) {
        idMatches = true;
      }
      
      if (member._id && member._id.toString() === childId) {
        idMatches = true;
      }
      
      return idMatches && member.accountType === "child";
    });
    
    if (!childExists) {
      throw new Error("Child not found in your family");
    }
    
    req.session.viewingAsChild = childId;
    
    const childMember = membersResult.members.find(member => 
      (member.id === childId || member._id?.toString() === childId)
    );
    
    authHelpers.setFlashMessage(req, `Now viewing as ${childMember.firstName}`);
    
    res.redirect("/dashboard");
  } catch (error) {
    authHelpers.setFlashMessage(req, error.message, "error");
    res.redirect("/select-child");
  }
});

module.exports = router;