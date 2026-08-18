# HOHOO-VILLE TECHNICAL SCHOOL

# TESTING PLAN

Hohoo-Ville Training Management System  
ISO/IEC 25010-Aligned Functional Testing  
and User Acceptance Evaluation

**System under test:** Hohoo-Ville Training Management System  
**Prepared for:** Hohoo-Ville Technical School  
**Test type:** Functional, integration, usability, security, performance, reliability, and user acceptance testing  
**Document status:** Ready for execution  
**Date:** ____________________

---

# TESTING FRAMEWORK: THREE-LEVEL HIERARCHY

## LEVEL 1: Master Unit Testing Registry

### Series 100: User Authentication, Security & Session Management

Focuses on crypto hashes, formatting rules, token lifetimes, and gatekeeping rules.

---

## LEVEL 2: Master Integration Testing Registry

### Series 100: Frontend Interface ↔ Backend API Integration

Validates the data-sharing bridge between user input screens and server-side processing controllers.

---

## LEVEL 3: Master System Testing Registry

### Series 100: User Authentication, Security & Account Management

Ensures that access gates work perfectly and user accounts are managed securely.

### Series 200: Core Data Management & Transaction Processing (CRUD)

Validates the system's ability to smoothly Create, Read, Update, and Delete information.

### Series 300: Search, Filtering & Information Retrieval

Ensures users can efficiently query, sort, and look up information in the database.

### Series 400: Reporting, Document Exports & Analytic Computations

Tests mathematical reliability and the generation of business reporting files.

### Series 500: System Configurations & Notifications

Tests backend automation, profile modifications, and interface status alert behaviors.

---

# Part 1: PARTICIPANT PROFILE MATRIX

Complete this form before performing the assigned test cases and survey evaluation.

| Participant information | Response |
|---|---|
| Participant name (optional) | |
| Role | ☐ Administrator  ☐ Registrar  ☐ Trainer  ☐ Trainee |
| Department / Batch | |
| Date of testing | |
| Device and browser used | |
| Experience using the system | ☐ First-time user  ☐ Occasional user  ☐ Regular user |

## 1. Test Objectives

1. Confirm that each role can perform only its authorised tasks.
2. Validate the complete process from trainee application to completion.
3. Verify that information saved by one role is accurately available to the next authorised role.
4. Assess quality using ISO/IEC 25010 criteria.

## 2. Test Environment

| Item | Required setup |
|---|---|
| Application | Hohoo-Ville deployed in an isolated XAMPP test/staging environment. |
| Database | Current schema/migrations and safe test data; no production personal data. |
| Browsers | Latest Chrome or Edge plus a mobile/responsive browser view. |
| Accounts | Active Admin, Registrar, Trainer and Trainee accounts; one inactive and one archived account. |
| Evidence | Executed-case result and screenshot/API response where useful. |

## 3. Test Rules

> Record every case as **Pass**, **Fail**, **Blocked**, or **Not Run**. Record failed cases with repeatable steps, actual result, expected result, evidence, and severity.

| Severity | Definition |
|---|---|
| Critical | Blocks login or training lifecycle, corrupts/loses data, or exposes sensitive data. |
| High | Major role function is unavailable with no reasonable workaround. |
| Medium | Function is incorrect but a workaround exists. |
| Low | Minor visual, wording or usability concern. |

---

# LEVEL 1: Master Unit Testing Registry

## Series 100: User Authentication, Security & Session Management

Focuses on crypto hashes, formatting rules, token lifetimes, and gatekeeping rules.

| Unit ID | Target Function / Code Method | Testing Scenario Profile | Expected Isolation Output |
|---|---|---|---|
| UT-101 | validateEmailFormat(email) | Input contains structural typos (e.g., test@com, a@domain.com) | Return false (Rejected) |
| UT-102 | validatePasswordStrength(pwd) | Input is less than 8 characters or misses a special character. | Return false (Weak password) |
| UT-103 | hashUserPassword(plainText) | Raw string is passed into the cryptographic library (e.g., BCrypt). | Return a unique 60+ char secure salt hash |
| UT-104 | verifyPasswordMatch(plain, hash) | Matching a user login password attempt against database hash record | Return true if match, false if modified |
| UT-105 | generateSessionToken(userId) | User authenticates successfully; token generation | Return structured JWT or secure random state string |
| UT-106 | isTokenExpired(timestamp) | Token expiry timestamp is older than current server system time. | Return true (Trigger auto-logout routine) |
| UT-107 | sanitizeHtmlInput(userInput) | Input contains unsafe script tags (e.g., <script>malicious()</script>). | Return stripped or encoded clean string (XSS protection) |

