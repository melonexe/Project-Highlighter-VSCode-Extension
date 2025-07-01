# Line Highlighter

Highlight and manage important lines or blocks in your code with persistent, per-file storage and a powerful sidebar overview.

## Features

- **Highlight lines or blocks**: Select lines and highlight them with a single command.
- **Persistent highlights**: Highlights are saved per file and restored when you reopen your project.
- **Sidebar overview**: View all highlighted blocks in the current file and across your entire workspace.
- **Block management**: Reveal or remove any highlighted block directly from the sidebar.
- **Rename blocks**: Assign custom names to highlighted blocks for easy reference.
- **Cyan highlight color**: Uses a subtle, readable cyan highlight for minimal distraction.


## Usage

1. **Highlight lines**: Select one or more lines and run the `Highlight Current Line` command from the Command Palette or context menu.
2. **Remove highlight**: Select highlighted lines and run the `Remove Highlight from Current Line` command.
3. **Sidebar**: Open the sidebar from the activity bar to view, reveal, remove, or rename highlighted blocks.

## Requirements

No special requirements. Works out of the box in any VS Code workspace.

## Extension Settings

This extension does not add any user-configurable settings.

## Known Issues

- Highlights are not shared between different machines unless you sync your VS Code workspaceState.
- Only one highlight color (cyan) is currently supported.

## Release Notes

### 1.0.0
- Initial release: Highlight, persist, and manage blocks with sidebar overview and renaming.

---

**Enjoy using Line Highlighter!**
