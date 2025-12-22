#### **WEEK 4**

#### **I. Semantic Search (Backend & Logic)**

**Description**: Implement the core "Intelligence" of the search system. The backend must generate vector embeddings for emails (Subject \+ Body) and store them (using a vector database). When a search is performed, the system converts the user's query into a vector and finds semantically related emails, not just exact text matches.

**Definition of Done**

- **Embeddings Generation:** The system successfully generates and stores embeddings for emails using an embedding model (OpenAI, Gemini API, or a local library like all-MiniLM-L6-v2).
- **Conceptual Relevance:** Searching for a concept (e.g., "money") successfully returns emails containing related terms (e.g., "invoice", "price", "salary") even if the word "money" is missing.
- **API Endpoint:** A dedicated search endpoint (e.g., POST /api/search/semantic) that accepts a text query and returns a ranked list of email objects.

#### **II. Search Auto-Suggestion (UI & Interaction)**

**Description:** Build a responsive "Type-ahead" search bar on the frontend. As the user types, the application should predict what they are looking for by suggesting relevant contacts, past queries, or keywords. This improves UX by reducing the need to type full sentences.

**Definition of Done**

- **Auto-Suggest UI:** As the user types, a dropdown immediately appears below the input field showing 3–5 suggestions.
- **Data Source:** Suggestions are populated from relevant data (e.g., unique Sender names from the inbox, or subject keywords).
- **Interaction:** Pressing "Enter" or clicking a suggestion in the dropdown triggers the Semantic Search (Feature I) and updates the dashboard with results.

#### **III. Dynamic Kanban Configuration**

**Description:** Allow users to customize their Kanban board workflow. Users should be able to define what columns exist on their board and how they map to the underlying email data.

**Definition of Done**

- **Settings Interface:** A "Settings" modal or page where users can Create, Rename, or Delete columns.
- **Persistence:** The custom column structure is saved (backend DB or localStorage) and restored correctly after a page reload.
- **Label Mapping:** Configure each column to map directly to a specific Gmail label (e.g., "To Do" column → "STARRED" label). When a card is moved into a column, the system automatically applies the corresponding label to the email in Gmail.

### **Grading Rubric (Total: 100 Points)**

| Feature                           | Criteria                                                                                                                                                                                                    | Points  |
| :-------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------ |
| **I. Semantic Search (Backend)**  | • Embeddings are generated for emails. • Search logic uses vector comparison (not just SQL LIKE). • Results demonstrate conceptual relevance (e.g., query "cost" finds "invoice").                          | **25**  |
| **II.Auto-Suggestion (Frontend)** | • The search bar shows a dropdown while typing. • Suggestions are relevant (contacts, keywords). • Selecting a suggestion triggers the search correctly.                                                    | **20**  |
| **III.Kanban Configuration**      | • Users can add/remove/rename columns via UI. • Configuration persists after refresh. • **Label Mapping:** Moving cards sync the correct Label to Gmail (e.g., Move to "Archive" \--\> Remove Inbox label). | **25**  |
| **Deployment, UI/UX, & Demo**     | • **Deployment:** Live Frontend (Vercel/Netlify) & Backend (Cloud). • **UI/UX:** Polished interface, handles loading states. • **Demo:** Video (\<5 mins) showing Search, Config, and Sync.                 | **20**  |
| **Code Quality**                  | • Clean component structure, proper error handling, no hardcoded secrets.                                                                                                                                   | **10**  |
| **Total**                         |                                                                                                                                                                                                             | **100** |
