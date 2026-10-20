import { compare, equal, formatFraction, multiply, powerOfTwo, rational } from "./math.js";

export const NOTE_ORDER = ["C", "D", "E", "F", "G", "A", "H", "C′"];

const NOTE_DEFINITIONS = {
  C: { fifths: 0, octaveShift: 0, color: "coral" },
  G: { fifths: 1, octaveShift: 0, color: "blue" },
  D: { fifths: 2, octaveShift: 1, color: "gold" },
  A: { fifths: 3, octaveShift: 1, color: "violet" },
  E: { fifths: 4, octaveShift: 2, color: "green" },
  H: { fifths: 5, octaveShift: 2, color: "blue" },
  F: { fifths: -1, octaveShift: -1, color: "gold" },
  "C′": { fifths: 0, octaveShift: -1, color: "coral" },
};

export const INTERVALS = {
  octave: {
    label: "Oktave",
    frequency: rational(2n),
    parts: 2,
    selected: 1,
    result: rational(1n, 2n),
    explanation: "Die Saite wird in 2 gleiche Teile geteilt. 1 von 2 Teilen schwingt: 1 × 1/2 = 1/2.",
  },
  fifth: {
    label: "Reine Quinte",
    frequency: rational(3n, 2n),
    parts: 3,
    selected: 2,
    result: rational(2n, 3n),
    explanation: "Die Saite wird in 3 gleiche Teile geteilt. 2 Teile bleiben übrig: 1 × 2/3 = 2/3.",
  },
  fourth: {
    label: "Reine Quarte",
    frequency: rational(4n, 3n),
    parts: 4,
    selected: 3,
    result: rational(3n, 4n),
    explanation: "Die Saite wird in 4 gleiche Teile geteilt. 3 Teile schwingen: 1 × 3/4 = 3/4.",
  },
};

function makeOperation(type, details) {
  return Object.freeze({ type, ...details });
}

function makeFifthOperations(count) {
  const operations = [];
  let current = rational(1n);
  const direction = count < 0 ? -1 : 1;

  for (let index = 0; index < Math.abs(count); index += 1) {
    const before = current;
    if (direction > 0) {
      const factor = rational(2n, 3n);
      const after = multiply(before, factor);
      operations.push(
        makeOperation("divide", { parts: 3, before, label: "Saite in 3 gleiche Teile teilen" }),
        makeOperation("select-segment", {
          count: 2,
          parts: 3,
          before,
          label: "2 von 3 Teilen auswählen",
        }),
        makeOperation("multiply-length", {
          factor,
          before,
          after,
          label: `${formatFraction(before)} × 2/3 = ${formatFraction(after)}`,
          explanation: "Eine aufsteigende Quinte verkürzt die Saite auf zwei Drittel.",
        }),
      );
      current = after;
    } else {
      const factor = rational(3n, 2n);
      const after = multiply(before, factor);
      operations.push(
        makeOperation("extend-segment", {
          before,
          addedFraction: rational(1n, 2n),
          label: "Die Saite um die Hälfte ihrer Länge verlängern",
        }),
        makeOperation("multiply-length", {
          factor,
          before,
          after,
          label: `${formatFraction(before)} × 3/2 = ${formatFraction(after)}`,
          explanation: "Eine absteigende Quinte verlängert die Saite auf das Dreifache ihrer halben Länge.",
        }),
      );
      current = after;
    }
  }
  return { operations, rawLength: current };
}

function normalizeToOctave(rawLength, octaveShift) {
  let factor = powerOfTwo(octaveShift);
  let result = multiply(rawLength, factor);
  while (compare(result, rational(1n)) > 0) {
    factor = multiply(factor, rational(1n, 2n));
    result = multiply(rawLength, factor);
  }
  while (compare(result, rational(1n, 2n)) < 0) {
    factor = multiply(factor, rational(2n));
    result = multiply(rawLength, factor);
  }
  return { factor, result };
}

