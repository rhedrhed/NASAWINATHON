import fs from "fs";
import path from "path";
import dotenv from "dotenv";

console.log("process.cwd():", process.cwd());
console.log("Absolute path to .env:", path.resolve(process.cwd(), ".env"));
console.log(".env exists?", fs.existsSync(path.resolve(process.cwd(), ".env")));

// Load .env explicitly
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
console.log("Loaded NASA_API_KEY:", process.env.NASA_API_KEY);