---

# LEVEL 2: Master Integration Testing Registry

## Series 100: Frontend Interface ↔ Backend API Integration

Validates the data-sharing bridge between user input screens and server-side processing controllers.

| Integration ID | Interoperating Subsystems | Testing Scenario Profile | Expected Cross-Module Integration Behavior |
|---|---|---|---|
| IT-101 | UI Registration Form → Auth Controller | A user gathers the form registration details on the screen and clicks "Submit". | The frontend gathers the form array, serializes it to JSON, dispatches an HTTP POST request, handles the server's HTTP 201 Created status code, and redirects to login. |
| IT-102 | Login Screen ↔ State/Session Manager | A user logs into an authenticated account profile. | The backend API returns a session token, the client-side framework catches it, securely commits it to storage (localStorage or cookies), and updates global application access states. |
| IT-103 | Live Search Bar UI ↔ Query Controller | A user types a partial search string (e.g., keyword query) into an auto-suggest field. | The frontend captures keypress events, applies debounce timing logic, fires an API query request, and dynamically updates the data grid array without refreshing the web view |
| IT-104 | Client File Uploader ↔ Storage Controller | A user attaches and uploads an image/document file attachment. | The client app wraps files into a Multipart/Form-Data boundary stream, the backend parses the object, generates storage pathways, and returns a public URL |

---

# LEVEL 3: Master System Testing Registry

## Series 100: User Authentication, Security & Account Management

Ensures that access gates work perfectly and user accounts are managed securely.

| System Test ID | Module | Step-by-Step Execution Procedure | Test Data / Inputs | Expected System Response |
|---|---|---|---|---|
| ST-101 | Account Registration | 1. Navigate to Registration page 2. Fill fields using an email format that already exists in database 3. Click "Register". | Email: existing_user@gmail.com | Form submission is blocked. A clear warning message states, "Email is already registered ". |
| ST-102 | Login Security | 1. Navigate to Login page 2. Enter a valid username but an incorrect password 3. Click "Login". | Password: WrongPass123 | Login fails. System displays an error message: "Invalid credentials ". Password field is wiped clean |
| ST-103 | Password Masking | 1. Navigate to Login page 2. Type values into the password field | Any input string | Input values are visually masked using bullet dots (•••) to prevent shoulder surfing. |
| ST-104 | Form Validation | 1. Navigate to Registration page. 2. Leave required fields blank. 3. Click "Register". | Blank fields | Form submission fails. Inline error messages label each blank field with "This field is required." |
| ST-105 | Access Control | 1. Log in as Admin user 2. Change URL to /trainer/dashboard 3. Attempt direct access without admin role. | Role: Trainee | System blocks the action and returns 403 Forbidden or redirects to user's authorized dashboard. No restricted data is shown. |

## Series 200: Core Data Management & Transaction Processing (CRUD)

Validates the system's ability to smoothly Create, Read, Update, and Delete information.

| System Test ID | Module | Step-by-Step Execution Procedure | Test Data / Inputs | Expected System Response |
|---|---|---|---|---|
| ST-201 | Record Creation | 1. Navigate to the core creation form [e.g., Add New Qualification, Add Student Record] 2. Populate valid data fields. 3. Click "Save" | Valid record values | A success popup alert confirms saving. The system automatically redirects the user back to the master list view |
| ST-202 | Input Data Boundaries | 1. Open the data entry form. 2. Type text characters into fields explicitly meant for numbers. 3. Click "Save" | Stock Quantity "Five" | System rejects input stops processing, and displays a validation alert "Please enter a valid numeric value ". |
| ST-203 | Record Modification | 1. Select an existing entry row from the data table. 2. Click "Edit", modify a field value, and click "Update" | Updated name/value string | Data grid instantly updates with the new modifications. Changes are successfully preserved upon page refresh. |
| ST-204 | Record Removal | 1. Select a record entry row from the data table. 2. Click the "Delete" trash icon. | Click action button | A modal popup asks "Are you sure you want to delete this record?" Data is dropped only after confirmation |
| ST-205 | Table Pagination | 1. Navigate to a heavy data grid list containing more entries than the display limit [e.g., 50 rows total, limit 10]. 2. Interact with footer page controls. | Click "Next" / "Page 2" | System retrieves the next batch of records. The grid updates smoothly without flickering. Pagination does not mix or duplicate records. |

