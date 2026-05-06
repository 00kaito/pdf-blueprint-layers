# Toolbar Refactor (May 2026)
- Tools (Select, Draw, Text, Image, Icons, Auto-Numbering) moved from Sidebar back to Top Bar (`Toolbar.tsx`) to restore \"upper part\" experience.
- Save and Export actions consolidated into clear menus in `ProjectActions.tsx`.
- `ObjectToolbar.tsx` removed as its functionality is now in the main `Toolbar`.
