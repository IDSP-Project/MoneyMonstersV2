// Class for users in the database

const { getDB } = require("./connection.js");
const { ObjectId } = require('mongodb');
const bcrypt = require('bcrypt');

class User {
  constructor(firstName, lastName, email, password, accountType, profilePhoto = null, familyId = null) {
    this.firstName = firstName;
    this.lastName = lastName;
    this.email = email;
    this.password = password;
    this.accountType = accountType;
    this.familyId = familyId;
    this.profilePhoto = profilePhoto;
    this.balance = 0;
    this.createdAt = new Date();
    this.lastLogin = null;
  }

  async save() {
    try {
      const db = getDB();
      const usersCollection = db.collection('users');
      
      const existingUser = await usersCollection.findOne({ email: this.email });
      if (existingUser) {
        throw new Error('Email already exists');
      }
      
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
      
      const result = await usersCollection.insertOne(this);
      return result;
    } catch (error) {
      throw error;
    }
  }

  static async findByEmail(email) {
    try {
      const db = getDB();
      return await db.collection('users').findOne({ email });
    } catch (error) {
      throw error;
    }
  }

  static async findById(id) {
    try {
      const db = getDB();
      return await db.collection('users').findOne({ _id: new ObjectId(id) });
    } catch (error) {
      throw error;
    }
  }

  static async updateUser(id, updateData) {
    try {
      const db = getDB();
      const result = await db.collection('users').updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData }
      );
      return result;
    } catch (error) {
      throw error;
    }
  }

  static async updateLastLogin(id) {
    try {
      const db = getDB();
      const result = await db.collection('users').updateOne(
        { _id: new ObjectId(id) },
        { $set: { lastLogin: new Date() } }
      );
      return result;
    } catch (error) {
      throw error;
    }
  }

  static async comparePassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  static async findFamilyMembers(familyId) {
    try {
      const db = getDB();
      return await db.collection('users').find({ 
        familyId: new ObjectId(familyId) 
      }).toArray();
    } catch (error) {
      throw error;
    }
  }

  static async findFamilyParents(familyId) {
    try {
      const db = getDB();
      return await db.collection('users').find({ 
        familyId: new ObjectId(familyId),
        accountType: "parent"
      }).toArray();
    } catch (error) {
      throw error;
    }
  }

  static async findFamilyChildren(familyId) {
    try {
      const db = getDB();
      return await db.collection('users').find({ 
        familyId: new ObjectId(familyId),
        accountType: "child"
      }).toArray();
    } catch (error) {
      throw error;
    }
  }

  static async assignToFamily(userId, familyId) {
    try {
      const db = getDB();
      const result = await db.collection('users').updateOne(
        { _id: new ObjectId(userId) },
        { $set: { familyId: new ObjectId(familyId) } }
      );
      return result;
    } catch (error) {
      throw error;
    }
  }

  static async removeFromFamily(userId) {
    try {
      const db = getDB();
      const result = await db.collection('users').updateOne(
        { _id: new ObjectId(userId) },
        { $set: { familyId: null } }
      );
      return result;
    } catch (error) {
      throw error;
    }
  }

  static async findUsersWithoutFamily() {
    try {
      const db = getDB();
      return await db.collection('users').find({ 
        familyId: null 
      }).toArray();
    } catch (error) {
      throw error;
    }
  }

  static async deleteUser(id) {
    try {
      const db = getDB();
      const result = await db.collection('users').deleteOne({ _id: new ObjectId(id) });
      return result;
    } catch (error) {
      throw error;
    }
  }

  static async findAll() {
    try {
      const db = getDB();
      return await db.collection('users').find().toArray();
    } catch (error) {
      throw error;
    }
  }

  static async findByAccountType(accountType) {
    try {
      const db = getDB();
      return await db.collection('users').find({ accountType }).toArray();
    } catch (error) {
      throw error;
    }
  }

  static async updateProfilePhoto(id, photoData) {
    try {
      const db = getDB();
      
      if (photoData === null) {
        const result = await db.collection('users').updateOne(
          { _id: new ObjectId(id) },
          { $set: { profilePhoto: null } }
        );
        return result;
      }
      
      const profilePhoto = {
        url: photoData.url,
        publicId: photoData.publicId,
        updatedAt: new Date()
      };

      const result = await db.collection('users').updateOne(
        { _id: new ObjectId(id) },
        { $set: { profilePhoto: profilePhoto } }
      );
      return result;
    } catch (error) {
      throw error;
    }
  }
  static async getProfilePhoto(id) {
    try {
      const db = getDB();
      const user = await db.collection('users').findOne(
        { _id: new ObjectId(id) },
        { projection: { profilePhoto: 1 } }
      );
      
      return user ? user.profilePhoto : null;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = User;