export function deriveNote(note) {
  const definition = NOTE_DEFINITIONS[note];
  if (!definition) throw new RangeError(`Unbekannter Ton: ${note}`);

  const { operations, rawLength } = makeFifthOperations(definition.fifths);
  const normalized = normalizeToOctave(rawLength, definition.octaveShift);
  if (!equal(normalized.result, targetLength(note))) {
    throw new Error(`Die Herleitung für ${note} stimmt nicht mit dem Zielwert überein.`);
  }
  if (note === "C′") {
    operations.push(
      makeOperation("divide", { parts: 2, before: rawLength, label: "Saite in 2 gleiche Teile teilen" }),
      makeOperation("select-segment", {
        count: 1,
        parts: 2,
        before: rawLength,
        label: "1 von 2 Teilen auswählen",
      }),
      makeOperation("multiply-length", {
        factor: rational(1n, 2n),
        before: rawLength,
        after: normalized.result,
        label: `${formatFraction(rawLength)} × 1/2 = ${formatFraction(normalized.result)}`,
        explanation: "Bei doppelter Frequenz halbiert sich die Saitenlänge.",
      }),
    );
  } else if (!equal(normalized.factor, rational(1n))) {
    operations.push(
      makeOperation("normalize-octave", {
        factor: normalized.factor,
        before: rawLength,
        after: normalized.result,
        label: `${formatFraction(rawLength)} × ${formatFraction(normalized.factor)} = ${formatFraction(normalized.result)}`,
        explanation: normalized.factor.n > normalized.factor.d
          ? "Die Saite wird verdoppelt, um den Ton in die Referenzoktave zu bringen."
          : "Die Saite wird halbiert, um den Ton in die Referenzoktave zu bringen.",
      }),
    );
  }

  return Object.freeze({
    kind: "note",
    id: note,
    label: note,
    target: normalized.result,
    rawLength,
    operations: Object.freeze(operations),
    fifths: definition.fifths,
    color: definition.color,
    summary: note === "C′"
      ? "C′ entsteht durch eine Oktavierung: Bei doppelter Frequenz halbiert sich die Saitenlänge."
      : note === "D"
        ? "D entsteht aus zwei aufsteigenden Quinten und Oktavnormalisierung. Der pythagoreische Ganzton hat das Frequenzverhältnis 9/8; gleichstufig gestimmt ist ein Ganzton 2^(2/12) ≈ 1,12246 und damit nicht exakt gleich."
      : `Von C aus ${Math.abs(definition.fifths)} ${Math.abs(definition.fifths) === 1 ? "Quinte" : "Quinten"}${definition.fifths < 0 ? " abwärts" : " aufwärts"}; danach wird die Saite in die Referenzoktave gebracht.`,
  });
}

export function deriveInterval(id) {
  const interval = INTERVALS[id];
  if (!interval) throw new RangeError(`Unbekanntes Intervall: ${id}`);
  const before = rational(1n);
  const result = interval.result;
  const operations = [
    makeOperation("divide", { parts: interval.parts, before, label: `Saite in ${interval.parts} gleiche Teile teilen` }),
    makeOperation("select-segment", {
      count: interval.selected,
      parts: interval.parts,
      before,
      label: `${interval.selected} von ${interval.parts} Teilen auswählen`,
    }),
    makeOperation("multiply-length", {
      factor: result,
      before,
      after: result,
      label: `1 × ${formatFraction(result)} = ${formatFraction(result)}`,
      explanation: interval.explanation,
    }),
  ];
  return Object.freeze({
    kind: "interval",
    id,
    label: interval.label,
    target: result,
    rawLength: result,
    operations: Object.freeze(operations),
    frequency: interval.frequency,
    color: id === "fifth" ? "blue" : id === "fourth" ? "green" : "violet",
    summary: interval.explanation,
  });
}

export function deriveWholeTone() {
  return deriveNote("D");
}

export function targetLength(note) {
  const values = {
    C: rational(1n),
    D: rational(8n, 9n),
    E: rational(64n, 81n),
    F: rational(3n, 4n),
    G: rational(2n, 3n),
    A: rational(16n, 27n),
    H: rational(128n, 243n),
    "C′": rational(1n, 2n),
  };
  const value = values[note];
  if (!value) throw new RangeError(`Unbekannter Ton: ${note}`);
  return value;
}

export function evaluateOperations(operations) {
  let current = rational(1n);
  for (const operation of operations) {
    if (operation.type === "multiply-length" || operation.type === "normalize-octave") {
      if (!equal(current, operation.before)) {
        throw new Error(`Ungültiger Rechenschritt: erwartet ${formatFraction(operation.before)}, erhalten ${formatFraction(current)}.`);
      }
      current = multiply(current, operation.factor);
      if (!equal(current, operation.after)) {
        throw new Error(`Ungültiges Ergebnis: erhalten ${formatFraction(current)}, erwartet ${formatFraction(operation.after)}.`);
      }
    }
  }
  return current;
}

export function scaleNotes() {
  return NOTE_ORDER.map((note) => ({
    note,
    ratio: targetLength(note),
    color: NOTE_DEFINITIONS[note].color,
    path: note === "C"
      ? "Referenz"
      : note === "C′"
        ? "Oktave"
        : `${Math.abs(NOTE_DEFINITIONS[note].fifths)} ${Math.abs(NOTE_DEFINITIONS[note].fifths) === 1 ? "Quinte" : "Quinten"} ${NOTE_DEFINITIONS[note].fifths < 0 ? "abwärts" : "aufwärts"}`,
    derivation: deriveNote(note),
  }));
}
