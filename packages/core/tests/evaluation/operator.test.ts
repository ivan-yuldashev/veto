import { describe, expect, it } from "vitest";
import { evaluateOperator } from "../../src/evaluation/operator.js";

describe("evaluateOperator", () => {
	describe("eq", () => {
		it("returns true for strictly equal primitives", () => {
			expect(evaluateOperator("eq", "published", "published")).toBe(true);
			expect(evaluateOperator("eq", 42, 42)).toBe(true);
		});
		it("returns false for different values", () => {
			expect(evaluateOperator("eq", "draft", "published")).toBe(false);
		});
		it("is case sensitive", () => {
			expect(evaluateOperator("eq", "Published", "published")).toBe(false);
		});
		it("treats null and undefined as distinct", () => {
			expect(evaluateOperator("eq", null, undefined)).toBe(false);
		});
		it("returns false for NaN compared to NaN (JS semantics)", () => {
			expect(evaluateOperator("eq", Number.NaN, Number.NaN)).toBe(false);
		});
	});

	describe("ne", () => {
		it("inverts eq", () => {
			expect(evaluateOperator("ne", "draft", "published")).toBe(true);
			expect(evaluateOperator("ne", "draft", "draft")).toBe(false);
		});
		it("returns true for NaN compared to NaN", () => {
			expect(evaluateOperator("ne", Number.NaN, Number.NaN)).toBe(true);
		});
	});

	describe("in", () => {
		it("returns true when the value is a member", () => {
			expect(evaluateOperator("in", "draft", ["draft", "published"])).toBe(
				true,
			);
		});
		it("returns false when the value is not a member", () => {
			expect(evaluateOperator("in", "archived", ["draft", "published"])).toBe(
				false,
			);
		});
		it("returns undefined when the expected value is not an array", () => {
			expect(evaluateOperator("in", "draft", "draft")).toBeUndefined();
		});
		it("returns false for an empty array (Vacuous falsity)", () => {
			expect(evaluateOperator("in", "draft", [])).toBe(false);
		});
		// An incomparable member (object against a scalar) is Kleene-unknown, not a
		// plain miss: a decidable false here would disarm a deny built on `nin`.
		it("returns undefined when no member matches but one is incomparable", () => {
			expect(
				evaluateOperator("in", "draft", [{}, "published"]),
			).toBeUndefined();
		});
		it("returns true when a later member matches despite an incomparable one", () => {
			expect(evaluateOperator("in", "draft", [{}, "draft"])).toBe(true);
		});
	});

	describe("nin", () => {
		it("is the strict negation of in", () => {
			expect(evaluateOperator("nin", "archived", ["draft", "published"])).toBe(
				true,
			);
			expect(evaluateOperator("nin", "draft", ["draft", "published"])).toBe(
				false,
			);
		});
		it("returns undefined when the expected value is not an array", () => {
			expect(evaluateOperator("nin", "draft", "draft")).toBeUndefined();
		});
		it("stays undefined when a member is incomparable", () => {
			expect(
				evaluateOperator("nin", "draft", [{}, "published"]),
			).toBeUndefined();
		});
		it("returns true for an empty array", () => {
			expect(evaluateOperator("nin", "draft", [])).toBe(true);
		});
	});

	describe("numeric comparison", () => {
		it("gt", () => {
			expect(evaluateOperator("gt", 5, 3)).toBe(true);
			expect(evaluateOperator("gt", 3, 5)).toBe(false);
			expect(evaluateOperator("gt", 5, 5)).toBe(false);
		});
		it("gte", () => {
			expect(evaluateOperator("gte", 5, 5)).toBe(true);
			expect(evaluateOperator("gte", 4, 5)).toBe(false);
		});
		it("lt", () => {
			expect(evaluateOperator("lt", 3, 5)).toBe(true);
			expect(evaluateOperator("lt", 5, 3)).toBe(false);
		});
		it("lte", () => {
			expect(evaluateOperator("lte", 5, 5)).toBe(true);
			expect(evaluateOperator("lte", 6, 5)).toBe(false);
		});
	});

	describe("date comparison", () => {
		it("compares by chronological order", () => {
			const earlier = new Date("2026-01-01");
			const later = new Date("2026-06-01");
			expect(evaluateOperator("gt", later, earlier)).toBe(true);
			expect(evaluateOperator("lt", earlier, later)).toBe(true);
			expect(evaluateOperator("gte", earlier, new Date("2026-01-01"))).toBe(
				true,
			);
		});
		it("orders a Date against an epoch-ms number", () => {
			const june = new Date("2026-06-01");
			const januaryMilliseconds = new Date("2026-01-01").getTime();
			expect(evaluateOperator("gt", june, januaryMilliseconds)).toBe(true);
			expect(evaluateOperator("lt", june, januaryMilliseconds)).toBe(false);
			expect(evaluateOperator("lt", januaryMilliseconds, june)).toBe(true);
		});
	});

	describe("string comparison", () => {
		it("compares lexicographically", () => {
			expect(evaluateOperator("gt", "b", "a")).toBe(true);
			expect(evaluateOperator("lt", "a", "b")).toBe(true);
		});
	});

	describe("incomparable operands", () => {
		it("returns undefined when present operands have mismatched types", () => {
			expect(evaluateOperator("gt", 5, "a")).toBeUndefined();
		});
		it("returns false when an operand is absent", () => {
			expect(evaluateOperator("gt", undefined, 5)).toBe(false);
			expect(evaluateOperator("lt", null, 5)).toBe(false);
		});
		// Booleans and objects have no ordering at all — unknown, not a decidable miss.
		it("returns undefined for operands that are not orderable at all", () => {
			expect(evaluateOperator("gt", true, false)).toBeUndefined();
			expect(evaluateOperator("lte", {}, {})).toBeUndefined();
		});
	});

	describe("contains", () => {
		it("returns true for substrings", () => {
			expect(evaluateOperator("contains", "hello world", "world")).toBe(true);
		});
		it("returns false when the substring is absent", () => {
			expect(evaluateOperator("contains", "hello", "xyz")).toBe(false);
		});
		it("is case sensitive", () => {
			expect(evaluateOperator("contains", "Hello", "hello")).toBe(false);
		});
		it("returns false when the expected pattern is not a string", () => {
			expect(evaluateOperator("contains", 42, 4)).toBe(false);
		});
		it("returns undefined for a present non-string actual", () => {
			expect(
				evaluateOperator("contains", ["secret"], "secret"),
			).toBeUndefined();
			expect(
				evaluateOperator("contains", { v: "secret" }, "secret"),
			).toBeUndefined();
			expect(evaluateOperator("contains", 42, "4")).toBeUndefined();
		});
		it("returns false when the actual value is absent", () => {
			expect(evaluateOperator("contains", undefined, "x")).toBe(false);
			expect(evaluateOperator("contains", null, "x")).toBe(false);
		});
		it("returns true when expected is an empty string", () => {
			expect(evaluateOperator("contains", "hello", "")).toBe(true);
			expect(evaluateOperator("contains", "", "")).toBe(true);
		});
	});

	describe("exists", () => {
		it("returns true when a present value is expected to exist", () => {
			expect(evaluateOperator("exists", "value", true)).toBe(true);
			expect(evaluateOperator("exists", 0, true)).toBe(true);
			expect(evaluateOperator("exists", false, true)).toBe(true);
		});
		it("treats null and undefined as absent", () => {
			expect(evaluateOperator("exists", null, true)).toBe(false);
			expect(evaluateOperator("exists", undefined, true)).toBe(false);
		});
		it("matches when absence is expected", () => {
			expect(evaluateOperator("exists", undefined, false)).toBe(true);
			expect(evaluateOperator("exists", "value", false)).toBe(false);
		});
		it("coerces truthy/falsy expected values to boolean", () => {
			expect(evaluateOperator("exists", "value", "yes")).toBe(true);
			expect(evaluateOperator("exists", "value", 0)).toBe(false);
			expect(evaluateOperator("exists", undefined, 0)).toBe(true);
		});
	});

	describe("unknown operator", () => {
		it("denies (returns false) instead of throwing", () => {
			expect(evaluateOperator("bogus" as never, 1, 1)).toBe(false);
		});
	});

	describe("date equality (value-based)", () => {
		it("eq matches two Date instances with the same time", () => {
			expect(
				evaluateOperator("eq", new Date("2026-01-01"), new Date("2026-01-01")),
			).toBe(true);
			expect(
				evaluateOperator("eq", new Date("2026-01-01"), new Date("2026-06-01")),
			).toBe(false);
		});
		it("ne inverts date equality", () => {
			expect(
				evaluateOperator("ne", new Date("2026-01-01"), new Date("2026-01-01")),
			).toBe(false);
		});
		it("in matches a Date by value", () => {
			expect(
				evaluateOperator("in", new Date("2026-01-01"), [
					new Date("2026-01-01"),
					new Date("2026-06-01"),
				]),
			).toBe(true);
			expect(
				evaluateOperator("in", new Date("2026-03-01"), [
					new Date("2026-01-01"),
				]),
			).toBe(false);
		});
		it("eq matches a Date against its epoch-ms number", () => {
			const date = new Date("2026-01-01");
			expect(evaluateOperator("eq", date, date.getTime())).toBe(true);
			expect(evaluateOperator("eq", date.getTime(), date)).toBe(true);
			expect(evaluateOperator("eq", date, date.getTime() + 1)).toBe(false);
		});
		it("in matches a Date against epoch-ms members", () => {
			const date = new Date("2026-01-01");
			expect(evaluateOperator("in", date, [date.getTime()])).toBe(true);
			expect(evaluateOperator("nin", date, [date.getTime()])).toBe(false);
		});
	});

	describe("reference equality (arrays and objects)", () => {
		it("compares arrays by reference, not by content", () => {
			const arr = [1, 2];
			expect(evaluateOperator("eq", arr, arr)).toBe(true);
			expect(evaluateOperator("eq", [1, 2], [1, 2])).toBe(false);
		});
		it("compares objects by reference, not by content", () => {
			const obj = { a: 1 };
			expect(evaluateOperator("eq", obj, obj)).toBe(true);
			expect(evaluateOperator("eq", { a: 1 }, { a: 1 })).toBe(false);
		});
	});

	describe("bigint", () => {
		it("orders bigints by magnitude", () => {
			expect(evaluateOperator("gt", 5n, 3n)).toBe(true);
			expect(evaluateOperator("lt", 3n, 5n)).toBe(true);
			expect(evaluateOperator("gte", 5n, 5n)).toBe(true);
		});
		it("treats equal number and bigint as equal", () => {
			expect(evaluateOperator("eq", 1, 1n)).toBe(true);
			expect(evaluateOperator("eq", 1n, 1)).toBe(true);
			expect(evaluateOperator("gte", 2, 1n)).toBe(true);
		});
		it("does not equate a fractional number with a bigint", () => {
			expect(evaluateOperator("eq", 1.5, 1n)).toBe(false);
		});
		it("equates exactly-representable integers at and beyond 2^53", () => {
			expect(evaluateOperator("eq", 9007199254740992n, 9007199254740992)).toBe(
				true,
			);
			expect(evaluateOperator("eq", 9007199254740992, 9007199254740992n)).toBe(
				true,
			);
			// biome-ignore lint/correctness/noPrecisionLoss: the precision loss is exactly what this test asserts.
			expect(evaluateOperator("eq", 9007199254740993n, 9007199254740993)).toBe(
				false,
			);
		});
	});

	describe("NaN and invalid dates (incomparable)", () => {
		it("never satisfies ordering for NaN", () => {
			expect(evaluateOperator("gt", Number.NaN, 5)).toBe(false);
			expect(evaluateOperator("gte", Number.NaN, 5)).toBe(false);
			expect(evaluateOperator("lt", Number.NaN, 5)).toBe(false);
			expect(evaluateOperator("lte", Number.NaN, 5)).toBe(false);
		});
		it("treats an invalid date as incomparable", () => {
			expect(
				evaluateOperator("gte", new Date("not-a-date"), new Date("2026-01-01")),
			).toBe(false);
			expect(evaluateOperator("gte", new Date("not-a-date"), 0)).toBe(false);
			expect(evaluateOperator("eq", new Date("not-a-date"), Number.NaN)).toBe(
				false,
			);
		});
	});
});
