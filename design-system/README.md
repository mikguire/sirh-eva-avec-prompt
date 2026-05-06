# EVA Design System MVP Kit

Kit frontend autonome pour lancer les composants RH prioritaires d'EVA.

## Structure

```text
design-system/
  src/
    components/
      mvp/
        DataList.tsx
        DatePicker.tsx
        EmployeeCard.tsx
        HRForm.tsx
        MobileDataTable.tsx
        StatusBadge.tsx
        TextInput.tsx
        ToastNotification.tsx
        ValidationModal.tsx
        __tests__/
        __stories__/
      shared/
        FormField.tsx
    patterns/
      validation.ts
    tokens/
      theme.ts
    types.ts
    index.ts
```

## MVP inclus

- `TextInput`
- `DatePicker`
- `HRForm`
- `StatusBadge`
- `EmployeeCard`
- `ValidationModal`
- `ToastNotification`
- `DataList`
- `MobileDataTable`

## Composants partages

- `FormField`
- Types metier communs (`EmployeeSummary`, `EmployeeStatus`, `ColumnDef`, etc.)
- Tokens de theme (`evaColors`, `evaRadius`, `evaSpacing`)
- Patterns de validation (`patterns`, `isRequired`, `validateDateRange`)

## Integration rapide

1. Ajouter ce dossier dans un frontend React TypeScript.
2. Installer les dependances UI:
   - `react`
   - `@testing-library/react` (tests)
   - `@storybook/react` (stories)
3. Importer via:

```ts
import { EmployeeCard, HRForm, StatusBadge } from "@/design-system/src";
```

## Conventions qualite

- Accessibilite: labels explicites, `aria-invalid`, `role="dialog"`, `aria-live`.
- Validation: pattern cote client + extension possible cote API.
- Etats: loading/empty/error presents sur chaque composant de donnees.
- Responsive: composant `MobileDataTable` optimise mobile-first.
