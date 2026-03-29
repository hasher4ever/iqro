# UX Audit — Iqro Learn

> Updated incrementally by `/ux-audit`. Each session covers ONE page.
> Audience: Designers & product owners. All propositions are actionable.

## Severity Legend

| Priority | Criteria |
|----------|----------|
| **P1** | Usability blocker, data-loss risk, WCAG A/AA violation, trust defect |
| **P2** | Friction, confusion, missing feedback, inefficiency |
| **P3** | Polish, delight, power-user efficiency |

## Routes

| Route | Page | Audit Status | Last Audited | P1 | P2 | P3 |
|-------|------|--------------|--------------|----|----|----|
| `/` | Login / Register | Done | 2026-03-29 | 5 | 5 | 3 |
| `/admin` | Admin Dashboard | Done | 2026-03-29 | 3 | 4 | 2 |
| `/teacher` | Teacher Dashboard | Not started | — | — | — | — |
| `/student` | Student Dashboard | Not started | — | — | — | — |
| `/classes` | Classes (Предметы) | Done | 2026-03-29 | 4 | 4 | 1 |
| `/finances` | Finances (Финансы) | Done | 2026-03-29 | 2 | 5 | 2 |
| `/schedule` | Schedule | Done | 2026-03-29 | 2 | 3 | 2 |
| `/attendance` | Attendance | Not started | — | — | — | — |
| `/grades` | Grades | Not started | — | — | — | — |
| `/users` | Users (Пользователи) | Done | 2026-03-29 | 2 | 4 | 1 |
| `/rooms` | Rooms (Кабинеты) | Done | 2026-03-29 | 1 | 1 | 0 |
| `/debtors` | Debtors | Inaccessible | — | — | — | — |
| `/transactions` | Transactions (Транзакции) | Done | 2026-03-29 | 1 | 1 | 0 |
| `/payment` | Payment | Inaccessible | — | — | — | — |
| `/audit-logs` | Audit Logs (Журнал действий) | Done | 2026-03-29 | 1 | 4 | 0 |
| `/profile` | Profile (Профиль) | Done | 2026-03-29 | 2 | 3 | 2 |
| `/notifications` | Notifications (Уведомления) | Done | 2026-03-29 | 0 | 0 | 0 |
| `/telegram-settings` | Telegram (in Profile) | Done | 2026-03-29 | 0 | 1 | 0 |
| `/onboarding` | Company Onboarding | Inaccessible | — | — | — | — |

## Global / Cross-Cutting Issues

These issues recur across 3+ pages and are documented once here rather than repeated per page.

