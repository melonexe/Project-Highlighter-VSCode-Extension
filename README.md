# Project Highlighter (Line Highlighter)

Project Highlighter helps you mark, manage and export important lines or blocks across your workspace. Highlights persist per-file and are surfaced in a Webview sidebar with rich management and copy/export features.

Current extension version: 0.2.0

## Highlights — what it does

### Core
- Persistent line and block highlights (saved per file)
- Five preset highlight colors (Cyan, Yellow, Green, Pink, Orange)
- Adjustable opacity for all highlights from the sidebar
- Minimap/overview ruler markers for highlighted blocks

### Timestamps
- The extension attempts to extract a timestamp from each highlighted block (several common timestamp formats are recognized). When present, the timestamp is shown next to the block entry in the sidebar.
- Sidebar lists (current file and all files) are sorted by timestamp when timestamps are available, making it easy to view highlights in chronological order.

### Copy & Export
- Copy all highlighted lines by color (current file)
- Copy all highlighted lines from current file
- Copy highlighted lines across all files in the workspace (VS Code search-style formatting)
- Copy individual blocks directly from the sidebar
- Copy-all-as-Markdown: exported Markdown uses `###` file headers for compact, readable reports

### SSRC / RTP Analysis (mostly for my personal use case)
- New command: "Calculate SSRC stats" (right-click on an RTP/log line or run from the Command Palette). Parses common log lines that contain a `syncBlockTS` and `rtpTimestamp` and computes signed differences (samples, packets, seconds, milliseconds).
- Prompts for sample rate (e.g., 48000 or 96000) and packet time (e.g., 125µs or 1000µs) and shows a detailed report in the "SSRC Stats" Output channel.

### Sidebar Management
- Full overview of highlighted blocks for the current file and across your workspace
- Reveal, remove, rename, or copy any highlighted block from the sidebar UI
- Color-coded labels in the sidebar match the highlight color for instant visual association
- Hide highlights: a "Hide highlights" checkbox in the sidebar hides decorations in the editor (state persists in workspaceState)

## Usage

1. Highlight lines: select lines and press `Ctrl+Shift+H`, or right-click → "Highlight Selected Lines", or run the `Highlight Current Line` command from the Command Palette.
2. Remove highlights: select highlighted lines and right-click → "Remove Highlight from Selected Lines" or run the matching command.
3. Open the Line Highlighter sidebar from the Activity Bar to manage colors, opacity, block names, copy/export, and to toggle the "Hide highlights" checkbox.
4. Run "Calculate SSRC stats": place the cursor on a log line that contains `syncBlockTS` and `rtpTimestamp`, right-click and choose "Calculate SSRC stats" (or run the command), then choose sample rate and packet time when prompted. The output appears in the "SSRC Stats" Output channel.

## Requirements

No special requirements — works in any VS Code workspace.

## Extension Settings

This extension does not add any configurable user settings; UI state (like the "Hide highlights" checkbox) is persisted in workspaceState.

## Known Limitations

- Timestamp extraction recognizes several common formats but may not catch every custom log format.
- Highlights are stored in VS Code `workspaceState` and are not automatically synced between machines unless you use VS Code Settings Sync for workspace state.

## Release Notes

### 0.2.0
- Added timestamp extraction for highlighted blocks and timestamp display in the sidebar (pale blue-cyan styling).
- Sidebar lists now sort entries by timestamp when available.
- Added a "Hide highlights" checkbox in the sidebar and `line-highlighter.toggleHideHighlights` command (keybinding: Ctrl+Alt+H) to quickly show/hide decorations.
- Added "Calculate SSRC stats" command to parse `syncBlockTS` and `rtpTimestamp` from log lines, prompt for sample rate and packet time, and produce a signed-differences report in an Output channel.
- Copy-as-Markdown now uses `###` file headers for exported content.

### 0.1.0
- Core highlighting, persistent per-file highlights, multiple colors, opacity control, and sidebar management.

### 0.0.4
- Added assignable keybind functions

### 0.0.2
- Added support for multiple highlight colors and opacity slider

### 0.0.1
- Initial release

---

Enjoy using Project Highlighter!
