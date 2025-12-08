/**
 * Tests for Analytics Calculator Service
 * @file analyticsCalculator.test.ts
 */
import { describe, it, expect } from "vitest";
import {
    calculateMemberPatterns,
    identifyIrregularMembers,
    comparePerformance,
    getMonthlyTitheSummary,
    getTopAssemblies,
    MemberTithingPattern
} from "./analyticsCalculator";
import { TransactionLogEntry, TitheRecordB, MemberDatabase } from "../types";

// ============================================================================
// TEST DATA FACTORIES
// ============================================================================

const createTitheRecord = (
    name: string,
    amount: number,
    date: string
): TitheRecordB => ({
    "No.": 1,
    "Transaction Type": "Individual Tithe-[Income]",
    "Payment Source Type": "Registered Member",
    "Membership Number": name,
    "Transaction Date ('DD-MMM-YYYY')": date,
    "Currency": "GHS",
    "Exchange Rate": 1,
    "Payment Method": "Cash",
    "Transaction Amount": amount,
    "Narration/Description": "Tithe",
    "Confidence": 1
});

const createTransactionLog = (
    assemblyName: string,
    date: string,
    records: TitheRecordB[]
): TransactionLogEntry => ({
    id: `log-${Date.now()}-${Math.random()}`,
    assemblyName,
    timestamp: Date.now(),
    selectedDate: date,
    titheListData: records,
    totalTitheAmount: records.reduce((sum, r) => sum + (Number(r["Transaction Amount"]) || 0), 0),
    soulsWonCount: 0,
    titherCount: records.filter(r => (Number(r["Transaction Amount"]) || 0) > 0).length,
    recordCount: records.length,
    concatenationConfig: { Title: true, "First Name": true, Surname: true, "Other Names": true, "Membership Number": true },
    descriptionText: "Test",
    amountMappingColumn: null
});

// ============================================================================
// CALCULATE MEMBER PATTERNS TESTS
// ============================================================================

describe("calculateMemberPatterns", () => {
    it("returns empty array for empty logs", () => {
        const result = calculateMemberPatterns([]);
        expect(result).toEqual([]);
    });

    it("calculates patterns for single member", () => {
        const logs: TransactionLogEntry[] = [
            createTransactionLog("Central", "2024-01-07", [
                createTitheRecord("John Doe (TAC001)", 100, "07-Jan-2024")
            ]),
            createTransactionLog("Central", "2024-01-14", [
                createTitheRecord("John Doe (TAC001)", 150, "14-Jan-2024")
            ])
        ];

        const result = calculateMemberPatterns(logs);

        expect(result.length).toBe(1);
        expect(result[0].memberId).toBe("TAC001");
        expect(result[0].totalTitheYTD).toBe(250);
        expect(result[0].weeksPaid).toBe(2);
    });

    it("filters by assembly when specified", () => {
        const logs: TransactionLogEntry[] = [
            createTransactionLog("Central", "2024-01-07", [
                createTitheRecord("John Doe (TAC001)", 100, "07-Jan-2024")
            ]),
            createTransactionLog("North", "2024-01-07", [
                createTitheRecord("Jane Doe (TAC002)", 200, "07-Jan-2024")
            ])
        ];

        const allPatterns = calculateMemberPatterns(logs);
        const centralOnly = calculateMemberPatterns(logs, "Central");

        expect(allPatterns.length).toBe(2);
        expect(centralOnly.length).toBe(1);
        expect(centralOnly[0].memberId).toBe("TAC001");
    });

    it("calculates consistency score correctly", () => {
        // 4 weeks period, member paid 2 weeks = 50% consistency
        const logs: TransactionLogEntry[] = [
            createTransactionLog("Central", "2024-01-07", [
                createTitheRecord("John Doe (TAC001)", 100, "07-Jan-2024")
            ]),
            createTransactionLog("Central", "2024-01-28", [
                createTitheRecord("John Doe (TAC001)", 100, "28-Jan-2024")
            ])
        ];

        const result = calculateMemberPatterns(logs);

        expect(result[0].consistencyScore).toBeGreaterThanOrEqual(50);
    });

    it("sorts by total tithe descending", () => {
        const logs: TransactionLogEntry[] = [
            createTransactionLog("Central", "2024-01-07", [
                createTitheRecord("Low Tither (TAC001)", 50, "07-Jan-2024"),
                createTitheRecord("High Tither (TAC002)", 500, "07-Jan-2024")
            ])
        ];

        const result = calculateMemberPatterns(logs);

        expect(result[0].memberId).toBe("TAC002");
        expect(result[1].memberId).toBe("TAC001");
    });
});

// ============================================================================
// IDENTIFY IRREGULAR MEMBERS TESTS
// ============================================================================

