Add role-based access control to a screen or Convex function in Iqro Learn.

What to guard: $ARGUMENTS

Project location: D:\User data\Downloads\a0-project\a0-project

Role hierarchy in this project:
- super_admin: full access across all companies
- admin: manages their own company (users, classes, finances, all data)
- teacher: mark attendance, add grades, view their own classes and students
- student_parent: read-only access to own/child's data (attendance, grades, balance)

FOR FRONTEND (React Native screens):
- Get user role from the `me` Convex query
- Redirect or show error if role is insufficient
- Conditionally render admin-only controls (edit/delete buttons, etc.)
- Follow the pattern used in existing screens (read AdminDashboard or similar)

FOR BACKEND (Convex functions):
- Fetch authenticated user: `const userId = await getAuthUserId(ctx)` then `ctx.db.get(userId)`
- Check `user.role` explicitly before proceeding
- For mutations affecting another user's data: verify the target is in the same company
- Throw `new ConvexError("Unauthorized")` with a descriptive message if check fails
- For teacher-specific actions: verify the teacher owns/teaches the class being modified

Steps:
1. Read convex/users.ts for existing role-check patterns
2. Read 2 existing protected screens or functions for reference
3. Implement the appropriate guards for the specified target
4. Ensure error messages are user-friendly and translated if shown in UI
