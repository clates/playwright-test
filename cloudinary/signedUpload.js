/**
 *
 * Cloudinary upload helper - This requires the API_SECRET and API_KEY to be set as an environment variable.
 *
 * Usage: call this script from the command line with the following command:
 *   API_KEY=api_key_from_cloudinary_dashboard API_SECRET=api_secret_from_cloudinary_dashboard  node scripts/cloudinary/signedUpload.js
 *
 * This will upload a random image from picsum to the cloudinary account. The goal here was to demonstrate what the payload would have to look like in order to
 * programatically upload an image to cloudinary. The signature is a SHA1 hash of the following:
 *  1. The unix timestamp
 *  2. Any optional parameters (in this case, just the public_id) but transformations would also be included here
 *
 */
const crypto = require("crypto");
const https = require("https");
const fs = require("fs");

const createSignature = signatureObj => {
  let unhashedSig =
    Object.keys(signatureObj)
      .sort()
      .map(key => {
        return `${key}=${signatureObj[key]}`;
      })
      .join("&") + API_SECRET;

  return crypto.createHash("sha1").update(unhashedSig).digest("hex");
};

const API_KEY = process.env.API_KEY;
const CLOUD_NAME = "crunchbase-production";
const API_SECRET = process.env.API_SECRET;

const timestamp = Date.now();
const public_id = `signedUploadHelper-${timestamp}`;

const signature = {
  // file: "" // Don't include in signature
  // cloud_name: "" // Don't include in signature
  // resource_type: "" // Don't include in signature
  // api_key: "" // Don't include in signature
  public_id, // Not strictly needed in production usage - but included for clarity and easy cleanup here.
  timestamp,
};

const body = {
  file: process.argv[2] ? fs.readFileSync(process.argv[2], 'utf8') : "https://picsum.photos/200/300",
  cloud_name: CLOUD_NAME,
  api_key: API_KEY,
  resource_type: "image",
  signature: createSignature(signature),
  ...signature,
};

const bodyAsJSON = JSON.stringify(body);

const options = {
  hostname: "api.cloudinary.com",
  path: `/v1_1/${CLOUD_NAME}/auto/upload`,
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": bodyAsJSON.length,
  },
};

const req = https.request(options, res => {
  console.log("statusCode:", res.statusCode);
  console.log("headers:", res.headers);

  let result = "";
  res.on("data", d => {
    result += d;
  });
  res.on("end", () => {
    console.log("Writing: ", result);
    fs.writeFileSync(`${process.argv[2]}.uploaded`, `<img src="${JSON.parse(result, null, 2).url
  }"/>`);
    console.log(JSON.parse(result, null, 2));
  });
});

// Perform the POST
req.write(bodyAsJSON);
req.end();

req.r