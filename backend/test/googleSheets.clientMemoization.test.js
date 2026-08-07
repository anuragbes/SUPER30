import { test, describe, mock } from "node:test";
import assert from "node:assert/strict";

// Fake-but-present credentials: getSheets() must actually succeed in
// constructing a client (not merely avoid throwing) for this file to prove
// anything about memoization -- googleSheets.lazyInit.test.js already
// covers the "no credentials at all" import-safety case separately.
process.env.GOOGLE_PRIVATE_KEY = "fake-key-content";
process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = "fake@example.com";
process.env.GOOGLE_SHEET_ID = "fake-sheet-id";

let constructCount = 0;
let sheetsFactoryCount = 0;

// mock.module() must run before the first import of googleSheets.js
// anywhere in this process, since ES module imports are cached per
// specifier -- googleSheets.lazyInit.test.js and this file are always run
// as separate node:test worker processes, so this mock never leaks into
// (or is affected by) that file.
mock.module("googleapis", {
  namedExports: {
    google: {
      auth: {
        GoogleAuth: class {
          constructor() {
            constructCount++;
          }
        },
      },
      sheets: () => {
        sheetsFactoryCount++;
        return {
          spreadsheets: {
            get: async () => {
              // A real network round trip is not instantaneous; without
              // this, a bug that re-constructs per-call could still
              // accidentally look "memoized" if every call happened to
              // resolve before the next one started.
              await new Promise((resolve) => setTimeout(resolve, 20));
              return { data: { sheets: [{ properties: { title: "PCM", sheetId: 1 } }] } };
            },
          },
        };
      },
    },
  },
});

const { getSheetIdByName } = await import("../src/utils/googleSheets.js");

describe("googleSheets.js getSheets() memoization", () => {
  test("initialization occurs exactly once across sequential calls", async () => {
    await getSheetIdByName("PCM");
    await getSheetIdByName("PCM");
    await getSheetIdByName("PCM");

    assert.equal(constructCount, 1, "GoogleAuth must be constructed exactly once, not once per call");
    assert.equal(sheetsFactoryCount, 1, "google.sheets() must be called exactly once, not once per call");
  });

  test("repeated calls reuse the same client even when genuinely concurrent", async () => {
    // The client is a true module-level singleton (sheetsClient in
    // googleSheets.js), already constructed once by the previous test in
    // this file. Correctly, that means these 25 concurrent calls must
    // trigger ZERO additional constructions -- not "construct once more".
    // Resetting the counters here and asserting they stay at 0 is what
    // actually proves the singleton persists across calls, not just within
    // a single batch.
    constructCount = 0;
    sheetsFactoryCount = 0;

    const results = await Promise.all(
      Array.from({ length: 25 }, () => getSheetIdByName("PCM")),
    );

    assert.equal(constructCount, 0, "an already-constructed client must never be rebuilt, even by 25 concurrent callers");
    assert.equal(sheetsFactoryCount, 0);
    assert.ok(results.every((r) => r === results[0]), "every concurrent caller must observe the same result");
  });
});
