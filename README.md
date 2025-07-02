# Line Highlighter

Highlight and manage important lines or blocks in your code with persistent, per-file storage and a powerful, customizable sidebar overview.

## Features

- **Highlight lines or blocks**: Select lines and highlight them with a single command.
- **Multiple highlight colors**: Choose from several preset colors for different blocks.
- **Adjustable opacity**: Use the sidebar slider to change highlight transparency in real time.
- **Persistent highlights**: Highlights are saved per file and restored when you reopen your project.
- **Sidebar overview**: View all highlighted blocks in the current file and across your entire workspace.
- **Block management**: Reveal or remove any highlighted block directly from the sidebar.
- **Rename blocks**: Assign custom names to highlighted blocks for easy reference.
- **Color-coded block labels**: Block labels in the sidebar are colored to match their highlight for instant visual association.

## Usage

1. **Highlight lines**: Select one or more lines and run the `Highlight Current Line` command from the Command Palette or context menu.
2. **Remove highlight**: Select highlighted lines and run the `Remove Highlight from Current Line` command.
3. **Sidebar**: Open the sidebar from the activity bar to:
   - View, reveal, remove, or rename highlighted blocks.
   - Change the highlight color for new highlights.
   - Adjust highlight opacity with the slider.
   - Instantly see which color is used for each block in the sidebar.

## Requirements

No special requirements. Works out of the box in any VS Code workspace.

## Extension Settings

This extension does not add any user-configurable settings.

## Known Issues

- Highlights are not shared between different machines unless you sync your VS Code workspaceState.

## Release Notes

### 0.0.2
- Added support for multiple highlight colors.
- Added opacity slider for real-time transparency adjustment.
- Sidebar block labels now use the highlight color for instant recognition.
- Improved sidebar block management and visual feedback.

### 0.0.1
- Initial release: Highlight, persist, and manage blocks with sidebar overview and renaming.

---

**Enjoy using Line Highlighter!**
