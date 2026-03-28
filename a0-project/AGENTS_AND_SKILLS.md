# Claude Agents & Skills for Iqro Learn Development

> **Project:** Learning Center Management System (React Native + Expo + Convex + Telegram Bot)
> **Purpose:** This file documents custom Claude Code agents and skills to accelerate development.
> **How to create skills:** Place `.md` files in `~/.claude/commands/` — they become `/skill-name` slash commands.

---

## TABLE OF CONTENTS
1. [How Custom Skills Work](#how-custom-skills-work)
2. [Skills to Create](#skills-to-create)
3. [Agent Prompts (for Task tool)](#agent-prompts)
4. [Development Checklist](#development-checklist)

---

## HOW CUSTOM SKILLS WORK

Skills are markdown files saved in `~/.claude/commands/`.
The filename (without `.md`) becomes the slash command.

**Example:** `~/.claude/commands/new-screen.md` → use `/new-screen` in chat

Inside the file, use `$ARGUMENTS` as a placeholder for what you type after the command.

---

## SKILLS TO CREATE

### 1. `/new-screen` — Generate a New Screen
**File:** `~/.claude/commands/new-screen.md`

```markdown
Create a new React Native screen for the "Iqro Learn" project at:
D:\User data\Downloads\a0-project\a0-project

Screen name/purpose: $ARGUMENTS

Follow these strict conventions from the existing codebase:
- Use TypeScript with proper types
- Follow the pattern in screens/ directory (check similar screens first)
- Use the theme from lib/theme.ts for colors/spacing
- Use i18n translations — add keys to ALL 4 language files: ru, uz_latin, uz_cyrillic, en in lib/i18n.ts
- Role-guard the screen if needed (check user role from convex/users.ts `me` query)
- Add the screen to App.tsx navigation stack
- Use Convex queries/mutations (not REST) for all data operations
- Check convex/schema.ts to understand available tables
- Follow the multi-tenant pattern: always filter by companyId

Steps:
1. Read 2-3 similar existing screens to understand patterns
2. Read lib/theme.ts and lib/i18n.ts
3. Check convex/schema.ts for relevant tables
4. Create the screen file in the appropriate subdirectory (admin/, teacher/, student/)
5. Add navigation types if needed
6. Add translations to all 4 languages
7. Register in App.tsx
```

---

### 2. `/new-convex` — Add a Convex Backend Function
**File:** `~/.claude/commands/new-convex.md`

```markdown
Add a new Convex backend function to the Iqro Learn project at:
D:\User data\Downloads\a0-project\a0-project

Function description: $ARGUMENTS

Follow these conventions:
- Check convex/schema.ts first to understand the data model
- Always validate user identity with `await getAuthUserId(ctx)`
- Always check user role and companyId (multi-tenant isolation)
- Use `v.` validators for all arguments
- Queries use `ctx.db.query()`, mutations use `ctx.db.insert/patch/delete`
- For actions (external API calls), use `ctx.runMutation/runQuery`
- Add audit log entry via notifyAudit pattern for any data-changing mutation
- If this sends Telegram notifications, use the dispatchNotification pattern from convex/telegram.ts
- Export the function properly so it can be imported in screens

Steps:
1. Read convex/schema.ts
2. Read the relevant existing convex module (e.g., convex/users.ts, convex/classes.ts)
3. Read convex/_generated/api.d.ts to understand existing API surface
4. Implement the function
5. Show the frontend usage snippet
```

---

### 3. `/add-translation` — Add i18n Keys
**File:** `~/.claude/commands/add-translation.md`

```markdown
Add translation keys to all 4 languages in the Iqro Learn i18n system.

Keys/context to translate: $ARGUMENTS

Project location: D:\User data\Downloads\a0-project\a0-project

Steps:
1. Read lib/i18n.ts completely to see current structure
2. Add the new keys to ALL 4 language sections: ru (Russian), uz_latin (Uzbek Latin), uz_cyrillic (Uzbek Cyrillic), en (English)
3. For Uzbek translations, use natural phrasing appropriate for education context
4. For Russian, use formal register appropriate for admin software
5. Keep keys organized in the same section as related existing keys
6. Show where to use the new keys in components (t('keyName') pattern)

Never leave any language missing a key that was added to others.
```

---

### 4. `/telegram-notify` — Add a Telegram Notification
**File:** `~/.claude/commands/telegram-notify.md`

```markdown
Add a new Telegram notification type to the Iqro Learn project at:
D:\User data\Downloads\a0-project\a0-project

Notification context: $ARGUMENTS

Steps:
1. Read convex/telegram.ts fully to understand the dispatchNotification pattern
2. Read convex/schema.ts for notificationLogs and telegramLinks tables
3. Add the notification template with messages in all 4 languages (ru, uz_latin, uz_cyrillic, en)
4. Use HTML parse mode for formatting (bold, italic supported)
5. Add the trigger call at the appropriate mutation (after the data change)
6. Log the notification to notificationLogs table
7. Handle failures gracefully (don't break the main mutation if Telegram fails)
8. Test the message format is clear and informative for parents/students

Notification should include: what happened, when, which student/class, and any relevant amount/grade.
```

---

### 5. `/feature-status` — Check Feature Completeness
**File:** `~/.claude/commands/feature-status.md`

```markdown
Analyze the current implementation status of a feature in Iqro Learn.

Feature to check: $ARGUMENTS

Project location: D:\User data\Downloads\a0-project\a0-project

Perform a thorough analysis:
1. Check the convex/ backend — are the required queries and mutations implemented?
2. Check the screens/ frontend — is there a UI for this feature?
3. Check convex/schema.ts — is the data model in place?
4. Check lib/i18n.ts — are translations present?
5. Check App.tsx — is the screen registered in navigation?
6. Check Telegram notifications — are relevant notifications sent?
7. Check role permissions — is access control implemented?
8. Check audit logging — are data changes logged?

Return a clear status report:
- ✅ What is fully implemented
- ⚠️ What is partially implemented (what's missing)
- ❌ What is not implemented at all
- 📋 Recommended next steps in priority order
```

---

### 6. `/fix-multitenancy` — Verify Multi-tenant Isolation
**File:** `~/.claude/commands/fix-multitenancy.md`

```markdown
Review and fix multi-tenant isolation in Iqro Learn for: $ARGUMENTS

Project location: D:\User data\Downloads\a0-project\a0-project

Multi-tenancy rules in this project:
- Every database query MUST filter by companyId
- companyId comes from the authenticated user's record (users table)
- Never allow data from one company to be visible to another company
- super_admin can see across companies; admin/teacher/student are scoped

Check the specified file/function for:
1. Does every `ctx.db.query()` have a `.withIndex("by_company", ...)` or equivalent filter?
2. Is companyId fetched from the authenticated user (not from client input)?
3. Are there any queries that could return cross-company data?
4. Is the user's identity verified before any data access?

Fix any issues found and explain what was wrong.
```

---

### 7. `/financial-calc` — Implement Financial Calculation
**File:** `~/.claude/commands/financial-calc.md`

```markdown
Implement a financial calculation or report in Iqro Learn.

What to calculate: $ARGUMENTS

Project location: D:\User data\Downloads\a0-project\a0-project

Steps:
1. Read convex/finances.ts fully to understand existing calculations
2. Read convex/schema.ts for transactions, enrollments, attendance, classes tables
3. Understand the billing model:
   - Classes can bill per_lesson or per_month
   - Teacher share is a percentage of collected revenue
   - Projected = all enrolled students x lesson price (assumes 100% attendance)
   - Actual receivable = attended students x lesson price
   - Collected = confirmed transactions
   - Loss = projected - actual receivable
   - Advance = transactions beyond what's owed
4. Implement the calculation as a Convex query
5. Ensure calculations are company-scoped
6. Add appropriate date/period filtering
7. Return structured data suitable for display in FinancesScreen
```

---

### 8. `/audit-action` — Add Audit Logging
**File:** `~/.claude/commands/audit-action.md`

```markdown
Add audit logging to a Convex mutation in Iqro Learn.

Action to audit: $ARGUMENTS

Project location: D:\User data\Downloads\a0-project\a0-project

Steps:
1. Read convex/auditLogs.ts (or wherever audit log logic is defined)
2. Read convex/schema.ts for auditLogs table structure
3. The audit log should record:
   - action: string (e.g., "user_created", "grade_edited", "payment_confirmed")
   - entityType: string (e.g., "user", "grade", "transaction")
   - entityId: the affected record's _id
   - performedBy: the userId of who did it
   - companyId: for tenant scoping
   - details: JSON object with relevant before/after data
   - timestamp: auto (use _creationTime or Date.now())
4. Add the audit log insert AFTER the main operation succeeds
5. Don't let audit log failure break the main operation (use try/catch if needed)
```

---

### 9. `/convex-schema-update` — Update Database Schema
**File:** `~/.claude/commands/convex-schema-update.md`

```markdown
Update the Convex database schema for Iqro Learn.

Schema change needed: $ARGUMENTS

Project location: D:\User data\Downloads\a0-project\a0-project

IMPORTANT — Convex schema rules:
- Read convex/schema.ts fully first
- New fields should be optional (v.optional(...)) unless they have a default or are required at creation
- Adding required fields to existing tables needs a migration plan
- Use v.union() for fields with limited values (like status fields)
- Always add appropriate indexes for fields that will be queried/filtered
- Index naming convention: "by_fieldName" or "by_field1_field2"
- companyId index is required on every new table for multi-tenancy

Steps:
1. Read the full current schema
2. Propose the schema change
3. Identify which existing queries/mutations need updating
4. Implement the schema change
5. Update affected queries/mutations
6. Note if a data migration is needed for production
```

---

### 10. `/role-guard` — Add Role-Based Access Control
**File:** `~/.claude/commands/role-guard.md`

```markdown
Add role-based access control to a screen or function in Iqro Learn.

What to guard: $ARGUMENTS

Project location: D:\User data\Downloads\a0-project\a0-project

Role hierarchy in this project:
- super_admin: can do everything across all companies
- admin: manages their company (users, classes, finances, all data)
- teacher: can mark attendance, add grades, view their classes
- student_parent: read-only (own data, own child's data)

Frontend (screens):
- Check user role from the `me` Convex query
- Redirect to appropriate screen if role insufficient
- Use conditional rendering to show/hide admin controls

Backend (Convex functions):
- Always fetch the current user with getAuthUserId + db.get
- Check user.role and user.companyId
- Throw ConvexError with message if unauthorized
- For mutations that affect others: verify the target is in the same company

Steps:
1. Read convex/users.ts to see existing role-check patterns
2. Read 2-3 existing protected screens/functions
3. Implement the appropriate guards
4. Make sure error messages are user-friendly
```

---

## AGENT PROMPTS

These are reusable prompt templates for spawning Claude agents via the Task tool.
Save these and adapt as needed.

---

### Agent: Full Feature Implementer

Use when you want to build a complete feature end-to-end.

```
You are implementing a complete feature for Iqro Learn, a learning center management app.

Project: D:\User data\Downloads\a0-project\a0-project
Tech stack: React Native + Expo, TypeScript, Convex (serverless backend), Telegram Bot

Feature to implement: [DESCRIBE FEATURE]

Your job is to implement this feature completely:

1. BACKEND (convex/ directory):
   - Add/update schema in convex/schema.ts if needed
   - Create queries and mutations in the appropriate module
   - Add role checks and multi-tenant isolation (always filter by companyId)
   - Add audit logging for data-changing operations
   - Add Telegram notifications if parents/students should be informed

2. FRONTEND (screens/ directory):
   - Create or update the screen(s)
   - Follow existing UI patterns (read similar screens first)
   - Use theme from lib/theme.ts
   - Add translations to ALL 4 languages in lib/i18n.ts
   - Register in App.tsx if it's a new screen

3. VERIFICATION:
   - Check that every role (admin/teacher/student_parent) has appropriate access
   - Verify all Convex queries/mutations are properly typed
   - Ensure no cross-tenant data leakage

Start by reading: convex/schema.ts, App.tsx, lib/theme.ts, lib/i18n.ts, and the most similar existing feature.
```

---

### Agent: Telegram Bot Flow Builder

Use when adding new Telegram bot interactions.

```
You are extending the Telegram bot for Iqro Learn learning center app.

Project: D:\User data\Downloads\a0-project\a0-project
The Telegram bot handles: user registration, balance check, grades, courses, notifications

Bot flow to add: [DESCRIBE THE FLOW]

Your job:
1. Read convex/telegram.ts fully to understand current flow and patterns
2. Read convex/schema.ts for telegram-related tables
3. The bot supports 4 languages: ru, uz_latin, uz_cyrillic, en
4. All message strings MUST be in all 4 languages
5. Use inline keyboards for selections, not text parsing
6. State management is done via telegramRegistrations table (for multi-step flows)
7. Always validate that the user is authorized for the action
8. All Telegram API calls go through internal Convex actions (not directly from mutations)
9. Update the webhook handler in http.ts if handling new commands or callbacks
10. Log all notifications to notificationLogs table

Implement the flow and show example message output for each language.
```

---

### Agent: Financial Report Builder

Use when adding new financial reports or calculations.

```
You are adding financial reporting to Iqro Learn, a learning center management app.

Project: D:\User data\Downloads\a0-project\a0-project
Existing financial logic is in: convex/finances.ts, convex/transactions.ts
Frontend: screens/FinancesScreen.tsx, screens/DebtorsScreen.tsx

Financial report to add: [DESCRIBE WHAT TO CALCULATE]

Key financial concepts in this app:
- Billing: per_lesson or per_month per class
- Teacher share: percentage of collected revenue
- Projected revenue: all enrolled active students x lesson price
- Actual receivable: attended students x lesson price
- Collected: sum of confirmed transactions
- Loss: projected - actual receivable
- Advance: overpaid amounts
- Debtor: student with negative balance (owes money)

Your job:
1. Read convex/finances.ts and convex/schema.ts
2. Understand date/period filtering (day, week, month)
3. Implement the calculation as a Convex query
4. Ensure it's scoped to companyId
5. Add a UI component or screen update to display it
6. Add translations for any new labels
```

---

### Agent: Bug Investigator

Use when something is broken and you need root cause analysis.

```
You are investigating a bug in Iqro Learn.

Project: D:\User data\Downloads\a0-project\a0-project
Tech: React Native + Expo, Convex, TypeScript

Bug description: [DESCRIBE THE BUG — what happens, what should happen, when it occurs]

Your investigation approach:
1. Read the relevant screen(s) in screens/
2. Read the relevant Convex function(s) in convex/
3. Check the schema in convex/schema.ts for data model issues
4. Look for:
   - Missing or wrong index usage
   - companyId not being passed or checked
   - TypeScript type mismatches
   - Incorrect Convex query patterns
   - Role check failures
   - i18n key missing in one of the 4 languages
   - Navigation prop type issues in App.tsx
5. Identify the root cause
6. Provide a fix with explanation
7. Check if the same bug pattern exists elsewhere in the codebase
```

---

### Agent: i18n Completeness Checker

Use to find missing translations.

```
You are auditing translations in Iqro Learn for completeness.

Project: D:\User data\Downloads\a0-project\a0-project
Translation file: lib/i18n.ts
Languages: ru (Russian), uz_latin (Uzbek Latin), uz_cyrillic (Uzbek Cyrillic), en (English)

Your job:
1. Read lib/i18n.ts completely
2. For every translation key, verify it exists in ALL 4 language sections
3. List any keys that are missing from one or more languages
4. Check that Uzbek Cyrillic matches Uzbek Latin content (just different script)
5. Check for any keys that seem like placeholders or untranslated (e.g., still in English in Uzbek section)
6. Also grep screens/ and components/ for any hardcoded strings that should be in i18n
7. Provide a complete list of issues and fix them all

Common pattern: t('keyName') in .tsx files, key must exist in all 4 language objects.
```

---

## DEVELOPMENT CHECKLIST

Track what's remaining to build based on current codebase analysis:

### Backend (Convex)
- [ ] Class create/update/delete mutations (UI may be partial)
- [ ] Room CRUD functions
- [ ] Payment reversal detailed flow
- [ ] Teacher payout processing and recording
- [ ] Attendance unlock workflow (admin override)
- [ ] Class cancellation with automatic notifications
- [ ] Grade history/audit display query
- [ ] Leaderboard calculation query
- [ ] Period/term creation and management
- [ ] Enrollment withdrawal flow

### Frontend (Screens)
- [ ] Class creation/editing form
- [ ] Room management screen
- [ ] Teacher payment payout screen
- [ ] Grade history modal/screen
- [ ] Leaderboard screen
- [ ] Period/term management
- [ ] Class cancellation UI
- [ ] Enrollment withdrawal UI
- [ ] Attendance unlock request/approval UI

### Telegram Bot
- [ ] /balance command full implementation
- [ ] /courses command with schedule
- [ ] /grades command with recent grades
- [ ] Attendance notification to parents
- [ ] Payment received confirmation
- [ ] Grade added notification
- [ ] Class cancellation alert

### Infrastructure
- [ ] Telegram bot webhook setup UI (full flow)
- [ ] Company onboarding complete flow
- [ ] Super admin dashboard
- [ ] Data export functionality

---

## QUICK REFERENCE

### Key Files
| Purpose | File |
|---------|------|
| Database schema | `convex/schema.ts` |
| Navigation & routing | `App.tsx` |
| Theme (colors, fonts) | `lib/theme.ts` |
| Translations (all 4 languages) | `lib/i18n.ts` |
| Telegram bot logic | `convex/telegram.ts` |
| HTTP webhook handler | `convex/http.ts` |
| Financial calculations | `convex/finances.ts` |
| User & role management | `convex/users.ts` |
| Attendance logic | `convex/attendance.ts` |

### Common Convex Patterns
```typescript
// Get current user (always do this first in mutations/queries)
const userId = await getAuthUserId(ctx);
if (!userId) throw new ConvexError("Not authenticated");
const user = await ctx.db.get(userId);
if (!user) throw new ConvexError("User not found");

// Multi-tenant query (always filter by companyId)
const records = await ctx.db
  .query("tableName")
  .withIndex("by_company", (q) => q.eq("companyId", user.companyId))
  .collect();

// Role check
if (user.role !== "admin" && user.role !== "super_admin") {
  throw new ConvexError("Unauthorized");
}
```

### Role Capabilities Matrix
| Action | super_admin | admin | teacher | student_parent |
|--------|-------------|-------|---------|----------------|
| Manage users | ✅ all companies | ✅ own company | ❌ | ❌ |
| Manage classes | ✅ | ✅ | view own | view enrolled |
| Mark attendance | ✅ | ✅ | own classes | ❌ |
| Add grades | ✅ | ✅ | own classes | ❌ |
| View finances | ✅ | ✅ | own earnings | own balance |
| Approve enrollments | ✅ | ✅ | ❌ | ❌ |
| Telegram settings | ✅ | ✅ | ❌ | ❌ |
