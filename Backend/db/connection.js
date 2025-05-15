const { MongoClient, ServerApiVersion } = require('mongodb');

const uri = process.env.MONGODB_URI;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let db;

const connectDB = async () => {
  try {
    await client.connect();
    
    await client.db("admin").command({ ping: 1 });
    console.log("Connected to MongoDB");
    
    db = client.db("userDB");
    
    try {
      const goalsCollection = db.collection('goals');
      const changeStream = goalsCollection.watch();
      
      changeStream.on('change', change => {
        if (change.operationType === 'update' && 
            change.updateDescription && 
            change.updateDescription.updatedFields) {
          
          const updatedFields = change.updateDescription.updatedFields;
          
          if (updatedFields.lastUpdateSource === 'taskCompletion' || 
              (updatedFields.uniqueMarker && 
               (updatedFields.uniqueMarker.startsWith('task-') || 
                updatedFields.uniqueMarker.startsWith('restored-task-')))) {
            return;
          }
        }
      });
    } catch (watchErr) {
      console.error("Error setting up change stream:", watchErr);
    }
    
    return db;
  } catch (err) {
    console.error("Error connecting to MongoDB:", err);
    process.exit(1);
  }
};

const getDB = () => {
  if (!db) {
    throw new Error("Database not initialized. Call connectDB first.");
  }
  return db;
};

const closeDB = async () => {
  if (client) {
    await client.close();
    console.log("MongoDB connection closed.");
  }
};

process.on('SIGINT', async () => {
  await closeDB();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeDB();
  process.exit(0);
});

module.exports = { connectDB, getDB, closeDB };