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
**Note:** SE (Self-evaluation), TR (Teacher review)

| ID | Features | Grade |  |  | Notes |
| ----- | :---- | ----- | :---- | :---- | :---- |
|  |  | **Point** | **SE\*** | **TR\*** |  |
| **1** | **Overall requirements** |  |  |  |  |
|  | User-centered design | \-5 | 0 |  | Kanban-style workflow, AI summarization |
|  | Database design | \-1 | 0 |  | Tables: users, emails, vectors, kanban_columns, labels |
|  | Database mock data | \-1 | 0 |  | Sample emails and config data included |
|  | Website layout | \-2 | 0 |  | Responsive 3-column layout + Kanban view |
|  | Website architect | \-3 | 0 |  | React SPA + NestJS API, Separation of Concerns |
|  | Website stability | \-4 | 0 |  | Tested on Chrome, Safari, Firefox, Edge |
|  | Document | \-2 | 0 |  | Complete README & API docs |
|  | Demo video | \-5 | 0 |  | Covers all core features |
|  | Publish to public hosts | \-1 | 0 |  | FE (Vercel) + BE (Render) |
|  | Git History | \-7 | 0 |  | Feature branches, PRs, semantic commits |
| **2** | **Authentication** |  |  |  |  |
|  | Google OAuth 2.0 | \-0.5 | 0 |  | Standard OAuth flow with Gmail scopes |
|  | Auth Code flow | \-0.5 | 0 |  | Backend exchanges code for secure tokens |
|  | Token security | \-0.5 | 0 |  | HttpOnly cookies / Secure storage |
|  | Auto token refresh | \-0.5 | 0 |  | Handles 401s automatically |
|  | Concurrency handling | \-0.25 | 0 |  | Dedupes refresh requests |
|  | Forced logout | \-0.25 | 0 |  | Clears session on invalid refresh |
|  | Cleanup on logout | \-0.25 | 0 |  | Invalidates all tokens |
| **3** | **Email Sync & Display** |  |  |  |  |
|  | Fetch from Gmail | \-0.5 | 0 |  | Syncs inbox via Gmail API |
|  | Pagination | \-0.25 | 0 |  | Virtualized list/Infinite scroll |
|  | Detail view | \-0.25 | 0 |  | HTML content rendering |
|  | Mailboxes/Labels | \-0.25 | 0 |  | Dynamic label list from Gmail |
|  | Open in Gmail | \-0.25 | 0 |  | Direct link to original thread |
| **4** | **Kanban Board** |  |  |  |  |
|  | Board layout | \-0.5 | 0 |  | Columns: Inbox, Todo, Done, etc. |
|  | Card display | \-0.25 | 0 |  | Sender, subject, snippet, status |
|  | Drag-and-drop | \-0.5 | 0 |  | Move cards to update status |
|  | Status persistence | \-0.25 | 0 |  | Syncs with backend/Gmail labels |
|  | **Kanban Config** |  |  |  |  |
|  | Settings UI | \-0.25 | 0 |  | Manage column visibility/order |
|  | Persistence | \-0.25 | 0 |  | LocalStorage/User prefs sync |
|  | Label mapping | \-0.5 | 0 |  | Map columns to specific Gmail labels |
| **5** | **Snooze** |  |  |  |  |
|  | Time selection | \-0.25 | 0 |  | Custom date/time picker |
|  | Hide email | \-0.25 | 0 |  | Removes from board until due |
|  | Auto-return | \-0.5 | 0 |  | Reappears in Inbox on schedule |
| **6** | **AI Features** |  |  |  |  |
|  | **Summarization** |  |  |  |  |
|  | Backend API | \-0.5 | 0 |  | Gemini Integration |
|  | UI display | \-0.25 | 0 |  | Summary cards in Kanban/Detail |
|  | **Embedding** |  |  |  |  |
|  | Generation | \-0.5 | 0 |  | Vector embeddings for email content |
|  | Vector DB | \-0.5 | 0 |  | pgvector storage |
| **7** | **Search** |  |  |  |  |
|  | **Fuzzy Search** |  |  |  |  |
|  | Typo tolerance | \-0.5 | 0 |  | Matches approximate terms |
|  | Partial match | \-0.5 | 0 |  | Matches substrings |
|  | Ranking | \-0.25 | 0 |  | Relevance-sorted results |
|  | **Search UI** |  |  |  |  |
|  | Integration | \-0.25 | 0 |  | Global search bar |
|  | Result cards | \-0.25 | 0 |  | Unified result view |
|  | States | \-0.25 | 0 |  | Loading/Empty handling |
|  | Navigation | \-0.25 | 0 |  | Easy return to board |
|  | **Semantic Search** |  |  |  |  |
|  | Conceptual | \-0.5 | 0 |  | Finds related concepts (e.g. "invoice" -> "cost") |
|  | Endpoint | \-0.25 | 0 |  | Dedicated semantic search API |
|  | **Suggestions** |  |  |  |  |
|  | Type-ahead | \-0.25 | 0 |  | Live dropdown suggestions |
|  | Contextual | \-0.25 | 0 |  | From user history/content |
|  | Trigger | \-0.25 | 0 |  | Auto-executes on selection |
| **8** | **Filter & Sort** |  |  |  |  |
|  | Sort (Date) | \-0.25 | 0 |  | Newest/Oldest |
|  | Filter (Unread) | \-0.25 | 0 |  | Toggle unread only |
|  | Filter (Attach) | \-0.25 | 0 |  | Toggle has attachment |
|  | Real-time | \-0.25 | 0 |  | Instant UI updates |
| **9** | **Actions** |  |  |  |  |
|  | Read/Unread | \-0.25 | 0 |  | Syncs to Gmail |
|  | Compose | \-0.25 | 0 |  | Rich text editor modal |
|  | Reply/Forward | \-0.25 | 0 |  | Standard email flows |
|  | Send API | \-0.25 | 0 |  | Via Gmail API |
|  | Attachments | \-0.25 | 0 |  | View list |
|  | Download | \-0.25 | 0 |  | Secure download links |
|  | Delete | \-0.25 | 0 |  | Move to Trash |
| **10** | **Advanced** |  |  |  |  |
|  | Push Notif | 0.25 | 0 |  | (Planned) |
|  | Logout Sync | 0.25 | 0 |  | (Planned) |
|  | Offline | 0.25 | 0 |  | (Planned) |
|  | Keyboard Nav | 0.25 | 0.25 |  | Implemented global shortcuts |
|  | Docker | 0.25 | 0 |  | (Planned) |
|  | CI/CD | 0.25 | 0 |  | (Planned) |

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
