import { describe, expect, it } from "vitest";
import { fingerprint, randomToken, sha256 } from "./crypto";
import { currentAlmatyDateKey, resolveServerRegistrationDate } from "./dates";
import { registrationSchema } from "./validators";

describe("registration validation", () => {
  it("accepts Kazakhstan mobile phones and both event dates", () => {
    const parsed = registrationSchema.parse({
      firstName: "Алия",
      lastName: "Серикова",
      phone: "+7 701 123 45 67",
      category: "GUEST",
      language: "KZ",
      dates: ["2026-07-31", "2026-08-01"],
      consentAccepted: true,
      website: ""
    });
    expect(parsed.dates).toHaveLength(2);
  });

  it("accepts public registration without visit dates", () => {
    const parsed = registrationSchema.parse({
      firstName: "Алия",
      lastName: "Серикова",
      phone: "+7 701 123 45 67",
      category: "GUEST",
      language: "KZ",
      consentAccepted: true,
      website: ""
    });
    expect(parsed.dates).toBeUndefined();
  });
});

describe("server event date resolution", () => {
  it("uses Asia/Almaty date boundaries", () => {
    expect(currentAlmatyDateKey(new Date("2026-07-30T19:01:00.000Z"))).toBe("2026-07-31");
    expect(currentAlmatyDateKey(new Date("2026-07-31T19:01:00.000Z"))).toBe("2026-08-01");
  });

  it("blocks outside dates unless the development override is enabled", () => {
    const allow = process.env.ALLOW_OUTSIDE_EVENT_DATES;
    const testDate = process.env.TEST_EVENT_DATE;
    process.env.ALLOW_OUTSIDE_EVENT_DATES = "false";
    process.env.TEST_EVENT_DATE = "2026-07-31";
    expect(resolveServerRegistrationDate(new Date("2026-08-02T00:00:00.000Z"))).toBeNull();
    process.env.ALLOW_OUTSIDE_EVENT_DATES = "true";
    expect(resolveServerRegistrationDate(new Date("2026-08-02T00:00:00.000Z"))).toBe("2026-07-31");
    process.env.ALLOW_OUTSIDE_EVENT_DATES = allow;
    process.env.TEST_EVENT_DATE = testDate;
  });
});

describe("secure tokens", () => {
  it("generates nontrivial random QR tokens and hashes them", () => {
    const a = randomToken();
    const b = randomToken();
    expect(a).not.toEqual(b);
    expect(a.length).toBeGreaterThan(30);
    expect(sha256(a)).not.toContain(a);
    expect(fingerprint(a)).toHaveLength(16);
  });
});
