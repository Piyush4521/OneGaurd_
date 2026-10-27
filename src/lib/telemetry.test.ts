import { describe, expect, it } from "vitest";
import {
  CYLINDER_PRESETS,
  estimateDaysLeft,
  gasLevel,
  getHinglishStatus,
  lpgFromGross,
} from "./telemetry";

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

  it("provides valid standard Indian cylinder presets", () => {
    expect(CYLINDER_PRESETS.length).toBeGreaterThanOrEqual(4);
    const domestic = CYLINDER_PRESETS.find((p) => p.id === "domestic_14_2");
    expect(domestic).toBeDefined();
    expect(domestic?.capacityKg).toBe(14.2);
    expect(domestic?.tareKg).toBe(15.3);
  });

  it("generates unambiguous emergency instructions during gas leak alarm", () => {
    const status = getHinglishStatus(50, "alarm", "live");
    expect(status.greeting).toBe("EMERGENCY ALERT");
    expect(status.headline).toContain("GAS LEAK");
    expect(status.subtext).toContain("1906");
  });

  it("generates natural Hinglish copy during normal gas levels", () => {
    const status = getHinglishStatus(75, "safe", "live");
    expect(status.headline).toContain("Cylinder full hai");
  });
});
