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

```
src/
├── components/          # All UI components (66+ components)
│   ├── ui/              # shadcn/ui primitives (DO NOT MODIFY)
│   └── dashboard/       # Dashboard-specific components
├── hooks/               # Custom React hooks (14 hooks)
├── context/             # React Context providers (7 providers)
├── lib/                 # Utility libraries (11+ utilities)
├── services/            # Business logic services (17 services)
├── sections/            # Page-level view components (14 sections)
├── types/               # Additional type modules
├── utils/               # String/data utilities
└── types.ts             # Core type definitions
```

---

## 🎨 Reusable UI Components

> [!CAUTION]
> **NEVER create new UI primitives when existing ones cover your use case!**
> Always check this list FIRST before creating any new component.

### Shadcn/UI Primitives (DO NOT RECREATE)

Located in `src/components/ui/` - Use these AS-IS:

| Component | Import Path | Usage |
|-----------|-------------|-------|
| `Alert` | `@/components/ui/alert` | System messages, warnings |
| `Avatar` | `@/components/ui/avatar` | User profile images |
| `Badge` | `@/components/ui/badge` | Status indicators, tags |
| `Button` | `@/components/ui/button` | All button interactions |
| `Calendar` | `@/components/ui/calendar` | Date picking UI |
| `Popover` | `@/components/ui/popover` | Floating content panels |
| `ScrollArea` | `@/components/ui/scroll-area` | Custom scrollable areas |
| `Select` | `@/components/ui/select` | Dropdown selections |
| `Separator` | `@/components/ui/separator` | Visual dividers |
| `Sonner` | `@/components/ui/sonner` | Toast notifications |
| `Spinner` | `@/components/ui/spinner` | Loading states |
| `Toggle` | `@/components/ui/toggle` | Toggle buttons |

### Application Components (REUSE THESE)

| Component | File | Purpose |
|-----------|------|---------|
| `Modal` | `Modal.tsx` | **Base modal wrapper - USE FOR ALL MODALS** |
| `Button` | `Button.tsx` | Extended button with variants |
| `LiquidButton` | `LiquidButton.tsx` | Animated premium button |
| `MagicCard` | `MagicCard.tsx` | Interactive card with effects |
| `LoadingSpinner` | `LoadingSpinner.tsx` | App-wide loading indicator |
| `SkeletonLoader` | `SkeletonLoader.tsx` | Content placeholder |
| `EmptyState` | `EmptyState.tsx` | Empty data displays |
| `ErrorElement` | `ErrorElement.tsx` | Error boundary fallback |
| `DatePicker` | `DatePicker.tsx` | **Standard date picker** |
| `FileUploader` | `FileUploader.tsx` | **Standard file upload** |
| `Checkbox` | `Checkbox.tsx` | Custom checkbox |
| `CheckboxButton` | `CheckboxButton.tsx` | Button-style checkbox |
| `InfoTooltip` | `InfoTooltip.tsx` | Hover information tips |
| `CopyButton` | `CopyButton.tsx` | Copy-to-clipboard button |
| `AnimatedNumber` | `AnimatedNumber.tsx` | Number animations |
| `HighlightMatches` | `HighlightMatches.tsx` | Search result highlighting |
| `StatDisplayCard` | `StatDisplayCard.tsx` | Statistics display cards |
| `BarChart` | `BarChart.tsx` | Bar chart visualization |
| `DonutChart` | `DonutChart.tsx` | Donut chart visualization |
| `DistrictTrendChart` | `DistrictTrendChart.tsx` | Trend line charts |
| `ParsingIndicator` | `ParsingIndicator.tsx` | Processing status |
| `SyncStatusIndicator` | `SyncStatusIndicator.tsx` | Sync status display |
| `CommandPalette` | `CommandPalette.tsx` | Quick action palette |
| `Sidebar` | `Sidebar.tsx` | App navigation sidebar |
| `MobileHeader` | `MobileHeader.tsx` | Mobile navigation header |
| `NotificationsPopover` | `NotificationsPopover.tsx` | Notification dropdown |
| `PopoverProfile` | `PopoverProfile.tsx` | User profile popover |
| `ChatInterface` | `ChatInterface.tsx` | AI chat interface |
| `ReportGenerator` | `ReportGenerator.tsx` | Report generation UI |
| `MemberSelect` | `MemberSelect.tsx` | Member selection dropdown |

### Modal Components (Extend `Modal.tsx`)

| Modal Component | Purpose |
|-----------------|---------|
| `AddAssemblyModal` | Add new assembly |
| `AddNewMemberModal` | Add new member |
| `AmountEntryModal` | Tithe amount entry |
| `AssemblySelectionModal` | Assembly picker |
| `ClearWorkspaceModal` | Workspace reset confirm |
| `CreateTitheListModal` | New tithe list |
| `EditMemberModal` | Edit member details |
| `FullTithePreviewModal` | Tithe list preview |
| `ImageVerificationModal` | Image verification |
| `MembershipReconciliationModal` | Data reconciliation |
| `UpdateMasterListConfirmModal` | Master list update |
| `ValidationReportModal` | Validation results |

---

## 🪝 Custom Hooks

> [!IMPORTANT]
> **ALWAYS check if a hook exists before implementing similar logic!**
> These hooks encapsulate complex reusable logic.

| Hook | File | Purpose | When to Use |
|------|------|---------|-------------|
| `useDebounce` | `useDebounce.ts` | Debounce any value | Search inputs, form validation |
| `useModal` | `useModal.ts` | Simple modal state | Single modal control |
| `useModals` | `useModals.ts` | Multiple modal state | Complex modal flows |
| `useOnlineStatus` | `useOnlineStatus.ts` | Network status | Offline-first features |
| `usePWAFeatures` | `usePWAFeatures.ts` | PWA capabilities | Install prompts, updates |
| `useThemePreferences` | `useThemePreferences.ts` | Theme management | Dark/light mode |
| `useFavorites` | `useFavorites.ts` | Favorites CRUD | Workspace snapshots |
| `useGemini` | `useGemini.ts` | Gemini AI integration | AI features |
| `useGoogleDriveQuery` | `useGoogleDriveQuery.ts` | Drive data queries | Read Drive data |
| `useGoogleDriveSync` | `useGoogleDriveSync.ts` | Drive sync operations | Sync to Drive |
| `useMemberDatabase` | `useMemberDatabase.ts` | Member data CRUD | Member operations |
| `useTitheProcessor` | `useTitheProcessor.ts` | Tithe processing | Tithe workflows |
| `useWorkspace` | `useWorkspace.ts` | Workspace state | Main app state |
| `useCommandPaletteHotkeys` | `useCommandPaletteHotkeys.ts` | Keyboard shortcuts | Global hotkeys |

---

## 🎭 Context Providers

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
| `imageProcessor.ts` | Image OCR processing |
| `imageValidator.ts` | Image validation |
| `handwritingLearning.ts` | Handwriting recognition |
| `memberOrderService.ts` | Member ordering logic |
| `reconciliation.ts` | Data reconciliation |
| `titheList.ts` | Tithe list operations |
| `filters.ts` | Data filtering |
| `offline-analytics.ts` | Offline analytics |

### Service Subdirectories
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
