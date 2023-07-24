const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 3000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');

const corsOptions = {
  origin: '*',
  credentials: true,
  optionSuccessStatus: 200,
};

// middleware:
app.use(cors());
app.use(express.json());
app.use(cors(corsOptions));

app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'DELETE, PUT, GET, POST');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept'
  );
  next();
});

// jwt processor:
const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: 'Invalid authorization' });
  }

  // bearer authorization token:
  const token = authorization.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
    if (error) {
      return res
        .status(401)
        .send({ error: true, message: 'Invalid authorization' });
    }
    req.decoded = decoded;
    next();
  });
};

// database connection:
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.wndd9z6.mongodb.net/?retryWrites=true&w=majority`;

// database functionalities:
async function run() {
  try {
    // connect the client to the server:
    await client.connect();

    // database collections:
    const usersCollection = client.db('gocampus').collection('users');
    const classCollection = client.db('gocampus').collection('colleges');

    // JWT configuration:
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '7d',
      });
      res.send(token);
    });

    // verify Admin:
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      console.log('verifyAdmin', email);

      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user?.role !== 'admin') {
        return res
          .status(403)
          .send({ error: true, message: 'forbidden access' });
      }
      next();
    };

    // user based APIs:
    app.get('/users', async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.post('/users', async (req, res) => {
      const user = req.body;
      console.log(user);
      const query = { email: user?.email };
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'User already exists!' });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    // delete an user:
    app.delete('/users/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });

    // Admin APIs:
    app.get('/users/admin/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({ admin: false });
      }

      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const result = { admin: user?.role === 'admin' };
      res.send(result);
    });

    // role management:
    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: 'admin',
        },
      };
      const result = await usersCollection.updateOne(filter, updatedDoc);
      res.send(result);
      console.log(result);
    });

    // class collection:
    app.get('/colleges', async (req, res) => {
      const result = await classCollection.find().toArray();
      res.send(result);
    });

    // add new class:
    app.post('/colleges', async (req, res) => {
      const newClass = req.body;
      const result = await classCollection.insertOne(newClass);
      res.send(result);
    });

    // delete a class::
    app.delete('/colleges/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await classCollection.deleteOne(query);
      res.send(result);
    });

    // check server connection:
    await client.db('admin').command({ ping: 1 });
    console.log("Chief! You'r e successfully connected to MongoDB!");
  } finally {
    // optional
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('GOCAMPUS');
});

app.listen(port, () => {
  console.log(`Running on port ${port}`);
});
