import fs from "node:fs";
import jwt from "jsonwebtoken";

const privateKey = fs.readFileSync("AuthKey_WLS9RZ2P22.p8");

const token = jwt.sign(
  {
    iss: "T7754BV8QM",          // Team ID
    iat: Math.floor(Date.now() / 1000), // Issued at
    exp: Math.floor(Date.now() / 1000) + 86400 * 180, // Expires in 180 days
    aud: "https://appleid.apple.com",
    sub: "io.godaisy.login",    // Client ID (Service ID)
  },
  privateKey,
  {
    algorithm: "ES256",
    keyid: "WLS9RZ2P22",       // Key ID
  }
);

console.log(token);