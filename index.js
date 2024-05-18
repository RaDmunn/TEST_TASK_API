import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import pool from "./db.js";
import userRouter from "./routes/user.routes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(express.static("public"));

pool.connect((err, client, done) => {
  if (err) {
    console.error("Unable to connect to the database:", err);
  } else {
    console.log("Connected to PostgreSQL database");
  }
});

app.use("/", userRouter);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
