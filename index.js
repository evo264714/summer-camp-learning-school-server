const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY)
const port = process.env.PORT || 5000

//middleware
app.use(cors())
app.use(express.json())

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: 'Unauthorized access' })
  }
  const token = authorization.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: true, message: 'Unauthorized access' })
    }
    req.decoded = decoded;
    next();
  })
}


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
    // await client.connect();

    const usersCollection = client.db("summerDb").collection("users");
    const instructorCollection = client.db("summerDb").collection("instructor");
    const classCollection = client.db("summerDb").collection("class")
    const singleUserClassCollection = client.db("summerDb").collection("singleUserClass")
    const paymentCollection = client.db("summerDb").collection("payments")

    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '6h' })

      res.send({ token })
    })

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email }
      const user = await usersCollection.findOne(query);
      if (user?.role !== 'admin') {
        return res.status(403).send({ error: true, message: 'Forbidden Access' });
      }
      next();
    }

    const verifyInstructor = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email }
      const user = await usersCollection.findOne(query);
      if (user?.role !== 'instructor') {
        return res.status(403).send({ error: true, message: 'Forbidden Access' });
      }
      next();
    }

    //Users related Apis
    app.get('/users', verifyJWT, verifyAdmin, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result)
    });

    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email }
      const existingUser = await usersCollection.findOne(query)
      if (existingUser) {
        return res.send({ message: 'User already exists' })
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    })

    app.get('/users/admin/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({ admin: false })
      }

      const query = { email: email }
      const user = await usersCollection.findOne(query);
      const result = { admin: user?.role === 'admin' }
      res.send(result)
    })

    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params;
      const filter = { _id: new ObjectId(id) }
      const updatedDoc = {
        $set: {
          role: 'admin'
        }
      }
      const result = await usersCollection.updateOne(filter, updatedDoc);
      res.send(result);
    })




    //Instructors related Apis
    app.get('/instructor', async (req, res) => {
      const result = await instructorCollection.find().toArray();
      res.send(result)
    })

    app.get('/users/instructor/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        return res.send({ instructor: false })

      }

      const query = { email: email }
      const user = await usersCollection.findOne(query);
      const result = { instructor: user?.role === 'instructor' }
      res.send(result)
    })

    app.patch('/users/instructor/:id', async (req, res) => {
      const id = req.params;
      const filter = { _id: new ObjectId(id) }
      const updatedDoc = {
        $set: {
          role: 'instructor'
        }
      }
      const result = await usersCollection.updateOne(filter, updatedDoc);
      res.send(result);
    })

    //Classes collection apis
    app.get('/classes', async (req, res) => {
      const result = await classCollection.find().toArray();
      res.send(result)
    })

    app.post('/classes', verifyJWT, verifyInstructor, async (req, res) => {
      const newItem = req.body;
      const result = await classCollection.insertOne(newItem)
      res.send(result);
    })


    // Update class status
    app.put('/classes/:id/status', async (req, res) => {
      try {
        const { id } = req.params;
        const { status } = req.body;

        await classCollection.updateOne({ _id: new ObjectId(id) }, { $set: { status } });

        res.status(200).json({ message: 'Class status updated successfully' });
      } catch (error) {
        console.error('Failed to update class status', error);
        res.status(500).json({ error: 'Failed to update class status' });
      }
    });

    // Update class feedback
    app.put('/classes/:id/feedback', async (req, res) => {
      try {
        const { id } = req.params;
        const { feedback } = req.body;

        await classCollection.updateOne({ _id: new ObjectId(id) }, { $set: { feedback } });

        res.status(200).json({ message: 'Class feedback updated successfully' });
      } catch (error) {
        console.error('Failed to update class feedback', error);
        res.status(500).json({ error: 'Failed to update class feedback' });
      }
    });



    //Single user class collection apis
    app.post('/singleuserclass', async (req, res) => {
      const item = req.body;
      const result = await singleUserClassCollection.insertOne(item)
      res.send(result)
    })

    app.get('/singleuserclass', verifyJWT, async (req, res) => {
      const email = req.query.email;
      if (!email) {
        res.send([])
      }

      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(403).send({ error: true, message: 'Forbidden Access' })
      }
      const query = { email: email };
      const result = await singleUserClassCollection.find(query).toArray();
      res.send(result);
    })

    app.delete('/singleuserclass/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) };
      const result = await singleUserClassCollection.deleteOne(query)
      res.send(result);
    })


    //Payment
    app.get('/payments/:email', async (req, res) => {
      const email = req.params.email
      const query = { email: email }
      const result = await paymentCollection.find(query).toArray()
      res.send(result)
    })

    app.put('/payments/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const updatedDoc = {
        $inc: {
          availableSeats: -1,
          enrolledStudents: 1
        }

      }
      const result = await classCollection.findOneAndUpdate(query, updatedDoc)
      res.send(result)
    })

    app.get('/payments/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const options = { sort: { date: -1 } };
      const result = await paymentCollection.find(query, options).toArray();
      res.send(result);
    });

    app.post('/create-payment-intent', verifyJWT, async (req, res) => {
      const { price } = req.body;
      const amount = price * 100;

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      })

      res.send({
        clientSecret: paymentIntent.client_secret
      })
    })

    app.post('/payments', verifyJWT, async (req, res) => {
      const payment = req.body;
      const result = await paymentCollection.insertOne(payment)
      res.send(result)
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