// preload.js
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve('C:/Users/rayya/Downloads/NASAWINATHON/Backend/.env') });
console.log("✅ Preloaded .env, NASA_API_KEY:", process.env.NASA_API_KEY);
