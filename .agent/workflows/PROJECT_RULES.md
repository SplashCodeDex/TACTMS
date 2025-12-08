---
description: Strict project rules for TACTMS contributors - reusable components, hooks, utils, libs, and patterns
---

# 🏛️ TACTMS PROJECT RULES

> **MANDATORY READING FOR ALL CONTRIBUTORS**
> This document defines strict rules for consistency, maintainability, and efficiency across the TACTMS codebase.

---

## 📋 Table of Contents

1. [Project Architecture Overview](#project-architecture-overview)
2. [Reusable UI Components](#reusable-ui-components)
3. [Custom Hooks](#custom-hooks)
4. [Context Providers](#context-providers)
5. [Library Utilities](#library-utilities)
6. [Services](#services)
7. [Type Definitions](#type-definitions)
8. [Coding Standards](#coding-standards)
9. [Import Conventions](#import-conventions)

---

## 🏗️ Project Architecture Overview
> [!WARNING]
> **NEVER duplicate context logic! Use the centralized exports from `src/context/index.ts`**

### Import Convention
```typescript
// ✅ CORRECT - Always import from index
import { useNotificationContext, useWorkspaceContext } from '@/context';

// ❌ WRONG - Never import directly from provider files
import { useNotificationContext } from '@/context/NotificationProvider';
```

### Available Contexts

| Context | Hook | Purpose |
|---------|------|---------|
| `NotificationProvider` | `useNotificationContext`, `useToast` | Toast/notification management |
| `WorkspaceProvider` | `useWorkspaceContext` | Tithe processing state |
| `DatabaseProvider` | `useDatabaseContext` | Member database access |
| `AppConfigProvider` | `useAppConfigContext` | App configuration (assemblies, thresholds) |
| `ModalProvider` | `useModalContext` | App-wide modal state |

### Root Provider Setup
```typescript
// AppProviders.tsx wraps all providers - DO NOT create new provider wrappers
import { AppProviders } from '@/context';
```

---

## 📚 Library Utilities

> [!NOTE]
> Located in `src/lib/` - These are pure utility functions.

| Utility Module | Purpose | Key Functions |
|----------------|---------|---------------|
| `excelUtils.ts` | Excel file operations | Parsing, formatting |
| `exportUtils.ts` | Data export helpers | CSV, Excel exports |
| `pdfGenerator.ts` | PDF generation | Report PDFs |
| `reportUtils.ts` | Report calculations | Statistics, summaries |
| `dataTransforms.ts` | Data transformations | Map, filter, aggregate |
| `markdown.ts` | Markdown utilities | Parsing, rendering |
| `toast.ts` | Toast utility | `showToast()` function |
| `utils.ts` | General utilities | `cn()` for classnames |

### String Utilities (`src/utils/`)
| Function | Location | Purpose |
|----------|----------|---------|
| String manipulation | `stringUtils.ts` | Name formatting, parsing |

---

## ⚙️ Services

> [!IMPORTANT]
> Services contain business logic - REUSE before creating new ones!

| Service | Purpose |
|---------|---------|
| `AnalyticsService.ts` | Analytics tracking |
| `SyncManager.ts` | Sync orchestration |
| `analyticsCalculator.ts` | Statistics calculations |
| `excelProcessor.ts` | Excel file processing |
| `imageProcessor/` | Image OCR processing (modular) |
| `imageValidator.ts` | Image validation |
| `handwritingLearning.ts` | Handwriting recognition |
| `memberOrderService.ts` | Member ordering logic |
| `reconciliation.ts` | Data reconciliation |
| `titheList.ts` | Tithe list operations |
| `filters.ts` | Data filtering |
| `offline-analytics.ts` | Offline analytics |

### Service Subdirectories
- `services/imageProcessor/` - AI image processing modules (8 files)
- `services/ingestion/` - Data ingestion services
- `services/member/` - Member-specific services

---

## 📝 Type Definitions

> [!CAUTION]
> **ALWAYS use existing types from `src/types.ts`!**
> Never create duplicate type definitions.

### Core Types (USE THESE)
```typescript
// Member data from Excel
interface MemberRecordA { ... }

// Processed tithe record
interface TitheRecordB { ... }

// Workspace snapshot
interface FavoriteConfig { ... }

// Transaction log entry
interface TransactionLogEntry { ... }

// Member database structure
type MemberDatabase = Record<string, MasterListData>;

// App view types
type AppView = "dashboard" | "processor" | "database" | "favorites" | "reports" | "analytics" | "settings";
```

### Additional Types
```typescript
// Concatenation settings
interface ConcatenationConfig { ... }

// Auto-save draft
interface AutoSaveDraft { ... }

// Google user profile
interface GoogleUserProfile { ... }

// Reconciliation types
interface ReconciliationEntry { ... }
interface MembershipReconciliationReport { ... }

// Chat/AI types
interface ChatMessage { ... }

// Chart data
interface ChartData { ... }
```

---

## 📏 Coding Standards

### File Naming
- Components: `PascalCase.tsx` (e.g., `MemberSelect.tsx`)
- Hooks: `camelCase.ts` with `use` prefix (e.g., `useDebounce.ts`)
- Utils/Services: `camelCase.ts` (e.g., `excelUtils.ts`)
- Types: `camelCase.ts` or inline (e.g., `types.ts`)

### Component Structure
```typescript
// 1. Imports (external, then internal)
import React from 'react';
import { Button } from '@/components/ui/button';
import { useDebounce } from '@/hooks/useDebounce';

// 2. Types/Interfaces
interface MyComponentProps {
  title: string;
  onAction: () => void;
}

// 3. Component
export function MyComponent({ title, onAction }: MyComponentProps) {
  // 4. Hooks first
  const debouncedTitle = useDebounce(title, 300);

  // 5. State
  const [isOpen, setIsOpen] = React.useState(false);

  // 6. Effects
  React.useEffect(() => { ... }, []);

  // 7. Handlers
  const handleClick = () => { ... };

  // 8. Render
  return <div>...</div>;
}
```

---

## 📦 Import Conventions

### Path Aliases (USE THESE)
```typescript
// ✅ CORRECT
import { Button } from '@/components/ui/button';
import { useDebounce } from '@/hooks/useDebounce';
import { useWorkspaceContext } from '@/context';
import { cn } from '@/lib/utils';
import type { MemberRecordA } from '@/types';

// ❌ WRONG - Relative paths
import { Button } from '../../../components/ui/button';
```

### Alias Reference
| Alias | Path |
|-------|------|
| `@/components` | `src/components` |
| `@/components/ui` | `src/components/ui` |
| `@/hooks` | `src/hooks` |
| `@/lib` | `src/lib` |
| `@/context` | `src/context` |
| `@/services` | `src/services` |
| `@/utils` | `src/utils` |
| `@/types` | `src/types.ts` |

---

## ✅ Pre-Commit Checklist

Before committing ANY code, verify:

- [ ] Used existing UI components instead of creating new ones
- [ ] Used existing hooks instead of duplicating logic
- [ ] Imported types from `@/types` not redefined
- [ ] Used context from `@/context/index.ts`
- [ ] Used path aliases (`@/...`) not relative imports
- [ ] Followed file naming conventions
- [ ] Ran `npm run format` (Prettier)
- [ ] Ran `npm run lint` (ESLint)

---

## 🚨 Violations

> [!CAUTION]
> **VIOLATIONS OF THESE RULES WILL RESULT IN:**
> 1. PR rejection
> 2. Required refactoring
> 3. Code review escalation

**When in doubt, ASK before creating new components, hooks, or utilities!**

---

*Last Updated: December 5, 2025*
*Maintainer: TACTMS Core Team*
