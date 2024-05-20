import pool from "../db.js";
import sharp from "sharp";
import tinify from "tinify";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

tinify.key = TINYPNG_API_KEY;

async function optimizeImage(imageBuffer) {
  try {
    const optimizedResult = await tinify.fromBuffer(imageBuffer).toBuffer();
    return optimizedResult;
  } catch (error) {
    console.error("Error optimizing image:", error);
    throw error;
  }
}

class UserController {
  async createUser(req, res) {
    try {
      const { name, email, phone, position } = req.body;
      const photo = req.file;

      // Validate input fields
      if (!name || name.length < 2 || name.length > 60) {
        return res.status(422).json({
          success: false,
          message: "Validation failed",
          fails: {
            name: ["The name must be between 2 and 60 characters."],
          },
        });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        return res.status(422).json({
          success: false,
          message: "Validation failed",
          fails: {
            email: ["The email must be a valid email address."],
          },
        });
      }

      const phoneRegex = /^\+380\d{9}$/;
      if (!phone || !phoneRegex.test(phone)) {
        return res.status(422).json({
          success: false,
          message: "Validation failed",
          fails: {
            phone: [
              "The phone must start with code of Ukraine +380 and contain 12 digits.",
            ],
          },
        });
      }

      if (!String.isInteger(parseInt(position))) {
        return res.status(422).json({
          success: false,
          message: "Validation failed",
          fails: {
            position_id: ["The position id must be a string."],
          },
        });
      }

      if (!photo) {
        return res.status(422).json({
          success: false,
          message: "Validation failed",
          fails: {
            photo: ["The photo field is required."],
          },
        });
      }

      // Check the photo's format and size
      if (!photo.mimetype.startsWith("image/jpeg")) {
        return res.status(422).json({
          success: false,
          message: "Validation failed",
          fails: {
            photo: ["The photo must be a jpeg/jpg image."],
          },
        });
      }

      if (photo.size > 5 * 1024 * 1024) {
        // 5MB
        return res.status(422).json({
          success: false,
          message: "Validation failed",
          fails: {
            photo: ["The photo size must not exceed 5 MB."],
          },
        });
      }

      // Resize and compress the image
      const resizedImageBuffer = await sharp(photo.buffer)
        .resize(70, 70, {
          fit: sharp.fit.cover,
          position: sharp.strategy.entropy,
        })
        .toBuffer();

      const optimizedImageBuffer = await optimizeImage(resizedImageBuffer);

      const photoBase64 = optimizedImageBuffer.toString("base64");

      // Check for existing user with same phone or email
      const existingUser = await pool.query(
        "SELECT * FROM users WHERE email = $1 OR phone = $2",
        [email, phone]
      );

      if (existingUser.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: "User with this phone or email already exist",
        });
      }

      // Insert new user into the database
      const result = await pool.query(
        "INSERT INTO users (name, email, phone, position, photo) VALUES ($1, $2, $3, $4, $5) RETURNING id",
        [name, email, phone, position, photoBase64]
      );

      res.status(201).json({
        success: true,
        user_id: result.rows[0].id,
        message: "New user successfully registered",
      });
    } catch (err) {
      console.error("Error:", err);
      if (err instanceof ValidationError) {
        res.status(422).json({
          success: false,
          message: "Validation failed",
          fails: err.errors,
        });
      } else {
        res
          .status(500)
          .json({ success: false, message: "Internal server error" });
      }
    }
  }

  async getUsers(req, res) {
    const { page = 1, count = 10 } = req.query;
    const offset = (page - 1) * count;

    try {
      const totalUsersResult = await pool.query("SELECT COUNT(*) FROM users");
      const totalUsers = parseInt(totalUsersResult.rows[0].count, 10);
      const totalPages = Math.ceil(totalUsers / count);

      const usersResult = await pool.query(
        "SELECT * FROM users ORDER BY id ASC LIMIT $1 OFFSET $2",
        [count, offset]
      );

      res.json({
        success: true,
        total_pages: totalPages,
        total_users: totalUsers,
        count: parseInt(count, 10),
        page: parseInt(page, 10),
        links: {
          next_url:
            page < totalPages ? `/users?page=${page + 1}&count=${count}` : null,
          prev_url: page > 1 ? `/users?page=${page - 1}&count=${count}` : null,
        },
        users: usersResult.rows,
      });
    } catch (err) {
      console.error("Error fetching users:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  async getUserById(req, res) {
    try {
      const userId = req.params.id;
      const user = await pool.query("SELECT * FROM users WHERE id = $1", [
        userId,
      ]);

      if (user.rows.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json(user.rows[0]);
    } catch (err) {
      console.error("Error fetching user by ID:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  async getUsersPositions(req, res) {
    try {
      const positions = await pool.query(
        "SELECT DISTINCT id, position as name FROM users"
      );
      if (positions.rows.length === 0) {
        return res
          .status(422)
          .json({ success: false, message: "Positions not found" });
      }
      const positionsArray = positions.rows.map((row) => ({
        id: row.id,
        name: row.name,
      }));
      res.status(200).json({ success: true, positions: positionsArray });
    } catch (err) {
      console.error("Error fetching positions:", err);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  }

  async getUserToken(req, res) {
    try {
      function generateToken() {
        return crypto.randomBytes(64).toString("base64");
      }
      const token = generateToken();
      res.status(200).json({ success: true, token: token });
    } catch (err) {
      console.error("Error generating token:", err);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  }

  async getPage(req, res) {
    try {
      const page = parseInt(req.query.page) || 1; // Get page number from query parameter, default to 1
      const limit = 6; // Number of users per page
      const offset = (page - 1) * limit; // Calculate offset based on page number

      // Query to get the total count of users
      const usersCountQuery = await pool.query("SELECT COUNT(*) FROM users");
      const totalCount = parseInt(usersCountQuery.rows[0].count); // Total number of users

      // Calculate total pages
      const totalPages = Math.ceil(totalCount / limit);

      // Query to get users for the current page
      const usersQuery = await pool.query(
        "SELECT * FROM users ORDER BY id ASC LIMIT $1 OFFSET $2",
        [limit, offset]
      );
      const users = usersQuery.rows;

      // Render the users and pagination details using EJS template
      res.render("index.ejs", { users, totalPages, currentPage: page });
    } catch (error) {
      console.error("Error:", error);
      res.status(500).send("Internal Server Error");
    }
  }

  async generateUsers(req, res) {
    try {
    } catch (error) {
      console.error("Error:", error);
      res.status(500).send("Internal Server Error");
    }
  }
}

export default new UserController();
