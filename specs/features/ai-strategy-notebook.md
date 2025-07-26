# Feature Specification: AI Strategy Notebook

## 1. Feature Overview

The AI Strategy Notebook is an advanced, interactive workspace where users can upload their private business data (e.g., electricity bills, hardware invoices, external earning reports) and have the AI analyze it in conjunction with GPUScout's real-time market data. It transforms the AI from a conversationalist into a collaborative business analyst.

## 2. User Story (US-020)

**As a** small farm operator (Maria)
**I want to** upload my private business documents and have the AI analyze them alongside market data
**So that** I can get a complete, holistic view of my operation's profitability and make highly informed strategic decisions.

## 3. Core Components

### 3.1. Secure Document Upload
- A dedicated "My Documents" section in the user's account settings.
- Supports uploading common file types: `.csv`, `.pdf`, `.txt`.
- All uploaded documents are encrypted at rest and are strictly private to the user's account.
- Users can tag documents for easy reference (e.g., "Jan 2024 Electricity Bill", "RTX 4090 Invoice").

### 3.2. AI Cross-Referencing
- When a user interacts with the AI, they can reference an uploaded document using its tag (e.g., `@Jan_Bill`).
- The `AIOrchestrator` will use a Retrieval-Augmented Generation (RAG) pipeline to pull context from the specified document.
- The AI can then answer questions that require combining data sources.
  - **User Query Example:** "Using my `@RTX_4090_Invoice` and my portfolio's current earnings, calculate the real-time ROI for that card."
  - **User Query Example:** "What was my true net profit last month? Use my earnings data and subtract the total from my `@Jan_Bill`."

### 3.3. AI-Powered Report Generation
- Users can ask the AI to generate structured reports based on the combined data.
- **Example Command:** "Generate a Q1 Profit & Loss report for my portfolio."
- The AI will synthesize portfolio earnings, market performance, and data from uploaded documents (like costs) into a downloadable PDF or CSV report.

## 4. Technical Implementation Notes
- **Document Storage:** Use a secure, encrypted object store like Cloudflare R2.
- **Data Extraction:**
  - For PDFs, use an OCR and layout analysis service to extract text and tables.
  - For CSVs, parse the data into a structured format.
- **RAG Pipeline:**
  - Extracted text from documents will be chunked and stored in a vector database (e.g., Cloudflare Vectorize).
  - When a user query references a document, the system will perform a similarity search on the vector store to find the most relevant chunks of text to inject into the AI's context.
- **Security:** Document access is strictly controlled by `userId`. The AI's context is sandboxed per-request to ensure no data leakage between users.

## 5. Tiering
- **Individual Tier:** Can upload up to 5 documents.
- **Professional Tier:** Can upload up to 50 documents and access the automated report generation feature.

## 6. Acceptance Criteria
- Users can successfully upload and manage private documents.
- The AI can correctly reference data from an uploaded document in its response.
- The AI can perform calculations that combine user-uploaded data and platform data.
- The report generation feature produces accurate and well-formatted documents.
- All user-uploaded data is kept strictly confidential and isolated.