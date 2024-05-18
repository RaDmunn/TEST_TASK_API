import pg from "pg";
import Chance from "chance";

const chance = new Chance();

const pool = new pg.Pool({
  user: "postgres",
  host: "127.0.0.1",
  database: "postgres",
  password: "123456",
  port: 5432,
});

const createUserTableQuery = `
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(60) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(25) NOT NULL,
    position VARCHAR(50) NOT NULL,
    photo VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`;

async function seedDatabase() {
  try {
    const res = await pool.query('SELECT COUNT(*) FROM users');
    const userCount = parseInt(res.rows[0].count, 10);

    if (userCount === 0) {
      for (let i = 0; i < 45; i++) {
        const name = chance.name();
        const email = chance.email({ domain: "example.com" });
        const phone = `+380${chance.string({ length: 9, pool: '0123456789' })}`;
        const position = chance.profession({ rank: true }).substring(0, 30);
        const photo = chance.avatar({ protocol: 'https', fileExtension: 'jpg' });
        const createdAt = chance.date({ year: new Date().getFullYear() - 1 });

        const query = `
          INSERT INTO users (name, email, phone, position, photo, created_at)
          VALUES ($1, $2, $3, $4, $5, $6)
        `;
        await pool.query(query, [name, email, phone, position, photo, createdAt]);
      }
      console.log("Database seeded successfully");
    } else {
      console.log("Users already exist in the database, skipping seeding");
    }
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}

pool
  .query(createUserTableQuery)
  .then(() => {
    console.log("User table created successfully");
    return seedDatabase();
  })
  .catch((err) => console.error("Error creating user table:", err));

export default pool;
