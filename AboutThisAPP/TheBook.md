# The Apostolic Church - Ghana: Tithes Register

> A comprehensive documentation of the physical Tithe Book used by The Apostolic Church - Ghana for manual weekly tithe recording.

---

## 📖 Overview

The **Tithes Register** is an official, branded physical ledger published by **The Apostolic Church - Ghana**. It serves as the authoritative record for tracking weekly tithe contributions from church members (referred to as **"tithers"**) throughout an entire calendar year.

![Blank Tithe Book Template](w:\CodeDeX\TACTMS\AboutThisAPP\TitheBook_blank_template.jpg)

---

## 🗂️ Physical Structure

### Book Orientation
- **Landscape-oriented** hardcover register
- Designed to be opened flat for easy writing
- Each spread (two facing pages) covers the **entire year** for a set of members

### Page Numbering
- Pages are numbered at the **bottom center** (e.g., page 13, 14, 23, etc.)
- Each page is branded with: **"THE APOSTOLIC CHURCH-GHANA, TITHES REGISTER"**

---

## 📊 Page Layout & Columns

### The "SET" Concept
When opened, the book displays **two facing pages** that together form a **"SET"**:
- **Left page** (e.g., page 13): Covers **January → May**
- **Right page** (e.g., page 14): Covers **June → December** (continuation)

> [!IMPORTANT]
> A single "SET" (two facing pages) can accommodate a maximum of **31 members/tithers**.

### Column Structure

Each page follows this structured layout:

#### Left Page (January - May)

| Column | Description |
|--------|-------------|
| **NO** | Sequential member number (1, 2, 3, ... 31) |
| **NAME** | Full name of the tither (handwritten) |
| **JANUARY** | Week columns: 1st, 2nd, 3rd, 4th, 5th + **TOTAL** |
| **FEBRUARY** | Week columns: 1st, 2nd, 3rd, 4th, 5th + **TOTAL** |
| **MARCH** | Week columns: 1st, 2nd, 3rd, 4th, 5th + **TOTAL** |
| **APRIL** | Week columns: 1st, 2nd, 3rd, 4th, 5th + **TOTAL** |
| **MAY** | Week columns: 1st, 2nd, 3rd, 4th, 5th + **TOTAL** |

#### Right Page (June - December)

| Column | Description |
|--------|-------------|
| **JUNE** | Week columns: 1st, 2nd, 3rd, 4th, 5th + **TOTAL** |
| **JULY** | Week columns: 1st, 2nd, 3rd, 4th, 5th + **TOTAL** |
| **AUGUST** | Week columns: 1st, 2nd, 3rd, 4th, 5th + **TOTAL** |
| **SEPTEMBER** | Week columns: 1st, 2nd, 3rd, 4th, 5th + **TOTAL** |
| **OCTOBER** | Week columns: 1st, 2nd, 3rd, 4th, 5th + **TOTAL** |
| **NOVEMBER** | Week columns: 1st, 2nd, 3rd, 4th, 5th + **TOTAL** |
| **DECEMBER** | Week columns: 1st, 2nd, 3rd, 4th, 5th + **TOTAL** |

![Full Spread View - 2025](w:\CodeDeX\TACTMS\AboutThisAPP\TitheBook_spread_view.jpg)

---

## 📝 How Data is Recorded

### Year Header
- At the **top center** of each page, there's a space to write the **YEAR** (e.g., "YEAR: 2025")
- This is filled in once at the beginning of the year

### Member Entry
Each row represents **one tither** and includes:

1. **NO** - A sequential number assigned based on their position in that assembly's roster
2. **NAME** - The full name of the member (handwritten by the administrator)

### Weekly Tithe Recording
Each month has **5 week columns** (1st, 2nd, 3rd, 4th, 5th) plus a **TOTAL** column:

- The **week columns** correspond to the Sundays of that month:
  - **1st** = First Sunday of the month
  - **2nd** = Second Sunday of the month
  - **3rd** = Third Sunday of the month
  - **4th** = Fourth Sunday of the month
  - **5th** = Fifth Sunday (if applicable; some months have 5 Sundays)

