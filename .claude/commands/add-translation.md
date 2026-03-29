Add translation keys to all 4 languages in the Iqro Learn i18n system.

Keys/context to translate: $ARGUMENTS

Project location: D:\User data\Downloads\a0-project\a0-project

Steps:
1. Read lib/i18n.ts completely to understand the current structure and existing key patterns
2. Add the new keys to ALL 4 language sections:
   - ru: Russian (formal register, appropriate for admin/education software)
   - uz_latin: Uzbek in Latin script
   - uz_cyrillic: Uzbek in Cyrillic script (same meaning as uz_latin, different script)
   - en: English
3. Place new keys in the same logical section as related existing keys
4. Never leave any language missing a key that was added to others
5. For education context: use appropriate Uzbek terms for "dars" (lesson), "o'quvchi" (student), "o'qituvchi" (teacher), "to'lov" (payment), "davomat" (attendance), "baho" (grade)
6. Show where to use the new keys in components using the t('keyName') pattern
