import { describe, expect, it } from "vitest";
import { estimateDaysLeft, gasLevel, lpgFromGross } from "./telemetry";

describe("telemetry rules", () => {
  it("LPG = gross minus tare, clamped to capacity", () => {
    const cfg = { tareKg: 15.3, capacityKg: 14.2 };
    expect(lpgFromGross(22.4, cfg).lpgKg).toBeCloseTo(7.1);
    expect(lpgFromGross(22.4, cfg).percent).toBeCloseTo(50);
    expect(lpgFromGross(10, cfg).lpgKg).toBe(0);
    expect(lpgFromGross(40, cfg).lpgKg).toBe(14.2);
  });
  it("needs 3 days of usage before estimating", () => {
    expect(estimateDaysLeft(5, [0.5, 0.5])).toBeNull();
    expect(estimateDaysLeft(5, [0.5, 0.5, 0.5])).toBe(10);
  });
  it("leak thresholds", () => {
    expect(gasLevel(999)).toBe("safe");
    expect(gasLevel(1000)).toBe("warn");
    expect(gasLevel(2000)).toBe("alarm");
  });
});
