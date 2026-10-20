import test from "node:test";
import assert from "node:assert/strict";
import {
  compare,
  divide,
  equal,
  formatFraction,
  gcd,
  inverse,
  multiply,
  rational,
} from "../math.js";
import {
  deriveInterval,
  deriveNote,
  evaluateOperations,
  INTERVALS,
  NOTE_ORDER,
  scaleNotes,
  targetLength,
} from "../model.js";

const expectedLengths = {
  C: "1",
  G: "2/3",
  D: "8/9",
  A: "16/27",
  E: "64/81",
  F: "3/4",
  H: "128/243",
  "C′": "1/2",
};

test("each named note has its exact Pythagorean string length", () => {
  for (const [note, expected] of Object.entries(expectedLengths)) {
    assert.equal(formatFraction(targetLength(note)), expected, note);
    assert.equal(formatFraction(deriveNote(note).target), expected, note);
  }
});

test("rational arithmetic reduces fractions and compares exactly", () => {
  assert.equal(formatFraction(rational(8n, 18n)), "4/9");
  assert.equal(formatFraction(multiply(rational(2n, 3n), rational(2n, 3n))), "4/9");
  assert.equal(formatFraction(divide(rational(8n, 9n), rational(2n, 3n))), "4/3");
  assert.equal(compare(rational(128n, 243n), rational(1n, 2n)), 1);
  assert.equal(equal(rational(4n, 6n), rational(2n, 3n)), true);
});

test("frequency ratios are inverse to string-length ratios", () => {
  for (const note of NOTE_ORDER) {
    assert.equal(formatFraction(inverse(targetLength(note))), formatFraction(inverse(deriveNote(note).target)));
  }
  for (const interval of Object.values(INTERVALS)) {
    assert.equal(formatFraction(inverse(interval.result)), formatFraction(interval.frequency));
  }
});

test("octave normalization puts derived notes in the reference octave", () => {
  for (const note of NOTE_ORDER) {
    const derivation = deriveNote(note);
    assert.ok(compare(derivation.target, rational(1n, 2n)) >= 0, note);
    assert.ok(compare(derivation.target, rational(1n)) <= 0, note);
    assert.equal(formatFraction(evaluateOperations(derivation.operations)), expectedLengths[note], note);
  }
});

test("D shows both fifths and the octave adjustment exactly", () => {
  const derivation = deriveNote("D");
  const fifthResults = derivation.operations
    .filter((operation) => operation.type === "multiply-length")
    .map((operation) => formatFraction(operation.after));
  assert.deepEqual(fifthResults, ["2/3", "4/9"]);
  const normalization = derivation.operations.find((operation) => operation.type === "normalize-octave");
  assert.equal(formatFraction(normalization.before), "4/9");
  assert.equal(formatFraction(normalization.factor), "2");
  assert.equal(formatFraction(normalization.after), "8/9");
});

test("each interval construction evaluates to its displayed ratio", () => {
  for (const id of Object.keys(INTERVALS)) {
    const derivation = deriveInterval(id);
    assert.equal(formatFraction(evaluateOperations(derivation.operations)), formatFraction(derivation.target));
  }
  assert.equal(formatFraction(deriveInterval("octave").target), "1/2");
  assert.equal(formatFraction(deriveInterval("fifth").target), "2/3");
  assert.equal(formatFraction(deriveInterval("fourth").target), "3/4");
});

test("C′ is constructed by dividing the string into two equal halves", () => {
  const derivation = deriveNote("C′");
  assert.deepEqual(derivation.operations.map((operation) => operation.type), [
    "divide",
    "select-segment",
    "multiply-length",
  ]);
  assert.equal(formatFraction(evaluateOperations(derivation.operations)), "1/2");
});

test("every scale overview derivation evaluates to its displayed result", () => {
  assert.deepEqual(scaleNotes().map((entry) => entry.note), NOTE_ORDER);
  for (const entry of scaleNotes()) {
    assert.ok(equal(evaluateOperations(entry.derivation.operations), entry.ratio), entry.note);
  }
});

test("all fractions in displayed derivations are in lowest terms", () => {
  const values = [];
  for (const note of NOTE_ORDER) {
    const derivation = deriveNote(note);
    values.push(derivation.target, derivation.rawLength);
    for (const operation of derivation.operations) {
      for (const key of ["before", "after", "factor"]) {
        if (operation[key]) values.push(operation[key]);
      }
    }
  }
  for (const interval of Object.values(INTERVALS)) {
    values.push(interval.result, interval.frequency);
  }
  for (const value of values) {
    assert.equal(gcd(value.n < 0n ? -value.n : value.n, value.d), 1n, formatFraction(value));
  }
});

test("replaying or reversing operation prefixes preserves exact state", () => {
  const operations = deriveNote("E").operations;
  const completedStates = [rational(1n)];
  for (let index = 1; index <= operations.length; index += 1) {
    completedStates.push(evaluateOperations(operations.slice(0, index)));
  }
  assert.equal(formatFraction(completedStates.at(-1)), "64/81");
  for (let index = operations.length - 1; index >= 0; index -= 1) {
    assert.equal(formatFraction(evaluateOperations(operations.slice(0, index))), formatFraction(completedStates[index]));
  }
  assert.equal(formatFraction(evaluateOperations(operations)), "64/81");
});

test("fractions reject invalid denominators and division by zero", () => {
  assert.throws(() => rational(1n, 0n), RangeError);
  assert.throws(() => divide(rational(1n), rational(0n)), RangeError);
});
