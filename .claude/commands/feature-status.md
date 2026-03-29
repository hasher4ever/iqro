Analyze the current implementation status of a feature in Iqro Learn.

Feature to check: $ARGUMENTS

Project location: D:\User data\Downloads\a0-project\a0-project

Perform a thorough analysis across all layers:

1. BACKEND — Check convex/ directory:
   - Are the required queries and mutations implemented?
   - Does the schema in convex/schema.ts support this feature?
   - Are indexes defined for required query patterns?

2. FRONTEND — Check screens/ and components/:
   - Is there a UI screen for this feature?
   - Is it registered in App.tsx navigation?
   - Are loading/error states handled?

3. TRANSLATIONS — Check lib/i18n.ts:
   - Are all UI strings present in all 4 languages (ru, uz_latin, uz_cyrillic, en)?

4. NOTIFICATIONS — Check convex/telegram.ts:
   - Are relevant Telegram notifications sent for events in this feature?

5. PERMISSIONS — Check role enforcement:
   - Does each role (admin/teacher/student_parent) have correct access?
   - Are unauthorized access attempts handled?

6. AUDIT TRAIL — Are data changes logged?

Return a clear status report:
- ✅ Fully implemented
- ⚠️ Partially implemented (list what's missing)
- ❌ Not implemented
- 📋 Recommended next steps in priority order
