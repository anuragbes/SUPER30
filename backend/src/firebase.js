import admin from "firebase-admin";
import { createRequire } from "module";
const require = createRequire(import.meta.url);

// Import credentials.json from the root directory
// Adjust the path if necessary depending on where this file is located relative to root
let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch (error) {
        console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT environment variable", error);
    }
} else {
    try {
        serviceAccount = require("../credentials/credentials.json");
    } catch (error) {
        console.warn("credentials.json not found and FIREBASE_SERVICE_ACCOUNT not set.");
    }
}

if (serviceAccount) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
} else {
    console.error("Firebase Admin initialization failed: No credentials provided.");
}

export const auth = admin.auth();
export default admin;