| # | Priority | Proposition |
|---|----------|-------------|
| G.1 | **P1** | **All icon-only buttons lack accessible names.** Back arrows, add (+) buttons, notification bell, profile icon, filter icons, and refresh icons across every screen render as empty text ("") in the accessibility tree. Add `aria-label` to every icon-only interactive element app-wide (WCAG 4.1.2: Name, Role, Value). Affects: Login, Dashboard, Classes, Users, Finances, Rooms, Transactions, Audit Logs, Profile. |
| G.2 | **P1** | **All filter/toggle chips lack ARIA roles.** Every screen with filter chips (Active/All/Completed, Day/Week/Month, A-F/0-100/1-5, etc.) renders them as plain `<div>` elements with `cursor: pointer` but no `role="radiogroup"` / `role="radio"` or `role="tablist"` / `role="tab"`. They are invisible to keyboard and screen reader users (WCAG 2.1.1: Keyboard, WCAG 4.1.2: Name, Role, Value). Affects: Classes, Users, Finances, Transactions, Audit Logs, Profile (theme/language). |
| G.3 | **P1** | **All pages render simultaneously in the DOM.** The tab navigation does not unmount inactive screens — Dashboard, Schedule, Classes, Users, and Finances content is all present in the accessibility tree at once. This confuses screen readers, inflates memory usage, and may cause unexpected behavior (WCAG 1.3.1: Info & Relationships). |
| G.4 | **P2** | **Empty states are generic and lack call-to-action.** Multiple screens show plain text "Нет данных" or "Ничего не найдено" with no icon, illustration, or guidance on what to do next. Add contextual empty states with an icon and a primary action button (Nielsen #9: Help users recover from errors). Affects: Classes, Schedule, Rooms, Transactions, Finances. |
| G.5 | **P2** | **Broken or missing i18n translations.** Several screens display untranslated English keys or text: "teachers" (Finances), "role" / "Admin" / "Teacher" / "Student/Parent" (Users), "select_teacher" (Classes), "create company" (Audit Logs). Perform a full i18n audit to catch all missing translation keys (Nielsen #4: Consistency & standards). |
| G.6 | **P2** | **No loading/skeleton states anywhere.** No screen in the app shows a loading skeleton or shimmer animation during data fetch. Users cannot distinguish between "loading" and "empty" (Nielsen #1: Visibility of system status). Affects: Dashboard, Schedule, Classes, Users, Finances, Transactions. |
| G.7 | **P2** | **Inconsistent date formatting.** The app uses at least 3 different date formats: "23.03 — 29.03" (Schedule), "2026-03-01 — 2026-03-31" (Finances, ISO), "3/28/2026, 4:34:57 PM" (Audit Logs, US). Standardize on one locale-appropriate format (Nielsen #4: Consistency & standards). |

## Per-Page Findings

### 1. Login / Register (`/`)

**Audited:** 2026-03-29 | **Screenshots:** `ux_audit_screenshots/login.png`, `login-email-tab.png`, `login-register.png`, `login-error-empty.png`, `login-language-dropdown.png`

#### 1. Navigation & Wayfinding

| # | Priority | Proposition |
|---|----------|-------------|
| 1.1 | **P2** | Add a visible heading or page title ("Sign In" / "Create Account") that changes when toggling between sign-in and sign-up modes. Currently the only indicator is the button label at the bottom, which is easy to miss. Users may not realize they switched modes (Nielsen #1: Visibility of system status). |

#### 2. Forms & Validation

| # | Priority | Proposition |
|---|----------|-------------|
| 2.1 | **P1** | Show per-field inline validation errors (highlight the specific empty field) instead of a single generic banner "Заполните все поля". Users must scan all fields to find the problem (Nielsen #9: Help users recognize/recover from errors). |
| 2.2 | **P1** | Add a `<label>` element or `aria-label` to the phone input field. The accessibility tree shows `textbox "XX XXX XX XX"` — the placeholder is the only label, which disappears on input and is invisible to screen readers once text is entered (WCAG 1.3.1: Info & Relationships, WCAG 3.3.2: Labels or Instructions). |
| 2.3 | **P1** | Add a `<label>` element or `aria-label` to the email input field. The accessibility tree shows `textbox "Электронная почта"` with placeholder-only labeling (WCAG 1.3.1: Info & Relationships). |
| 2.4 | **P2** | Show password requirements (minimum 6 characters) before the user submits the registration form. Currently the constraint is only revealed after a failed submission (Nielsen #5: Error prevention). |
| 2.5 | **P2** | Add a "show/hide password" toggle to the password field. Users on mobile and desktop benefit from being able to verify what they typed, especially during registration (Nielsen #1: Visibility of system status). |

#### 3. Feedback & Loading States

| # | Priority | Proposition |
|---|----------|-------------|
| 3.1 | **P2** | Add a loading spinner or disable the "Войти" / "Регистрация" button while the authentication request is in progress. The code sets `loading` state but the button text just changes to "Загрузка…" — there is no visual spinner and the button remains clickable, risking duplicate submissions (Nielsen #1: Visibility of system status). |

#### 4. Accessibility (WCAG 2.1 AA)

| # | Priority | Proposition |
|---|----------|-------------|
| 4.1 | **P1** | The phone/email toggle tabs, language selector, and sign-in/sign-up switch link are all `TouchableOpacity` (rendered as `<div>` on web) with no `role="button"` or `role="tab"`. They are inaccessible to keyboard and screen reader users (WCAG 4.1.2: Name, Role, Value). |
| 4.2 | **P1** | The language picker dropdown has no `role="listbox"` or `role="menu"` and cannot be navigated with arrow keys or dismissed with Escape. Keyboard-only users cannot change language (WCAG 2.1.1: Keyboard). |
| 4.3 | **P3** | Add `aria-live="polite"` to the error banner container so screen readers announce validation errors automatically when they appear (WCAG 4.1.3: Status Messages). |

#### 5. Data Display & Tables

No issues found — not applicable to login page.

#### 6. Empty & Error States

| # | Priority | Proposition |
|---|----------|-------------|
| 6.1 | **P2** | Differentiate error messages between "wrong password" and "account not found" instead of showing a single "Неверные учётные данные" for both cases. This helps users know whether to re-type their password or check their phone/email (Nielsen #9: Help users recover from errors). |

#### 7. Visual Hierarchy & Layout

| # | Priority | Proposition |
|---|----------|-------------|
| 7.1 | **P3** | The subtitle "Learning Center ERP" is hardcoded in English while the rest of the UI is in the selected language. Translate it or remove it to maintain language consistency (Nielsen #4: Consistency & standards). |
| 7.2 | **P3** | The language selector in the top-right corner has low visual weight and no icon (globe/language icon). Users unfamiliar with the app may not notice it. Add a globe icon next to the language name (Nielsen #6: Recognition over recall). |

#### 8. Consistency & Standards

| # | Priority | Proposition |
|---|----------|-------------|
| 8.1 | **P2** | The sign-in error message prepends "Ошибка: " before the message ("Ошибка: Заполните все поля") but the sign-up validation does not use this prefix. Standardize error message formatting across both modes (Nielsen #4: Consistency & standards). |

### 2. Admin Dashboard (`/admin`)

**Audited:** 2026-03-29 | **Screenshots:** `ux_audit_screenshots/admin-dashboard.png`, `notifications-empty.png`

#### 1. Navigation & Wayfinding

| # | Priority | Proposition |
|---|----------|-------------|
| 2.1 | **P2** | The bottom tab bar shows 5 tabs (Главная, Расписание, Предметы, Пользователи, Финансы) but the app has many more screens (Rooms, Debtors, Audit Logs, Transactions, etc.) with no visible way to reach them from the dashboard. Add a "More" tab or a hamburger/side menu to surface all available sections (Nielsen #6: Recognition over recall). |

#### 2. Forms & Validation

No issues found — no forms on this page.

#### 3. Feedback & Loading States

| # | Priority | Proposition |
|---|----------|-------------|
| 3.1 | **P2** | The financial summary cards (Начислено за уроки, Собрано, Баланс) show "0 UZS" with no indication of whether data is still loading or genuinely zero. Add a skeleton/shimmer state during data fetch so users can distinguish "loading" from "empty" (Nielsen #1: Visibility of system status). |

#### 4. Accessibility (WCAG 2.1 AA)

| # | Priority | Proposition |
|---|----------|-------------|
| 4.1 | **P1** | The notification bell and profile icons in the header have no `aria-label` or accessible name. The accessibility tree shows empty text content ("") — screen readers cannot identify what these buttons do (WCAG 4.1.2: Name, Role, Value). |
| 4.2 | **P1** | The financial summary cards are rendered as plain `<div>` elements with no semantic structure. Wrap them in a landmark or use heading + definition list so screen readers convey the relationship between label and value (WCAG 1.3.1: Info & Relationships). |
| 4.3 | **P1** | The back button on the Notifications screen renders as empty text ("") with no accessible name. Add `aria-label="Back"` or visible text (WCAG 4.1.2: Name, Role, Value). |

#### 5. Data Display & Tables

| # | Priority | Proposition |
|---|----------|-------------|
| 5.1 | **P3** | Format currency values with thousand separators (e.g., "1 250 000 UZS" instead of "1250000 UZS") for readability. Currently all values are zero, but this should be verified with real data (Nielsen #8: Aesthetic & minimalist design). |

#### 6. Empty & Error States

| # | Priority | Proposition |
|---|----------|-------------|
| 6.1 | **P2** | The "Сегодня нет занятий" (No classes today) empty state is plain text with no icon or call-to-action. Add an illustration and a link to the schedule or class creation to guide the user toward next steps (Nielsen #9: Help users recover from errors). |
| 6.2 | **P2** | The Notifications empty state ("Нет уведомлений") shows a bell icon but no guidance on what generates notifications or how to configure them. Add a brief explanation or link to notification settings (Nielsen #10: Help & documentation). |

#### 7. Visual Hierarchy & Layout

| # | Priority | Proposition |
|---|----------|-------------|
| 7.1 | **P3** | The greeting "Добро пожаловать, abubakr" uses the raw account name without capitalization. Display the user's full name with proper casing for a polished first impression (Nielsen #8: Aesthetic & minimalist design). |

#### 8. Consistency & Standards

No issues found.

### 3. Schedule (`/schedule`)

**Audited:** 2026-03-29 | **Screenshots:** `ux_audit_screenshots/schedule.png`

#### 1. Navigation & Wayfinding

| # | Priority | Proposition |
|---|----------|-------------|
| 3.1 | **P2** | The week navigation arrows ("<" and ">") have no tooltip or label indicating "Previous week" / "Next week". Add a tooltip or `aria-label` so the meaning is clear without guessing (Nielsen #6: Recognition over recall). |
| 3.2 | **P3** | Add a "Today" button to quickly jump back to the current week after navigating away. Users who browse past/future weeks have no shortcut to return (Nielsen #7: Flexibility & efficiency). |

#### 2. Forms & Validation

No issues found — no forms on this page.

#### 3. Feedback & Loading States

| # | Priority | Proposition |
|---|----------|-------------|
| 3.3 | **P2** | When switching weeks, the grid updates without any loading indication. If network is slow, users see stale data with no signal that new data is loading. Add a subtle loading overlay or skeleton to the grid area (Nielsen #1: Visibility of system status). |

#### 4. Accessibility (WCAG 2.1 AA)

| # | Priority | Proposition |
|---|----------|-------------|
| 3.4 | **P1** | The week navigation arrows render as empty text ("") in the accessibility tree with no `aria-label`. Screen readers cannot identify their purpose (WCAG 4.1.2: Name, Role, Value). |
| 3.5 | **P1** | The day columns (ПО, ВТ, СР, etc.) and time rows (08:00–17:00) have no `role="grid"`, `role="columnheader"`, or `role="rowheader"` semantics. The entire schedule is a flat list of `<div>` elements, making it impossible to navigate with assistive technology (WCAG 1.3.1: Info & Relationships). |

#### 5. Data Display & Tables

| # | Priority | Proposition |
|---|----------|-------------|
| 3.6 | **P3** | Show the date numbers alongside day abbreviations in the column headers (e.g., "ПО 23" instead of just "ПО"). Users currently must look at the date range header to determine which date each column represents (Nielsen #6: Recognition over recall). |

#### 6. Empty & Error States

| # | Priority | Proposition |
|---|----------|-------------|
| 3.7 | **P2** | The "Ничего не найдено" (Nothing found) message is hidden at the bottom of the grid and easily missed. When the schedule is empty, display a prominent empty state in the center of the grid with a suggestion to create a class or check another week (Nielsen #9: Help users recover from errors). |

#### 7. Visual Hierarchy & Layout

No issues found.

#### 8. Consistency & Standards

No issues found.

### 4. Classes / Subjects (`/classes` — Предметы)

**Audited:** 2026-03-29 | **Screenshots:** `ux_audit_screenshots/classes.png`, `classes-create-modal.png`, `classes-create-modal-bottom.png`

#### 1. Navigation & Wayfinding

| # | Priority | Proposition |
|---|----------|-------------|
| 4.1 | **P1** | All screen content (Dashboard, Schedule, Classes) renders stacked in the DOM simultaneously instead of only showing the active tab's content. The accessibility tree exposes all pages at once, confusing screen readers and inflating the DOM. Only the active tab's content should be mounted or visible to assistive technology (WCAG 1.3.1: Info & Relationships). |

#### 2. Forms & Validation

| # | Priority | Proposition |
|---|----------|-------------|
| 4.2 | **P1** | The "Create Subject" modal content is cut off at the bottom — the teacher share %, charge-for-absences toggle, and schedule day picker are hidden behind the bottom tab bar and cannot be scrolled into view. Users cannot complete the form (Nielsen #3: User control & freedom). |
| 4.3 | **P2** | The teacher dropdown shows the raw translation key "select_teacher" instead of a translated placeholder like "Выберите преподавателя". This is a broken i18n key (Nielsen #4: Consistency & standards). |
| 4.4 | **P2** | The "Кабинет" (Room) field has a label but no input control is visible beneath it — it appears empty. Either show a dropdown/selector or remove the label if not yet implemented (Nielsen #1: Visibility of system status). |

#### 3. Feedback & Loading States

No issues found.

#### 4. Accessibility (WCAG 2.1 AA)

| # | Priority | Proposition |
|---|----------|-------------|
| 4.5 | **P1** | The "+" (add) button in the header and the back arrow ("<") have no accessible name — they render as empty text in the accessibility tree. Add `aria-label="Create subject"` and `aria-label="Back"` respectively (WCAG 4.1.2: Name, Role, Value). |
| 4.6 | **P1** | The filter chips (Активен, Все, Завершён) and grading system chips (A-F, 0-100, 1-5) are rendered as plain `<div>` elements with `cursor: pointer` but no `role="radio"` or `role="tab"`. They are not keyboard-navigable (WCAG 2.1.1: Keyboard, WCAG 4.1.2: Name, Role, Value). |

#### 5. Data Display & Tables

| # | Priority | Proposition |
|---|----------|-------------|
| 4.7 | **P2** | The count label "0 предметы" has incorrect Russian grammar — it should be "0 предметов" (genitive plural). Implement proper pluralization rules for the count display (Nielsen #2: Match between system and real world). |

#### 6. Empty & Error States

| # | Priority | Proposition |
|---|----------|-------------|
| 4.8 | **P2** | The "Нет данных" (No data) empty state is plain text with no illustration or call-to-action. Add an icon and a prompt like "Создайте первый предмет" with a button linking to the create form (Nielsen #9: Help users recover from errors). |

#### 7. Visual Hierarchy & Layout

| # | Priority | Proposition |
|---|----------|-------------|
| 4.9 | **P3** | The "Название предмета" (Subject name) and "Предмет" (Subject) fields in the create form are ambiguously labeled — it's unclear what distinguishes them. Rename one to clarify (e.g., "Название группы" vs "Учебный предмет") (Nielsen #2: Match between system and real world). |

#### 8. Consistency & Standards

No issues found.

### 5. Users (`/users` — Пользователи)

**Audited:** 2026-03-29 | **Screenshots:** `ux_audit_screenshots/users.png`, `users-add-modal.png`

#### 1. Navigation & Wayfinding

| # | Priority | Proposition |
|---|----------|-------------|
| 5.1 | **P2** | Clicking a user card highlights it (active state) but does not navigate to a user detail view or open a detail panel. The user expects tapping a card to show details — either implement a detail view or remove the clickable affordance (cursor: pointer) to avoid false expectations (Nielsen #1: Visibility of system status). |

#### 2. Forms & Validation

| # | Priority | Proposition |
|---|----------|-------------|
| 5.2 | **P2** | The "role" label in the Add User modal is an untranslated key — it displays the raw English word "role" instead of "Роль". Fix the missing i18n translation (Nielsen #4: Consistency & standards). |
| 5.3 | **P2** | The role selection chips display English labels (Admin, Teacher, Student/Parent) while the rest of the modal is in Russian. Translate to "Администратор", "Учитель", "Ученик/Родитель" (Nielsen #4: Consistency & standards). |

#### 3. Feedback & Loading States

No issues found.

#### 4. Accessibility (WCAG 2.1 AA)

| # | Priority | Proposition |
|---|----------|-------------|
| 5.4 | **P1** | The add-user icon and filter icon in the header render as empty text ("") with no `aria-label`. Screen readers cannot identify these controls (WCAG 4.1.2: Name, Role, Value). |
| 5.5 | **P1** | The role selector chips (Admin, Teacher, Student/Parent) have no `role="radiogroup"` / `role="radio"` semantics and are not keyboard-navigable (WCAG 2.1.1: Keyboard, WCAG 4.1.2: Name, Role, Value). |

#### 5. Data Display & Tables

| # | Priority | Proposition |
|---|----------|-------------|
| 5.6 | **P3** | The green dot next to the user card presumably indicates "active" status, but there is no legend or tooltip explaining what it means. Add a tooltip on hover or a legend in the header (Nielsen #6: Recognition over recall). |

#### 6. Empty & Error States

No issues found.

#### 7. Visual Hierarchy & Layout

| # | Priority | Proposition |
|---|----------|-------------|
| 5.7 | **P2** | The "SA" badge on the user avatar presumably stands for "Super Admin" but is not explained anywhere. Display the full role name in the user card or add a tooltip (Nielsen #2: Match between system and real world). |

#### 8. Consistency & Standards

No issues found.

### 6. Finances (`/finances` — Финансы)

**Audited:** 2026-03-29 | **Screenshots:** `ux_audit_screenshots/finances.png`

#### 1. Navigation & Wayfinding

No issues found.

#### 2. Forms & Validation

No issues found — no forms on this page.

#### 3. Feedback & Loading States

| # | Priority | Proposition |
|---|----------|-------------|
| 6.1 | **P2** | Financial values show "0" with no loading/skeleton state. Users cannot distinguish between "data loaded and is zero" vs "still loading". Add a shimmer state during fetch (Nielsen #1: Visibility of system status). |

#### 4. Accessibility (WCAG 2.1 AA)

| # | Priority | Proposition |
|---|----------|-------------|
| 6.2 | **P1** | The back arrow renders as empty text ("") with no `aria-label` (WCAG 4.1.2: Name, Role, Value). |
| 6.3 | **P1** | The period toggle chips (День, Неделя, Месяц) are rendered as plain `<div>` elements with no `role="tablist"` / `role="tab"` semantics. They are not keyboard-navigable (WCAG 2.1.1: Keyboard). |

#### 5. Data Display & Tables

| # | Priority | Proposition |
|---|----------|-------------|
| 6.4 | **P2** | The date range displays in ISO format "2026-03-01 — 2026-03-31" instead of the localized format used elsewhere (e.g., "01.03 — 31.03.2026" or "Март 2026"). Match the date formatting convention used in the Schedule page (Nielsen #4: Consistency & standards). |
| 6.5 | **P2** | The "Day" view shows a redundant range "2026-03-29 — 2026-03-29". For a single day, display just "29 марта 2026" instead of a date range (Nielsen #8: Aesthetic & minimalist design). |
| 6.6 | **P3** | Financial values display as bare "0" without currency suffix (UZS). The Dashboard cards show "0 UZS" — align both views to always include the currency for clarity (Nielsen #4: Consistency & standards). |

#### 6. Empty & Error States

| # | Priority | Proposition |
|---|----------|-------------|
| 6.7 | **P2** | The "Нет данных" (No data) message at the bottom is ambiguous — it's unclear whether it refers to the entire page or just the teachers section. Position it within the specific section it applies to (Nielsen #1: Visibility of system status). |

#### 7. Visual Hierarchy & Layout

| # | Priority | Proposition |
|---|----------|-------------|
| 6.8 | **P3** | The "Ученики" section header includes an icon and is properly translated, but the "teachers" section header is in English. Translate to "Учителя" for language consistency (Nielsen #4: Consistency & standards). |

#### 8. Consistency & Standards

| # | Priority | Proposition |
|---|----------|-------------|
| 6.9 | **P2** | The "teachers" section heading is an untranslated i18n key displayed in English while all other headings are in Russian. This is a broken translation (Nielsen #4: Consistency & standards). |

### 7. Profile (`/profile` — Профиль)

**Audited:** 2026-03-29 | **Screenshots:** `ux_audit_screenshots/profile.png`, `profile-bottom.png`

#### 1. Navigation & Wayfinding

| # | Priority | Proposition |
|---|----------|-------------|
| 7.1 | **P2** | The Profile page is the only way to reach Rooms, Transactions, Audit Logs, and Telegram Settings — none of these are in the bottom tab bar. Users must know to visit Profile to find admin functions. Add these to a "More" menu or side navigation (Nielsen #6: Recognition over recall). |

#### 2. Forms & Validation

| # | Priority | Proposition |
|---|----------|-------------|
| 7.2 | **P2** | The "Полное имя" (Full name) field is editable inline with no save button — it's unclear whether changes are auto-saved or require explicit action. Add a "Save" button or a clear auto-save indicator (Nielsen #1: Visibility of system status). |

#### 3. Feedback & Loading States

No issues found.

#### 4. Accessibility (WCAG 2.1 AA)

| # | Priority | Proposition |
|---|----------|-------------|
| 7.3 | **P1** | The logout icon (top-right, red) has no accessible name. Screen readers cannot identify it (WCAG 4.1.2: Name, Role, Value). |
| 7.4 | **P1** | The organization code refresh icon renders as empty text with no `aria-label` (WCAG 4.1.2: Name, Role, Value). |

#### 5. Data Display & Tables

| # | Priority | Proposition |
|---|----------|-------------|
| 7.5 | **P3** | The "1 Участники" member count has incorrect Russian grammar — should be "1 Участник" (singular). Apply proper pluralization rules (Nielsen #2: Match between system and real world). |

#### 6. Empty & Error States

No issues found.

#### 7. Visual Hierarchy & Layout

| # | Priority | Proposition |
|---|----------|-------------|
| 7.6 | **P3** | The Telegram bot commands section (/balance, /courses, etc.) is displayed on the Profile page but is only relevant in the Telegram chat context. Consider moving it to the Telegram Settings detail page to reduce profile page clutter (Nielsen #8: Aesthetic & minimalist design). |

#### 8. Consistency & Standards

| # | Priority | Proposition |
|---|----------|-------------|
| 7.7 | **P2** | The "ПАРОЛЬ" label uses all-caps while "Полное имя" uses sentence case. Standardize label casing across the form (Nielsen #4: Consistency & standards). |

### 8. Rooms (`/rooms` — Управление кабинетами)

**Audited:** 2026-03-29 | **Screenshots:** `ux_audit_screenshots/rooms.png`

#### All Categories

| # | Priority | Proposition |
|---|----------|-------------|
| 8.1 | **P1** | The "+" add button and back arrow have no accessible names — see Global G.1 (WCAG 4.1.2). |
| 8.2 | **P2** | The "Нет данных" empty state has no icon or CTA to create a room — see Global G.4 (Nielsen #9). |

### 9. Transactions (`/transactions` — Транзакции)

**Audited:** 2026-03-29 | **Screenshots:** `ux_audit_screenshots/transactions.png`

#### All Categories

| # | Priority | Proposition |
|---|----------|-------------|
| 9.1 | **P1** | Filter chips (Все, Ожидание, Подтверждено) lack ARIA roles — see Global G.2 (WCAG 4.1.2). |
| 9.2 | **P2** | "Ничего не найдено" empty state is plain text with no guidance — see Global G.4 (Nielsen #9). |

### 10. Audit Logs (`/audit-logs` — Журнал действий)

**Audited:** 2026-03-29 | **Screenshots:** `ux_audit_screenshots/audit-logs.png`

#### 1–4. Navigation, Forms, Feedback, Accessibility

| # | Priority | Proposition |
|---|----------|-------------|
| 10.1 | **P1** | Filter chips lack ARIA roles — see Global G.2 (WCAG 4.1.2). |

#### 5. Data Display & Tables

| # | Priority | Proposition |
|---|----------|-------------|
| 10.2 | **P2** | Action names in filter chips and log cards display untranslated English ("create company"). Translate all audit action types to the user's selected language (Nielsen #4: Consistency & standards). |
| 10.3 | **P2** | Log entry timestamps use US locale format "3/28/2026, 4:34:57 PM" while the rest of the app uses DD.MM format. Standardize — see Global G.7 (Nielsen #4: Consistency & standards). |
| 10.4 | **P2** | The log detail section displays raw JSON (`{"name":"IQRO"}`) which is meaningless to non-technical users. Format the payload as a human-readable summary, e.g., "Создана организация: IQRO" (Nielsen #2: Match between system and real world). |

#### 6–8. Empty States, Layout, Consistency

| # | Priority | Proposition |
|---|----------|-------------|
| 10.5 | **P2** | The "entity" label ("company") in the log card is untranslated English. Translate entity types (Nielsen #4: Consistency & standards). |

### 11. Notifications (`/notifications` — Уведомления)

**Audited:** 2026-03-29 | **Screenshots:** `ux_audit_screenshots/notifications-empty.png`

No new issues beyond Dashboard finding 2.6.2 (empty state lacks guidance). Already covered.

### 12. Telegram Settings (in Profile)

**Audited:** 2026-03-29 | **Screenshot:** Visible in `ux_audit_screenshots/profile.png` (snapshot tree)

| # | Priority | Proposition |
|---|----------|-------------|
| 12.1 | **P2** | The "Отключить" (Disconnect) button for Telegram has no confirmation dialog. A single tap permanently disconnects the integration with no undo (Nielsen #5: Error prevention). |

## Summary

| Priority | Count | Focus Area |
|----------|-------|------------|
| **P1** | 23 | Accessibility (icon labels, ARIA roles, stacked DOM, modal scroll) — 3 global + 20 per-page |
| **P2** | 35 | i18n gaps, empty states, date formatting, loading states, navigation — 4 global + 31 per-page |
| **P3** | 13 | Grammar, polish, formatting, layout clutter |

## Audit Log

| Date | Page Audited | P1 | P2 | P3 | Notes |
|------|-------------|----|----|----|----|
| 2026-03-29 | Login / Register | 5 | 5 | 3 | First audit. Major a11y gaps on all interactive elements. |
| 2026-03-29 | Admin Dashboard | 3 | 4 | 2 | Missing a11y on header icons, empty states lack guidance, hidden nav items. |
| 2026-03-29 | Schedule | 2 | 3 | 2 | Grid lacks ARIA semantics, nav arrows unlabeled, empty state hidden. |
| 2026-03-29 | Classes (Предметы) | 4 | 4 | 1 | Modal scroll blocked, all pages stacked in DOM, broken i18n key, grammar. |
| 2026-03-29 | Users (Пользователи) | 2 | 4 | 1 | Untranslated labels, English role names, user card click does nothing. |
| 2026-03-29 | Finances (Финансы) | 2 | 5 | 2 | "teachers" untranslated, ISO dates, no currency suffix, ambiguous empty state. |
| 2026-03-29 | Profile (Профиль) | 2 | 3 | 2 | Logout/refresh icons unlabeled, name field save ambiguous, label casing inconsistent. |
| 2026-03-29 | Rooms (Кабинеты) | 1 | 1 | 0 | Minimal page — icon a11y + empty state. |
| 2026-03-29 | Transactions (Транзакции) | 1 | 1 | 0 | Filter chips a11y + empty state. |
| 2026-03-29 | Audit Logs (Журнал действий) | 1 | 4 | 0 | Untranslated actions, raw JSON, US date format, entity labels in English. |
| 2026-03-29 | Notifications | 0 | 0 | 0 | Already covered in Dashboard audit. |
| 2026-03-29 | Telegram Settings | 0 | 1 | 0 | No disconnect confirmation. |
| 2026-03-29 | **Global cross-cutting** | 3 | 4 | 0 | Icon labels, ARIA roles, stacked DOM, empty states, i18n, loading, dates. |

## Sequencing Recommendation

**Sprint 1 (P1 — Critical):** Fix the 3 global accessibility issues first — they affect every screen:
1. Add `aria-label` to all icon-only buttons (G.1)
2. Add ARIA roles to all filter/toggle chips (G.2)
3. Fix the tab navigation to unmount inactive screens (G.3)
4. Fix the Create Subject modal scroll being cut off by the tab bar (4.2)

**Sprint 2–3 (P2 — Important):** Group by theme:
- **i18n sweep:** Fix all untranslated keys across Users, Finances, Classes, Audit Logs (G.5)
- **Empty states:** Design and implement contextual empty states with icons + CTAs (G.4)
- **Loading states:** Add skeleton/shimmer animations to all data-fetching screens (G.6)
- **Date formatting:** Standardize to locale-appropriate format everywhere (G.7)
- **Login form:** Inline validation, password requirements, show/hide toggle

**Backlog (P3 — Polish):** Grammar fixes, currency formatting, "Today" button, label casing, layout tweaks.
