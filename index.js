const express = require('express')
const app = express()
const cors = require('cors')
const  jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const port = process.env.PORT || 5000;


//middleware
app.use(cors())
app.use(express.json())

const verifyJWT = (req, res, next) =>{
  const authorization = req.headers.authorization;
  if(!authorization){
    return res.status(401).send({error: true, message:'unauthorized access'});
  }

  const token = authorization.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) =>{
    if(err){
      return res.status(401).send({error: true, message:'unauthorized access'})
    }
    req.decoded = decoded;
    next();
  })
}

app.get('/',(req,res) =>{
    res.send('bistro boss server is connect')
})


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.nlw4swl.mongodb.net/?retryWrites=true&w=majority`;

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
    // Send a ping to confirm a successful connection
    const menuCollection = client.db('bistrodb').collection('menu');
    const usersCollection = client.db('bistrodb').collection('users');
    const testimonialCollection = client.db('bistrodb').collection('testimonial');
    const cardsCollection = client.db('bistrodb').collection('cards');

    //users

    app.post('/jwt', (req,res) =>{
      const user = req.body;
      const token = jwt.sign(user,process.env.ACCESS_TOKEN_SECRET, {expiresIn:'1h'})

      res.send({token})
    })
    /**
     * 0. do not show secure links to those who should not see the links
     * 1. use jwt token verifyJWT
     * 2. use verifyAdmin middleWear
     */

    //users related apis
    app.get('/users', verifyJWT, async(req,res) =>{
      const result = await usersCollection.find().toArray();
      res.send(result)
    })


    app.post('/users',async(req,res) =>{
      const user = req.body;
      console.log(user)
      const query = {email: user.email}
      const existingUser = await usersCollection.findOne(query)
      console.log('existing user',existingUser)
      if(existingUser){
        return res.json('user already exist ')
        
      }
      const result = await usersCollection.insertOne(user)
      res.send(result)
    })

    //security layer: verifyJWT
    //email same
    //check admin
    app.get('/users/admin/:email',verifyJWT, async(req,res) =>{
      const email = req.params.email;
      if(req.decoded.email !== email) {
        res.send({admin:false})
      }
      const query = {email: email}
      const user = await usersCollection.findOne(query)
      const result = {admin: user?.role === 'admin'}
      res.send(result)
    })
    app.patch('/users/admin/:id', async (req,res) =>{
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)};
      const updateDoc = {
        $set:{
          role:'admin'
        },
      };
      const result = await usersCollection.updateOne(filter,updateDoc);
      res.send(result)
    })

    //menu
    app.get('/menu', async(req,res) =>{
        const result = await menuCollection.find().toArray()
        res.send(result)
    })
    app.get('/testimonial', async(req,res) =>{
        const result = await testimonialCollection.find().toArray()
        res.send(result)
    })

    //my Card
    app.get('/carts', verifyJWT, async(req,res) =>{
    const  email = req.query.email;
    console.log(email)
    if(!email){
      res.send([])
    }

    const decodedEmail = req.decoded.email;
    if(email !== decodedEmail){
      return res.status(401).send({error:true,message:'porviden access'})
    }

    const query = {email:email};
    const result = await cardsCollection.find(query).toArray();
    res.send(result)
    })
    app.post('/carts', async(req,res) =>{
      const cardItem = req.body;
      console.log(cardItem)
      const result = await cardsCollection.insertOne(cardItem);
      res.send(result);
    })

    app.delete('/carts/:id', async(req,res) =>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await cardsCollection.deleteOne(query)
      res.send(result)
    })
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () =>{
    console.log(`mongodb port is running ${port}`)
})

/**
 * ---------------------------------------
 *    NAMING CONVENTION
 * ----------------------------------------
 * 
 *users : userCollection 
 app.get('/users')
 app.get('users:id')
 app.post('/users')
 app.patch('/user/:id')
 app.put('/users/:id')
 app.delete('/users/:id' ) 
 * 
 */