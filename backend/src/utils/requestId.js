import crypto from "crypto";

export const generateRequestId = () => crypto.randomUUID().split("-")[0];
