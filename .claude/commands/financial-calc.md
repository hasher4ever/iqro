Implement a financial calculation or report in Iqro Learn.

What to calculate: $ARGUMENTS

Project location: D:\User data\Downloads\a0-project\a0-project

Steps:
1. Read convex/finances.ts fully to understand existing calculations and patterns
2. Read convex/schema.ts for transactions, enrollments, attendance, classes, scheduleSlots tables
3. Understand the billing model before implementing:
   - Classes bill per_lesson or per_month
   - Teacher share is a percentage of collected revenue for their classes
   - Projected revenue = all enrolled active students × lesson price (assumes 100% attendance)
   - Actual receivable = attended students × lesson price
   - Collected = sum of confirmed transactions
   - Loss = projected − actual receivable (absent students who were charged)
   - Advance = payments beyond what's currently owed
   - Debtor = student with outstanding balance (owes money)
4. Implement the calculation as a Convex query scoped to companyId
5. Support date/period filtering (day, week, month, custom range) if relevant
6. Return structured data that can be displayed in FinancesScreen or a new screen
7. Add translations in lib/i18n.ts for any new labels
