# Final project Self-assessment report

Team: 22120120-22120157-22120163
GitHub repo URL: https://github.com/htloc0610/TLL_backend

# **TEAM INFORMATION**

| Student ID | Full name | Git account | Contribution | Contribution % |
| :---- | :---- | :---- | :---- | :---- |
| 22120120 | Trần Lượng | luongtrz / luongtrw | PROJ. LEADER. Frontend Architecture, Kanban Board, Email Detail, Search Features, UI/UX, Integration | 33% |
| 22120157 | Huỳnh Tấn Lộc | htloc0610 | Backend Architecture, Gmail API Integration, Email Services, Database Design, Vector Search | 33% |
| 22120163 | Lưu Thái Toàn | Tondeptrai23 | Feature Planning, Documentation, Testing, Report Generation, Support | 34% |

# **FEATURE LIST**

**Project:** React Email Client with Gmail Integration & AI-Powered Kanban

| ID | Features | Notes |
| ----- | :---- | :---- |
| **1** | **Overall requirements** | |
|  | User-centered design | Built with user experience in mind. Kanban-style email management, AI summarization |
|  | Database design | Tables: users, emails, vectors, kanban_columns, labels |
|  | Database mock data | Sample emails and config data included |
|  | Website layout | Responsive 3-column layout + Kanban view |
|  | Website architect | React SPA + NestJS API, Separation of Concerns |
|  | Website stability | Tested on Chrome, Safari, Firefox, Edge |
|  | Document | Complete README & API docs |
|  | Demo video | Covers all core features |
|  | Publish to public hosts | FE (Vercel) + BE (Render) |
|  | Git History | Feature branches, PRs, semantic commits |
| **2** | **Authentication** | |
|  | Google OAuth 2.0 | Standard OAuth flow with Gmail scopes |
|  | Auth Code flow | Backend exchanges code for secure tokens |
|  | Token security | HttpOnly cookies / Secure storage |
|  | Auto token refresh | Handles 401s automatically |
|  | Concurrency handling | Dedupes refresh requests |
|  | Forced logout | Clears session on invalid refresh |
|  | Cleanup on logout | Invalidates all tokens |
| **3** | **Email Sync & Display** | |
|  | Fetch from Gmail | Syncs inbox via Gmail API |
|  | Pagination | Virtualized list/Infinite scroll |
|  | Detail view | HTML content rendering |
|  | Mailboxes/Labels | Dynamic label list from Gmail |
|  | Open in Gmail | Direct link to original thread |
| **4** | **Kanban Board** | |
|  | Board layout | Columns: Inbox, Todo, Done, etc. |
|  | Card display | Sender, subject, snippet, status |
|  | Drag-and-drop | Move cards to update status |
|  | Status persistence | Syncs with backend/Gmail labels |
|  | **Kanban Config** | |
|  | Settings UI | Manage column visibility/order |
|  | Persistence | LocalStorage/User prefs sync |
|  | Label mapping | Map columns to specific Gmail labels |
| **5** | **Snooze** | |
|  | Time selection | Custom date/time picker |
|  | Hide email | Removes from board until due |
|  | Auto-return | Reappears in Inbox on schedule |
| **6** | **AI Features** | |
|  | **Summarization** | |
|  | Backend API | Gemini Integration |
|  | UI display | Summary cards in Kanban/Detail |
|  | **Embedding** | |
|  | Generation | Vector embeddings for email content |
|  | Vector DB | pgvector storage |
| **7** | **Search** | |
|  | **Fuzzy Search** | |
|  | Typo tolerance | Matches approximate terms |
|  | Partial match | Matches substrings |
|  | Ranking | Relevance-sorted results |
|  | **Search UI** | |
|  | Integration | Global search bar |
|  | Result cards | Unified result view |
|  | States | Loading/Empty handling |
|  | Navigation | Easy return to board |
|  | **Semantic Search** | |
|  | Conceptual | Finds related concepts (e.g. "invoice" -> "cost") |
|  | Endpoint | Dedicated semantic search API |
|  | **Suggestions** | |
|  | Type-ahead | Live dropdown suggestions |
|  | Contextual | From user history/content |
|  | Trigger | Auto-executes on selection |
| **8** | **Filter & Sort** | |
|  | Sort (Date) | Newest/Oldest |
|  | Filter (Unread) | Toggle unread only |
|  | Filter (Attach) | Toggle has attachment |
|  | Real-time | Instant UI updates |
| **9** | **Actions** | |
|  | Read/Unread | Syncs to Gmail |
|  | Compose | Rich text editor modal |
|  | Reply/Forward | Standard email flows |
|  | Send API | Via Gmail API |
|  | Attachments | View list |
|  | Download | Secure download links |
|  | Delete | Move to Trash |
| **10** | **Advanced** | |
|  | Push Notif | (Planned) |
|  | Logout Sync | (Planned) |
|  | Offline | (Planned) |
|  | Keyboard Nav | Implemented global shortcuts |
|  | Docker | (Planned) |
|  | CI/CD | (Planned) |

