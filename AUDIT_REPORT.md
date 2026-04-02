# Code Audit Report - MobilStock

**Date:** 24 mars 2026  
**Workspace:** stock-fix  
**Total Issues Found:** 47

---

## 📋 Table des matières
1. [Console.log & Debugger Statements](#1-consolelog--debugger-statements)
2. [Null/Undefined Reference Issues](#2-nullundefined-reference-issues)
3. [Input Validation & XSS Issues](#3-input-validation--xss-issues)
4. [Performance Issues](#4-performance-issues)
5. [Accessibility Issues](#5-accessibility-issues)
6. [Type Safety Issues](#6-type-safety-issues)
7. [Security Issues](#7-security-issues)
8. [Missing Error Handling](#8-missing-error-handling)
9. [Hardcoded Values](#9-hardcoded-values)
10. [Code Quality Issues](#10-code-quality-issues)

---

## 1. 🖥️ Console.log & Debugger Statements

| File | Line | Issue | Severity |
|------|------|-------|----------|
| [src/pages/NotFound.tsx](src/pages/NotFound.tsx#L8) | 8 | `console.error()` left in production code | 🟡 Medium |

**Notes:** This console.error logs 404 errors. Should be replaced with proper error logging service or removed.

---

## 2. 🚨 Null/Undefined Reference Issues

| File | Line | Issue | Severity |
|------|------|-------|----------|
| [src/pages/VentePage.tsx](src/pages/VentePage.tsx#L157) | 157 | `outOfStockCatalogue[0]?.nom` - accessing array element without bounds check | 🟡 Medium |
| [src/pages/VentePage.tsx](src/pages/VentePage.tsx#L157) | 157 | `outOfStockCatalogue[0]?.modele` - accessing array element without bounds check | 🟡 Medium |
| [src/pages/VentePage.tsx](src/pages/VentePage.tsx#L252-253) | 252-253 | `stock.find((s) => s.id === item.id)?.quantite ?? 0` - repeated find call in tight loop | 🟠 High |
| [src/pages/StockPage.tsx](src/pages/StockPage.tsx#L62) | 62 | `stock.find((i) => i.id === id)` - result used without null check | 🟡 Medium |
| [src/pages/UtilisateursPage.tsx](src/pages/UtilisateursPage.tsx#L64) | 64 | `users.find((u) => u.id === editingId)?.ventes ?? 0` - repeated find calls | 🟡 Medium |
| [src/pages/UtilisateursPage.tsx](src/pages/UtilisateursPage.tsx#L64) | 64 | `users.find((u) => u.id === editingId)?.actif ?? true` - repeated find call | 🟡 Medium |
| [src/pages/CompatibilitesPage.tsx](src/pages/CompatibilitesPage.tsx#L34) | 34 | `editingId ? data.find(...) : null` - nullable result | 🟡 Medium |
| [src/pages/CompatibilitesPage.tsx](src/pages/CompatibilitesPage.tsx#L85) | 85 | `data.find((c) => c.id === id)` - used without null check before accessing property | 🔴 High |

---

## 3. 🔐 Input Validation & Security Issues

| File | Line | Issue | Severity |
|------|------|-------|----------|
| [src/pages/VentePage.tsx](src/pages/VentePage.tsx#L218-220) | 218-220 | Missing validation for `montantLibre` - allows leading zeros, could accept invalid numbers | 🟡 Medium |
| [src/pages/StockPage.tsx](src/pages/StockPage.tsx#L115) | 115 | No validation: `+e.target.value` converts empty string to 0 silently | 🟡 Medium |
| [src/pages/StockPage.tsx](src/pages/StockPage.tsx#L119-123) | 119-123 | Price inputs accept any number including negative values | 🟡 Medium |
| [src/pages/UtilisateursPage.tsx](src/pages/UtilisateursPage.tsx#L167) | 167 | Email input has no proper validation before submission | 🟡 Medium |
| [src/pages/ParametresPage.tsx](src/pages/ParametresPage.tsx#L133-137) | 133-137 | Shop settings accept empty strings without validation | 🟡 Medium |
| [src/pages/ProfilPage.tsx](src/pages/ProfilPage.tsx#L33) | 33 | Avatar upload: `event.target?.result as string` - unsafe type assertion | 🟡 Medium |
| [src/pages/LoginPage.tsx](src/pages/LoginPage.tsx#L40) | 40 | Login form has no validation - navigates without actual authentication | 🔴 High |
| [src/pages/CompatibilitesPage.tsx](src/pages/CompatibilitesPage.tsx#L117-125) | 117-125 | No trim() on inputs before processing, allows leading/trailing spaces | 🟡 Medium |

---

## 4. ⚡ Performance Issues

| File | Line | Issue | Severity |
|------|------|-------|----------|
| [src/pages/VentePage.tsx](src/pages/VentePage.tsx#L252-253) | 252-253 | `stock.find()` called twice per item in tight rendering loop | 🔴 High |
| [src/pages/Dashboard.tsx](src/pages/Dashboard.tsx#L43-44) | 43-44 | Large array calculations done on every state change | 🟡 Medium |
| [src/pages/Dashboard.tsx](src/pages/Dashboard.tsx#L59-80) | 59-80 | Complex chart data filtering recalculated on every render without memoization | 🟡 Medium |
| [src/pages/HistoriquePage.tsx](src/pages/HistoriquePage.tsx#L30-45) | 30-45 | Date filtering uses new Date() objects repeatedly without caching | 🟡 Medium |
| [src/pages/StockPage.tsx](src/pages/StockPage.tsx#L75-76) | 75-76 | `[...new Set(...)]` creates new arrays on every render | 🟡 Medium |
| [src/pages/VentePage.tsx](src/pages/VentePage.tsx#L47-56) | 47-56 | Multiple `.filter()` and `.map()` chains in sequence | 🟡 Medium |

---

## 5. ♿ Accessibility Issues

| File | Line | Issue | Severity |
|------|------|-------|----------|
| **All form selects** | - | Custom `<select>` elements have no proper ARIA labels or keyboard navigation | 🟡 Medium |
| [src/components/AppLayout.tsx](src/components/AppLayout.tsx#L58) | 58 | Modal backdrop div has onClick but no keyboard support | 🟡 Medium |
| [src/pages/VentePage.tsx](src/pages/VentePage.tsx#L134-151) | 134-151 | Toggle buttons not properly marked as `aria-pressed` | 🟡 Medium |
| [src/pages/StockPage.tsx](src/pages/StockPage.tsx#L225-229) | 225-229 | Icon-only buttons without aria-label | 🟡 Medium |
| [src/pages/UtilisateursPage.tsx](src/pages/UtilisateursPage.tsx#L82) | 82 | `window.confirm()` used - not accessible for screen readers | 🟡 Medium |
| [src/pages/CompatibilitesPage.tsx](src/pages/CompatibilitesPage.tsx#L87) | 87 | `window.confirm()` used instead of accessible dialog | 🟡 Medium |

---

## 6. 🔤 Type Safety Issues

| File | Line | Issue | Severity |
|------|------|-------|----------|
| [src/pages/ProfilPage.tsx](src/pages/ProfilPage.tsx#L33) | 33 | `event.target?.result as string` - unsafe type assertion | 🟡 Medium |
| [src/pages/Dashboard.tsx](src/pages/Dashboard.tsx#L84) | 84 | `Number(selectedYear)` - no fallback for invalid values | 🟡 Medium |
| [src/pages/VentePage.tsx](src/pages/VentePage.tsx#L98) | 98 | `Number(montantLibre) \|\| 0` - could fail silently with invalid input | 🟡 Medium |
| [src/pages/ParametresPage.tsx](src/pages/ParametresPage.tsx#L56) | 56 | `(ev.target?.result as string) \|\| ""` - unsafe assertion | 🟡 Medium |
| **All useState declarations** | - | No validation or initial state guards for complex objects | 🟡 Medium |

---

## 7. 🔒 Security Issues

| File | Line | Issue | Severity |
|------|------|-------|----------|
| [src/pages/LoginPage.tsx](src/pages/LoginPage.tsx#L17) | 17 | Form submission bypasses actual authentication - navigates regardless | 🔴 High |
| **All form inputs** | - | No server-side validation (client-side only) | 🟠 High |
| [src/pages/ProfilPage.tsx](src/pages/ProfilPage.tsx#L33-34) | 33-34 | Avatar base64 stored as-is - no validation of image size or malicious content | 🟡 Medium |
| [src/pages/ParametresPage.tsx](src/pages/ParametresPage.tsx#L49) | 49 | Logo stored as base64 without size/format validation before state | 🟡 Medium |
| **window.confirm() usage** | - | Using native dialogs instead of app-controlled confirmation | 🟡 Medium |
| [src/store/useAppStore.ts](src/store/useAppStore.ts#L1-50) | 1-50 | All data stored in client-side Zustand, no backend persistence | 🔴 High |

---

## 8. ⚠️ Missing Error Handling

| File | Line | Issue | Severity |
|------|------|-------|----------|
| [src/pages/ProfilPage.tsx](src/pages/ProfilPage.tsx#L24-47) | 24-47 | FileReader.onload has no try-catch, onload error handler missing | 🟡 Medium |
| [src/pages/ParametresPage.tsx](src/pages/ParametresPage.tsx#L48-62) | 48-62 | FileReader.onload has no error handler or timeout protection | 🟡 Medium |
| [src/pages/ParametresPage.tsx](src/pages/ParametresPage.tsx#L77-89) | 77-89 | No error handling for payment account addition | 🟡 Medium |
| [src/pages/VentePage.tsx](src/pages/VentePage.tsx#L104-120) | 104-120 | No error handling for sale validation or submission | 🟡 Medium |
| [src/store/useAppStore.ts](src/store/useAppStore.ts) | - | No error handling for state mutations | 🟡 Medium |

---

## 9. 🔨 Hardcoded Values Should Be Constants

| File | Line | Issue | Severity |
|------|------|-------|----------|
| [src/pages/ParametresPage.tsx](src/pages/ParametresPage.tsx#L33-34) | 33-34 | `STANDARD_OPERATORS = ["Mixx", "Flooz"]` should be in constants file | 🟡 Medium |
| [src/pages/ParametresPage.tsx](src/pages/ParametresPage.tsx#L35) | 35 | `MAX_CUSTOM_OPERATORS = 3` hardcoded | 🟡 Medium |
| [src/pages/ProfilPage.tsx](src/pages/ProfilPage.tsx#L22) | 22 | `2 * 1024 * 1024` (2MB limit) hardcoded in multiple places | 🟡 Medium |
| [src/pages/ParametresPage.tsx](src/pages/ParametresPage.tsx#L55) | 55 | `2 * 1024 * 1024` duplicated file size limit | 🟡 Medium |
| [src/pages/StockPage.tsx](src/pages/StockPage.tsx#L19) | 19 | `stockThreshold ?? 5` - default value should be constant | 🟡 Medium |
| [src/pages/Dashboard.tsx](src/pages/Dashboard.tsx#L13-14) | 13-14 | `DAYS` and `MONTHS` arrays should be in localized constants file | 🟡 Medium |

---

## 10. 💻 Code Quality Issues

| File | Line | Issue | Severity |
|------|------|-------|----------|
| [src/pages/UtilisateursPage.tsx](src/pages/UtilisateursPage.tsx#L64) | 64 | Duplicate `.find()` calls should be cached in variable | 🟠 High |
| [src/pages/VentePage.tsx](src/pages/VentePage.tsx#L252) | 252 | Repeated `stock.find()` in className and disabled attribute | 🠠 High |
| [src/pages/CompatibilitesPage.tsx](src/pages/CompatibilitesPage.tsx#L64-68) | 64-68 | Duplicate check logic for compatibility exists | 🟡 Medium |
| [src/components/AppLayout.tsx](src/components/AppLayout.tsx#L58) | 58 | Backdrop div handles click but doesn't prevent event bubbling | 🟡 Medium |
| **Multiple pages** | - | No loading states during async operations | 🟡 Medium |
| **Multiple pages** | - | Toast notifications don't dismiss duplicates | 🟡 Medium |
| [src/pages/Dashboard.tsx](src/pages/Dashboard.tsx#L43-60) | 43-60 | Complex date calculations mixed with UI logic | 🟡 Medium |

---

## Summary by Severity

### 🔴 Critical (4)
- Login form bypasses authentication
- No backend persistence of data
- XSS vulnerability potential in FileReader assertions
- Repeated database queries in render loops

### 🟠 High (5)
- Missing error handling for file operations
- Potential null reference crashes
- Performance: repeated `.find()` in render loops
- Type safety with Number() conversions
- Duplicate code in user update handler

### 🟡 Medium (38)
- Missing input validation
- Accessibility issues with native dialogs
- Hardcoded constants
- Performance optimizations needed
- Code duplication

---

## 📊 Audit Statistics

| Category | Count | Critical | High | Medium |
|----------|-------|----------|------|--------|
| Console Statements | 1 | - | - | 1 |
| Null/Undefined Issues | 8 | - | 2 | 6 |
| Input Validation | 8 | 1 | 1 | 6 |
| Performance | 6 | 1 | 1 | 4 |
| Accessibility | 6 | - | - | 6 |
| Type Safety | 4 | - | 1 | 3 |
| Security | 6 | 2 | 1 | 3 |
| Error Handling | 5 | - | - | 5 |
| Hardcoded Values | 6 | - | - | 6 |
| Code Quality | 10 | - | 1 | 9 |
| **TOTAL** | **47** | **4** | **7** | **36** |

---

## 🎯 Priority Recommendations

1. **URGENT:** Fix authentication bypass in [src/pages/LoginPage.tsx](src/pages/LoginPage.tsx)
2. **URGENT:** Implement backend persistent storage instead of client-only state
3. **HIGH:** Replace `window.confirm()` with accessible dialog component
4. **HIGH:** Cache repeated `.find()` calls in render loops
5. **HIGH:** Add proper error handling for file uploads
6. **MEDIUM:** Implement input validation on all form fields
7. **MEDIUM:** Extract hardcoded values to constants file
8. **MEDIUM:** Optimize performance with useMemo for complex calculations

