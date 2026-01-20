# Final project Self-assessment report

Team: 22120120-22120157-22120163
GitHub repo URL: https://github.com/htloc0610/TLL_backend

# **TEAM INFORMATION**

| Student ID | Full name | Git account | Contribution | Contribution % |
| :---- | :---- | :---- | :---- | :---- |
| 22120120 | Trần Lượng | luongtrz / luongtrw | PROJ. LEADER. Frontend Architecture, Kanban Board, Email Detail, Search Features, UI/UX, Integration | 33% |
| 22120157 | Huỳnh Tấn Lộc | htloc0610 | Backend Architecture, Gmail API Integration, Email Services, Database Design, Vector Search | 33% |
| 22120163 | Luu Thai Toan | Tondeptrai23 | Feature Planning, Documentation, Testing, Report Generation, Support | 34% |

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

# **GIT HISTORY & COLLABORATION**

**Methodology:** Feature Branch Workflow (`feat/*`, `fix/*`, `main`). PR reviews for all merges.

## **Contributors**
| User | Commits | Est. Add/Del |
| :--- | :--- | :--- |
| luongtrz | 34 | +5000 / -2000 |
| htloc0610 | 6 | +3000 / -1000 |
| Tondeptrai23 | 11 | +1000 / -500 |

## **Recent Commits**
| Date | Author | Message |
| :--- | :--- | :--- |
| 2026-01-20 | luongtrz | docs: Add Teamwork Collaboration Report |
| 2026-01-20 | Trần Lượng | fix(core): Resolve Attachment download and Data integration bugs |
| 2026-01-20 | luongtrz | fix(kanban): Fix Load More logic and Filter issues |
| 2026-01-20 | luongtrz | feat(search): Optimize search and add utility features |
| 2026-01-20 | luongtrz | style(ui): Enhance Dark Mode support and UI layout |

# **PROJECT SUMMARY**

**React Email Client** transforms Gmail into a productivity-focused Kanban board with AI superpowers.

*   **Tech Stack:** React (Vite), NestJS, PostgreSQL (pgvector), Gmail API, Gemini AI.
*   **Key Features:**
    *   **Kanban Workflow:** Drag-and-drop email management.
    *   **AI Intelligence:** Auto-summarization and Semantic Search.
    *   **Gmail Integration:** seamless 2-way sync (Read/Reply/Archive/Delete).
    *   **UX:** Dark Mode, Keyboard Shortcuts, Optimistic Updates.
*   **Deployment:** Vercel (Frontend) & Render (Backend).
