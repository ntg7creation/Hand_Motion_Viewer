export async function loadGigaHandsJSONL(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load GigaHands from ${path}`);
  const text = await res.text();
  return text
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) =>
      JSON.parse(line)
        .slice(0, 21)
        .map(([x, y, z]) => [x, y, z])
    );
}
