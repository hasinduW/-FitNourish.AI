export const BASE_URL = "http://127.0.0.1:8000";

export async function predictAndSave(payload) {
  const res = await fetch(`${BASE_URL}/predict-and-save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getHistory(userId) {
  const res = await fetch(`${BASE_URL}/history/${userId}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
