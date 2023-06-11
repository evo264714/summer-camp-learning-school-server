const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 5000

//middleware
app.use(cors())
app.use(express.json())



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xmw7zrv.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const usersCollection = client.db("summerDb").collection("users");
    const instructorCollection = client.db("summerDb").collection("instructor");
    const classCollection = client.db("summerDb").collection("class")
    const singleUserClassCollection = client.db("summerDb").collection("singleUserClass")

    //Users related Apis
    app.post('/users', async(req, res) =>{
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.send(result);
    })


    //Instructors related Apis
    app.get('/instructor', async (req, res) => {
      const result = await instructorCollection.find().toArray();
      res.send(result)
    })

    //Classes collection apis
    app.get('/classes', async (req, res) => {
      const result = await classCollection.find().toArray();
      res.send(result)
    })

    //Single user class collection apis
    app.post('/singleuserclass', async (req, res) => {
      const item = req.body;
      const result = await singleUserClassCollection.insertOne(item)
      res.send(result)
    })

    app.get('/singleuserclass', async (req, res) => {
      const email = req.query.email;
      if (!email) {
        res.send([])
      }
      const query = { email: email }; const result = await singleUserClassCollection.find(query).toArray();
      res.send(result);
    })

    app.delete('/singleuserclass/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) };
      const result = await singleUserClassCollection.deleteOne(query)
      res.send(result);
    })




    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Camp is here')
})

app.listen(port, () => {
  console.log(`Camp is here on port ${port}`);
})