export type Fit = "press" | "snug" | "slip";
export function measureKerf(
  nominal: number,
  measured: number,
  cuts = 1,
  kind: "external" | "internal" | "comb" = "external",
) {
  if (
    ![nominal, measured].every((n) => Number.isFinite(n) && n > 0) ||
    !Number.isInteger(cuts) ||
    cuts < 1
  )
    throw new Error("measurement");
  const kerf =
    (kind === "internal" ? measured - nominal : nominal - measured) /
    (kind === "comb" ? cuts : 1);
  if (kerf < 0 || kerf >= nominal) throw new Error("measurement");
  return kerf;
}
export function jointFit(
  thickness: number,
  kerf: number,
  fit: Fit,
  adjustment = 0,
) {
  if (
    ![thickness, kerf, adjustment].every(Number.isFinite) ||
    thickness <= 0 ||
    kerf < 0 ||
    kerf >= thickness ||
    !["press", "snug", "slip"].includes(fit)
  )
    throw new Error("dimensions");
  // Clearance is final slot minus final tab, not a per-side offset.
  const clearance = { press: -0.1, snug: 0, slip: 0.2 }[fit] + adjustment;
  const tabDraw = thickness + kerf,
    slotDraw = thickness + clearance - kerf;
  if (slotDraw <= 0) throw new Error("dimensions");
  return {
    clearance,
    tabDraw,
    slotDraw,
    tabFinished: thickness,
    slotFinished: thickness + clearance,
  };
}
export function kerfCoupon(
  thickness: number,
  kerf: number,
  step = 0.05,
  count = 9,
) {
  if (
    !Number.isInteger(count) ||
    count < 3 ||
    count > 21 ||
    !Number.isFinite(step) ||
    step <= 0 ||
    step > 1
  )
    throw new Error("gauge");
  jointFit(thickness, kerf, "snug");
  const slots = Array.from(
    { length: count },
    (_, i) => thickness - kerf + (i - (count - 1) / 2) * step,
  );
  if (slots.some((w) => w <= 0)) throw new Error("gauge");
  const pitch = Math.max(10, thickness + 7),
    width = Math.max(160, count * pitch + 10);
  const joinA = 52,
    joinB = joinA + thickness + 8,
    bottomB = joinB + thickness + 8,
    height = bottomB + 5;
  // Open notches are part of one continuous outline; no doubled cut edges.
  let outline = "M5 30 V10";
  slots.forEach((w, i) => {
    const x = 8 + i * pitch;
    outline += ` H${x} V23 H${x + w} V10`;
  });
  outline += ` H${width - 5} V40 H5 Z`;
  const labels = slots
    .map(
      (w, i) =>
        `<text x="${8 + i * pitch}" y="34" font-size="2.2">${(w + kerf - thickness).toFixed(2)}</text>`,
    )
    .join("");
  // Two mating stepped coupons; alternating fingers are thickness wide (finished).
  const finger = thickness + kerf,
    slot = thickness - kerf;
  const n = Math.min(8, Math.floor(56 / (finger + slot)));
  if (thickness > 8 || n < 1) throw new Error("coupon-thickness");
  const end = 5 + n * (finger + slot);
  let a = `M5 44 H${end} V${joinA}`,
    b = `M5 ${bottomB} H${end} V${joinB}`;
  let x = end;
  for (let i = 0; i < n; i++) {
    a += ` V${joinA + thickness}`;
    x -= finger;
    a += ` H${x} V${joinA}`;
    x -= slot;
    a += ` H${x}`;
  }
  a += " Z";
  x = end;
  for (let i = 0; i < n; i++) {
    b += ` V${joinB + thickness}`;
    x -= slot;
    b += ` H${x} V${joinB}`;
    x -= finger;
    b += ` H${x}`;
  }
  b += " Z";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}mm" height="${height}mm" viewBox="0 0 ${width} ${height}"><title>Kerf comb and mating finger joint coupons; mm</title><g id="cut" fill="none" stroke="#ff0000" stroke-width="0.01"><path d="${outline}"/><path d="${a}"/><path d="${b}"/></g><g id="engrave" fill="#000000" font-family="sans-serif"><text x="5" y="5" font-size="3">t=${thickness}mm k=${kerf.toFixed(3)}mm — clearance (mm)</text>${labels}<text x="72" y="58" font-size="3">Finger joint pair</text><text x="72" y="64" font-size="2.5">Apply no extra kerf offset</text><text x="72" y="70" font-size="2.5">Red: cut / black: engrave</text></g></svg>`;
}
