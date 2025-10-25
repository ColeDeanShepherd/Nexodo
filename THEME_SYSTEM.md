# Theme System Documentation

## Overview

The Nexodo application now supports both light and dark themes with automatic system preference detection and manual theme switching.

## Features

### Automatic System Detection
- The application automatically detects your system's preferred color scheme (light/dark mode)
- On first visit, it will apply the appropriate theme based on your system settings
- If your system theme changes while using the app, it will automatically update (unless you've manually set a preference)

### Manual Theme Toggle
- Click the theme toggle button (🌙/☀️) in the header to manually switch between light and dark modes
- Your preference is saved locally and will persist across browser sessions
- Manual preferences override automatic system detection

### Cross-Page Consistency
- Theme preferences are synchronized across all pages (login, main app, flashcards)
- The selected theme is maintained when navigating between different sections

## Implementation Details

### CSS Variables
The theme system uses CSS custom properties (variables) for consistent theming:

```css
:root {
  --primary-color: #3498db;
  --text-color: #333;
  --background-color: #f5f7fa;
  --surface-color: #ffffff;
  /* ... more variables */
}
```

### Theme Classes
- `[data-theme="light"]` - Forces light theme
- `[data-theme="dark"]` - Forces dark theme
- When no data-theme attribute is set, the system uses `@media (prefers-color-scheme: dark)` for automatic detection

### JavaScript API
The `ThemeManager` class provides programmatic theme control:

```javascript
// Get current theme
const theme = window.themeManager.getTheme();

// Set specific theme
window.themeManager.setTheme('dark');

// Toggle between themes
window.themeManager.toggleTheme();
```

## Browser Support

- **System Detection**: Works in all modern browsers that support `prefers-color-scheme` media query
- **Manual Toggle**: Works in all browsers with CSS custom property support
- **Fallback**: Gracefully degrades to light theme in older browsers

## File Structure

- `theme.js` - Core theme management logic
- `styles.css` - CSS variables and theme-aware styles
- Theme variables are also included inline in `login.html` for the Svelte login component

## Customization

To customize theme colors, modify the CSS variables in the `:root` selector and corresponding theme-specific sections in `styles.css` and `login.html`.