const express = require("express");
const admin = require("firebase-admin");
const cors = require("cors");
const { MongoClient } = require("mongodb");
const ObjectId = require("mongodb").ObjectId;
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

const serviceAccount = require("./oliveo-fc01c-firebase-adminsdk.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

//middleware
app.use(cors());
app.use(express.json());

//set up database
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.4mqcd.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
async function verifyToken(req, res, next) {
  if (req?.body?.headers?.Authorization?.startsWith("Bearer ")) {
    const token = req?.body?.headers?.Authorization?.split(" ")[1];
    try {
      const decodedUser = await admin.auth().verifyIdToken(token);
      req.decodedEmail = decodedUser.email;
    } catch {}
  }

  next();
}
async function run() {
  try {
    await client.connect();
    //create new database
    const database = client.db("Oliveo");
    //create collections in database
    const oilsCollection = database.collection("oills");
    const usersCollections = database.collection("users");
    const reviewsCollections = database.collection("reviews");
    const OrdersCollections = database.collection("orders");
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
    //post one oil
    app.post("/oils", async (req, res) => {
      const oil = req.body;
      const result = await oilsCollection.insertOne(oil);
      res.json(result);
    });
    //get user order by email id
    app.post("/orders/find", async (req, res) => {
      const userEmail = req.query.email;
      const query = { email: { $in: [userEmail] } };
      const result = await OrdersCollections.find(query).toArray();
      res.send(result);
    });
    //get a user by email address
    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollections.findOne(query);
      let isAdmin = false;
      if (user?.role === "admin") {
        isAdmin = true;
      }
      res.json({ admin: isAdmin });
    });
    //get all reviews
    app.get("/reviews", async (req, res) => {
      const result = await reviewsCollections.find({}).toArray();
      res.send(result);
    });
    //get all  user order for admin
    app.get("/orders", async (req, res) => {
      const result = await OrdersCollections.find({}).toArray();
      res.send(result);
    });
    //recive user order and save
    app.post("/orders", async (req, res) => {
      const order = req.body;
      const result = await OrdersCollections.insertOne(order);
      res.json(result);
    });
    //post user data
    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await usersCollections.insertOne(user);

      res.json(result);
    });
    //post single reviews
    app.post("/reviews/add", async (req, res) => {
      const review = req.body;
      const result = await reviewsCollections.insertOne(review);
      res.json(result);
    });
    //user when google popup login
    app.put("/users", async (req, res) => {
      const user = req.body;
      const filter = { email: user.email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await usersCollections.updateOne(
        filter,
        updateDoc,
        options
      );

      res.json(result);
    });
    //delete a products from database
    app.delete("/oils/delete/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await oilsCollection.deleteOne(query);
      res.json(result);
    });
    //delete a order from all user order
    app.delete("/order/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await OrdersCollections.deleteOne(query);
      res.json(result);
    });
    //update user order status
    app.put("/order/status", async (req, res) => {
      const status = req.body.status;
      const id = req.body.id;
      const filter = { _id: ObjectId(id) };
      const updateDoc = { $set: { status: status } };
      const result = await OrdersCollections.updateOne(filter, updateDoc);
      res.json(result);
    });
    //handle admin
    app.put("/users/admin", verifyToken, async (req, res) => {
      const user = req.body.user;
      const filter = { email: user.email };
      const requester = req.decodedEmail;
      if (requester) {
        const requesterAccount = await usersCollections.findOne({
          email: requester,
        });
        if (requesterAccount.role === "admin") {
          const updateDoc = { $set: { role: "admin" } };
          const result = await usersCollections.updateOne(filter, updateDoc);
          res.json(result);
        }
      } else {
        res
          .status(401)
          .json({ message: "You do not have access to make admin" });
      }
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
