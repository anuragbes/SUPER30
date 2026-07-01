import mongoose from "mongoose";
import { DB_NAME } from "../constant.js";
import { logError } from "../utils/logger.js";


const connectDB = async () => {
    try {
        // Sanitize the URL to prevent "super30/super30" double namespace errors
        let uri = process.env.MONGODB_URL;
        if (uri.endsWith(`/${DB_NAME}`)) {
            uri = uri.slice(0, -(DB_NAME.length + 1));
        } else if (uri.endsWith('/')) {
            uri = uri.slice(0, -1);
        }
        
        const connectionInstance = await mongoose.connect(`${uri}/${DB_NAME}`)
        console.log(`\n MongoDB connected!! DB HOST: ${connectionInstance.connection.host}`)
    } catch (error) {
        logError("[DB] MongoDB connection failed", error);
        process.exit(1)
    }
}

export default connectDB