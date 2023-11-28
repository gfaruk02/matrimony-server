const express = require('express');
const cors = require('cors');
require('dotenv').config()
const jwt = require('jsonwebtoken');
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.zjs4f1h.mongodb.net/?retryWrites=true&w=majority`;

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


    const biodataCollection = client.db("matrimonyDb").collection("biodata");
    const favouritesCollection = client.db("matrimonyDb").collection("favourites");
    const reviewsCollection = client.db("matrimonyDb").collection("reviews");
    const usersCollection = client.db("matrimonyDb").collection("users");
    const contactRequestCollection = client.db("matrimonyDb").collection("contactRequest");
    //jwt api
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '1h'
      })
      res.send({ token });
    })
    //middlewares for verifytoken
    const verifyToken = (req, res, next) => {
      console.log('inside verify token', req.headers);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unauthorized access' });
      }
      const token = req.headers.authorization.split(' ')[1];
      // next()
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          console.log(err);
          res.status(401).send({ message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next()
      })
    }
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email }
      const user = await usersCollection.findOne(query);
      const isAdmin = user?.role === 'admin';
      if (!isAdmin) {
        return res.status(403).send({ message: 'forbidden access' })
      }
      next()
    }

    app.get('/biodatas', async (req, res) => {
      const result = await biodataCollection.find().toArray();
      res.send(result);
    })

    app.get('/biodata', async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await biodataCollection.find(query).toArray();
      res.send(result);
    })

    app.delete('/biodata/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await biodataCollection.findOne(query);
      res.send(result);
    })
    app.post('/biodatas', async (req, res) => {
      const favouriteItem = req.body;
      const result = await biodataCollection.insertOne(favouriteItem);
      res.send(result);
    })

    //user to premium api biodata
    app.patch('/biodatas/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updatedRole = {
        $set: {
          member: 'Pending'
        }
      }
      const result = await biodataCollection.updateOne(filter, updatedRole);
      res.send(result);
    })
    app.patch('/biodata/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updatedRole = {
        $set: {
          member: 'Premium'
        }
      }
      const result = await biodataCollection.updateOne(filter, updatedRole);
      res.send(result);
    })


    app.get('/favourites', async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await favouritesCollection.find(query).toArray();
      res.send(result);
    })

    app.post('/favourites', async (req, res) => {
      const favouriteItem = req.body;
      const result = await favouritesCollection.insertOne(favouriteItem);
      res.send(result);
    })
    app.delete('/favourites/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await favouritesCollection.deleteOne(query);
      res.send(result);
    })

    //Review
    app.get('/reviews', async (req, res) => {
      const result = await reviewsCollection.find().toArray();
      res.send(result);
    })
    app.post('/reviews', async (req, res) => {
      const reviewsItem = req.body;
      const result = await reviewsCollection.insertOne(reviewsItem);
      res.send(result);
    })


    //Users api
    app.get('/users', verifyToken, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    })

    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email }
      const userExits = await usersCollection.findOne(query);
      if (userExits) {
        return res.send({ message: 'user already exists', insertedId: null })
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    })

    app.patch('/users/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updatedRole = {
        $set: {
          role: 'admin'
        }
      }
      const result = await usersCollection.updateOne(filter, updatedRole);
      res.send(result);
    })
    app.patch('/users/premium/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updatedRole = {
        $set: {
          role: 'premium'
        }
      }
      const result = await usersCollection.updateOne(filter, updatedRole);
      res.send(result);
    })

    app.get('/users/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(401).send({ message: 'unathorized access' })
      }
      const query = { email: email }
      const user = await usersCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === 'admin';
      }
      res.send({ admin })
    })
    //contact Request api
    app.get('/contactRequest',verifyToken, async (req, res) => {
      const result = await contactRequestCollection.find().toArray();
      res.send(result);
    })
    app.get('/contactRequests',verifyToken, async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await contactRequestCollection.find(query).toArray();
      res.send(result);
    })
    app.post('/contactRequest',verifyToken, async (req, res) => {
      const requestItem = req.body;
      const result = await contactRequestCollection.insertOne(requestItem);
      res.send(result);
    })

    app.patch('/contactRequest/:id',verifyToken, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updatedRole = {
        $set: {
          status: 'Active'
        }
      }
      const result = await contactRequestCollection.updateOne(filter, updatedRole);
      res.send(result);
    })

    app.delete('/contactRequest/:id',verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await contactRequestCollection.deleteOne(query);
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
  res.send('matrimony is Running');
})

app.listen(port, () => {
  console.log(`matrimony server is running on port ${port}`);
})