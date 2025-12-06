### **Basic Idea/Logic of this project.**



There is a church called The Apostolic Church in Ghana. This church is structured into levels; National, Area, District and Local/Assembly. Where Locals/Assemblies is the actual church(example; Ayiresu, Central, Maranatha) where people worship, District is the administration that covers particular set of locals. Example; Jei-Krodua(Jei-Krodua is my district but there are other districts such as Silom, K2, Ofaankor and many more). Area is the administration that covers particular set of Districts such as Jei-Krodua and  Ofaankor. Lastly,  National are the executives in charge of the church across Ghana, the head, and the administrations that covers the all the Area. Also, information and rules is passed down in the order that i have said(National - Area - District -Assembly/Local). Also, the church has an online website AI called TACMS(The Apostolic Church Management AI) that administrators can use to manage members, souls, transactions, projects, and many more scoped to the level they are in. TACMS recognize every member by their membership IDs only and the ID is unique and it is assigned by the TACMS immediately after registering the member on TACMS. Now, per the Church rules, every Sunday, the administrator of the local/assembly must record the tithes of every member who was present in their local/assembly Tithe Books(TitheBook.jpg or see AboutThisAPP\TitheBook.html for the html representation of how the Tithe Book is structured.), these special members are called tithers.  Now. I, CodeDeX happen to be in Jei-Krodua District. I am now the District Administrator at District level. I am entitled to records the tithes amount/transaction from the Tithe books of each assembly to TACMS.  I have decided to create this project called TACTMS (The Apostolic Church Tithe Made Simple) to make the process easy. Since TACMS has no API logic, I rely on the 2 excel files ( Lets call them A.xlsx AboutThisAPP\A.xlsx) and B(AboutThisAPP\B.xlsx). There is also a Markdown and pdf version (A.md, B.md, A.csv, B.csv) for easier understanding of the files structure that TACMS makes it possible to download. Even though, TACMS only accepts one of the files (B.xlsx) as a ready, dated Sunday tithers to be processed.  The A, excel file which is raw data and includes marital status, type of marriage, age, Gender and many more for the members. this  raw excel file is actually the membership details. The B excel file  has payment method, transaction amount, narration/description, and so on. Note: the B excel structure is the only excel file TACMS acknowledges and receives to process the alerts therefore  it is the exact excel structure TACTMS(our project) needs to produce in our final export (Download Excel) which means TACTMS must see to it that only after the  Transaction Amount(since the rest are all the same except the "Transaction Date ('DD-MMM-YYYY)" which will use the selected Sunday date and the "Narration/Description" which will be populated with "Tithe for 'the  selected date' like: Tithe for 02-NOV-2025) is entered/populated,  that it can final export(Download excel). Also in the A, there  is "membership number(TAC89JAM131001)", " old membership number(651101008)" , "Title(PASTOR)", "First Name(JONATHAN)", "Surname(ADDO)", "other name(MENSAH)" but notice how  for the B, we have "Membership Number(PASTOR JONATHAN ADDO MENSAH (TAC89JAM131001|651101008))" which is simply achieved by concatenating "membership number(TAC89JAM131001)", " old membership number(651101008)" , "Title(PASTOR)", "First Name(JONATHAN)", "Surname(ADDO)", "other name(MENSAH)" from the A with only the Membership  and the old membership number  separated by "|".  Note: The Old Membership Number (651101008) is the old way of assigning IDs to registered members but after TACMS upgrade, it introduced the new (Membership Number (TAC89JAM131001)) but it didn't abandoned the old membership number, it just separated it with "|" that is why you will see some members with (TAC89JAM131001|651101008). Also, the least compulsory requirements for registering members on TACMS to qualify for the membership number assigning are First Name, Surname and date of birth.  Then TACMS will automatically assign Membership number(TAC89JAM131001).

Even though TACMS does a lot, I want my project(TACTMS) to be easier, AI-Powered, smarter, intelligent and more user-friendly:

## Tithe Book Description:
The tithe Book, when opened,  is a landscape-oriented register used to manually record weekly(Sundays only) tithe contributions from church members throughout an entire year. It's published/branded by The Apostolic Church - Ghana. shows two pages (let say: 13 and 14). on the 13th page, it has the 'NO', 'NAME', 'JANUARY (Week 1st|2nd|3rd|4th|5th + TOTAL)', 'FEBRUARY (Week 1st|2nd|3rd|4th|5th + TOTAL)', 'MARCH (Week 1st|2nd|3rd|4th|5th + TOTAL)', 'APRIL (Week 1st|2nd|3rd|4th|5th + TOTAL)' and 'MAY (Week 1st|2nd|3rd|4th|5th + TOTAL)' and since the 14th page is the continuation of 13th page, it just continue the month; 'JUNE (Week 1st|2nd|3rd|4th|5th + TOTAL)', 'JULY (Week 1st|2nd|3rd|4th|5th + TOTAL)', 'AUGUST (Week 1st|2nd|3rd|4th|5th + TOTAL)', 'SEPTEMBER (Week 1st|2nd|3rd|4th|5th + TOTAL)', 'OCTOBER (Week 1st|2nd|3rd|4th|5th + TOTAL)', 'NOVEMBER (Week 1st|2nd|3rd|4th|5th + TOTAL)', 'DECEMBER (Week 1st|2nd|3rd|4th|5th + TOTAL)'. Therefore, page 13 and 14 are deemed as 'SET'. Now, the 'NAME' column for a 'SET' is limited to 31.
Each SET provides a full year's tracking for those 31 members. When an assembly has more than 31 tithers:
- Additional SETs are used for overflow members
- Page numbering continues sequentially
- The **NO** column continues from where the previous SET ended
  - Example: Page 13/14 has members 1-31, Page 15/16 has members 32-62, etc.
  ---

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
- Page number appears in a **colored box** (typically red/maroon)

---

## 📅 Year-Based Usage

- **One book per year** per assembly
- At the start of each year:
  1. The **YEAR** field is filled in at the top
  2. Member **NAMES** are written in the NAME column
  3. New members are added at the end of the existing list therefore each register member will retain their position for an entire year.

---

## ⚙️ Data Flow to TACTMS

The physical Tithe Book is the **source of truth** that TACTMS digitizes:






## FAGs
Handling Partial Image Captures
If a user captures only the data columns (e.g., the 1st-5th weeks of October) without the corresponding names, the image context alone is insufficient for the AI to identify the tithers. The AI sees numbers and grid lines, but no names.

Solution: The AI will prompt the user to  Manually select the assembly and provide the starting position (e.g., "This is the 1st-5th weeks of October for Central Assembly, starting at position 100").

This ensures the AI can correctly map the data to the persisted Assembly_Rosters.


---

### Handling Multiple Pages of the Same Assembly

If a user uploads multiple images of the same assembly("The same assembly" because the user will choose the assembly after he/she has uploaded the images, e.g., Central Assembly, October,  4th week), the AI will:
 analyze the page number, The Months in the page, the "NO." and "NAME" Column  of the two images to know that, two images shows that they are Landscape-oriented, opened flat two facing pages captured images for a set of members and will stitch the data together. e.g. 1st image (Page:9, 'NO':1,2.3..., 'NAME':John Doe, Jane Smith, etc.  Month: JANUARY, FEBRUARY, MARCH..), 2nd image (page:10, only  continued Months: JUNE, JULY, AUGUST, SEPTEMBER, OCTOBER, NOVEMBER, DECEMBER). The AI will cross-validate the data to ensure accuracy if multiple images of the same page is provided.

---

### Handling New Members vs. Existing Members

When uploading an updated `A.xlsx` file:
1. The AI will compare the new list with the persisted `Assembly_Rosters`.
2. New members (not in the existing database) will be added as "won souls" for the current month.
3. Existing members will retain their historical data, and their positions in the databse that matches with  the physical tithe book.

---

---
