import {
  assert,
  assertEquals,
  assertRejects,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { hashOtp, OtpHashConfigError, timingSafeEqualHex } from "./otpHash.ts";

const PEPPER_KEY = "OTP_HASH_PEPPER";

function withPepper<T>(value: string | null, fn: () => Promise<T> | T): Promise<T> {
  const prev = Deno.env.get(PEPPER_KEY);
  if (value === null) Deno.env.delete(PEPPER_KEY);
  else Deno.env.set(PEPPER_KEY, value);
  return Promise.resolve(fn()).finally(() => {
    if (prev === undefined) Deno.env.delete(PEPPER_KEY);
    else Deno.env.set(PEPPER_KEY, prev);
  });
}

function captureConsole(): { restore: () => void; output: string[] } {
  const output: string[] = [];
  const origError = console.error;
  const origWarn = console.warn;
  const origLog = console.log;
  const push = (...args: unknown[]) => {
    output.push(args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" "));
  };
  console.error = push;
  console.warn = push;
  console.log = push;
  return {
    output,
    restore: () => {
      console.error = origError;
      console.warn = origWarn;
      console.log = origLog;
    },
  };
}

Deno.test("hashOtp throws OtpHashConfigError when OTP_HASH_PEPPER is missing", async () => {
  await withPepper(null, async () => {
    await assertRejects(
      () => hashOtp("123456", "user-uuid"),
      OtpHashConfigError,
    );
  });
});

Deno.test("hashOtp throws OtpHashConfigError when OTP_HASH_PEPPER is empty", async () => {
  await withPepper("", async () => {
    await assertRejects(
      () => hashOtp("123456", "user-uuid"),
      OtpHashConfigError,
    );
  });
});

Deno.test("missing-pepper failure does not log the secret value", async () => {
  const secret = "super-secret-pepper-value-do-not-log";
  // Use a value, then unset, ensuring no leak path exists
  await withPepper(null, async () => {
    const cap = captureConsole();
    try {
      await assertRejects(() => hashOtp("123456", "user-uuid"), OtpHashConfigError);
    } finally {
      cap.restore();
    }
    const joined = cap.output.join("\n");
    assert(!joined.includes(secret), "console output must not contain the secret");
    assert(!joined.includes("123456"), "console output must not contain the OTP code");
  });
});

Deno.test("hashOtp returns deterministic 64-char hex digest when pepper is configured", async () => {
  await withPepper("test-pepper-1234567890abcdef", async () => {
    const a = await hashOtp("123456", "user-uuid");
    const b = await hashOtp("123456", "user-uuid");
    assertEquals(a, b);
    assertEquals(a.length, 64);
    assert(/^[0-9a-f]{64}$/.test(a));
  });
});

Deno.test("hashOtp differs across users, codes, and peppers", async () => {
  const r1 = await withPepper("pepper-A", () => hashOtp("123456", "user-1"));
  const r2 = await withPepper("pepper-A", () => hashOtp("123456", "user-2"));
  const r3 = await withPepper("pepper-A", () => hashOtp("654321", "user-1"));
  const r4 = await withPepper("pepper-B", () => hashOtp("123456", "user-1"));
  assert(r1 !== r2, "different user_id should change digest");
  assert(r1 !== r3, "different code should change digest");
  assert(r1 !== r4, "different pepper should change digest");
});

Deno.test("timingSafeEqualHex matches identical digests and rejects mismatched ones", async () => {
  await withPepper("pepper-X", async () => {
    const a = await hashOtp("123456", "user-1");
    const b = await hashOtp("123456", "user-1");
    const c = await hashOtp("000000", "user-1");
    assertEquals(timingSafeEqualHex(a, b), true);
    assertEquals(timingSafeEqualHex(a, c), false);
    assertEquals(timingSafeEqualHex(a, ""), false);
  });
});