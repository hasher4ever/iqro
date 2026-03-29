Add a new Convex backend function to the Iqro Learn project at:
D:\User data\Downloads\a0-project\a0-project

Function description: $ARGUMENTS

Follow these conventions:
- Check convex/schema.ts first to understand the data model
- Always validate user identity with `await getAuthUserId(ctx)` — throw if null
- Always check user role and companyId (multi-tenant isolation — never allow cross-company data)
- Use `v.` validators for ALL arguments (never unvalidated inputs)
- Queries use `ctx.db.query()` with proper index; mutations use `ctx.db.insert/patch/delete`
- For external API calls (e.g. Telegram), use internal actions via `ctx.runAction`
- Add audit log entry for any data-changing mutation
- If this sends Telegram notifications, follow the dispatchNotification pattern from convex/telegram.ts
- Export the function so it can be imported in screens

Steps:
1. Read convex/schema.ts fully
2. Read the relevant existing convex module (users.ts, classes.ts, finances.ts, etc.)
3. Check convex/_generated/api.d.ts for the existing API surface
4. Implement the function with all required checks
5. Show the frontend usage snippet (useQuery / useMutation call)
