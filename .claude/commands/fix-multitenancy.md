Review and fix multi-tenant isolation in Iqro Learn for: $ARGUMENTS

Project location: D:\User data\Downloads\a0-project\a0-project

Multi-tenancy rules in this project:
- Every database query MUST be scoped to companyId
- companyId MUST come from the authenticated user's record — never trust client input for this
- super_admin can see across companies; admin/teacher/student_parent are strictly scoped to their company
- Data from one company must NEVER be visible to another company

Check the specified file/function for:
1. Every `ctx.db.query()` — does it filter by companyId using the correct index?
2. Is companyId fetched from `ctx.db.get(userId)` (trusted) rather than `args.companyId` (untrusted)?
3. Are there any list queries that could return cross-company data?
4. Is user identity verified before any data access?
5. Are _id lookups followed by a companyId ownership check?

Common pattern to follow:
```typescript
const userId = await getAuthUserId(ctx);
if (!userId) throw new ConvexError("Not authenticated");
const user = await ctx.db.get(userId);
if (!user) throw new ConvexError("User not found");
// use user.companyId for all queries — never args.companyId
```

Fix all issues found and explain what was wrong.