- The **TOTAL** column is for the monthly sum of all weekly contributions

### Recording Convention
- Amounts are written in the appropriate week column
- **Red ink** is often used to write the Total.
- **Blue/Black ink** is standard for regular entries
- Empty cells indicate the member did not tithe that week

![Page 14 - June to December with Entries](w:\CodeDeX\TACTMS\AboutThisAPP\TitheBook_page14.jpg)

---

## 👥 Member Capacity

### Per SET (Two Facing Pages)
- **Maximum capacity**: 31 members
- Each SET provides a full year's tracking for those 31 members

### For Large Assemblies
When an assembly has more than 31 tithers:
- Additional SETs are used for overflow members
- Page numbering continues sequentially
- The **NO** column continues from where the previous SET ended
  - Example: Page 13/14 has members 1-31, Page 15/16 has members 32-62, etc.

![Page 13 - Members 63-93](w:\CodeDeX\TACTMS\AboutThisAPP\TitheBook_page13.jpg)

---

## 🔢 Page Number Logic

### Identifying Continuation Pages of the same Assembly

| Page Numbers | Member Range | Months Covered | SET |
|--------------|--------------|----------------|-----|
| Pages 1-2 | Members 1-31 | Full Year | 1st SET |
| Pages 3-4 | Members 32-62 | Full Year | 2nd SET |
| Pages 5-6 | Members 63-93 | Full Year | 3rd SET |
| Pages 7-8 | Members 94-124 | Full Year | 4th SET |



## 🎨 Visual Characteristics

### Watermark
- A **watermark of The Apostolic Church logo** appears in the center of each page
- This provides authentication and branding

### Grid Lines
- Precise **horizontal and vertical lines** form a structured grid
- Enables neat, organized record-keeping
- All cells are uniform in size for consistency

### Footer Branding
- Every page displays: **"THE APOSTOLIC CHURCH-GHANA, TITHES REGISTER"**
- Page number appears in a **colored box** (typically red/maroon/black)

---

## 📅 Year-Based Usage

- **One book per year** per assembly (or per group of assemblies)
- At the start of each year:
  1. The **YEAR** field is filled in at the top
  2. Member **NAMES** are written in the NAME column for the year.
  3. New members are added at the end of the existing list

---

## ⚙️ Data Flow to TACTMS

The physical Tithe Book is the **source of truth** that TACTMS digitizes:

```mermaid
flowchart LR
    A[Physical Tithe Book] -->|Image Capture| B[TACTMS AI]
    B -->|OCR/ICR Processing| C[Data Extraction]
    C -->|Member Matching| D[Assembly Roster]
    D -->|Amount Mapping| E[B.xlsx Export]
    E -->|Upload| F[TACMS System]
```

### Key Data Points Extracted:
1. **Member Names** - Matched against persisted assembly rosters
2. **Week Columns** - Identifies which Sunday the tithe was recorded
3. **Amounts** - The actual tithe values
4. **NO Column** - Used to maintain positional order
5. **Page Number** - Helps identify continuation pages and member ranges

---

## 📋 Summary Table

| Attribute | Value |
|-----------|-------|
| **Publisher** | The Apostolic Church - Ghana |
| **Orientation** | Landscape |
| **Members per SET** | 31 (maximum) |
| **Months Covered** | 12 (January - December) |
| **Weeks per Month** | 5 (1st, 2nd, 3rd, 4th, 5th) |
| **Additional Columns** | Monthly TOTAL |
| **Branding** | Watermark + Footer text |
| **Usage Period** | One calendar year |

---

## 🔗 Related Files

- [WhyThisApp.md](./WhyThisApp.md) - Project motivation and logic
- [TitheBook.html](./TitheBook.html) - HTML representation of the book structure
- [A.xlsx](./A.xlsx) - Member details export from TACMS
- [B.xlsx](./B.xlsx) - Transaction template for TACMS upload

---

> [!TIP]
> For TACTMS to accurately process tithe book images, ensure that:
> - The **YEAR** is clearly visible
> - The **NAME** column is captured (not just the amounts)
> - The **page number** is visible at the bottom
> - Images are clear and well-lit
