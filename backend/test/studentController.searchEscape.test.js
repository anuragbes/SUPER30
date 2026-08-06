import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { escapeRegex } from "../src/controllers/studentController.js";

// Mirrors the exact query object getAllStudents builds from `search`, so
// regression tests can compare pre-fix vs post-fix output directly instead
// of re-implementing assumptions about it.
const buildSearchQuery = (search) => {
  const escapedSearch = escapeRegex(search);
  return {
    $or: [
      { studentName: { $regex: escapedSearch, $options: "i" } },
      { studentId: { $regex: escapedSearch, $options: "i" } },
    ],
  };
};

describe("escapeRegex (Module 1.2 -- admin search ReDoS/regex-injection fix)", () => {
  test("normal search: plain name is unchanged (no-op escape)", () => {
    assert.equal(escapeRegex("John"), "John");
  });

  test("partial text search: substring terms are unchanged", () => {
    assert.equal(escapeRegex("STU00"), "STU00");
  });

  test("case-insensitive search: escaping does not alter case, $options stays 'i'", () => {
    const query = buildSearchQuery("jOhN");
    assert.equal(query.$or[0].studentName.$options, "i");
    assert.equal(query.$or[0].studentName.$regex, "jOhN");
  });

  test("search with spaces: unchanged", () => {
    assert.equal(escapeRegex("John Doe"), "John Doe");
  });

  test("regression: query object is byte-identical to the pre-fix version for realistic legitimate terms", () => {
    const buildQueryUnescaped = (search) => ({
      $or: [
        { studentName: { $regex: search, $options: "i" } },
        { studentId: { $regex: search, $options: "i" } },
      ],
    });

    for (const term of ["John", "STU0042", "jOhN doe", "O Brien"]) {
      assert.deepEqual(buildSearchQuery(term), buildQueryUnescaped(term));
    }
  });

  describe("regex metacharacters are treated as literal text, not regex syntax", () => {
    const cases = [
      ["C++", "C\\+\\+"],
      ["student(name)", "student\\(name\\)"],
      [".*", "\\.\\*"],
      ["[abc]", "\\[abc\\]"],
      ["(a+)+", "\\(a\\+\\)\\+"],
      ["(a+)+$", "\\(a\\+\\)\\+\\$"],
      ["(a|a)+b", "\\(a\\|a\\)\\+b"],
    ];

    for (const [input, expectedEscaped] of cases) {
      test(`"${input}" escapes to a literal-matching pattern`, () => {
        const escaped = escapeRegex(input);
        assert.equal(escaped, expectedEscaped);

        // The escaped pattern must compile and match ONLY the literal input text.
        const re = new RegExp(escaped, "i");
        assert.equal(re.test(input), true, "must still match the literal string it came from");
      });
    }
  });

  test("malicious payload: classic ReDoS pattern (a+)+$ no longer causes catastrophic backtracking", () => {
    const escaped = escapeRegex("(a+)+$");
    const re = new RegExp(escaped, "i");

    // If this were still interpreted as a real regex, testing against a long
    // run of "a"s with no matching tail would hang (catastrophic backtracking).
    // As a literal pattern, this must return instantly and find no match.
    const start = Date.now();
    const result = re.test("a".repeat(40) + "!");
    const elapsedMs = Date.now() - start;

    assert.equal(result, false);
    assert.ok(elapsedMs < 100, `expected near-instant literal match, took ${elapsedMs}ms`);
  });

  test("malicious payload: .* no longer matches everything -- only the literal string \".*\"", () => {
    const escaped = escapeRegex(".*");
    const re = new RegExp(escaped, "i");

    assert.equal(re.test("Any Random Name"), false, "must NOT match arbitrary text anymore");
    assert.equal(re.test("contains .* literally"), true, "must match the literal substring");
  });

  test("edge case: metacharacters-only input escapes to a valid, harmless pattern", () => {
    for (const input of [".*", "[abc]", "(a+)+", "$^", "\\\\"]) {
      assert.doesNotThrow(() => new RegExp(escapeRegex(input), "i"));
    }
  });

  test("edge case: empty string is never escaped in practice (guarded by the existing `if (search)` check upstream)", () => {
    // escapeRegex itself is a no-op on empty input; documented here so the
    // upstream falsy-check in getAllStudents isn't silently relied upon
    // without a record of why it's safe to skip escaping in that case.
    assert.equal(escapeRegex(""), "");
  });

  test("edge case: Unicode/non-ASCII names are untouched", () => {
    assert.equal(escapeRegex("आर्यन कुमार"), "आर्यन कुमार");
  });
});
