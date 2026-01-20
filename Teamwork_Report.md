# Teamwork Collaboration Report

## 1. Team Members
The following members contributed to the project, facilitating a collaborative development environment:

*   **Huỳnh Tấn Lộc (Huynh Tan Loc)** - *Backend & Feature Integration*
*   **Trần Lượng (luongtrw / luongtrz)** - *Frontend Development & Testing*
*   **Luu Thai Toan** - *Features & Documentation*
*   **Tondeptrai23** - *Support & Bug Fixes*

## 2. Collaboration Methodology

Our team adopted a **Feature Branch Workflow** to ensure code stability and streamline collaboration. This approach allowed multiple developers to work on different features or bug fixes simultaneously without disrupting the main codebase.

### Key Practices:
*   **Branching Strategy:**
    *   `main`: The stable production-ready branch.
    *   `mail`: The primary development branch for the email module.
    *   `feat/*`: Feature-specific branches (e.g., `feat/dark` for Dark Mode, `feat/search` for Search functionality).
    *   `fix/*`: Bug fix branches (e.g., `fix/bug`, `fix/kanban`).
    *   `responsive`: Dedicated usage for UI responsiveness improvements.
*   **Pull Requests (PRs):** All changes were reviewed and merged via Pull Requests (e.g., #6, #7, #8, #9, #10) to maintain code quality.
*   **Commit Messages:** We followed reliable commit message conventions (e.g., `feat:`, `fix:`, `style:`, `chore:`) to generate a clear and readable history.

## 3. Git Workflow Evidence

Below is a snapshot of our Git Commit History, demonstrating parallel development and merge commits. This illustrates how different features (Dark Mode, Responsive UI, Kanban fixes) were developed in isolation and merged back into the main line.

### Commit Graph Snapshot
```text
*   605cdac (HEAD -> mail, origin/mail) Merge pull request #6 from htloc0610/doc
|\  
| * 424a7b8 doc: add ai summary section
| * a4a10d1 doc: add final project document
* |   41ff4bc (origin/main) Merge pull request #10 from htloc0610/fix/bug
|\ \  
| * | bf9be3b (origin/fix/bug) fix(core): Resolve Attachment download and Data integration bugs
| * | 10c7709 fix(kanban): Fix Load More logic and Filter issues
| * | c3ea92f feat(search): Optimize search and add utility features
| * | f028bd3 style(ui): Enhance Dark Mode support and UI layout
|/ /  
* |   60365a5 Merge pull request #9 from htloc0610/responsive
|\ \  
| | | * a029817 (fix/delete_mail) chore: cleanup redundant root files after main merge
| | | * de7bfcf Merge branch 'main' into responsive
| | |/| 
| |/| | 
| | | * f028c98 (main) Update README.md with new repository URL for cloning
| | | * 6a24097 Initialize NestJS Student API project with essential configurations and structure
| * | d35ff4b (origin/responsive) feat(email): enhance trash management functionality
| * | c40f94b feat(ui): Responsive Layout & UI Improvements
|/ /  
* |   10ac778 Merge pull request #7 from htloc0610/update/UImail
|\ \  
| |/  
|/|   
| *   762f91c Merge pull request #8 from htloc0610/feat/dark
| |\  
| | | * 49b809e fix(ui): ensure ai summary card has dark background in dark mode
| | | * f241d64 fix(css): force dark mode colors for AI summary content elements
| | |/  
| | * 61c6a60 feat: dark mode implementation for kanban board and modals
```

## 4. Summary of Contributions
*   **Kanban Board:** Implemented drag-and-drop functionality, status updates, and "Load More" optimization.
*   **UI/UX:** Delivered a responsive design with full Dark Mode support (`feat/dark`).
*   **Search & Filters:** Optimized search performance and added filter logic (`feat/search`).
*   **Backend Integration:** Resolved core issues with attachment handling and API data synchronization (`fix/bug`).
*   **Documentation:** Comprehensive project reports and API documentation were added (`doc` branch).
