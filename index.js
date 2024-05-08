const  express = require('express');
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express()
const port = process.env.PORT|| 5000;


//middle wire
app.use(cors({
  origin: ['http://localhost:5173'],
  credentials: true,
}))
app.use(express.json())
app.use(cookieParser())

// {
//   origin: ['http://localhost:5173'],
//   credentials: true
// }

//middle wire made by me
// const logger = async(req,res,next) => {
//   console.log('called',req.host, req.originalUrl);
//   next();
// }

const logger = async(req,res,next) => {
       console.log('called', req.method, req.url);
       next();
}

// const verifyToken = async (req,res,next) => {
//       const token = req.cookies?.token;
//       console.log('value of token in middle wire',token)
//       if(!token){
//           return res.status(401).send({message : 'not authorized'})
//       }
//       jwt.verify(token , process.env.DB_TOKEN , (err,decoded) => {
//         if(err){
//           console.log(err);
//          return res.status(401).send({message: 'unauthorized'})
//         }
//         console.log('value in the token', decoded)
//         req.user = decoded;
//         next();
//       })
      
// }

const verifyToken = async(req,res,next) => {
        const token = req?.cookies?.token;
        //console.log('token from middle wire', token);

        if(!token){
          return res.status(401).send({message: 'unauthorized access'})
        }
        jwt.verify(token, process.env.DB_TOKEN, (err,decoded) => {
          if(err){
             return  res.status(401).send({message: 'unauthorized access'})
          }
          req.user = decoded;
          next();
        })
        
}

//require('crypto').randomBytes(64).toString('hex')
// console.log(process.env.DB_USER)

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.khblnbj.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const cookieOption = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production" ? true: false,
  sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
 }

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    //await client.connect();
     
    const carCollection = client.db('carDoctor').collection('services');
    const checkOutCollection = client.db('carDoctor').collection('checkout')
  
     //auth related api
  //  app.post('/jwt', async(req,res) => {
  //         const  user = req.body;
  //         console.log(user);
  //         const token = jwt.sign({user}, process.env.DB_TOKEN ,{expiresIn : '1h'});
  //         res
  //         .cookie('token', token, {
  //           httpOnly: true,
  //           secure: false,
  //         })
  //         .send({success: true})
  //  } )

  app.post('/jwt',async(req,res) => {
         const user = req.body;
        console.log(user, 'for token')
         const token = jwt.sign(user , process.env.DB_TOKEN, {expiresIn: '1h'})
         
         res.cookie('token', token ,cookieOption)
         res.send({success: true})
  })
  
  app.post('/logout', async(req,res) => {
    const user = req.body;
    console.log(user, 'delete token')
    res.clearCookie('token', {...cookieOption, maxAge : 0 }).send({success:true})
  })


    //services related api
    app.get('/services', logger, async(req,res) => {
          const cursor = carCollection.find();
          const result = await cursor.toArray();
          res.send(result);
    })
    //single data
     app.get('/services/:id',async(req,res) => {
         const id = req.params.id;
         const query = {_id: new ObjectId(id)};
         const options = {
  
          // Include only the `title` and `imdb` fields in the returned document
          projection: {  title: 1,price:1,img:1 },
        };

         const result = await carCollection.findOne(query,options);
         res.send(result)

     })
     //get /checkout
     app.get('/checkout',logger,verifyToken, async(req,res) => {
      // console.log(req.query.email,req.user.user.email)
      // //console.log('tok tok token',req.cookies.token)
      // console.log('user in the valid token', req.user)
      // if(req.query.email !== req.user.user.email){
      //   return res.status(403).send({message: 'forbidden access'})
      // }  ---0--

      //after jwt work install cookie parser 
      // console.log('get cookies from client trow cookie parser', req.cookies.token)
      console.log(req.user, 'valid token')
      if(req.query.email !== req.user.email){
        return res.status(403).send({message: 'forbidden access'})
      }
      let query = {};
      if(req.query?.email){
        query = {email: req.query.email}
      }
          const result = await checkOutCollection.find(query).toArray() ;
          res.send(result)
     })
     //post in another collection
    app.post('/checkout',async(req,res) => {
          const booking = req.body;
          const result = await checkOutCollection.insertOne(booking)
          res.send(result)
    })
    // patch checkout
    app.patch('/checkout/:id', async(req,res) => {
         const id = req.params.id;
         const updatedCheckout = req.body;
         const filter = {_id: new ObjectId(id)}
         const updateDoc = {
          $set: {
           status: updatedCheckout.status
          },
        };
        const result = await checkOutCollection.updateOne(filter,updateDoc);
        res.send(result)

    })

    // delete checkout
    app.delete('/checkout/:id',async(req,res) => {
           const id = req.params.id;
           const query = {_id: new ObjectId(id)}
           const result = await checkOutCollection.deleteOne(query);
           res.send(result)
    })
     
    // Send a ping to confirm a successful connection
   // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
   // await client.close();
  }
}
run().catch(console.dir);



app.get('/',(req,res) => {
      res.send('Doctor server side is running');
})
app.listen(port, () => {
    console.log( 'Car doctor is running on port',port)
})