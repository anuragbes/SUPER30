import "dotenv/config";
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { generateNextStudentId } from "../src/models/student.models.js";
import Counter from "../src/models/counter.models.js";

// Simulates MongoDB's atomic findOneAndUpdate($inc, upsert:true): the
// running total is incremented synchronously (no await between read and
// write), so concurrent callers can never observe or produce an overlapping
// value -- the same guarantee the real atomic operation provides.
const makeAtomicCounterMock = (t, startingSeq = 0) => {
  let seq = startingSeq;
  return t.mock.method(Counter, "findOneAndUpdate", async () => {
    seq += 1;
    return { seq };
  });
};

describe("generateNextStudentId (Module 8 -- atomic student-ID counter coverage)", () => {
  test("sequential calls produce monotonically increasing IDs", async (t) => {
    makeAtomicCounterMock(t);

    const first = await generateNextStudentId();
    const second = await generateNextStudentId();
    const third = await generateNextStudentId();

    assert.deepEqual([first, second, third], ["STU0001", "STU0002", "STU0003"]);
  });

  test("concurrent calls never produce duplicate IDs", async (t) => {
    makeAtomicCounterMock(t);

    const ids = await Promise.all(Array.from({ length: 20 }, () => generateNextStudentId()));

    assert.equal(ids.length, 20);
    assert.equal(new Set(ids).size, 20, "20 concurrent registrations must yield 20 distinct student IDs");
  });

  test("regression: ID format is 'STU' + seq zero-padded to 4 digits, unchanged", async (t) => {
    t.mock.method(Counter, "findOneAndUpdate", async () => ({ seq: 42 }));
    assert.equal(await generateNextStudentId(), "STU0042");
  });

  test("edge case: a 5+ digit sequence is never truncated -- padStart only pads, never cuts", async (t) => {
    t.mock.method(Counter, "findOneAndUpdate", async () => ({ seq: 10005 }));
    assert.equal(await generateNextStudentId(), "STU10005");
  });

  test("counter failures propagate to the caller instead of silently producing a bad ID", async (t) => {
    t.mock.method(Counter, "findOneAndUpdate", async () => {
      throw new Error("simulated Mongo failure");
    });

    await assert.rejects(() => generateNextStudentId(), /simulated Mongo failure/);
  });
});
