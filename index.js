const express = require("express");
const app = express();
const port = process.env.PORT || 5000;
const cors = require("cors");
require("dotenv").config();
const jwt = require('jsonwebtoken');

// for csv file upload  
const multer = require('multer');
const csvParser = require('csv-parser');
const fs = require('fs');

const uploadDir = './uploads';

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}



// Midelware  
app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: 'unauthorized access' });
  }
  // bearer token
  const token = authorization.split(' ')[1];

  jwt.verify(token, process.env.Access_token, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: true, message: 'unauthorized access' })
    }
    req.decoded = decoded;
    next();
  })
}




const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ts9e2p2.mongodb.net/?retryWrites=true&w=majority`;

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

    const usersCollection = client.db("flynass").collection("users")
    const orderCollection = client.db("flynass").collection("orders")

    // jwt token create 
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.Access_token, { expiresIn: "1h" })
      res.send({ token })
    })

    app.post("/users", async (req, res) => {
      users = req.body;
      console.log(users);
      const query = { email: users.email };
      const existingusers = await usersCollection.findOne(query)
      if (existingusers) {
        return res.send({ message: 'Merchant already exists' })
      }
      const result = await usersCollection.insertOne(users);
      res.send(result)
    })

    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'admin'
        },
      };

      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);

    })

    app.put('/user/:id', async (req, res) => {
      const id = req.params.id;
      const user = req.body;
      console.log(user);
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateProfile = {
        $set: {
          name: user.name,
          phone: user.phone,
          address: user.address
        }
      }
      const result = await usersCollection.updateOne(filter, updateProfile, options);
      res.send(result)
    });


    app.get("/user/:email", async (req, res) => {
      const email = req.params.email;
      const quary = { email: email };

      const result = await usersCollection.findOne(quary);
      res.send(result)
    })

    app.get("/users", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result)
    })

    app.post("/orders", async (req, res) => {
      const order = req.body;
      const result = await orderCollection.insertOne(order);
      res.send(result)
    })

    app.get("/orders", async (req, res) => {
      const result = await orderCollection.find().toArray();
      res.send(result)
    })
    app.put("/orders/:id", async (req, res) => {
      const id = req.params.id;
      const updatInfo = req.body;
      console.log(updatInfo);
    })


    // for csv file upload  
    // File upload configuration
    const upload = multer({ dest: "uploads/" });

    // File upload endpoint
    app.post("/upload", upload.single("csvFile"), (req, res) => {
      const file = req.file;
      console.log(file);
      const user_email = req.body.user_email;
      const status = 'pending'
      if (!file) {
        return res.status(400).json({ error: "No CSV file uploaded" });
      }

      const results = [];

      // Parse CSV file and save data to MongoDB
      fs.createReadStream(file.path)
        .pipe(csvParser())
        .on("data", (row) => {
          // Assuming the CSV has columns 'name', 'age', 'email'
          // Adjust this according to your actual CSV structure
          results.push({
            marchent_id: row.marchent_id,
            name: row.name,
            phone: row.phone,
            from_address: row.from_address,
            to_address: row.to_address,
            district: row.district,
            thana: row.thana,
            product_amount: row.product_amount,
            delivary_Charge: row.delivary_Charge,
            cod: row.cod,
            total_amount: row.total_amount,
            user_email: user_email,
            status: status,
          });
        })
        .on("end", () => {
          // Save the data to MongoDB
          orderCollection.insertMany(results, (err, result) => {
            if (err) {
              res.status(500).json({ error: "Error saving data to MongoDB" });
            } else {
              const result = res.status(200).json({ message: "Data saved to MongoDB successfully" });
              console.log(result);
            }
          });
        });
    });


    // admin and superAdmin finding ============================
    app.get("/user/merchant/:email", async (req, res) => {
      const email = req.params.email;
      const quary = { email: email };

      const user = await usersCollection.findOne(quary);
      const result = { admin: user?.role === "merchant" }
      res.send(result);
    });

    app.get("/user/admin/:email", async (req, res) => {
      const email = req.params.email;
      const quary = { email: email };

      const user = await usersCollection.findOne(quary);
      const result = { admin: user?.role === "admin" }
      res.send(result);
    });


    app.get("/user/superadmin/:email", async (req, res) => {
      const email = req.params.email;
      const quary = { email: email };

      const user = await usersCollection.findOne(quary);
      const result = { super_admin: user?.role === "superAdmin" }
      res.send(result);
    });


    // filter by date 
    app.get("/orders/today", async (req, res) => {
      const today = new Date();
      const formattedToday = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;
      console.log(formattedToday);
      const query = { date: formattedToday }; // Assuming the date field is named 'date'

      try {
        const result = await orderCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching orders for today:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    });
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get("/", (req, res) => {
  res.send("Flynass Server is Running.........")
});

app.listen(port, () => {
  console.log(`Flynass server is running on ${port}`);
});