describe("identifyIrregularMembers", () => {
    const mockPatterns: MemberTithingPattern[] = [
        {
            memberId: "TAC001",
            memberName: "Regular John",
            assemblyName: "Central",
            totalTitheYTD: 1000,
            weeksPaid: 10,
            weeksInPeriod: 12,
            consistencyScore: 83,
            averageTithe: 100,
            lastTitheDate: "2024-03-01",
            lastTitheAmount: 100,
            trend: "stable",
            tithes: []
        },
        {
            memberId: "TAC002",
            memberName: "Irregular Jane",
            assemblyName: "Central",
            totalTitheYTD: 200,
            weeksPaid: 3,
            weeksInPeriod: 12,
            consistencyScore: 25,
            averageTithe: 67,
            lastTitheDate: "2024-02-01",
            lastTitheAmount: 50,
            trend: "irregular",
            tithes: []
        },
        {
            memberId: "TAC003",
            memberName: "Never Paid",
            assemblyName: "Central",
            totalTitheYTD: 0,
            weeksPaid: 0,
            weeksInPeriod: 12,
            consistencyScore: 0,
            averageTithe: 0,
            lastTitheDate: "",
            lastTitheAmount: 0,
            trend: "new",
            tithes: []
        }
    ];

    it("returns members below default threshold (50%)", () => {
        const result = identifyIrregularMembers(mockPatterns);

        expect(result.length).toBe(1); // Only TAC002 (25%, paid > 0)
        expect(result[0].memberId).toBe("TAC002");
    });

    it("excludes members who never paid", () => {
        const result = identifyIrregularMembers(mockPatterns);

        const neverPaid = result.find(p => p.memberId === "TAC003");
        expect(neverPaid).toBeUndefined();
    });

    it("respects custom threshold", () => {
        const result = identifyIrregularMembers(mockPatterns, 90);

        // Both TAC001 (83%) and TAC002 (25%) below 90%
        expect(result.length).toBe(2);
    });

    it("sorts by consistency ascending (worst first)", () => {
        const result = identifyIrregularMembers(mockPatterns, 90);

        expect(result[0].consistencyScore).toBeLessThanOrEqual(result[1].consistencyScore);
    });
});

// ============================================================================
// COMPARE PERFORMANCE TESTS
// ============================================================================

describe("comparePerformance", () => {
    const logs: TransactionLogEntry[] = [
        createTransactionLog("Central", "2024-01-15", [
            createTitheRecord("John (TAC001)", 100, "15-Jan-2024")
        ]),
        createTransactionLog("Central", "2024-02-15", [
            createTitheRecord("John (TAC001)", 150, "15-Feb-2024")
        ])
    ];

    it("calculates period totals correctly", () => {
        const result = comparePerformance(
            logs,
            new Date("2024-01-01"),
            new Date("2024-01-31"),
            new Date("2024-02-01"),
            new Date("2024-02-28")
        );

        expect(result.period1Total).toBe(100);
        expect(result.period2Total).toBe(150);
    });

    it("determines trend as up when increase > 5%", () => {
        const result = comparePerformance(
            logs,
            new Date("2024-01-01"),
            new Date("2024-01-31"),
            new Date("2024-02-01"),
            new Date("2024-02-28")
        );

        expect(result.trendDirection).toBe("up");
        expect(result.percentageChange).toBe(50); // 50% increase
    });

    it("determines trend as down when decrease > 5%", () => {
        // Reverse the periods
        const result = comparePerformance(
            logs,
            new Date("2024-02-01"),
            new Date("2024-02-28"),
            new Date("2024-01-01"),
            new Date("2024-01-31")
        );

        expect(result.trendDirection).toBe("down");
    });

    it("determines trend as stable for small changes", () => {
        const stableLogs: TransactionLogEntry[] = [
            createTransactionLog("Central", "2024-01-15", [
                createTitheRecord("John (TAC001)", 100, "15-Jan-2024")
            ]),
            createTransactionLog("Central", "2024-02-15", [
                createTitheRecord("John (TAC001)", 102, "15-Feb-2024")
            ])
        ];

        const result = comparePerformance(
            stableLogs,
            new Date("2024-01-01"),
            new Date("2024-01-31"),
            new Date("2024-02-01"),
            new Date("2024-02-28")
        );

        expect(result.trendDirection).toBe("stable");
    });

    it("filters by assembly when specified", () => {
        const multiAssemblyLogs: TransactionLogEntry[] = [
            ...logs,
            createTransactionLog("North", "2024-01-15", [
                createTitheRecord("Jane (TAC002)", 500, "15-Jan-2024")
            ])
        ];

        const allResult = comparePerformance(
            multiAssemblyLogs,
            new Date("2024-01-01"),
            new Date("2024-01-31"),
            new Date("2024-02-01"),
            new Date("2024-02-28")
        );

        const centralOnly = comparePerformance(
            multiAssemblyLogs,
            new Date("2024-01-01"),
            new Date("2024-01-31"),
            new Date("2024-02-01"),
            new Date("2024-02-28"),
            "Central"
        );

        expect(allResult.period1Total).toBe(600); // 100 + 500
        expect(centralOnly.period1Total).toBe(100);
    });
});

