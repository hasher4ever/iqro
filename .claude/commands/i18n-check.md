Audit translations in Iqro Learn for completeness and correctness.

Scope (leave blank to check everything): $ARGUMENTS

Project location: D:\User data\Downloads\a0-project\a0-project

Steps:
1. Read lib/i18n.ts completely
2. For every translation key, verify it exists in ALL 4 language sections:
   - ru (Russian)
   - uz_latin (Uzbek Latin script)
   - uz_cyrillic (Uzbek Cyrillic script)
   - en (English)
3. List any keys missing from one or more languages
4. Check that uz_cyrillic and uz_latin have equivalent meaning (same content, different script)
5. Flag any keys that appear to be untranslated (e.g., English text in Uzbek/Russian sections)
6. Grep screens/ and components/ for hardcoded strings that should be in i18n instead
   - Look for text inside <Text> components that aren't using t('...')
   - Look for alert/toast messages that aren't translated
7. Fix all issues found
8. Summary: total keys, how many had issues, what was fixed

The t() function is used for all translations. Every user-visible string must be translated.
