import Chance from "chance";
import pool from "../db.js";
const chance = new Chance();

async function seedDatabase() {
  try {
    for (let i = 0; i < 45; i++) {
      const name = chance.name();
      const email = chance.email({ domain: "example.com" });
      const phone = `+380${chance.string({ length: 9, pool: "0123456789" })}`;
      const position = chance.profession({ rank: true }).substring(0, 30);
      const photo = chance.avatar({
        protocol: "https",
        fileExtension: "jpg",
      });
      const createdAt = chance.date({ year: new Date().getFullYear() - 1 });

      const query = `
            INSERT INTO users (name, email, phone, position, photo, created_at)
            VALUES ($1, $2, $3, $4, $5, $6)
          `;
      await pool.query(query, [name, email, phone, position, photo, createdAt]);
    }
    console.log("Database seeded successfully");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}

export default seedDatabase;
