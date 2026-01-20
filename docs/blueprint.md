# **App Name**: E-Contract BKPSDM Automation

## Core Features:

- Excel Data Import: Import employee data from Excel files, mapping columns to Firestore document fields. Supports parsing contract type based on participant ID (PW for PARUH_WAKTU, else PENUH_WAKTU).
- Contract Date Calculation: Calculate contract end dates based on contract type and start date (selected via DatePicker). PARUH_WAKTU: Start + 1 Year - 1 Day; PENUH_WAKTU: Start + 5 Years - 1 Day.
- PDF Contract Generation: Generate F4-sized contract PDFs by injecting employee data, salary details (numeric and words), unit name, position, and grade class into predefined sections (Pasal 1 and Pasal 6).
- Signature Merging: Merge a scanned signature PDF (uploaded by admin) with the generated contract PDF. Extracts NI PPPK from the filename. Resizes and appends the scanned signature page as the last page of the contract.
- Firebase Storage Archival: Automatically upload the final merged PDF to Firebase Storage (`archives/{niPppk}_FINAL.pdf`) and update the document's status to 'Archived' in Firestore. This is done when the LLM reasons that the file passes the final quality check.

## Style Guidelines:

- Primary color: Navy blue (#003049) to evoke trust and professionalism, commonly associated with governmental institutions.
- Background color: Light gray (#E5E8E8), a desaturated version of the primary, providing a clean backdrop and optimizing readability.
- Accent color: Teal (#008080) to bring a sense of forward thinking.
- Body and headline font: 'Times New Roman' serif (user-specified).
- Note: currently only Google Fonts are supported.
- F4 paper size (215mm x 330mm). Justified alignment for body text, centered alignment for headers.