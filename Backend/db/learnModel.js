//Class for learnings in database
//might need to remove later


const { getDB } = require('../db/connection');
const { ObjectId } = require('mongodb');

class Learning {
  constructor(category, title, summary, content, image = null) {
    this.category = category || '';
    this.title = title;
    this.summary = summary;
    this.content = content;
    this.image = image;
    this.createdAt = new Date();
  }

  async save() {
    try {
      const db = getDB();
      const result = await db.collection('learnings').insertOne(this);
      return result;
    } catch (err) {
      throw err;
    }
  }

  static async findAll() {
    try {
      const db = getDB();
      return await db.collection('learnings').find().sort({ createdAt: -1 }).toArray();
    } catch (err) {
      throw err;
    }
  }

  static async findById(id) {
    try {
      const db = getDB();
      return await db.collection('learnings').findOne({ _id: new ObjectId(id) });
    } catch (err) {
      throw err;
    }
  }

  static async deleteAll() {
    try {
      const db = getDB();
      return await db.collection('learnings').deleteMany({});
    } catch (err) {
      throw err;
    }
  }

  static async insertMany(blogs) {
    try {
      const db = getDB();
      return await db.collection('learnings').insertMany(blogs);
    } catch (err) {
      throw err;
    }
  }
}

module.exports = Learning;