## Series 300: Search, Filtering & Information Retrieval

Ensures users can efficiently query, sort, and look up information in the database.

| System Test ID | Module | Step-by-Step Execution Procedure | Test Data / Inputs | Expected System Response |
|---|---|---|---|---|
| ST-301 | Global Text Search | 1. Open a master list registry view. 2. Type a known, specific keyword identifier into the search input box. | Keyword query | Data grid filters rows instantly, displaying only records that contain the specified search keyword string. |
| ST-302 | Empty Search State | 1. Type a random, non-existent keyword string into the search input box. | Query: "xyz789abc" | The data table clears out its row views and displays a clear message card stating: "No matching records found". |
| ST-303 | Multi-Filter Sorting | 1. Open the data tracking grid panel. 2. Select filter criteria properties [e.g., Status: Active, Category: Training] and click apply. | Drop-down selection filters | Table hides irrelevant entries and groups matching rows accurately according to the active filters selected. |

## Series 400: Reporting, Document Exports & Analytic Computations

Tests mathematical reliability and the generation of business reporting files.

| System Test ID | Module | Step-by-Step Execution Procedure | Test Data / Inputs | Expected System Response |
|---|---|---|---|---|
| ST-401 | Mathematical Audit | 1. Run transactions with manual reference calculations. 2. Open the system's analytics view | Simulated record data | System-calculated values (sums, averages, totals) exactly match the verified manual calculation totals. |
| ST-402 | PDF Document Export | 1. Navigate to a reporting table summary screen. 2. Click the "Export to PDF" download button. | Click action button | System compiles the current data and initiates a browser download of a clean, structured .pdf file asset. |
| ST-403 | Spreadsheet Export | 1. Navigate to a reporting table summary screen. 2. Click the "Export to Excel/CSV" download button. | Click action button | System cleanly formats records into comma-separated rows and downloads an uninterrupted Excel-readable file. |

## Series 500: System Configurations & Notifications

Tests backend automation, profile modifications, and interface status alert behaviors.

| System Test ID | Module | Step-by-Step Execution Procedure | Test Data / Inputs | Expected System Response |
|---|---|---|---|---|
| ST-501 | UI Feedback Alerts | 1. Trigger a background process activity [e.g., Processing Application, Sending Notifications] via form action. | Click trigger switch | A loading animation display blocks the UI screen temporarily, preventing duplicate form submissions from rapid clicks. |
| ST-502 | Settings Profiling | 1. Navigate to user settings or general options panel. 2. Change system configurations and save. | Update configuration choices | System persists the modified configuration settings. No user-facing errors occur, and the interface remains stable. |

---

# LEVEL 4: COMPREHENSIVE USER ACCEPTANCE TESTING (UAT) SURVEY

Students must document exactly who tested the system. A minimum of 3 to 5 domain experts/clients and 10 to 15 end-users is standard for an IT Capstone.

## PART 1: UAT PARTICIPANT PROFILE MATRIX

| Participant ID | Target User Role / Position | Organization / Department | Testing Date | Signature / Initials |
|---|---|---|---|---|
| UAT-EX-01 | IT Department Head (Expert) | Client Organization | 07/15/2026 | Signed |
| UAT-EX-02 | Systems Administrator (Expert) | College IT Office | 07/15/2026 | Signed |
| UAT-EU-01 | Front Desk Clerk (End-User) | Operations Dept. | 07/16/2026 | Signed |
| UAT-EU-02 | General Customer (End-User) | External Stakeholder | 07/16/2026 | Signed |

---

# PART 2: FULL ISO/IEC 25010-ALIGNED SURVEY EVALUATION

This instrument evaluates the system using the industry standard ISO/IEC 25010 Software Quality Model.

## Likert Rating Scale

