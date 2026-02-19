/**
 * Extract userId from auth API responses (login-otp, forgot-password, verify-otp).
 * Handles common response shapes so backend can return userId in any of these.
 */
export function extractUserId(data) {
  if (!data || typeof data !== "object") return null;
  const pick = (v) => {
    if (v == null || v === "") return null;
    if (typeof v === "number" && !Number.isNaN(v)) return v;
    if (typeof v === "string" && /^\d+$/.test(v)) return parseInt(v, 10);
    return null;
  };
  const paths = [
    data.userId,
    data.user_id,
    data.id,
    data.consumerId,
    data.consumer_id,
    data.user?.id,
    data.user?.userId,
    data.user?.user_id,
    data.data?.userId,
    data.data?.user_id,
    data.data?.id,
    data.data?.user?.id,
    data.data?.user?.userId,
    data.data?.consumer?.id,
    data.data?.consumerId,
    data.body?.userId,
    data.body?.user_id,
    data.body?.id,
    data.result?.userId,
    data.result?.id,
    data.payload?.userId,
    data.payload?.id,
  ];
  for (const v of paths) {
    const id = pick(v);
    if (id != null) return id;
  }
  const deep = [data, data.data, data.body, data.result].filter(Boolean);
  for (const obj of deep) {
    if (typeof obj !== "object") continue;
    for (const key of ["userId", "user_id", "id", "consumerId", "consumer_id"]) {
      const id = pick(obj[key]);
      if (id != null) return id;
    }
  }
  return null;
}
