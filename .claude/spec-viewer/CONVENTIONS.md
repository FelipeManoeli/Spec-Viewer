# spec-viewer conventions

This file is read by `/spec-sync` every run. Tell Claude how your project works
so generated specs match your code conventions.

## Selector key
We use `data-testid` for test selectors.

## Validation library
We use zod. Schemas live alongside form components.

## Permission model
Describe your permission check pattern (e.g., `can('write', 'contacts')`).

## Elements to skip
- Storybook-only components
- Dev-tools panels
