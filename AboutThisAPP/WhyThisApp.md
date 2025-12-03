### **Basic Idea/Logic of this project.**



There is a church called The Apostolic Church in Ghana. This church is structured into levels; National, Area, District and Local/Assembly. Where Locals/Assemblies is the actual church(example; Ayiresu, Central, Maranatha) where people worship, District is the administration that covers particular set of locals. Example; Jei-Krodua(Jei-Krodua is my district but there are other districts such as Silom, K2, Ofaankor and many more). Area is the administration that covers particular set of Districts such as Jei-Krodua and  Ofaankor. Lastly,  National are the executives in charge of the church across Ghana, the head, and the administrations that covers the all the Area. Also, information and rules is passed down in the order that i have said(National - Area - District -Assembly/Local). Also, the church has an online website system called TACMS(The Apostolic Church Management System) that administrators can use to manage members, souls, transactions, projects, and many more scoped to the level they are in. TACMS recognize every member by their membership IDs only and the ID is unique and it is assigned by the TACMS immediately after registering the member on TACMS. Now, per the Church rules, every Sunday, the administrator of the local/assembly must record the tithes of every member who was present in their local/assembly Tithe Books (these members are called tithers). (see these images: W:\\CodeDeX\\TACTMS\\AboutThisAPP\\20250628\_083713.jpg
W:\\CodeDeX\\TACTMS\\AboutThisAPP\\20250704\_164252.jpg
W:\\CodeDeX\\TACTMS\\AboutThisAPP\\20250704\_164300.jpg
W:\\CodeDeX\\TACTMS\\AboutThisAPP\\20250803\_164617.jpg  for clarity how the tithe book is designed.).  Now. I, CodeDeX happen to be in Jei-Krodua District. I am now the District Administrator at District level. I am entitled to records the tithes amount/transaction from the Tithe books of each assembly to TACMS.  I have decided to create this project called TACTMS (The Apostolic Church Tithe Made Simple) to make the process easy. Since TACMS has no API logic, I rely on the 2 excel files ( Lets call them A.xlsx (W:\\CodeDeX\\TACTMS\\AboutThisAPP\\A.xlsx) and B(W:\\CodeDeX\\TACTMS\\AboutThisAPP\\B.xlsx)). There is also a Markdown and pdf version (A.md, B.md, A.pdf, B.pdf) for easier understanding that TACMS makes it possible to download. Even though, TACMS only accepts one of the files (B.xlsx) as a ready, dated Sunday tithers to be processed.  The A, excel file which is raw data and includes marital status, type of marriage, age, Gender and many more for the members. this  raw excel file is actually the membership details. The B excel file  has payment method, transaction amount, narration/description, and so on. Note: the B excel structure is the only excel file TACMS acknowledges and receives to process the alerts therefore  it is the exact excel structure TACTMS(our project) needs to produce in our final export (Download Excel) which means TACTMS must see to it that only after the  Transaction Amount(since the rest are all the same except the "Transaction Date ('DD-MMM-YYYY)" which will use the selected Sunday date and the "Narration/Description" which will be populated with "Tithe for 'the  selected date' like: Tithe for 02-NOV-2025) is entered/populated,  that it can final export(Download excel). Also in the A, there  is "membership number(TAC89JAM131001)", " old membership number(651101008)" , "Title(PASTOR)", "First Name(JONATHAN)", "Surname(ADDO)", "other name(MENSAH)" but notice how  for the B, we have "Membership Number(PASTOR JONATHAN ADDO MENSAH (TAC89JAM131001|651101008))" which is simply achieved by concatenating "membership number(TAC89JAM131001)", " old membership number(651101008)" , "Title(PASTOR)", "First Name(JONATHAN)", "Surname(ADDO)", "other name(MENSAH)" from the A with only the Membership  and the old membership number  separated by "|".  Note: The Old Membership Number (651101008) is the old way of assigning IDs to registered members but after TACMS upgrade, it introduced the new (Membership Number (TAC89JAM131001)) but it didn't abandoned the old membership number, it just separated it with "|" that is why you will see some members with both (TAC89JAM131001|651101008). Also, the least compulsory requirements for registering members on TACMS to qualify for the membership number assigning are First Name, Surname and date of birth.  then TACMS will automatically assign Membership number(TAC89JAM131001).
Even though TACMS does a lot, I want my project(TACTMS) for be easier, AI-assited, smarter, intelligent and more friendly.

* The ability to accept both A.xlsx and B.xlsx files
* The intelligent ability to distinguish between those two files types.
* To  guess the assembly a given excel file belongs to.
* The intelligent logic when it receives either A or B.
* The intelligent ability to be aware of the order of the members in the various tithe books of a particular year and persist it.
* The intelligent ability to accept a picture/image of the tithe book and intelligently prepare the B.xlsx ready for download/export



###### Any other logic you see in this code is for the betterment of this project can be continue here. Thank you.

The Logic of the Tithe Book Image Recognition Feature
The feature is implemented in four main phases:

1. Image Acquisition and Pre-processing
This is the initial interaction stage where the application prepares the raw image for analysis.
Input Handling: The TACTMS application accepts an image file (e.g., JPEG, PNG) uploaded by the District Administrator.
Image Optimization: The application automatically performs image enhancements to maximize recognition accuracy:
Deskewing & Cropping: Aligning the image so the table lines are straight and potentially cropping out irrelevant background noise.
Brightness/Contrast Adjustment: Enhancing text visibility, especially critical for handwritten entries or poor lighting conditions during the photo capture.
Noise Reduction: Cleaning up artifacts from camera flash or paper texture.

2. Intelligent Document Analysis and OCR
This phase uses AI models to "read" and structure the content based on the known layout of the TitheBook.html structure.
Layout Detection: The AI first identifies the major sections of the page: the header (YEAR:, THE APOSTOLIC CHURCH-GHANA, TITHES REGISTER), the rows, and the columns (January, February, etc., including the "1st, 2nd, 3rd, 4th, 5th, TOTAL" sub-headers).
Zonal OCR (Text Extraction): The system uses a combination of standard OCR for printed text and advanced Handwriting Recognition (HTR) for handwritten names and monetary amounts. It identifies bounding boxes for every single cell in the grid.
Data Structuring: This is where the logic leverages the predictable HTML structure you provided (TitheBook.html). The application parses the raw text snippets into a temporary, structured dataset (e.g., a dictionary or internal table format) that mirrors the physical book's organization, linking each amount to a specific name, month, and week.

3. Data Mapping and Validation (The "Intelligence" Layer)
This is the central logic hub where TACTMS connects the newly extracted data with the existing membership data.
Member Lookup: For each "NAME" extracted via HTR from the image, the application attempts to match it against the internal database compiled from the A.xlsx file.
Fuzzy Matching: Since handwriting recognition isn't perfect, the application uses "fuzzy matching" algorithms to suggest the most likely correct member ID even if the extracted name has minor spelling errors (e.g., matching "Jonthan Addo" to "Jonathan Addo Mensah").
Transaction Preparation: Once a match is confirmed, TACTMS takes the associated extracted weekly amount and formats it according to the required B.xlsx structure:
Transaction Amount: The HTR value.
Transaction Date: Uses the current date selected by the administrator for that Sunday.
Narration/Description: Automatically populates with "Tithe for [Selected Date]".
Membership Number: Populates the complex, concatenated string required by the TACMS (e.g., PASTOR JONATHAN ADDO MENSAH (TAC89JAM131001|651101008)).

4. Review and Export
The process culminates in a user-friendly interface that allows the admin to verify the AI's work before the final output.
Interactive Review UI: The system presents the extracted data side-by-side with the original image. The admin can quickly verify amounts that the AI flagged as uncertain (e.g., a "5" that looked like a "S") and confirm correct member matching.
Export B.xlsx: After manual verification and ensuring all required "Transaction Amount" fields are populated, the admin clicks "Download Excel." The application generates the ready-to-import B.xlsx file that the official TACMS will acknowledge and process.

Robust HTR (Handwriting Recognition): The AI will need to interpret various handwriting styles for both names and amounts (e.g., distinguishing between a '5' and a '50').
Grid Alignment Logic: The visual layout matches the TitheBook.html specification precisely, confirming that the layout detection logic will have a consistent framework to follow.
Fuzzy Matching Validation: The names visible in the image (e.g., "EMELIA AFFUL", "GRACE AMU") will need to be matched against the master membership list from A.xlsx to link the transaction amounts to the correct membership IDs.

Database Structure: You would create a database table for Members and a table for Assembly_Rosters. The Assembly_Rosters table links a Member ID to a specific Assembly ID and critically stores a Sort_Order index (e.g., Emelia Afful is position 63, Grace Amu is 64, etc.).
Persistent State: The application no longer relies solely on the input file's ephemeral order; it uses the stored Sort_Order as the canonical truth.
Unlocked Possibilities and Easy Goal Achievement
This strategy enables several key features you outlined in your initial project description:
1. The "Intelligent Ability to be Aware of the Order"
Automated Alignment: When you upload an image of a new month's page (e.g., the February page for Central Assembly), the AI/OCR extracts the names and amounts. TACTMS then cross-references these names against the persisted Assembly_Rosters list for Central Assembly. It instantly re-orders the extracted data to match the expected sequence, ensuring that the exported B.xlsx file respects the consistent layout of the physical book.
Identifying Missing Tithers: If someone from position 75 is missing that week, the database knows to leave that row blank for that Sunday's transaction, providing a structured way to track attendance/contributions over time.

2. Guessing the Assembly
Contextual Clues: When a file or image is uploaded, TACTMS can perform a quick check of the top few names. If those names match the Assembly_Rosters for "Central Assembly" with high confidence, the application can automatically default to that assembly, streamlining the user experience.

3. Historical Tracking and Reporting
Yearly Totals: This is a major goal achievement. You can easily generate reports showing who has contributed how much year-to-date across all assemblies you manage. The official TACMS might do this after import, but TACTMS can provide real-time dashboards for the District Admin before import.
Identifying Trends: You can analyze weekly data—which weeks tend to have higher engagement, which members need follow-up, etc.

4. Robust Validation and Consistency
Data Integrity: The database acts as a single source of truth. The system will alert you if an OCR process identifies a name that isn't in your current master A.xlsx list, prompting you to register that new member first, thus enforcing the correct church procedures.

Handling Partial Image Captures
If a user captures only the data columns (e.g., the 1st-5th weeks of October) without the corresponding names, the image context alone is insufficient for the AI to identify the tithers. The AI sees numbers and grid lines, but no names.
The TACTMS application will manage this using a two-step approach enabled by your persistence strategy:
1. Establishing the Master Roster (The Prerequisite)
Before processing any partial image, the District Administrator must first establish the complete, ordered roster for that specific assembly for the year. This requires one initial full scan or data input:
Initial Setup: You would require the user to capture an image that clearly shows the "NO" and "NAME" columns at least once per tithe book (e.g., when setting up the year 2026).
Database Storage: TACTMS uses the AI/OCR to extract this initial roster and stores it in the database with the associated Sort_Order (Emelia Afful is 63, Grace Amu is 64, etc.). This becomes the master template for the year.
2. Processing Subsequent Partial Images
Once the master roster is in the TACTMS database, you can confidently process partial images:
User Workflow: The admin uploads the partial image (e.g., only the October data columns) and manually tells TACTMS which month and assembly they are processing (e.g., "Central Assembly, October 2026").
Intelligent Alignment: TACTMS assumes the order in the new partial image matches the persisted master roster's order (i.e., the top row of data corresponds to the person in position 63, the second row to position 64, and so on).
Data Injection: The AI focuses purely on extracting the numeric values from the grid. TACTMS then programmatically injects these amounts next to the correct, verified names pulled from the database, effectively re-associating the data with the identity using the stored sort order as the key.
