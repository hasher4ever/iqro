Create a new React Native screen for the Iqro Learn project at:
D:\User data\Downloads\a0-project\a0-project

Screen name/purpose: $ARGUMENTS

Follow these strict conventions from the existing codebase:
- Use TypeScript with proper types
- Follow the pattern in screens/ directory (read 2-3 similar screens first)
- Use the theme from lib/theme.ts for colors/spacing
- Use i18n translations — add keys to ALL 4 language sections in lib/i18n.ts: ru, uz_latin, uz_cyrillic, en
- Role-guard the screen if needed (check user role from convex/users.ts `me` query)
- Add the screen to App.tsx navigation stack with correct TypeScript types
- Use Convex queries/mutations (not REST) for all data operations
- Check convex/schema.ts to understand available tables
- Follow the multi-tenant pattern: always filter by companyId
- Place in the correct subdirectory: screens/admin/, screens/teacher/, or screens/student/

Steps:
1. Read App.tsx to understand navigation structure
2. Read 2-3 similar existing screens to understand patterns
3. Read lib/theme.ts and lib/i18n.ts
4. Check convex/schema.ts for relevant tables and existing queries/mutations
5. Create the screen file
6. Add translations to all 4 languages in lib/i18n.ts
7. Register in App.tsx with correct TypeScript navigation types
