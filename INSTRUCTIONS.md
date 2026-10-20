# Implementation Specification: Interactive Pythagorean String-Length Visualizer

## Goal

Build an interactive web visualization that teaches Pythagorean tuning by **animating how a vibrating string is divided to derive exact musical intervals and string-length ratios**.

The user should be able to start with a string of length \(1\), select a musical interval or note, and watch the string being divided, shortened, or extended to derive its exact fractional length. The visualization should explain where every numerator and denominator comes from rather than merely displaying the final ratios.

The result should be an educational, interactive experience, not just a static chart.

## 1. Musical and mathematical conventions

Use these conventions consistently:

- A string's fundamental frequency is inversely proportional to its vibrating length.
- A string of length \(1\) represents C.
- A perfect fifth has a frequency ratio of \(3:2\), corresponding to a string-length ratio of \(2:3\).
- An octave has a frequency ratio of \(2:1\), corresponding to a string-length ratio of \(1:2\).
- To bring a note into the reference octave, multiply its frequency by an appropriate power of two. For string lengths, this means multiplying or dividing by powers of two as needed.

Represent all musical ratios internally as exact rational numbers, never as floating-point numbers alone.

Use the following target values for the initial visualization:

| Note | String length relative to C |
|---|---:|
| C | \(1\) |
| D | \(8/9\) |
| E | \(64/81\) |
| F | \(3/4\) |
| G | \(2/3\) |
| A | \(16/27\) |
| H | \(128/243\) |
| C′ | \(1/2\) |

Use German note names (H, not B) and German-language interface text.

**Important mathematical detail:** The target values above are not all obtained by simply moving upward through successive fifths in the displayed order. Generate fifths through multiplication by \(3/2\) in frequency space, or \(2/3\) in string-length space, followed by octave normalization. Make the derivation shown in the animation match the actual arithmetic.

For example, starting with C:

- C → G: multiply the string length by \(2/3\), giving \(2/3\).
- G → D: multiply by \(2/3\), giving \(4/9\), then double the string length to return to the reference octave, giving \(8/9\).
- D → A: multiply by \(2/3\), giving \(16/27\).

For each step, show the exact fraction before and after octave normalization.

## 2. Main visualization: the string

Create a large, visually clear representation of a string stretched horizontally between two fixed endpoints.

The string should represent a normalized length of \(1\). Include a ruler or scale beneath it, with ticks and labels at meaningful positions.

The string should have a visually distinct movable plucking point or division marker. When an interval is selected, animate the relevant division and highlight the resulting segment.

The display should make it immediately apparent:

- Which segment is being measured.
- Which segment represents the new vibrating string.
- How the new length relates to the original length.
- Which ratio is being derived.

Use smooth animations with sensible durations and no unnecessary visual effects.

### Core interaction

When the user selects a note or interval:

1. Highlight the current string.
2. Introduce division markers corresponding to the relevant integer ratio.
3. Animate the division into equal parts.
4. Highlight the segment or combination of segments that represents the new string.
5. Display the corresponding multiplication or division of lengths.
6. Animate any octave normalization required.
7. Update the exact fraction, decimal value, note name, and derivation steps.

The animation must reflect mathematically correct operations. Do not animate an arbitrary split and then display an unrelated fraction.

## 3. Interval construction modes

Provide two complementary modes.

### Mode A: Direct interval construction

Let the user select a ratio and see how it is constructed from the original string.

At minimum, support:

**Octave**
- Divide the string into two equal segments.
- Select one segment.
- Result: \(1/2\).

**Perfect fifth**
- Divide the string into three equal segments.
- Select two segments.
- Result: \(2/3\).

**Perfect fourth**
- Divide the string into four equal segments.
- Select three segments.
- Result: \(3/4\).

**Whole tone (Pythagorean)**
- Derive the D string from C using two perfect fifths and octave normalization, or demonstrate the corresponding exact length ratio \(8/9\).
- Show that the ratio is not the same as an equal-tempered whole tone.

For each interval, explain why the number of segments selected corresponds to the resulting string length.

### Mode B: Build the Pythagorean scale

Start at C with a string length of \(1\).

Let the user repeatedly apply the perfect-fifth operation. Each operation should:

1. Multiply the current string length by \(2/3\).
2. Display the resulting exact fraction.
3. Determine whether the result is inside the desired octave.
4. Normalize the length into the reference octave when necessary.
5. Identify the resulting note.
6. Add the note to a visible scale or derivation history.

Show the current string alongside the accumulated sequence of notes.

