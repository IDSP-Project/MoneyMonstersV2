const { getDB } = require("./connection.js");
const { ObjectId } = require('mongodb');

class Family {
  constructor(name) {
    this.name = name;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }
  
  async save() {
    try {
      const db = getDB();
      const familiesCollection = db.collection('families');
      const result = await familiesCollection.insertOne(this);
      return result;
    } catch (error) {
      throw error;
    }
  }
  
  static async findById(id) {
    try {
      const db = getDB();
      return await db.collection('families').findOne({ _id: new ObjectId(id) });
    } catch (error) {
      throw error;
    }
  }
  
  static async findByName(name) {
    try {
      const db = getDB();
      return await db.collection('families').findOne({ name });
    } catch (error) {
      throw error;
    }
  }
  
  static async updateFamily(id, updateData) {
    try {
      const db = getDB();
      updateData.updatedAt = new Date();
      const result = await db.collection('families').updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData }
      );
      return result;
    } catch (error) {
      throw error;
    }
  }
  
  static async deleteFamily(id) {
    try {
      const db = getDB();
      await db.collection('users').updateMany(
        { familyId: new ObjectId(id) },
        { $set: { familyId: null }}
      );
      
      const result = await db.collection('families').deleteOne({ _id: new ObjectId(id) });
      return result;
    } catch (error) {
      throw error;
    }
  }
  
  static async findAll() {
    try {
      const db = getDB();
      return await db.collection('families').find().toArray();
    } catch (error) {
      throw error;
    }
  }
  
  static async getFamilyWithMembers(familyId) {
    try {
      const db = getDB();
      const family = await db.collection('families').findOne({ _id: new ObjectId(familyId) });
      
      if (!family) {
        return null;
      }
      
      const members = await db.collection('users').find({
        familyId: new ObjectId(familyId)
      }).toArray();
      
      return {
        ...family,
        members
      };
    } catch (error) {
      throw error;
    }
  }
  
  static async countMembers(familyId) {
    try {
      const db = getDB();
      return await db.collection('users').countDocuments({
        familyId: new ObjectId(familyId)
      });
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Family;