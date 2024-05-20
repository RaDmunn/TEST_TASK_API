import pool from "../db.js";

async function clearDatabase() {
  try {
    const query = "DELETE FROM users";
    await pool.query(query);
    console.log("All users deleted successfully");
  } catch (error) {
    console.error("Error deleting users:", error);
  }
}

export default clearDatabase;
