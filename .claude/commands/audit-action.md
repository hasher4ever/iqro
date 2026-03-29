Add audit logging to a Convex mutation in Iqro Learn.

Action to audit: $ARGUMENTS

Project location: D:\User data\Downloads\a0-project\a0-project

Steps:
1. Read convex/schema.ts for the auditLogs table structure
2. Read an existing mutation that already has audit logging to follow the pattern
3. The audit log entry must include:
   - action: descriptive string (e.g., "user_created", "grade_edited", "payment_confirmed", "enrollment_approved")
   - entityType: the table name affected (e.g., "user", "grade", "transaction", "enrollment")
   - entityId: the _id of the affected record
   - performedBy: userId of who performed the action
   - companyId: for tenant scoping
   - details: JSON object with relevant context (before/after values, amounts, names, etc.)
4. Insert the audit log AFTER the main operation succeeds
5. Do not let audit log failure break the main operation — if needed, wrap in try/catch
6. Use descriptive action names that make the audit log readable to admins without code knowledge

The audit log should answer: Who did what, to which record, when, and what changed?
