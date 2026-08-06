import { sanitize as sanitizeMongo } from "express-mongo-sanitize";

// Strips any $-prefixed or dotted keys from req.body/req.params to guard
// against NoSQL operator injection. Deliberately does NOT use
// express-mongo-sanitize's default middleware() export or touch req.query:
// in Express 5, req.query is a live getter (a fresh object on every access,
// not a cached property) with no setter, so any code that reassigns it --
// which the package's default middleware() unconditionally does for every
// request -- throws immediately. req.body/req.params are plain, writable,
// cached objects in Express 5, so mutating them in place here is safe.
export const sanitizeRequest = (req, res, next) => {
  if (req.body) sanitizeMongo(req.body);
  if (req.params) sanitizeMongo(req.params);
  next();
};
