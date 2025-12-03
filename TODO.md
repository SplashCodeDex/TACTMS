# 🚀 Project Roadmap & Advanced Feature Specifications

This document serves as the master plan for elevating the TACTMS application from a functional tool to an intelligent, self-correcting, and user-centric platform.

---

## 1. 🧠 Intelligent Identity Parser (`MemberIdentityService`)
**Status:** 🔴 Pending | **Priority:** High | **Type:** Core Infrastructure

### The Problem
Currently, the application relies on scattered, brittle Regular Expressions (Regex) within individual components (like `App.tsx`) to clean up member IDs. This "band-aid" approach is fragile; if the data format shifts slightly (e.g., a missing space or an extra parenthesis), the export breaks or produces ugly data.

### The Solution: A Centralized "Brain"
We will build a dedicated `MemberIdentityService` that acts as the single source of truth for all identity-related logic.

### Detailed Capabilities
1.  **Multi-Format Pattern Recognition:**
    The service will robustly handle and normalize messy input formats into a standardized structure:
    *   **Input:** `John Doe (TAC123)` → **Output:** Name: `John Doe`, ID: `TAC123`
    *   **Input:** `(TAC123) John Doe` → **Output:** Name: `John Doe`, ID: `TAC123`
    *   **Input:** `TAC123 - John Doe` → **Output:** Name: `John Doe`, ID: `TAC123`
    *   **Input:** `(TAC123)` → **Output:** Name: `[Unknown]`, ID: `TAC123`

2.  **Intelligent Typo Correction (Fuzzy Logic):**
    It will detect and auto-correct common data entry errors based on the known `TAC` pattern:
    *   `TAG89...` → Auto-corrected to `TAC89...`
    *   `TCA89...` → Auto-corrected to `TAC89...`
    *   `TAC 89...` (extra space) → Auto-corrected to `TAC89...`

3.  **Strict Validation Protocol:**
    It will enforce the canonical ID format: `TAC` + `[Year: 2 digits]` + `[Initials: 3 chars]` + `[Date: 6 digits]`.
    *   **Valid:** `TAC89JAM131001`
    *   **Invalid:** `TAC89JAM131` (Too short) -> *Flagged for review*

### Technical Implementation
*   **Method:** `parseIdentity(input: string): { name: string | null, id: string | null, confidence: number, original: string }`
*   **Usage:** This service will be injected into:
    *   **Image Verification:** To clean AI outputs immediately.
    *   **Excel Import:** To sanitize legacy data upon entry.
    *   **Excel Export:** To guarantee perfect formatting in the final report.

---

## 2. 🏥 The "Self-Healing" Database
**Status:** 🔴 Pending | **Priority:** Medium | **Type:** Data Integrity

### The Problem
Bad data (like a name stuck inside an ID field) currently sits in the database until it causes a problem during export. We are fixing the *symptom* (the export) instead of the *disease* (the data).

### The Solution: Proactive Data Hygiene
Implement a background system that actively monitors, reports, and repairs data inconsistencies without user intervention.

### Detailed Workflow
1.  **Background Scanner:**
    A lightweight process runs on application load (or on demand) to scan the entire `MemberDatabase`. It looks for:
    *   IDs containing spaces or lowercase letters (suspicious).
    *   IDs that match the "Name (ID)" pattern.
    *   Duplicate IDs across different names.

2.  **Health Dashboard & Alerts:**
    *   **UI:** A new "Data Health" tab in the Settings or Dashboard.
    *   **Notification:** "⚠️ System detected 12 malformed member records."
    *   **Action:** Users can click "Review Issues" to see a side-by-side comparison of "Current" vs. "Proposed Fix".

3.  **One-Click Bulk Repair:**
    *   Users can select all safe fixes (e.g., stripping parentheses) and apply them in one click.
    *   Ambiguous cases (e.g., two members with the same ID) are flagged for manual resolution.

---

## 3. 🎨 WYSIWYG (What You See Is What You Get) Export Experience
**Status:** 🔴 Pending | **Priority:** Medium | **Type:** User Experience (UX)

### The Problem
Currently, exporting is a "blind" process. Users click "Download," wait, and then have to open Excel to see if the result is what they wanted.



## 5. 📈 Smart Financial Insights (AI Analyst)
**Status:** ⚪ Future Concept | **Priority:** Medium | **Type:** Analytics

### The Problem
Users currently see raw numbers (Total Tithe: 5,000). They don't know if this is good, bad, or trending downwards compared to historical data.

### The Solution: Predictive & Comparative Analytics
Turn the dashboard into a financial analyst that explains the "Why" behind the numbers.

### Detailed Features
1.  **Trend Analysis:**
    *   "Tithe income is **15% lower** than the same Sunday last year."
    *   "Attendance has dropped for 3 consecutive weeks."
2.  **Forecasting:**
    *   "Based on current trends, expected tithe for next month is ~GHS 12,000."
3.  **Anomaly Detection:**
    *   "Unusual Activity: 5 regular high-value tithers missed payment this week."
