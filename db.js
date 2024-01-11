const { MongoClient } = require("mongodb");

// Connection URI for MongoDB Atlas
const uri =
  "mongodb+srv://Rajesh:<rajeshgrootan>@cluster0.q4agnxw.mongodb.net/?retryWrites=true&w=majority";

// Create a new MongoClient
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function run() {
  try {
    // Connect the client to the MongoDB cluster
    await client.connect();

    console.log("Connected to MongoDB Atlas");

    // // Specify the database and collection
    // const database = client.db("Rajesh"); // Replace with your database name
    // const collection = database.collection("Cluster0"); // Replace with your collection name

    // // Perform operations here
    // // For example, inserting a document
    // await collection.insertOne({ name: "John Doe", age: 30 });

    // // Query documents
    // const result = await collection.find({ age: { $gt: 25 } }).toArray();
    // console.log("Documents with age greater than 25:", result);
  } finally {
    // Close the connection when done
    await client.close();
  }
}

// Run the async function
run().catch(console.error);
