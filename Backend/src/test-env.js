import dotenv from "dotenv";
import path from "path";

// Explicit absolute path to Backend/.env
const envPath = path.resolve('C:/Users/rayya/Downloads/NASAWINATHON/Backend/.env');
dotenv.config({ path: envPath });

console.log("Reading .env from:", envPath);
console.log("NASA_API_KEY =", process.env.NASA_API_KEY);