# Static Resources Guide

## Where to Put Images and Other Resources

### 1. `src/assets/` (Recommended for Component Images)

**Use for:**
- Images imported in React components
- Icons and logos
- Images that need optimization
- Images referenced in CSS/JSX

**How to use:**
```tsx
import logo from '../assets/logo.png';
import heroImage from '../assets/hero-image.jpg';

<img src={logo} alt="Logo" />
```

**Benefits:**
- Vite processes and optimizes them
- Automatic file hashing for cache busting
- TypeScript support
- Tree-shaking (unused assets removed)

### 2. `public/` (For Root-Level Files)

**Use for:**
- Favicon (`favicon.ico`)
- `robots.txt`
- Large files that don't need processing
- Files referenced by absolute paths

**How to use:**
```tsx
// Reference directly (no import needed)
<img src="/favicon.ico" alt="Favicon" />
```

**Note:** Files in `public/` are copied as-is to the build output.

## Recommended Structure

```
src/
  assets/
    images/
      logo.png
      hero-bg.jpg
      icons/
        icon-1.svg
        icon-2.svg
    fonts/
      custom-font.woff2
public/
  favicon.ico
  robots.txt
```

## Current Project

For this ArtZyla project:
- **Component images** → `src/assets/images/`
- **Icons** → `src/assets/images/icons/`
- **Favicon** → `public/favicon.ico`
- **User-uploaded images** → Already handled by backend (`backend/uploads/`)

