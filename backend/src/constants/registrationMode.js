// Single source of truth for the Junior/Senior split of `classMoving`
// values. Both the Student schema (enum + stream.required()) and the
// registration-mode gate in studentController.js consume this module, so
// the two can never silently drift apart the way two independently
// hardcoded lists could.
//
// Values are taken as-is from the pre-existing Student schema -- nothing
// added, nothing renamed, nothing reordered.

export const SENIOR_CLASS_MOVING_VALUES = ["10th to 11th", "11th to 12th"];

export const CLASS_MOVING_VALUES = [
  "Class 8",
  "Class 9",
  "Class 10",
  ...SENIOR_CLASS_MOVING_VALUES,
];

// Classifies a submitted `classMoving` value as "junior" or "senior", or
// null if it isn't a recognized value. A null result is deliberately not
// treated as an error here -- the Student schema's own `enum` constraint on
// `classMoving` is what rejects unrecognized values; this function only
// answers "which mode does this belong to, if any."
export const getSubmissionMode = (classMoving) => {
  if (SENIOR_CLASS_MOVING_VALUES.includes(classMoving)) return "senior";
  if (CLASS_MOVING_VALUES.includes(classMoving)) return "junior";
  return null;
};
