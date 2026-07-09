import { describe, expect, it } from "vitest";
import { selectStepLegs, type Candidate } from "./stepBuilder";

function candidate(overrides: Partial<Candidate>): Candidate {
  return {
    fixtureId: "fx-1",
    selection: "HOME",
    edge: 0.05,
    confidence: 80,
    odds: 2.0,
    reasoning: "test reasoning",
    qualifies: true,
    ...overrides,
  };
}

describe("selectStepLegs", () => {
  it("picks up to 5 qualifying legs, ranked by edge×confidence", () => {
    const candidates = Array.from({ length: 8 }, (_, i) =>
      candidate({ fixtureId: `fx-${i}`, edge: 0.02 + i * 0.01, confidence: 60, qualifies: true }),
    );
    const { chosen, isFullStrength } = selectStepLegs(candidates);

    expect(chosen).toHaveLength(5);
    expect(isFullStrength).toBe(true);
    // Highest edge×confidence candidates should be chosen (fx-7 down to fx-3).
    expect(chosen.map((c) => c.fixtureId)).toEqual(["fx-7", "fx-6", "fx-5", "fx-4", "fx-3"]);
  });

  it("never includes a non-qualifying candidate, even to reach 5 legs", () => {
    const candidates = [
      candidate({ fixtureId: "fx-a", edge: 0.06, confidence: 80, qualifies: true }),
      candidate({ fixtureId: "fx-b", edge: 0.055, confidence: 75, qualifies: true }),
      candidate({ fixtureId: "fx-c", edge: 0.045, confidence: 70, qualifies: true }),
      candidate({ fixtureId: "fx-d", edge: 0.02, confidence: 40, qualifies: false }),
      candidate({ fixtureId: "fx-e", edge: 0.01, confidence: 30, qualifies: false }),
    ];
    const { chosen, isFullStrength } = selectStepLegs(candidates);

    expect(chosen).toHaveLength(3); // only 3 candidates actually qualify
    expect(isFullStrength).toBe(false);
    expect(chosen.every((c) => c.qualifies)).toBe(true);
    expect(chosen.map((c) => c.fixtureId).sort()).toEqual(["fx-a", "fx-b", "fx-c"]);
  });

  it("publishes nothing when fewer than MIN_STEP_LEGS (3) candidates qualify", () => {
    const twoQualifying = [
      candidate({ fixtureId: "fx-1", qualifies: true }),
      candidate({ fixtureId: "fx-2", qualifies: true }),
      candidate({ fixtureId: "fx-3", qualifies: false }),
    ];
    const { chosen, isFullStrength, combinedOdds } = selectStepLegs(twoQualifying);
    expect(chosen).toHaveLength(0);
    expect(isFullStrength).toBe(false);
    expect(combinedOdds).toBe(1);
  });

  it("publishes with exactly 3 qualifying legs (the floor)", () => {
    const threeQualifying = Array.from({ length: 3 }, (_, i) => candidate({ fixtureId: `fx-${i}`, qualifies: true }));
    const { chosen, isFullStrength } = selectStepLegs(threeQualifying);
    expect(chosen).toHaveLength(3);
    expect(isFullStrength).toBe(false); // full strength requires all 5
  });

  it("is full strength only when exactly 5 (or capped at 5 from more) candidates qualify", () => {
    const fourQualifying = Array.from({ length: 4 }, (_, i) => candidate({ fixtureId: `fx-${i}`, qualifies: true }));
    expect(selectStepLegs(fourQualifying).isFullStrength).toBe(false);

    const fiveQualifying = Array.from({ length: 5 }, (_, i) => candidate({ fixtureId: `fx-${i}`, qualifies: true }));
    expect(selectStepLegs(fiveQualifying).isFullStrength).toBe(true);

    const sixQualifying = Array.from({ length: 6 }, (_, i) => candidate({ fixtureId: `fx-${i}`, qualifies: true }));
    const result = selectStepLegs(sixQualifying);
    expect(result.isFullStrength).toBe(true);
    expect(result.chosen).toHaveLength(5); // capped at 5 even with 6 qualifying
  });

  it("computes combined odds as the product of the chosen legs' odds", () => {
    const candidates = [
      candidate({ fixtureId: "fx-1", odds: 2.0, qualifies: true }),
      candidate({ fixtureId: "fx-2", odds: 1.5, qualifies: true }),
      candidate({ fixtureId: "fx-3", odds: 3.0, qualifies: true }),
    ];
    const { combinedOdds } = selectStepLegs(candidates);
    expect(combinedOdds).toBeCloseTo(2.0 * 1.5 * 3.0, 10);
  });

  it("returns an empty selection with combinedOdds of 1 when there are no candidates", () => {
    const { chosen, combinedOdds, isFullStrength } = selectStepLegs([]);
    expect(chosen).toHaveLength(0);
    expect(combinedOdds).toBe(1);
    expect(isFullStrength).toBe(false);
  });

  it("documents that one-leg-per-fixture is the caller's responsibility, not selectStepLegs'", () => {
    // buildDailyStep only ever constructs one candidate per fixture (the single best outcome),
    // so this never happens in practice — but selectStepLegs itself has no dedupe logic, so two
    // qualifying candidates sharing a fixtureId would both be selectable here.
    const candidates = [
      candidate({ fixtureId: "fx-1", selection: "HOME", edge: 0.08, qualifies: true }),
      candidate({ fixtureId: "fx-1", selection: "AWAY", edge: 0.07, qualifies: true }),
      candidate({ fixtureId: "fx-2", edge: 0.06, qualifies: true }),
    ];
    const { chosen } = selectStepLegs(candidates);
    expect(chosen).toHaveLength(3);
  });
});