// ============================================================================
// GET MONTHLY TITHE SUMMARY TESTS
// ============================================================================

describe("getMonthlyTitheSummary", () => {
    it("returns 12 months of data", () => {
        const result = getMonthlyTitheSummary([], 2024);

        expect(result.length).toBe(12);
        expect(result[0].month).toBe("January");
        expect(result[11].month).toBe("December");
    });

    it("returns zeros for empty logs", () => {
        const result = getMonthlyTitheSummary([], 2024);

        result.forEach(month => {
            expect(month.total).toBe(0);
            expect(month.tithersCount).toBe(0);
        });
    });

    it("calculates monthly totals correctly", () => {
        const logs: TransactionLogEntry[] = [
            createTransactionLog("Central", "2024-01-15", [
                createTitheRecord("John (TAC001)", 100, "15-Jan-2024"),
                createTitheRecord("Jane (TAC002)", 200, "15-Jan-2024")
            ])
        ];

        const result = getMonthlyTitheSummary(logs, 2024);

        expect(result[0].total).toBe(300);
        expect(result[0].tithersCount).toBe(2);
    });

    it("filters by assembly when specified", () => {
        const logs: TransactionLogEntry[] = [
            createTransactionLog("Central", "2024-01-15", [
                createTitheRecord("John (TAC001)", 100, "15-Jan-2024")
            ]),
            createTransactionLog("North", "2024-01-15", [
                createTitheRecord("Jane (TAC002)", 500, "15-Jan-2024")
            ])
        ];

        const allAssemblies = getMonthlyTitheSummary(logs, 2024);
        const centralOnly = getMonthlyTitheSummary(logs, 2024, "Central");

        expect(allAssemblies[0].total).toBe(600);
        expect(centralOnly[0].total).toBe(100);
    });
});

// ============================================================================
// GET TOP ASSEMBLIES TESTS
// ============================================================================

describe("getTopAssemblies", () => {
    const mockDatabase: MemberDatabase = {
        "Central": { data: Array(10).fill({}) as any, lastUpdated: Date.now(), fileName: "test.xlsx" },
        "North": { data: Array(5).fill({}) as any, lastUpdated: Date.now(), fileName: "test.xlsx" }
    };

    it("returns sorted by total descending", () => {
        const logs: TransactionLogEntry[] = [
            createTransactionLog("Central", "2024-01-15", [
                createTitheRecord("John (TAC001)", 100, "15-Jan-2024")
            ]),
            createTransactionLog("North", "2024-01-15", [
                createTitheRecord("Jane (TAC002)", 500, "15-Jan-2024")
            ])
        ];

        const result = getTopAssemblies(logs, mockDatabase);

        expect(result[0].assembly).toBe("North");
        expect(result[0].total).toBe(500);
    });

    it("calculates per capita correctly", () => {
        const logs: TransactionLogEntry[] = [
            createTransactionLog("Central", "2024-01-15", [
                createTitheRecord("John (TAC001)", 100, "15-Jan-2024")
            ])
        ];

        const result = getTopAssemblies(logs, mockDatabase);

        // Central: 100 total / 10 members = 10 per capita
        expect(result[0].perCapita).toBe(10);
    });

    it("respects limit parameter", () => {
        const logs: TransactionLogEntry[] = [
            createTransactionLog("Central", "2024-01-15", [createTitheRecord("A", 100, "d")]),
            createTransactionLog("North", "2024-01-15", [createTitheRecord("B", 200, "d")]),
            createTransactionLog("East", "2024-01-15", [createTitheRecord("C", 300, "d")])
        ];

        const result = getTopAssemblies(logs, mockDatabase, 2);

        expect(result.length).toBe(2);
    });

    it("defaults per capita to total/1 for unknown assemblies", () => {
        const logs: TransactionLogEntry[] = [
            createTransactionLog("Unknown", "2024-01-15", [
                createTitheRecord("John (TAC001)", 100, "15-Jan-2024")
            ])
        ];

        const result = getTopAssemblies(logs, mockDatabase);

        // Unknown assembly: 100 / 1 = 100
        expect(result[0].perCapita).toBe(100);
    });
});
