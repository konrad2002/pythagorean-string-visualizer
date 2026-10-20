export function rational(numerator, denominator = 1n) {
  let n = BigInt(numerator);
  let d = BigInt(denominator);
  if (d === 0n) throw new RangeError("Der Nenner darf nicht null sein.");
  if (d < 0n) {
    n = -n;
    d = -d;
  }
  const divisor = gcd(n < 0n ? -n : n, d);
  return Object.freeze({ n: n / divisor, d: d / divisor });
}

export function gcd(a, b) {
  let left = BigInt(a);
  let right = BigInt(b);
  while (right !== 0n) [left, right] = [right, left % right];
  return left;
}

export function multiply(left, right) {
  return rational(left.n * right.n, left.d * right.d);
}

export function divide(left, right) {
  if (right.n === 0n) throw new RangeError("Division durch null.");
  return rational(left.n * right.d, left.d * right.n);
}

export function compare(left, right) {
  const difference = left.n * right.d - right.n * left.d;
  return difference < 0n ? -1 : difference > 0n ? 1 : 0;
}

export function equal(left, right) {
  return compare(left, right) === 0;
}

export function powerOfTwo(exponent) {
  const amount = Number(exponent);
  if (!Number.isInteger(amount)) throw new RangeError("Der Exponent muss ganzzahlig sein.");
  return amount >= 0
    ? rational(2n ** BigInt(amount))
    : rational(1n, 2n ** BigInt(-amount));
}

export function formatFraction(value) {
  return value.d === 1n ? value.n.toString() : `${value.n}/${value.d}`;
}

export function toDecimal(value, places = 4) {
  return (Number(value.n) / Number(value.d)).toFixed(places);
}

export function inverse(value) {
  if (value.n === 0n) throw new RangeError("Null hat keinen Kehrwert.");
  return rational(value.d, value.n);
}