Include controls for:

- Next step
- Previous step
- Play/pause animation
- Reset
- Animation speed
- Selecting a target note directly

Allow the user to inspect each intermediate result.

## 4. Exact fraction arithmetic

Implement a small rational-number utility using integer numerators and denominators.

It must support:

- Multiplication
- Division
- Reduction to lowest terms using the greatest common divisor
- Exact comparison
- Conversion to decimal for display
- Multiplication by powers of two for octave normalization

Avoid using floating-point arithmetic to determine musical notes or derive fractions.

Display fractions in reduced form, for example:

- \(4/9\), not \(8/18\)
- \(8/9\)
- \(16/27\)
- \(64/81\)

Show the unreduced intermediate expression when pedagogically useful, then show the simplified result.

For octave normalization, explicitly explain whether the string is doubled or halved and why. Keep the frequency-space and string-length-space conventions separate to avoid inversions.

## 5. Derivation panel

Alongside the string, display a live derivation panel.

For example, deriving D from C should display something equivalent to:

1. Start with C: \(L = 1\).
2. Ascend by a perfect fifth: \(1 \times 2/3 = 2/3\).
3. Ascend by another perfect fifth: \(2/3 \times 2/3 = 4/9\).
4. Normalize to the reference octave: \(4/9 \times 2 = 8/9\).
5. Result: D has a string length of \(8/9\) relative to C.

The exact number of steps and operations must be generated from the selected derivation, not hardcoded into the UI.

Highlight the currently animated operation in the panel.

Let the user click a completed step to replay its animation.

## 6. Scale overview

Add a compact overview of all derived notes.

For every note, show:

- Note name
- Exact string-length ratio
- Decimal value
- Relative string length as a horizontal bar
- Derivation path or number of fifths from the reference

Selecting a note should load its derivation into the main visualization.

Clearly distinguish the physical length of the string from the pitch or frequency of the note. Longer strings correspond to lower pitches.

## 7. Visual design and responsiveness

Use a clean, modern educational interface.

- Make the string visualization the visual focus.
- Use a neutral background and restrained accent colors.
- Keep the exact fractions large and readable.
- Use consistent colors for notes across the string, scale overview, and derivation panel.
- Use smooth transitions without excessive motion.
- Make the layout responsive for desktop, tablet, and mobile.
- Support keyboard navigation and accessible labels.
- Respect reduced-motion preferences.
- Ensure that the visualization remains understandable without relying on color alone.

If a charting or animation library is already installed in the project, reuse it where appropriate. Otherwise, prefer native SVG and CSS animations for the string, divisions, segments, and markers. SVG is recommended because it provides precise control over segment positions and scales naturally across screen sizes.

## 8. Architecture and implementation quality

Before implementing, inspect the existing repository and follow its framework, language, styling, component conventions, and build process.

Do not replace the existing application architecture unnecessarily.

Separate the implementation into:

- Exact rational arithmetic and octave-normalization utilities.
- Musical interval and note derivation logic.
- Animation state and playback controls.
- SVG string visualization.
- Derivation history and scale overview.

Keep the mathematical model independent of the UI so it can be tested without rendering components.

Represent an animation as a sequence of explicit, typed mathematical operations, such as `divide`, `select-segment`, `multiply-length`, and `normalize-octave`. The visual layer should animate these operations rather than independently inventing its own arithmetic.

Avoid unnecessary dependencies and external services. No backend or AI integration is required.

## 9. Validation and tests

Write automated tests for the mathematical model.

At minimum, verify:

- C produces \(1\).
- G produces \(2/3\).
- D produces \(8/9\).
- A produces \(16/27\).
- E produces \(64/81\).
- F produces \(3/4\).
- H produces \(128/243\).
- C′ produces \(1/2\).
- Every fraction is reduced to lowest terms.
- Octave normalization preserves the intended pitch class.
- Frequency ratios are the inverse of the corresponding string-length ratios.
- Replaying or reversing an animation does not corrupt the mathematical state.

Also test that each displayed derivation evaluates to its displayed result.

## 10. Definition of done

The implementation is complete when a user can open the web application, select a note or interval, and watch a mathematically accurate construction of its string-length ratio.

The user must be able to understand not only that D equals \(8/9\), but also why it does: how the string is divided, which segments are selected, which operations are performed, and how the result is normalized into the reference octave.

Prioritize a correct, intuitive and polished core interaction over adding many musical features. Deliver working code, tests, and concise instructions for running the application locally.