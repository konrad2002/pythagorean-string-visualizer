import { formatFraction, toDecimal, rational } from "./math.js";
import { deriveInterval, deriveNote, scaleNotes, targetLength } from "./model.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const state = {
  mode: "interval",
  selection: deriveNote("D"),
  current: rational(1n),
  completed: 0,
  activeStep: -1,
  playing: false,
  animating: false,
  divisions: 0,
  selectedSegments: 0,
  extendPreview: false,
  animationId: 0,
};

const elements = {
  svg: document.querySelector("#string-svg"),
  note: document.querySelector("#current-note"),
  fraction: document.querySelector("#current-fraction"),
  decimal: document.querySelector("#current-decimal"),
  selectionExplanation: document.querySelector("#selection-explanation"),
  derivationSummary: document.querySelector("#derivation-summary"),
  derivationList: document.querySelector("#derivation-list"),
  stepCount: document.querySelector("#step-count"),
  frequencyExplanation: document.querySelector("#frequency-explanation"),
  scaleList: document.querySelector("#scale-list"),
  liveStatus: document.querySelector("#live-status"),
  play: document.querySelector("#play-button"),
  previous: document.querySelector("#previous-button"),
  next: document.querySelector("#next-button"),
  reset: document.querySelector("#reset-button"),
  speed: document.querySelector("#speed-select"),
  intervalPicker: document.querySelector("#interval-picker"),
};

const wait = (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));
const animationDuration = () => 680 * Number(elements.speed.value);

function svgElement(name, attributes = {}) {
  const element = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
  return element;
}

function appendText(parent, text, attributes = {}) {
  const element = svgElement("text", attributes);
  element.textContent = text;
  parent.append(element);
  return element;
}

function fractionNumber(value) {
  return Number(value.n) / Number(value.d);
}

function drawString() {
  const svg = elements.svg;
  svg.replaceChildren();
  const title = svgElement("title", { id: "svg-title" });
  title.textContent = `Saite für ${state.selection.label}`;
  const desc = svgElement("desc", { id: "svg-desc" });
  desc.textContent = state.extendPreview
    ? "Die Saite wird um eine Hälfte verlängert: drei halbe Saitenstücke ergeben die Länge 3/2."
    : `Die gemessene Saite ist ${formatFraction(state.current)} der C-Saite lang.`;
  svg.append(title, desc);

  const x0 = 80;
  const baselineWidth = 720;
  const length = Math.max(0, Math.min(1.5, fractionNumber(state.current)));
  const currentEndX = x0 + baselineWidth * length;
  const endX = x0 + baselineWidth * (state.extendPreview ? length * 1.5 : length);
  const divisionLength = state.divisions > 0 ? baselineWidth * length : 0;
  const segmentWidth = state.divisions > 0 ? divisionLength / state.divisions : 0;
  const selectedWidth = segmentWidth * state.selectedSegments;
  const color = `var(--note-${state.selection.color})`;

  svg.append(svgElement("line", { x1: x0, y1: 107, x2: x0 + baselineWidth, y2: 107, class: "ruler-baseline" }));

  if (state.selectedSegments > 0) {
    svg.append(svgElement("rect", {
      x: x0,
      y: 88,
      width: selectedWidth,
      height: 38,
      rx: 7,
      class: "selected-segment",
      fill: color,
    }));
    if (state.extendPreview) {
      svg.append(svgElement("line", {
        x1: currentEndX,
        y1: 107,
        x2: endX,
        y2: 107,
        class: "extension-guide",
      }));
    }
    appendText(svg, state.extendPreview
      ? "2 Hälften + 1 weitere"
      : `${state.selectedSegments} von ${state.divisions} Teilen`, {
      x: x0 + selectedWidth / 2,
      y: 76,
      "text-anchor": "middle",
      class: "svg-operation-label",
    });
  }

  if (state.divisions > 0) {
    for (let index = 0; index <= state.divisions; index += 1) {
      const x = x0 + segmentWidth * index;
      svg.append(svgElement("line", {
        x1: x,
        y1: 78,
        x2: x,
        y2: 135,
        class: index === 0 || index === state.divisions ? "division-marker division-end" : "division-marker",
      }));
    }
  }

  svg.append(svgElement("line", {
    x1: x0,
    y1: 107,
    x2: endX,
    y2: 107,
    class: "vibrating-string",
    stroke: color,
  }));
  svg.append(svgElement("circle", { cx: x0, cy: 107, r: 9, class: "fixed-anchor" }));
  svg.append(svgElement("circle", { cx: endX, cy: 107, r: 8, class: "length-marker", fill: color }));

  for (let index = 0; index <= 4; index += 1) {
    const x = x0 + baselineWidth * (index / 4);
    svg.append(svgElement("line", {
      x1: x,
      y1: 153,
      x2: x,
      y2: index === 0 || index === 4 ? 173 : 166,
      class: "ruler-tick",
    }));
    appendText(svg, `${index}/4`, { x, y: 191, "text-anchor": "middle", class: "ruler-label" });
  }
  svg.append(svgElement("line", { x1: x0, y1: 153, x2: x0 + baselineWidth, y2: 153, class: "ruler-line" }));
  appendText(svg, "C · Länge 1", { x: x0, y: 222, "text-anchor": "start", class: "ruler-caption" });
  appendText(svg, `aktuell · ${formatFraction(state.current)}`, {
    x: Math.min(currentEndX, x0 + baselineWidth),
    y: 222,
    "text-anchor": "end",
    class: "ruler-caption",
  });
}

