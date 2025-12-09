### **Basic Idea/Logic of this project.**



There is a church called The Apostolic Church in Ghana. This church is structured into levels; National, Area, District and Local/Assembly. Where Locals/Assemblies is the actual church(example; Ayiresu, Central, Maranatha) where people worship, District is the administration that covers particular set of locals. Example; Jei-Krodua(Jei-Krodua is my district but there are other districts such as Silom, K2, Ofaankor and many more). Area is the administration that covers particular set of Districts such as Jei-Krodua and  Ofaankor. Lastly,  National are the executives in charge of the church across Ghana, the head, and the administrations that covers the all the Area. Also, information and rules is passed down in the order that i have said(National - Area - District -Assembly/Local). Also, the church has an online website AI called TACMS(The Apostolic Church Management AI) that administrators can use to manage members, souls, transactions, projects, and many more scoped to the level they are in. TACMS recognize every member by their membership IDs only and the ID is unique and it is assigned by the TACMS immediately after registering the member on TACMS. Now, per the Church rules, every Sunday, the administrator of the local/assembly must record the tithes of every member who was present in their local/assembly Tithe Books(TitheBook.jpg or see AboutThisAPP\TitheBook.html for the html representation of how the Tithe Book is structured.), these special members are called tithers.  Now. I, CodeDeX happen to be in Jei-Krodua District. I am now the District Administrator at District level. I am entitled to records the tithes amount/transaction from the Tithe books of each assembly to TACMS.  I have decided to create this project called TACTMS (The Apostolic Church Tithe Made Simple) to make the process easy. Since TACMS has no API logic, I rely on the 2 excel files ( Lets call them A.xlsx AboutThisAPP\A.xlsx) and B(AboutThisAPP\B.xlsx). There is also a Markdown and pdf version (A.md, B.md, A.csv, B.csv) for easier understanding of the files structure that TACMS makes it possible to download. Even though, TACMS only accepts one of the files (B.xlsx) as a ready, dated Sunday tithers to be processed.  The A, excel file which is raw data and includes marital status, type of marriage, age, Gender and many more for the members. this  raw excel file is actually the membership details. The B excel file  has payment method, transaction amount, narration/description, and so on. Note: the B excel structure is the only excel file TACMS acknowledges and receives to process the alerts therefore  it is the exact excel structure TACTMS(our project) needs to produce in our final export (Download Excel) which means TACTMS must see to it that only after the  Transaction Amount(since the rest are all the same except the "Transaction Date ('DD-MMM-YYYY)" which will use the selected Sunday date and the "Narration/Description" which will be populated with "Tithe for 'the  selected date' like: Tithe for 02-NOV-2025) is entered/populated,  that it can final export(Download excel). Also in the A, there  is "membership number(TAC89JAM131001)", " old membership number(651101008)" , "Title(PASTOR)", "First Name(JONATHAN)", "Surname(ADDO)", "other name(MENSAH)" but notice how  for the B, we have "Membership Number(PASTOR JONATHAN ADDO MENSAH (TAC89JAM131001|651101008))" which is simply achieved by concatenating "membership number(TAC89JAM131001)", " old membership number(651101008)" , "Title(PASTOR)", "First Name(JONATHAN)", "Surname(ADDO)", "other name(MENSAH)" from the A with only the Membership  and the old membership number  separated by "|".
## NOTE:
1. The Old Membership Number (651101008) is the old way of assigning IDs to registered members but after TACMS upgrade, it introduced the new (Membership Number (TAC89JAM131001)) but it didn't abandoned the old membership number, it just separated it with "|" that is why you will see some members with (TAC89JAM131001|651101008).
2. The least compulsory requirements for registering members on TACMS to qualify for the membership number assigning are First Name, Surname and date of birth.  Then TACMS will automatically assign Membership number(TAC89JAM131001).

Even though TACMS does a lot, I want my project(TACTMS) to be easier, AI-Powered, smarter, intelligent and more user-friendly:
  ----

## Tithe Book Description:
  The tithe Book, when opened,  is a landscape-oriented register used to manually record weekly(Sundays only) tithe contributions from church members throughout an entire year. It's published/branded by The Apostolic Church - Ghana. shows two pages (let say: 13 and 14). on the 13th page, it has the 'NO', 'NAME', 'JANUARY (Week 1st|2nd|3rd|4th|5th + TOTAL)', 'FEBRUARY (Week 1st|2nd|3rd|4th|5th + TOTAL)', 'MARCH (Week 1st|2nd|3rd|4th|5th + TOTAL)', 'APRIL (Week 1st|2nd|3rd|4th|5th + TOTAL)' and 'MAY (Week 1st|2nd|3rd|4th|5th + TOTAL)' and since the 14th page is the continuation of 13th page, it just continue the month; 'JUNE (Week 1st|2nd|3rd|4th|5th + TOTAL)', 'JULY (Week 1st|2nd|3rd|4th|5th + TOTAL)', 'AUGUST (Week 1st|2nd|3rd|4th|5th + TOTAL)', 'SEPTEMBER (Week 1st|2nd|3rd|4th|5th + TOTAL)', 'OCTOBER (Week 1st|2nd|3rd|4th|5th + TOTAL)', 'NOVEMBER (Week 1st|2nd|3rd|4th|5th + TOTAL)', 'DECEMBER (Week 1st|2nd|3rd|4th|5th + TOTAL)'. Therefore, page 13 and 14 are deemed as 'SET' and in this case, 'SET1'.

  # 'SET'
  Each SET contains 31 members (rows 1-31, 32-62, etc.). Each SET provides a full year's tracking for those 31 members. When an assembly has more than 31 tithers:
  - Additional SETs (SET2,SET3,..) are used for overflow members
  - Page numbering continues sequentially
  - The **NO** column continues from where the previous SET ended
  - Example: Page 13/14 has members 1-31, Page 15/16 has members 32-62, etc.

  ---
  # 'NAME'
Members names are writing in this column.

  # 'NO'
  - Each SET contains 31 members (rows 1-31, 32-62, etc.)
  - The "NO." column continues sequentially across SETs

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


### TITHEBOOK IMAGE PROCESSING LOGIC

  ## TitheBook Image Validation
  An image of a tithe book is considered valid when:
  - Page Number is Visible and identifiable: Required
  - Selected Month is Visible and identifiable: Required
  - Selected Week is visible and identifiable: Required
  - 'NAME' column is visible, full SET and identifiable: Critically Required for Databse 'AI Reorder', optional for single/multiple tithe extraction
  - 'NO' Column is visible: Required for Databse 'AI Reorder' but AI can still predict even with with minimal effort because it is just sequential numbering, optional for single/multiple tithe extraction
  - Year field is visible: optional since the AI can easily know the Date.


  ## DASHBOARD: Scan Tithe Book(AI)
This is where admin uploads only one image, select Assembly type, target Month and target Week. The AI work its magic (image validation, analysis, extract handwritten names and amounts, map the extracted names to the members names of selected assembly to get the real database names,... prepare the B.xlsx version.)

 ## TITHE PROCESSING: Scan image
This is where admin can upload multiple images of a particular Assembly Tithe Book because, in the Tithe Processing Page means the user has already selected the Assembly type and he/she is in that assembly workspace already. At this stage, the name and 'NO' extraction should not be aggressive because we are in the workspace of a known assembly and the persistent index(position) of the members matches the physical tithe book already. If admin uploads multiple images(5 atmost) of the that assembly, selects target Month and Week, the AI works its magic:
 Validates the image,...it then uses the page NUMBER and the MONTH visible in the images to understand the 'SET' of members even if the user didn't capture the full Landscape-oriented of the physical tithe book. The AI will then stitch the data together in the order of SETs. e.g. After March, Week2(Sunday) church service at Central Assembly with 195 members. Assembly Admin opens TitheBook containing 93 tithers but only 73 paid tithe. Assembly Admin records the amount in the tithe book, take pictures and send it to District Admin(me). I open TACTMS and  upload  three images in Central assembly workspace (Tithe Processing Page), Selects Target Month: March and Target Week:2. What is visible in image1: (Page:9, Months: FEBRUARY, MARCH, ...), image2: (page:11,  Months: MARCH, ...), image3: (page:12, Months: MARCH, APRIL,...). The AI, fully aware of the Assembly and the persistence index(position(#)) of the members already matches the physical tithe book, continue to validate the images first, tackling the image with page (9) first, proceed to extract and parse the amounts from (2nd week column) to their respective owners because it knows that the row after the (1st, 2nd, 3rd, 4th, 5th) row is the row for the first tither corresponding to the first member(#1) in the database and the last tither before the 'TOTAL(bottom)' is the last tither corresponding to the member(#31),  to wrap up for the  SET1 in 'image1'. It proceed with image2 and image3 using the sequential page numbers and recognizing the first row under the week:(1st, 2nd, 3rd, 4th, 5th) column start from 'NO':32 - 62 as it is the SET2 and the same thing for image3, 'NO':62 - 93 as it is the SET3 of that assembly. I then stitch the data together in one for the next phase. Note: The AI will cross-validate the data to boost accuracy if multiple images of the same page is provided.

---

NOTE:
1. Handwriting variations: Multiple writers (local/Assembly Admins) writes with different styles.
2. Amounts are numericals and are written in the Weeks column. Since they are numerals, extracted 'l' should be '1', 'o' - '0', 's' - '5'
3. Dashes "-" or empty cells mean 0
4. Crossed-out amounts should be deemed 0
5. There may be different writing inks, shouldn't matter
6.   GHANAIAN NAME PATTERNS:
 - Often include church titles: PASTOR, DEACONESS, DEACON, ELDER, MRS, MADAM.
 - Abbreviated titles: PST, DCNS, DCN, ELD, APT
 - Format typically: [Title] Surname FirstName OtherNames
 - Common surnames: MENSAH, OWUSU, ASANTE, BOATENG, QUARTEY, LAMPTEY, ANKRAH


## FAQs
1. Handling Partial Image Captures
If a user captures only the data columns (e.g., the 1st-5th weeks of October) without the corresponding names.

2.
---
