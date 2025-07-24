# Line Highlighter

Highlight and manage important lines or blocks in your code with persistent, per-file storage, powerful copy functionality, and a comprehensive sidebar overview.

## Features

### Core Highlighting
- **Highlight lines or blocks**: Select lines and highlight them with a single command or keyboard shortcut
- **Multiple highlight colors**: Choose from 5 preset colors (Cyan, Yellow, Green, Pink, Orange) for different blocks
- **Adjustable opacity**: Use the sidebar slider to change highlight transparency in real time
- **Persistent highlights**: Highlights are saved per file and restored when you reopen your project
- **Minimap integration**: Highlighted blocks appear in the overview ruler for easy navigation when scrolling

### Advanced Copy Functionality
- **Copy by color**: Copy all highlighted lines of a specific color from the current file
- **Copy current file**: Copy all highlighted lines from the active file
- **Copy all files**: Copy highlighted lines from every file in your workspace with VS Code search-style formatting
- **Individual block copy**: Copy specific highlighted blocks directly from the sidebar
- **Smart formatting**: Copied content includes file headers and maintains proper line organization

### Sidebar Management
- **Comprehensive overview**: View all highlighted blocks in the current file and across your entire workspace
- **Block management**: Reveal, remove, rename, or copy any highlighted block directly from the sidebar
- **Custom block names**: Assign custom names to highlighted blocks for easy reference
- **Color-coded labels**: Block labels in the sidebar are colored to match their highlight for instant visual association
- **Individual copy buttons**: Each block has its own copy button for granular control

### Keyboard & Context Integration
- **Default keyboard shortcut**: `Ctrl+Shift+H` to highlight selected lines
- **Context menu integration**: Right-click to access highlight, remove, and copy functions
- **Command palette**: All functions available through VS Code's command palette

## Usage

### Basic Highlighting
1. **Highlight lines**: Select one or more lines and:
   - Press `Ctrl+Shift+H` (default keyboard shortcut)
   - Right-click and select "Highlight Selected Lines" from the context menu
   - Run the `Highlight Current Line` command from the Command Palette

2. **Remove highlights**: Select highlighted lines and:
   - Right-click and select "Remove Highlight from Selected Lines"
   - Run the `Remove Highlight from Current Line` command from the Command Palette

### Copy Functionality
3. **Copy highlighted content**:
   - **By color**: Right-click → "Copy Highlighted Lines" → "By Color" or use sidebar button
   - **Current file**: Right-click → "Copy Highlighted Lines" → "Current File" or use sidebar button
   - **All files**: Right-click → "Copy Highlighted Lines" → "All Files" or use sidebar button
   - **Individual blocks**: Click the "Copy" button next to any block in the sidebar

### Sidebar Management
4. **Using the sidebar**: Open the Line Highlighter sidebar from the activity bar to:
   - **Change colors**: Click color buttons to set the highlight color for new highlights
   - **Adjust opacity**: Use the slider to change transparency of all highlights
   - **View blocks**: See all highlighted blocks organized by current file and all files
   - **Manage blocks**: Click block labels to reveal them in the editor
   - **Copy blocks**: Use individual copy buttons for granular copying
   - **Remove blocks**: Use remove buttons to delete specific blocks
   - **Rename blocks**: Type in the name field to assign custom names to blocks

## Requirements

No special requirements. Works out of the box in any VS Code workspace.

## Extension Settings

This extension does not add any user-configurable settings.

## Known Issues

- Highlights are not shared between different machines unless you sync your VS Code workspaceState
- Overview ruler markers use the highlight color but may appear slightly different due to VS Code's rendering

## Release Notes

### 0.1.0
- **Major Feature Release**: Comprehensive copy functionality
- Added copy by color, current file, and all files with VS Code search-style formatting
- Implemented individual block copy buttons in sidebar
- Integrated context menu with copy submenu
- Added overview ruler integration for minimap visibility
- Enhanced sidebar with individual copy and management controls

### 0.0.4
- Added assignable keybind functions

### 0.0.2
- Added support for multiple highlight colors
- Added opacity slider for real-time transparency adjustment
- Sidebar block labels now use the highlight color for instant recognition
- Improved sidebar block management and visual feedback

### 0.0.1
- Initial release: Highlight, persist, and manage blocks with sidebar overview and renaming

---

**Enjoy using Line Highlighter!**