function describeOperation(operation) {
  if (operation.type === "divide") return operation.label;
  if (operation.type === "select-segment") return operation.label;
  if (operation.type === "extend-segment") return operation.label;
  if (operation.type === "multiply-length" || operation.type === "normalize-octave") {
    return `${operation.label}${operation.explanation ? ` — ${operation.explanation}` : ""}`;
  }
  return operation.label;
}

function renderDerivation() {
  const { operations } = state.selection;
  elements.derivationSummary.textContent = state.selection.summary;
  elements.derivationList.replaceChildren();

  const start = document.createElement("li");
  start.className = "derivation-step is-static";
  const startButton = document.createElement("span");
  startButton.className = "step-content";
  startButton.textContent = "Ausgangssaite: C hat die Länge 1.";
  start.append(startButton);
  elements.derivationList.append(start);

  operations.forEach((operation, index) => {
    const item = document.createElement("li");
    item.className = "derivation-step";
    if (index === state.activeStep) item.classList.add("is-current");
    if (index < state.completed) item.classList.add("is-complete");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "step-content";
    button.dataset.step = String(index);
    button.setAttribute("aria-label", `Schritt ${index + 1} erneut abspielen: ${operation.label}`);
    button.textContent = operation.label;
    item.append(button);
    elements.derivationList.append(item);
  });

  const result = document.createElement("li");
  result.className = "derivation-step is-result";
  const resultText = document.createElement("span");
  resultText.className = "step-content";
  resultText.textContent = `${state.selection.label}: L = ${formatFraction(state.selection.target)} der C-Saite.`;
  result.append(resultText);
  elements.derivationList.append(result);

  elements.stepCount.textContent = `${state.completed} / ${operations.length}`;
  elements.frequencyExplanation.textContent =
    `Länge ${formatFraction(state.selection.target)} · Frequenzverhältnis ${formatFraction(rational(state.selection.target.d, state.selection.target.n))}. Längere Saite = tiefere Tonhöhe.`;
}

function renderScale() {
  elements.scaleList.replaceChildren();
  for (const entry of scaleNotes()) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "scale-note";
    if (state.selection.kind === "note" && state.selection.id === entry.note) button.classList.add("is-selected");
    button.dataset.note = entry.note;
    button.style.setProperty("--note-color", `var(--note-${entry.color})`);
    button.setAttribute("aria-label", `${entry.note}: Saitenlänge ${formatFraction(entry.ratio)}, Dezimalwert ${toDecimal(entry.ratio)}, ${entry.path}`);

    const main = document.createElement("span");
    main.className = "scale-note-main";
    const name = document.createElement("strong");
    name.textContent = entry.note;
    const fraction = document.createElement("span");
    fraction.className = "scale-fraction";
    fraction.textContent = formatFraction(entry.ratio);
    main.append(name, fraction);

    const barTrack = document.createElement("span");
    barTrack.className = "scale-bar-track";
    const bar = document.createElement("span");
    bar.className = "scale-bar";
    bar.style.width = `${fractionNumber(entry.ratio) * 100}%`;
    barTrack.append(bar);

    const decimal = document.createElement("span");
    decimal.className = "scale-decimal";
    decimal.textContent = toDecimal(entry.ratio).replace(".", ",");
    const path = document.createElement("span");
    path.className = "scale-path";
    path.textContent = entry.path;
    button.append(main, barTrack, decimal, path);
    elements.scaleList.append(button);
  }
}

function render() {
  elements.note.textContent = state.selection.label;
  elements.note.dataset.color = state.selection.color;
  elements.fraction.textContent = formatFraction(state.current);
  elements.decimal.textContent = toDecimal(state.current).replace(".", ",");
  elements.selectionExplanation.textContent = state.selection.summary;
  drawString();
  renderDerivation();
  renderScale();
  elements.previous.disabled = state.completed === 0 || state.playing || state.animating;
  elements.next.disabled = state.completed >= state.selection.operations.length || state.playing || state.animating;
  elements.play.textContent = state.playing ? "Pausieren" : "Abspielen";
  elements.play.setAttribute("aria-pressed", String(state.playing));
}

function resetVisualState() {
  state.animationId += 1;
  state.animating = false;
  state.current = rational(1n);
  state.completed = 0;
  state.activeStep = -1;
  state.divisions = 0;
  state.selectedSegments = 0;
  state.extendPreview = false;
}

function setSelection(selection) {
  state.playing = false;
  state.selection = selection;
  resetVisualState();
  elements.liveStatus.textContent = `${selection.label} ausgewählt.`;
  render();
}

