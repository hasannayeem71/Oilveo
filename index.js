const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");
const ObjectId = require("mongodb").ObjectId;
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());

//set up database
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.4mqcd.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function run() {
  try {
    await client.connect();
    //create new database
    const database = client.db("Oliveo");
    //create collections in database
    const oilsCollection = database.collection("oills");
    // const userPackageCollection = database.collection("");

    //get all data from oils database (api)
    app.get("/oils", async (req, res) => {
      const result = await oilsCollection.find({}).toArray();
      res.send(result);
    });
    //get single data from oils database (api) using id
    app.get("/oils/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await oilsCollection.findOne(query);
      res.send(result);
    });
  } finally {
    //await client.close()
  }
}
run().catch(console.dir);

//root path to check all ok
app.get("/", (req, res) => {
  res.send("Back-End Ok");
});

app.listen(port, () => {
  console.log("Server running at port ", port);
});
