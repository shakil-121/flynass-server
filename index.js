const express = require("express");
const app = express();
const port = process.env.PORT || 5000;
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");

// for csv file upload
const multer = require("multer");
const csvParser = require("csv-parser");
const fs = require("fs");

const uploadDir = "./uploads";

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Midelware
app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "unauthorized access" });
  }
  // bearer token
  const token = authorization.split(" ")[1];

  jwt.verify(token, process.env.Access_token, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .send({ error: true, message: "unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
};

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ts9e2p2.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const usersCollection = client.db("flynass").collection("users");
    const orderCollection = client.db("flynass").collection("orders");
    const noticeCollection = client.db("flynass").collection("notice");

    // jwt token create
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.Access_token, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    //  notice update  
    app.put("/notice/:id", async (req, res) => {
      const id = req.params.id;
      const notice = req.body.notice;
      const filter = { _id: new ObjectId(id) }
      const updateNotice = {
        $set: {
          notice: notice,
        },
      };
      const result = await noticeCollection.updateOne(filter, updateNotice);
      res.send(result);

    })
    app.get("/get_notice", async (req, res) => {
      const result = await noticeCollection.findOne();
      res.send(result)
    })


    app.post("/users", async (req, res) => {
      users = req.body;
      console.log(users);
      const query = { email: users.email };
      const existingusers = await usersCollection.findOne(query);
      if (existingusers) {
        return res.send({ message: "Merchant already exists" });
      }
      const result = await usersCollection.insertOne(users);
      res.send(result);
    });

    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };

      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // single user delete API 
    app.delete("/users/:id", async (req, res) => {
      const id = req.params.id;

      const quary = { _id: new ObjectId(id) }
      const result = await usersCollection.deleteOne(quary);
      res.send(result)
    })

    // update user info 
    app.put("/user/update/:id", async (req, res) => {
      const id = req.params.id;
      const user = req.body;
      console.log(user);
      // const filter = { _id: new ObjectId(id) };
      const filter = { _id: new ObjectId(id) };
      // const options = { upsert: true };
      const updateProfile = {
        $set: {
          name: user.name,
          phone: user.phone,
          address: user.address,
          account_number: user.account_number,
          bank_name: user.bank_name,
          branch_name: user.branch_name,
          payment_method: user.payment_method,
          routing_number: user.routing_number,
          merchant_name:user.merchant_name,
        },
      };
      const result = await usersCollection.updateOne(filter, updateProfile);
      res.send(result);
    });

    // user role update 
    app.put("/user/role_update/:id", async (req, res) => {
      const id = req.params.id;
      // const user = req.body;
      // console.log(user);
      // const filter = { _id: new ObjectId(id) };
      const filter = { _id: new ObjectId(id) };
      // const options = { upsert: true };
      const updaterole = {
        $set: {
          role: "merchant",
        },
      };
      const result = await usersCollection.updateOne(filter, updaterole);
      res.send(result);
    });



    app.get("/user/:email", async (req, res) => {
      const email = req.params.email;
      const quary = { email: email };

      const result = await usersCollection.findOne(quary);
      res.send(result);
    });

    app.get("/users", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.post("/orders", async (req, res) => {
      const order = req.body;

      // Add the createdAt field with the current date to the order
      //  order.createdAt = new Date();

      const result = await orderCollection.insertOne(order);
      res.send(result);

      // Schedule the deletion of the order after one month
      // scheduleOrderDeletion(result.insertedId);
    });


    //  // Function to schedule the deletion of the order after one month
    //  function scheduleOrderDeletion(orderId) {
    //    const oneMonthInMilliseconds = 31 * 24 * 60 * 60 * 1000; // One month in milliseconds
    //   setTimeout(async () => {
    //     try {
    //       const query = { _id: new ObjectId(orderId) };
    //       const result = await orderCollection.deleteOne(query);
    //       console.log("Deleted order:", result.deletedCount);
    //     } catch (error) {
    //       console.error("Error deleting order:", error);
    //     }
    //   }, oneMonthInMilliseconds);
    // }

    app.get("/orders", async (req, res) => {
      const result = await orderCollection.find().toArray();
      res.send(result);
    });

    app.get("/user/order/:email", async (req, res) => {
      const email = req.params.email;
      const quary = { user_email: email }
      const result = await orderCollection.find(quary).toArray();
      res.send(result)
    })

    // app.put("/orders/:id", async (req, res) => {
    //   const id = req.params.id;
    //   const updatInfo = req.body;
    //   console.log(updatInfo); 
    // });

    // update order info 
    app.put("/order/:id", async (req, res) => {
      const id = req.params.id;
      const updateInfo = req.body;
      console.log(updateInfo);
      // const filter = { _id: new ObjectId(id) };
      const filter = { _id: new ObjectId(id) };
      // const options = { upsert: true };
      const updateProfile = {
        $set: {
          phone: updateInfo.phone,
          to_address: updateInfo.to_address,
        },
      };
      const result = await orderCollection.updateOne(filter, updateProfile);
      res.send(result);
    });

    // update order info for admin
    app.put("/order/admin/:id", async (req, res) => {
      const id = req.params.id;
      const updateInfo = req.body;
      console.log(updateInfo);
      // const filter = { _id: new ObjectId(id) };
      const filter = { _id: new ObjectId(id) };
      // const options = { upsert: true };
      const updateProfile = {
        $set: {
          from_address: updateInfo.from_address,
          to_address: updateInfo.to_address,
          delivary_Charge: updateInfo.delivary_Charge,
          cod: updateInfo.cod,
          total_amount: updateInfo.total_amount,
          payable_amount: updateInfo.payable_amount,
        },
      };
      const result = await orderCollection.updateOne(filter, updateProfile);
      res.send(result);
    });

    // delete single order 
    app.delete("/order/:id", async (req, res) => {
      const id = req.params.id;
      const quary = { _id: new ObjectId(id) };

      const result = await orderCollection.deleteOne(quary);
      res.send(result)
    })

    app.put("/order/status/:id", async (req, res) => {
      const id = req.params.id;
      const updateInfo = req.body;
      console.log(updateInfo);
      // const filter = { _id: new ObjectId(id) };
      const filter = { _id: new ObjectId(id) };
      // const options = { upsert: true };
      const updateProfile = {
        $set: {
          status: updateInfo.status,
        },
      };
      const result = await orderCollection.updateOne(filter, updateProfile);
      res.send(result);
    });

    // update many ID data 
    // app.put("/order/status", async (req, res) => {
    //   const { ids, status } = req.body;

    //   if (!Array.isArray(ids) || ids.length === 0) {
    //     return res.status(400).json({ error: "Invalid parcel IDs provided." });
    //   }

    //   // Convert the array of IDs to an array of ObjectIds
    //   const objectIds = ids.map((id) => new ObjectId(id));

    //   const filter = { _id: { $in: objectIds } };
    //   const updateProfile = {
    //     $set: {
    //       status: status,
    //     },
    //   };

    //   try {
    //     const result = await orderCollection.updateMany(filter, updateProfile);
    //     res.json({ acknowledged: result.acknowledged, modifiedCount: result.modifiedCount });
    //   } catch (error) {
    //     console.error(error);
    //     res.status(500).json({ error: "Failed to update parcels." });
    //   }
    // });

    app.patch("/order/multi-status", async (req, res) => {
      const { ids, status } = req.body;

      const objectIds = ids.map((id) => new ObjectId(id));

      const filter = { _id: { $in: objectIds } };
      const updateStatus = {
        $set: {
          status: status,
        },
      };


      try {
        const result = await orderCollection.updateMany(filter, updateStatus, { multi: true });
        console.log(result); // Log the result for debugging
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to update orders." });
      }
    });



    app.put("/order/payment/:id", async (req, res) => {
      const id = req.params.id;
      // const updatePaymentStatusInfo = req.body;
      // console.log(updatePaymentStatusInfo);
      // const filter = { _id: new ObjectId(id) };
      const filter = { _id: new ObjectId(id) };
      // const options = { upsert: true };
      const updatePaymentStatus = {
        $set: {
          payment_status: "paid",
        },
      };
      const result = await orderCollection.updateOne(filter, updatePaymentStatus);
      res.send(result);
    });

    // search 
    // app.get("/orders/:text", async (req, res) => {
    //   const text = req.params.text;
    //   const result = await orderCollection
    //     .find({
    //       $or: [
    //         { _id: { $regex: text, $options: "i" } },
    //         { phone: { $regex: text, $options: "i" } },
    //       ],
    //     })
    //     .toArray();
    //   res.send(result);
    // }) 
    app.get("/orders/:text", async (req, res) => {
      const text = req.params.text;
      let query = {};

      // Check if the input text can be converted to ObjectId
      if (ObjectId.isValid(text)) {
        query = { _id: new ObjectId(text) };
      } else {
        query = {
          $or: [
            { _id: { $regex: text, $options: "i" } },
            { phone: { $regex: text, $options: "i" } },
            { name: { $regex: text, $options: "i" } },
            { merchant_name: { $regex: text, $options: "i" } },
            { trackingId: { $regex: text, $options: "i" } },
            { user_email: { $regex: text, $options: "i" } },
            { status: { $regex: text, $options: "i" } },
          ],
        };
      }

      const result = await orderCollection.find(query).toArray();
      res.send(result);
    });


    // This is for csv file upload
    // File upload configuration
    const upload = multer({ dest: "uploads/" });

    // File upload endpoint
    // app.post("/upload", upload.single("csvFile"), (req, res) => {
    //   const file = req.file;
    //   console.log(file.originalname);
    //   console.log(file);
    //   const user_email = req.body.user_email;
    //   const id = req.body.marchent_id;
    //   // const TrackingID = req.body.trackingId;
    //   const fromAddress = req.body.from_address;
    //   const date = req.body.date;
    //   const status = "pending";
    //   if (!file) {
    //     return res.status(400).json({ error: "No CSV file uploaded" });
    //   }

    //   const results = [];

    //   // Parse CSV file and save data to MongoDB
    //   fs.createReadStream(file.path)
    //     .pipe(csvParser())
    //     .on("data", (row) => {
    //       // Assuming the CSV has columns 'name', 'age', 'email'
    //       // Adjust this according to your actual CSV structure
    //       const currentDate = new Date();
    //       const formattedDay = String(currentDate.getDate()).padStart(2, "0");
    //       const formattedMonth = String(currentDate.getMonth() + 1).padStart(2, "0");
    //       const year = currentDate.getFullYear();
    //       const dateString = `${formattedDay}${formattedMonth}${year}`;
    //       const trackingId = `${dateString}-${trackingIdCounter.toString().padStart(4, "0")}`;
    //       trackingIdCounter++;
    //       results.push({
    //         marchent_id: id,
    //         name: row["Marchent name"],
    //         customer_phone: row["Coustomer phone number"],
    //         customer_name: row["Customer name"],
    //         from_address: fromAddress,
    //         to_address: row["Customer Adress"],
    //         district: row["District Name"],
    //         thana: row["Thana Name"],
    //         product_amount: row["Actual Price"],
    //         delivary_Charge: row.delivary_Charge,
    //         cod: row.cod,
    //         total_amount: row.total_amount,
    //         special_instruction: row["Special instruction"],
    //         user_email: user_email,
    //         status: status,
    //         date: date,
    //         trackingId: trackingId,
    //       });
    //     })
    //     .on("end", () => {
    //       // Save the data to MongoDB
    //       orderCollection.insertMany(results, (err, result) => {
    //         if (err) {
    //           res.status(500).json({ error: "Error saving data to MongoDB" });
    //         } else {
    //           const result = res
    //             .status(200)
    //             .json({ message: "Data saved to MongoDB successfully" });
    //           console.log(result);
    //         }
    //       });
    //     });
    //   res.send(results)
    // });

    // Import necessary modules and set up your app, middleware, etc.

    // File upload endpoint
    app.post("/upload", upload.single("csvFile"), (req, res) => {
      const file = req.file;
      console.log(file);
      const user_email = req.body.user_email;
      const id = req.body.marchent_id;
      const fromAddress = req.body.from_address;
      const date = req.body.date;
      const status = "pending";

      const previousLength = req.body.previousLength;

      if (!file) {
        return res.status(400).json({ error: "No CSV file uploaded" });
      }

      const results = [];
      let trackingIdCounter = previousLength; // Initialize the tracking ID counter

      // Parse CSV file and save data to MongoDB
      fs.createReadStream(file.path)
        .pipe(csvParser())
        .on("data", (row) => {
          // Generate a new tracking ID for each order
          const currentDate = new Date();
          const formattedDay = String(currentDate.getDate()).padStart(2, "0");
          const formattedMonth = String(currentDate.getMonth() + 1).padStart(2, "0");
          const year = currentDate.getFullYear();
          const dateString = `${formattedDay}${formattedMonth}${year}`;
          const lastDigit = "FN";
          const trackingId = `${dateString}-${trackingIdCounter.toString().padStart(4, "0")}-${lastDigit}`;
          trackingIdCounter++;

          // Assuming the CSV has columns 'name', 'age', 'email'
          // Adjust this according to your actual CSV structure
          results.push({
            marchent_id: id,
            merchant_name: row["Marchent name"],
            customer_phone: row["Coustomer phone number"],
            customer_name: row["Customer name"],
            from_address: fromAddress,
            to_address: row["Customer Adress"],
            district: row["District Name"],
            thana: row["Thana Name"],
            product_amount: row["Actual Price"],
            delivary_Charge: row.delivary_Charge,
            cod: row.cod,
            total_amount: row.total_amount,
            special_instruction: row["Special instruction"],
            user_email: user_email,
            status: status,
            payment_status: "due",
            date: date,
            trackingId: trackingId, // Use the generated tracking ID
          });
        })
        .on("end", () => {
          // Save the data to MongoDB
          orderCollection.insertMany(results, (err, result) => {
            if (err) {
              res.status(500).json({ error: "Error saving data to MongoDB" });
            } else {
              res.status(200).json({ message: "Data saved to MongoDB successfully" });
            }
          });
        });
      res.send(results)
    });

    // Start your server and listen on a port


    // delete multipul order by filtering status
    app.delete("/delete", async (req, res) => {
      const query = { status: { $in: ["delivered", "rejected", "returned to merchant"] } };

      try {
        const result = await orderCollection.deleteMany(query);
        res.send(result);
      } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred while deleting orders.');
      }
    });

    // admin and superAdmin finding ============================
    app.get("/user/merchant/:email", async (req, res) => {
      const email = req.params.email;
      const quary = { email: email };

      const user = await usersCollection.findOne(quary);
      const result = { admin: user?.role === "merchant" };
      res.send(result);
    });

    app.get("/user/admin/:email", async (req, res) => {
      const email = req.params.email;
      const quary = { email: email };

      const user = await usersCollection.findOne(quary);
      const result = { admin: user?.role === "admin" };
      res.send(result);
    });

    app.get("/user/superadmin/:email", async (req, res) => {
      const email = req.params.email;
      const quary = { email: email };

      const user = await usersCollection.findOne(quary);
      const result = { super_admin: user?.role === "superAdmin" };
      res.send(result);
    });

    // filter by date
    app.get("/today", async (req, res) => {
      const today = new Date();
      // console.log(today);
      const formattedToday = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;
      // console.log("Today",formattedToday);
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
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/health", (req, res) => {
  res.status(200).json({ success: true });
})

app.get("/", (req, res) => {
  res.send("Flynass Server is Running.........");
});

app.listen(port, () => {
  console.log(`Flynass server is running on ${port}`);
});