function applyVisualOperation(operation) {
  if (operation.type === "divide") {
    state.divisions = operation.parts;
    state.selectedSegments = 0;
  } else if (operation.type === "select-segment") {
    state.divisions = operation.parts;
    state.selectedSegments = operation.count;
  } else if (operation.type === "multiply-length" || operation.type === "normalize-octave") {
    state.current = operation.after;
    state.divisions = 0;
    state.selectedSegments = 0;
    state.extendPreview = false;
  } else if (operation.type === "extend-segment") {
    state.divisions = 2;
    state.selectedSegments = 3;
    state.extendPreview = true;
  }
}

function rebuildVisualState(completed) {
  resetVisualState();
  state.completed = completed;
  for (const operation of state.selection.operations.slice(0, completed)) applyVisualOperation(operation);
  state.activeStep = completed > 0 ? completed - 1 : -1;
  render();
}

async function animateOperation(index) {
  const animationId = state.animationId;
  const selection = state.selection;
  const operation = state.selection.operations[index];
  if (!operation || state.animating) return false;
  state.animating = true;
  state.activeStep = index;
  render();

  try {
    if (operation.type === "divide") {
      state.divisions = operation.parts;
      state.selectedSegments = 0;
      render();
      await wait(animationDuration() * 0.35);
    } else if (operation.type === "select-segment") {
      state.divisions = operation.parts;
      state.selectedSegments = operation.count;
      render();
      await wait(animationDuration() * 0.35);
    } else {
      applyVisualOperation(operation);
      render();
      await wait(animationDuration());
    }

    if (animationId !== state.animationId || selection !== state.selection) return false;
    if (state.playing || index === state.completed) {
      state.completed = index + 1;
      render();
    }
    return true;
  } finally {
    if (animationId === state.animationId && selection === state.selection) {
      state.animating = false;
      render();
    }
  }
}

async function nextStep() {
  if (state.playing || state.completed >= state.selection.operations.length) return;
  await animateOperation(state.completed);
  elements.liveStatus.textContent = `Schritt ${state.completed} von ${state.selection.operations.length}: ${state.current && formatFraction(state.current)}.`;
}

async function play() {
  if (state.playing) {
    state.playing = false;
    rebuildVisualState(state.completed);
    elements.liveStatus.textContent = "Animation pausiert.";
    return;
  }
  if (state.completed >= state.selection.operations.length) rebuildVisualState(0);
  state.playing = true;
  const animationId = state.animationId;
  render();
  while (state.playing && animationId === state.animationId && state.completed < state.selection.operations.length) {
    const nextIndex = state.completed;
    await animateOperation(nextIndex);
  }
  if (animationId !== state.animationId) return;
  const finished = state.completed >= state.selection.operations.length;
  state.playing = false;
  render();
  elements.liveStatus.textContent = finished
    ? `Fertig: ${state.selection.label} hat die Saitenlänge ${formatFraction(state.selection.target)}.`
    : "Animation pausiert.";
}

function setMode(mode) {
  state.mode = mode;
  document.body.dataset.mode = mode;
  document.querySelectorAll(".mode-button").forEach((button) => {
    const selected = button.dataset.mode === mode;
    button.classList.toggle("is-active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  document.querySelector("#selection-heading").textContent =
    mode === "interval" ? "Was möchtest du herleiten?" : "Ton direkt auswählen";
  document.querySelector("#selection-kicker").textContent =
    mode === "interval" ? "Ausgangspunkt: C = 1" : "Quintenweg: C → G → D → A → E → H";
  render();
}

document.querySelectorAll(".mode-button").forEach((button) => {
  button.addEventListener("click", () => setMode(button.dataset.mode));
});

elements.intervalPicker.addEventListener("click", (event) => {
  const button = event.target.closest("[data-kind]");
  if (!button) return;
  elements.intervalPicker.querySelectorAll(".choice-button").forEach((choice) => {
    choice.classList.toggle("is-selected", choice === button);
  });
  const selection = button.dataset.kind === "interval"
    ? deriveInterval(button.dataset.id)
    : deriveNote(button.dataset.id);
  setSelection(selection);
});

elements.scaleList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-note]");
  if (button) setSelection(deriveNote(button.dataset.note));
});

elements.derivationList.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-step]");
  if (!button) return;
  state.playing = false;
  const targetStep = Number(button.dataset.step);
  rebuildVisualState(targetStep);
  await animateOperation(targetStep);
});

elements.next.addEventListener("click", nextStep);
elements.previous.addEventListener("click", () => {
  if (state.playing || state.completed === 0) return;
  rebuildVisualState(state.completed - 1);
  elements.liveStatus.textContent = "Zum vorherigen Schritt zurückgekehrt.";
});
elements.reset.addEventListener("click", () => {
  state.playing = false;
  rebuildVisualState(0);
  elements.liveStatus.textContent = "Herleitung zurückgesetzt.";
});
elements.play.addEventListener("click", play);

setMode("interval");
render();
