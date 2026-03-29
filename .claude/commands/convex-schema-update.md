Update the Convex database schema for Iqro Learn.

Schema change needed: $ARGUMENTS

Project location: D:\User data\Downloads\a0-project\a0-project

IMPORTANT — Read the full convex/schema.ts before making any changes.

Convex schema rules to follow:
- New fields on existing tables MUST be optional (v.optional(...)) unless added with a migration
- Adding required fields to existing tables needs explicit migration planning — flag this
- Use v.union("value1", "value2") for fields with a fixed set of values (status fields, etc.)
- Always add indexes for fields that will be filtered/queried:
  - Index naming: "by_fieldName" or "by_field1_field2"
  - Every new table needs "by_company" index on companyId for multi-tenancy
- Use v.id("tableName") for foreign key references to other tables
- Use v.array(...) for lists of values

Steps:
1. Read convex/schema.ts completely
2. Propose the exact schema change with reasoning
3. Implement the change in schema.ts
4. Identify which existing queries/mutations need updating for the new fields
5. Update those queries/mutations
6. Note if a data migration is required for existing production records
