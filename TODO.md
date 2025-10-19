# Sidebar Component Refactoring Plan

This document outlines the necessary steps to refactor and improve the `Sidebar.tsx` component.

## High Priority

- [ ] **Refactor to Use `useSidebar` Context:**
  - Modify child components (`ThemeControl`, `GoogleSyncControl`, etc.) to consume the `useSidebar` context directly.
  - Remove the props that are now provided by the context from the `Sidebar` component's prop list.

- [ ] **Redesign Collapsed Navigation:**
  - For `NavigationGroup` and `SecondaryMenu` in their collapsed state, replace the current "expand-in-place" behavior with a more intuitive pattern, such as a fly-out menu that appears on hover or click.

## Medium Priority

- [ ] **Simplify Responsive Logic:**
  - Consolidate all `useMediaQuery` hooks into a single, more manageable hook or a dedicated responsive utility file.
  - Explore using CSS media queries to handle more of the responsive layout changes, reducing reliance on JavaScript.

- [ ] **Standardize Spacing:**
  - Audit all components for inconsistent padding and margin classes.
  - Replace hardcoded spacing values with a consistent spacing scale from the project's design system or Tailwind theme.

## Low Priority

- [ ] **Consolidate Tooltips:**
  - In the collapsed state, remove redundant `title` attributes from elements that are already wrapped in a custom `Tooltip` component.

- [ ] **Improve `ScrollArea` Robustness:**
  - Modify the `ScrollArea` to use flexbox (`flex-grow`) to fill the available vertical space, removing the brittle `calc()`-based height calculation.