| Score | Interpretation |
|---:|---|
| 5 | Strongly Agree (SA) |
| 4 | Agree (A) |
| 3 | Neutral (N) |
| 2 | Disagree (D) |
| 1 | Strongly Disagree (SD) |

**Participant profile:** Role: __________  Date: __________  Testing device/browser: __________

## 1. Functional Suitability

| Code | Evaluation statement | Score (1–5) |
|---|---|---|
| FS-1 | The functions I need for my role are available. | |
| FS-2 | The system produces correct results for information I enter or view. | |
| FS-3 | Application, batch, module, task and grading functions support the training process. | |
| FS-4 | The system prevents incomplete or invalid information from being saved. | |

## 2. Usability

| Code | Evaluation statement | Score (1–5) |
|---|---|---|
| US-1 | Menus, labels and icons make the system easy to navigate. | |
| US-2 | I can complete usual tasks without frequent assistance. | |
| US-3 | Error and validation messages clearly tell me what to correct. | |
| US-4 | The interface is understandable and usable on my device/screen size. | |

## 3. Performance Efficiency

| Code | Evaluation statement | Score (1–5) |
|---|---|---|
| PE-1 | Pages and dashboards load within an acceptable time. | |
| PE-2 | Saving forms, grades and assignments responds promptly. | |
| PE-3 | Searching, filtering and opening reports performs acceptably. | |
| PE-4 | The system remains responsive while I move between pages. | |

## 4. Security

| Code | Evaluation statement | Score (1–5) |
|---|---|---|
| SE-1 | I can access only pages and data appropriate to my role. | |
| SE-2 | Valid credentials are required before protected information is shown. | |
| SE-3 | I trust the system to protect trainee data and uploaded documents. | |
| SE-4 | Logging out prevents another person from continuing to use my session. | |

## 5. Reliability

| Code | Evaluation statement | Score (1–5) |
|---|---|---|
| RE-1 | The system performs consistently when I repeat the same task. | |
| RE-2 | Saved records remain correct after refresh, logout and later login. | |
| RE-3 | The system handles errors without losing or duplicating work. | |
| RE-4 | Notifications, assignments and grades appear consistently for the intended user. | |

## 6. Maintainability

| Code | Evaluation statement | Score (1–5) |
|---|---|---|
| MA-1 | Screens and functions are organised consistently across the system. | |
| MA-2 | Changes to one function do not appear to break related functions. | |
| MA-3 | The system provides enough messages/logs to help identify a problem. | |
| MA-4 | The system appears easy to update or improve without disrupting users. | |

## Open-Ended Feedback

1. Which feature helped you most? ______________________________________________________________
2. Which task was difficult or unclear? _____________________________________________________________
3. What should be improved before deployment? _____________________________________________________
4. Other comments: ____________________________________________________________________________

## Scoring Interpretation

| Mean range | Interpretation |
|---:|---|
| 4.21–5.00 | Excellent / highly acceptable |
| 3.41–4.20 | Acceptable |
| 2.61–3.40 | Moderately acceptable; improvement required |
| 1.81–2.60 | Low acceptability; major improvement required |
| 1.00–1.80 | Unacceptable |

---

# Part 3: FORMAL CLIENT ACCEPTANCE

## Acceptance Statement

We confirm that the Hohoo-Ville Training Management System has undergone functional testing and user evaluation based on this testing plan. The results, reported defects and agreed corrective actions have been reviewed. Subject to the conditions stated below, the system is accepted for the agreed deployment or use.

| Acceptance item | Result / remarks |
|---|---|
| Total test cases executed | ______ |
| Test cases passed | ______ |
| Test cases failed/blocked | ______ |
| Open Critical defects | ______ |
| Open High defects | ______ |
| Overall ISO/IEC 25010 mean score | ______ / 5.00 |
| Deployment decision | ☐ Accepted  ☐ Accepted with conditions  ☐ Not accepted |
| Conditions / required corrections | ______________________________________________ |

## Approval Signatures

| Name and role | Signature | Date |
|---|---|---|
| Client representative | | |
| System administrator | | |
| Test facilitator / project representative | | |

---

## Test Execution Log Template

| Test ID | Tester | Date | Result | Defect ID / evidence | Actual result / remarks |
|---|---|---|---|---|---|
| | | | ☐ Pass  ☐ Fail  ☐ Blocked  ☐ Not Run | | |