# **COLLABORATION REPORT**

## **1. Methodology**
Our team adopted a **Feature Branch Workflow** to ensure code stability and streamline collaboration. This approach allowed multiple developers to work on different features or bug fixes simultaneously without disrupting the main codebase.

### **Key Practices:**
*   **Branching Strategy:**
    *   `main`: The stable production-ready branch.
    *   `mail`: The primary development branch for the email module.
    *   `feat/*`: Feature-specific branches (e.g., `feat/dark` for Dark Mode, `feat/search` for Search functionality).
    *   `fix/*`: Bug fix branches (e.g., `fix/bug`, `fix/kanban`).
    *   `responsive`: Dedicated usage for UI responsiveness improvements.
*   **Pull Requests (PRs):** All changes were reviewed and merged via Pull Requests (e.g., #6, #7, #8, #9, #10) to maintain code quality.
*   **Commit Messages:** We followed reliable commit message conventions (e.g., `feat:`, `fix:`, `style:`, `chore:`) to generate a clear and readable history.

## **2. Git Workflow Evidence**

The following Git Graph illustrates our parallel development process. Major integration points occur via Merge Pull Request commits, joining feature branches like `responsive`, `fix/bug`, and `feat/dark` into the main line (`mail`/`main`).

```text
* e8a5b19 - (HEAD -> mail, origin/mail) docs: Remove grades from Teamwork Report - luongtrz
* d5f31d0 - docs: Update Teamwork Report with concise Self-Assessment content - luongtrz
* a84578b - docs: Add Final Project Self-Assessment Report - luongtrz
* 7420af3 - docs: Add Teamwork Collaboration Report - luongtrz
*   605cdac - Merge pull request #6 from htloc0610/doc - Trần Lượng
|\  
| * 424a7b8 - doc: add ai summary section - Tondeptrai23
| * a4a10d1 - doc: add final project document - Tondeptrai23
* |   41ff4bc - (origin/main) Merge pull request #10 from htloc0610/fix/bug - Trần Lượng
|\ \  
| * | bf9be3b - (origin/fix/bug) fix(core): Resolve Attachment download and Data integration bugs - luongtrz
| * | 10c7709 - fix(kanban): Fix Load More logic and Filter issues - luongtrz
| * | c3ea92f - feat(search): Optimize search and add utility features - luongtrz
| * | f028bd3 - style(ui): Enhance Dark Mode support and UI layout - luongtrz
|/ /  
* |   60365a5 - Merge pull request #9 from htloc0610/responsive - Trần Lượng
|\ \  
| | | * a029817 - chore: cleanup redundant root files after main merge - luongtrz
| | | * de7bfcf - Merge branch 'main' into responsive - luongtrz
| | |/| 
| |/| | 
| | | * f028c98 - (main) Update README.md with new repository URL for cloning - Huynh Tan Loc
| | | * 6a24097 - Initialize NestJS Student API project with essential configurations and structure - Huynh Tan Loc
| * | d35ff4b - feat(email): enhance trash management functionality - luongtrz
| * | c40f94b - feat(ui): Responsive Layout & UI Improvements - luongtrz
|/ /  
* |   10ac778 - Merge pull request #7 from htloc0610/update/UImail - Trần Lượng
|\ \  
| |/  
|/|   
```
*(Please compare this graph with GitHub Network Graph for full verification)*

## **3. Contributors & Statistics**
| User | Commits | Est. Add/Del | Role |
| :--- | :--- | :--- | :--- |
| **luongtrz** | 34 | +5000 / -2000 | Frontend Lead, Core Features |
| **htloc0610** | 6 | +3000 / -1000 | Backend Lead, API & Services |
| **Tondeptrai23** | 11 | +1000 / -500 | Documentation & QA |

# **PROJECT SUMMARY**

**React Email Client** transforms Gmail into a productivity-focused Kanban board with AI superpowers.

*   **Tech Stack:** React (Vite), NestJS, PostgreSQL (pgvector), Gmail API, Gemini AI.
*   **Key Features:**
    *   **Kanban Workflow:** Drag-and-drop email management.
    *   **AI Intelligence:** Auto-summarization and Semantic Search.
    *   **Gmail Integration:** seamless 2-way sync (Read/Reply/Archive/Delete).
    *   **UX:** Dark Mode, Keyboard Shortcuts, Optimistic Updates.
*   **Deployment:** Vercel (Frontend) & Render (Backend).
