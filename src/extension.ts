// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "line-highlighter" is now active!');

	// Key for storing highlights in workspaceState
	const HIGHLIGHT_KEY = 'line-highlighter.highlights';

	// Store the selected color in workspaceState
	const COLOR_KEY = 'line-highlighter.color';

	// Add key for storing opacity
	const OPACITY_KEY = 'line-highlighter.opacity';

	// Define available highlight colors
	const HIGHLIGHT_COLORS = [
	    { name: 'Cyan', value: 'rgba(0, 204, 255, 0.49)' },
	    { name: 'Yellow', value: 'rgba(255, 187, 0, 0.49)' },
	    { name: 'Green', value: 'rgba(0, 255, 128, 0.49)' },
	    { name: 'Pink', value: 'rgba(255, 0, 0, 0.49)' },
	    { name: 'Orange', value: 'rgba(174, 0, 255, 0.49)' }
	];

	function getHighlightColor(): string {
	    return context.workspaceState.get<string>(COLOR_KEY, HIGHLIGHT_COLORS[0].value);
	}
	function setHighlightColor(color: string) {
	    context.workspaceState.update(COLOR_KEY, color);
	}
	function getOpacity(): number {
	    return context.workspaceState.get<number>(OPACITY_KEY, 0.2);
	}
	function setOpacity(opacity: number) {
	    context.workspaceState.update(OPACITY_KEY, opacity);
	}

	// Persistent decoration types for each color
	const decorationTypes: { [color: string]: vscode.TextEditorDecorationType } = {};
	HIGHLIGHT_COLORS.forEach(c => {
	    decorationTypes[c.value] = vscode.window.createTextEditorDecorationType({
	        backgroundColor: c.value,
	        isWholeLine: true,
	        overviewRulerColor: c.value,
	        overviewRulerLane: vscode.OverviewRulerLane.Full
	    });
	});
	function createDecorationType(color: string) {
	    // Use persistent decoration type
	    if (!decorationTypes[color]) {
	        decorationTypes[color] = vscode.window.createTextEditorDecorationType({
	            backgroundColor: color,
	            isWholeLine: true,
	            overviewRulerColor: color,
	            overviewRulerLane: vscode.OverviewRulerLane.Full
	        });
	    }
	    return decorationTypes[color];
	}
	let highlightDecorationType = createDecorationType(getHighlightColor());

	function getFileKey(document: vscode.TextDocument) {
	    return document.uri.toString();
	}

	// Refactored: highlights are now stored as { line: number, color: string }[] per file
	function getHighlights(context: vscode.ExtensionContext, document: vscode.TextDocument): { line: number, color: string }[] {
	    const all = context.workspaceState.get<{ [key: string]: { line: number, color: string }[] }>(HIGHLIGHT_KEY, {});
	    return all[getFileKey(document)] || [];
	}
	function setHighlights(context: vscode.ExtensionContext, document: vscode.TextDocument, highlights: { line: number, color: string }[]) {
	    const all = context.workspaceState.get<{ [key: string]: { line: number, color: string }[] }>(HIGHLIGHT_KEY, {});
	    all[getFileKey(document)] = highlights;
	    context.workspaceState.update(HIGHLIGHT_KEY, all);
	}

	function updateAllDecorations() {
	    highlightDecorationType = createDecorationType(getHighlightColor());
	    vscode.window.visibleTextEditors.forEach(editor => updateDecorations(editor, context));
	}

	// Helper to apply opacity to rgba color string
	function withOpacity(rgba: string, opacity: number): string {
	    const match = rgba.match(/rgba?\((\d+), ?(\d+), ?(\d+)(?:, ?([\d.]+))?\)/);
	    if (!match) return rgba;
	    const [_, r, g, b] = match;
	    return `rgba(${r},${g},${b},${opacity})`;
	}

	// Update decoration types to use current opacity
	function updateAllDecorationTypes() {
	    const opacity = getOpacity();
	    Object.keys(decorationTypes).forEach(k => {
	        decorationTypes[k].dispose();
	        delete decorationTypes[k];
	    });
	    HIGHLIGHT_COLORS.forEach(c => {
	        const colorWithOpacity = withOpacity(c.value, opacity);
	        decorationTypes[colorWithOpacity] = vscode.window.createTextEditorDecorationType({
	            backgroundColor: colorWithOpacity,
	            isWholeLine: true,
	            overviewRulerColor: colorWithOpacity,
	            overviewRulerLane: vscode.OverviewRulerLane.Full
	        });
	    });
	}

	// Update decorations to use color with current opacity
	function updateDecorations(editor: vscode.TextEditor, context: vscode.ExtensionContext) {
	    const highlights = getHighlights(context, editor.document);
	    const opacity = getOpacity();
	    // Remove all decorations first
	    HIGHLIGHT_COLORS.forEach(c => {
	        const colorWithOpacity = withOpacity(c.value, opacity);
	        const deco = decorationTypes[colorWithOpacity];
	        if (deco) editor.setDecorations(deco, []);
	    });
	    const colorMap: { [color: string]: vscode.Range[] } = {};
	    highlights.forEach(h => {
	        const colorWithOpacity = withOpacity(h.color, opacity);
	        if (!colorMap[colorWithOpacity]) colorMap[colorWithOpacity] = [];
	        colorMap[colorWithOpacity].push(new vscode.Range(h.line, 0, h.line, editor.document.lineAt(h.line).text.length));
	    });
	    Object.keys(colorMap).forEach(color => {
	        const deco = decorationTypes[color];
	        if (deco) editor.setDecorations(deco, colorMap[color]);
	    });
	}

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('line-highlighter.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from Line Highlighter!');
	});

	context.subscriptions.push(disposable);
	// Keep a reference to the current webviewView
	let currentWebviewView: vscode.WebviewView | undefined;

	// Helper to get all highlights across all files (now returns { line, color }[])
	function getAllHighlights(context: vscode.ExtensionContext) {
	    const all = context.workspaceState.get<{ [key: string]: { line: number, color: string }[] }>(HIGHLIGHT_KEY, {});
	    return all;
	}
	// Helper to get all block names
	const BLOCK_NAMES_KEY = 'line-highlighter.blockNames';
	function getBlockNames(context: vscode.ExtensionContext): { [file: string]: { [blockKey: string]: string } } {
	    return context.workspaceState.get<{ [file: string]: { [blockKey: string]: string } }>(BLOCK_NAMES_KEY, {});
	}
	function setBlockName(context: vscode.ExtensionContext, file: string, blockKey: string, name: string) {
	    const all = getBlockNames(context);
	    if (!all[file]) all[file] = {};
	    all[file][blockKey] = name;
	    context.workspaceState.update(BLOCK_NAMES_KEY, all);
	}
	function blockKeyFromLines(lines: number[]): string {
	    return lines.join('-');
	}

	function tryPostHighlights() {
	    if (currentWebviewView) {
	        const editor = vscode.window.activeTextEditor;
	        if (!editor) return;
	        const highlights = getHighlights(context, editor.document).sort((a, b) => a.line - b.line || a.color.localeCompare(b.color));
	        // Group consecutive lines with the same color into blocks
	        const blocks: { lines: number[], color: string }[] = [];
	        let block: { lines: number[], color: string } | null = null;
	        for (let i = 0; i < highlights.length; i++) {
	            const h = highlights[i];
	            if (!block || h.line !== block.lines[block.lines.length - 1] + 1 || h.color !== block.color) {
	                if (block) blocks.push(block);
	                block = { lines: [h.line], color: h.color };
	            } else {
	                block.lines.push(h.line);
	            }
	        }
	        if (block) blocks.push(block);
	        // All blocks in all files
	        const allHighlights = getAllHighlights(context);
	        const blockNames = getBlockNames(context);
	        const allBlocks: Array<{ file: string, fileName: string, block: number[], color: string, name?: string }> = [];
	        for (const file in allHighlights) {
	            const fileHighlights = (allHighlights[file] || []).sort((a, b) => a.line - b.line || a.color.localeCompare(b.color));
	            let b: { lines: number[], color: string } | null = null;
	            for (let i = 0; i < fileHighlights.length; i++) {
	                const h = fileHighlights[i];
	                if (!b || h.line !== b.lines[b.lines.length - 1] + 1 || h.color !== b.color) {
	                    if (b) allBlocks.push({ file, fileName: vscode.Uri.parse(file).fsPath.split(/[\\/]/).pop() || file, block: [...b.lines], color: b.color, name: blockNames[file]?.[blockKeyFromLines(b.lines)] });
	                    b = { lines: [h.line], color: h.color };
	                } else {
	                    b.lines.push(h.line);
	                }
	            }
	            if (b) allBlocks.push({ file, fileName: vscode.Uri.parse(file).fsPath.split(/[\\/]/).pop() || file, block: [...b.lines], color: b.color, name: blockNames[file]?.[blockKeyFromLines(b.lines)] });
	        }
	        currentWebviewView.webview.postMessage({ type: 'highlightBlocks', blocks, allBlocks });
	    }
	}

	context.subscriptions.push(
	    vscode.commands.registerCommand('line-highlighter.highlightLine', () => {
	        const editor = vscode.window.activeTextEditor;
	        if (!editor) { return; }
	        const selection = editor.selection;
	        const start = selection.start.line;
	        const end = selection.end.line;
	        let highlights = getHighlights(context, editor.document);
	        const color = getHighlightColor();
	        for (let line = start; line <= end; line++) {
	            if (!highlights.some(h => h.line === line)) {
	                highlights.push({ line, color });
	            }
	        }
	        setHighlights(context, editor.document, highlights);
	        updateDecorations(editor, context);
	        tryPostHighlights();
	    })
	);
	context.subscriptions.push(
	    vscode.commands.registerCommand('line-highlighter.removeHighlight', () => {
	        const editor = vscode.window.activeTextEditor;
	        if (!editor) { return; }
	        const selection = editor.selection;
	        const start = selection.start.line;
	        const end = selection.end.line;
	        let highlights = getHighlights(context, editor.document);
	        highlights = highlights.filter(h => h.line < start || h.line > end);
	        setHighlights(context, editor.document, highlights);
	        updateDecorations(editor, context);
	        tryPostHighlights();
	    })
	);

	// Copy functionality
	async function copyHighlightedLines(highlights: { line: number, color: string }[], document: vscode.TextDocument, fileHeader?: string): Promise<string> {
	    const lines: string[] = [];
	    
	    if (fileHeader) {
	        lines.push(fileHeader);
	        lines.push(''); // Empty line after header
	    }
	    
	    // Sort highlights by line number
	    const sortedHighlights = highlights.sort((a, b) => a.line - b.line);
	    
	    for (const highlight of sortedHighlights) {
	        try {
	            const lineText = document.lineAt(highlight.line).text;
	            lines.push(lineText);
	        } catch (error) {
	            // Line might not exist anymore, skip it
	            console.warn(`Line ${highlight.line} not found in document`);
	        }
	    }
	    
	    return lines.join('\n');
	}

	context.subscriptions.push(
	    vscode.commands.registerCommand('line-highlighter.copyHighlightsByColor', async () => {
	        const editor = vscode.window.activeTextEditor;
	        if (!editor) {
	            vscode.window.showWarningMessage('No active editor');
	            return;
	        }

	        // Show color picker
	        const colorItems = HIGHLIGHT_COLORS.map((c, index) => ({
	            label: `Color ${index + 1}`,
	            detail: c.name,
	            color: c.value
	        }));

	        const selectedColor = await vscode.window.showQuickPick(colorItems, {
	            placeHolder: 'Select color to copy highlighted lines'
	        });

	        if (!selectedColor) return;

	        const highlights = getHighlights(context, editor.document);
	        const colorHighlights = highlights.filter(h => h.color === selectedColor.color);

	        if (colorHighlights.length === 0) {
	            vscode.window.showInformationMessage(`No highlighted lines found with ${selectedColor.label}`);
	            return;
	        }

	        const content = await copyHighlightedLines(colorHighlights, editor.document);
	        await vscode.env.clipboard.writeText(content);
	        vscode.window.showInformationMessage(`Copied ${colorHighlights.length} lines from ${selectedColor.label}`);
	    })
	);

	context.subscriptions.push(
	    vscode.commands.registerCommand('line-highlighter.copyHighlightsCurrentFile', async () => {
	        const editor = vscode.window.activeTextEditor;
	        if (!editor) {
	            vscode.window.showWarningMessage('No active editor');
	            return;
	        }

	        const highlights = getHighlights(context, editor.document);
	        
	        if (highlights.length === 0) {
	            vscode.window.showInformationMessage('No highlighted lines found in current file');
	            return;
	        }

	        const content = await copyHighlightedLines(highlights, editor.document);
	        await vscode.env.clipboard.writeText(content);
	        vscode.window.showInformationMessage(`Copied ${highlights.length} highlighted lines from current file`);
	    })
	);

	context.subscriptions.push(
	    vscode.commands.registerCommand('line-highlighter.copyHighlightsAllFiles', async () => {
	        const allHighlights = getAllHighlights(context);
	        
	        if (Object.keys(allHighlights).length === 0) {
	            vscode.window.showInformationMessage('No highlighted lines found in any files');
	            return;
	        }

	        const contentParts: string[] = [];
	        let totalLines = 0;

	        for (const [fileUri, highlights] of Object.entries(allHighlights)) {
	            if (highlights.length === 0) continue;

	            try {
	                const document = await vscode.workspace.openTextDocument(vscode.Uri.parse(fileUri));
	                const fileName = vscode.workspace.asRelativePath(document.uri);
	                const fileHeader = `${fileName}:`;
	                
	                const fileContent = await copyHighlightedLines(highlights, document, fileHeader);
	                contentParts.push(fileContent);
	                totalLines += highlights.length;
	            } catch (error) {
	                console.warn(`Failed to open document: ${fileUri}`, error);
	            }
	        }

	        if (contentParts.length === 0) {
	            vscode.window.showInformationMessage('No valid highlighted lines found');
	            return;
	        }

	        const finalContent = contentParts.join('\n\n'); // Double newline to separate files
	        await vscode.env.clipboard.writeText(finalContent);
	        vscode.window.showInformationMessage(`Copied ${totalLines} highlighted lines from ${contentParts.length} files`);
	    })
	);

	// --- Webview Sidebar Provider ---
	context.subscriptions.push(
	    vscode.window.registerWebviewViewProvider('line-highlighter.sidebar', {
	        resolveWebviewView(webviewView) {
	            currentWebviewView = webviewView;
	            webviewView.onDidDispose(() => { currentWebviewView = undefined; });
	            webviewView.webview.options = { enableScripts: true };
	            webviewView.webview.html = getSidebarHtml(getHighlightColor());
	            tryPostHighlights();
	            webviewView.webview.onDidReceiveMessage(async msg => {
	                if (msg.type === 'sidebarReady') {
	                    tryPostHighlights();
	                } else if (msg.type === 'setColor') {
	                    setHighlightColor(msg.color);
	                    webviewView.webview.html = getSidebarHtml(msg.color);
	                    // tryPostHighlights will be called by sidebarReady after reload
	                } else if (msg.type === 'setOpacity') {
	                    setOpacity(msg.value);
	                    updateAllDecorationTypes();
	                    updateAllDecorations();
	                    webviewView.webview.html = getSidebarHtml(getHighlightColor());
	                    // tryPostHighlights will be called by sidebarReady after reload
	                } else if (msg.type === 'revealBlock') {
	                    const editor = vscode.window.activeTextEditor;
	                    if (!editor) return;
	                    const start = msg.block[0];
	                    const end = msg.block[msg.block.length - 1];
	                    editor.revealRange(new vscode.Range(start, 0, end, editor.document.lineAt(end).text.length));
	                } else if (msg.type === 'removeBlock') {
	                    const editor = vscode.window.activeTextEditor;
	                    if (!editor) return;
	                    let highlights = getHighlights(context, editor.document);
	                    // Remove highlights that match both line and color for the block
	                    highlights = highlights.filter(h => !(msg.block.includes(h.line) && h.color === (msg.color || getHighlightColor())));
	                    setHighlights(context, editor.document, highlights);
	                    updateDecorations(editor, context);
	                    tryPostHighlights();
	                } else if (msg.type === 'revealBlockGlobal') {
	                    const doc = await vscode.workspace.openTextDocument(vscode.Uri.parse(msg.file));
	                    const editor = await vscode.window.showTextDocument(doc);
	                    const start = msg.block[0];
	                    const end = msg.block[msg.block.length - 1];
	                    editor.revealRange(new vscode.Range(start, 0, end, doc.lineAt(end).text.length));
	                } else if (msg.type === 'removeBlockGlobal') {
	                    const doc = await vscode.workspace.openTextDocument(vscode.Uri.parse(msg.file));
	                    let highlights = getHighlights(context, doc);
	                    highlights = highlights.filter(h => !(msg.block.includes(h.line) && h.color === (msg.color || getHighlightColor())));
	                    setHighlights(context, doc, highlights);
	                    updateDecorations(await vscode.window.showTextDocument(doc), context);
	                    tryPostHighlights();
	                } else if (msg.type === 'renameBlock') {
	                    setBlockName(context, msg.file, blockKeyFromLines(msg.block), msg.name);
	                    tryPostHighlights();
	                } else if (msg.type === 'copyByColor') {
	                    vscode.commands.executeCommand('line-highlighter.copyHighlightsByColor');
	                } else if (msg.type === 'copyCurrentFile') {
	                    vscode.commands.executeCommand('line-highlighter.copyHighlightsCurrentFile');
	                } else if (msg.type === 'copyAllFiles') {
	                    vscode.commands.executeCommand('line-highlighter.copyHighlightsAllFiles');
	                } else if (msg.type === 'copyBlock') {
	                    const editor = vscode.window.activeTextEditor;
	                    if (!editor) return;
	                    
	                    // Create highlights array from the block
	                    const blockHighlights = msg.block.map((line: number) => ({ line, color: msg.color }));
	                    const content = await copyHighlightedLines(blockHighlights, editor.document);
	                    await vscode.env.clipboard.writeText(content);
	                    
	                    const lineCount = msg.block.length;
	                    const lineLabel = lineCount === 1 ? 'line' : 'lines';
	                    vscode.window.showInformationMessage(`Copied ${lineCount} ${lineLabel} from block`);
	                } else if (msg.type === 'copyBlockGlobal') {
	                    try {
	                        const doc = await vscode.workspace.openTextDocument(vscode.Uri.parse(msg.file));
	                        const fileName = vscode.workspace.asRelativePath(doc.uri);
	                        const fileHeader = `${fileName}:`;
	                        
	                        // Create highlights array from the block
	                        const blockHighlights = msg.block.map((line: number) => ({ line, color: msg.color }));
	                        const content = await copyHighlightedLines(blockHighlights, doc, fileHeader);
	                        await vscode.env.clipboard.writeText(content);
	                        
	                        const lineCount = msg.block.length;
	                        const lineLabel = lineCount === 1 ? 'line' : 'lines';
	                        vscode.window.showInformationMessage(`Copied ${lineCount} ${lineLabel} from ${fileName}`);
	                    } catch (error) {
	                        vscode.window.showErrorMessage('Failed to copy block from file');
	                        console.error('Copy block error:', error);
	                    }
	                }
	            });
	            vscode.window.onDidChangeActiveTextEditor(() => tryPostHighlights());
	            vscode.workspace.onDidChangeTextDocument(() => tryPostHighlights());
	        }
	    })
	);

	function getSidebarHtml(currentColor: string) {
	    const opacity = getOpacity();
	    // Color selection UI
	    const colorOptions = HIGHLIGHT_COLORS.map(c =>
	        `<button onclick="vscode.postMessage({ type: 'setColor', color: '${c.value}' })" style="width:28px;height:28px;margin:2px;border:${currentColor === c.value ? '2px solid #333' : '1px solid #ccc'};background:${c.value};cursor:pointer;" title="${c.name}"></button>`
	    ).join('');
	    return [
	        '<html><body>',
	        '<h3>Highlight Color</h3>',
	        `<div style="margin-bottom:10px;">Choose: ${colorOptions}</div>`,
	        `<div style="margin-bottom:10px;">Opacity: <input id="opacitySlider" type="range" min="0.1" max="1" step="0.01" value="${opacity}" style="vertical-align:middle;width:120px;" /> <span id="opacityValue">${Math.round(opacity*100)}%</span></div>`,
	        '<h3>Copy Highlighted Lines</h3>',
	        '<div style="margin-bottom:10px;">',
	        '<button onclick="vscode.postMessage({ type: \'copyByColor\' })" style="margin:2px;padding:4px 8px;font-size:12px;">Copy by Color</button>',
	        '<button onclick="vscode.postMessage({ type: \'copyCurrentFile\' })" style="margin:2px;padding:4px 8px;font-size:12px;">Copy Current File</button>',
	        '<button onclick="vscode.postMessage({ type: \'copyAllFiles\' })" style="margin:2px;padding:4px 8px;font-size:12px;">Copy All Files</button>',
	        '</div>',
	        '<h3>Highlighted Blocks (Current File)</h3>',
	        '<ul id="blocks"></ul>',
	        '<h3>All Highlighted Blocks</h3>',
	        '<ul id="allBlocks"></ul>',
	        '<script>',
	        'const vscode = acquireVsCodeApi();',
	        'window.addEventListener("DOMContentLoaded", function() {',
	        '  vscode.postMessage({ type: "sidebarReady" });',
	        '});',
	        'const slider = document.getElementById("opacitySlider");',
	        'const valSpan = document.getElementById("opacityValue");',
	        'slider.oninput = function() {',
	        '  valSpan.textContent = Math.round(slider.value*100) + "%";',
	        '  vscode.postMessage({ type: "setOpacity", value: parseFloat(slider.value) });',
	        '};',
	        'window.addEventListener("message", function(event) {',
	        '  if (event.data.type === "highlightBlocks") {',
	        '    // Current file blocks',
	        '    const blocks = event.data.blocks;',
	        '    const ul = document.getElementById("blocks");',
	        '    ul.innerHTML = "";',
	        '    blocks.forEach(function(block) {',
	        '      var label = block.lines.length === 1 ? "Line " + (block.lines[0] + 1) : "Lines " + (block.lines[0] + 1) + "-" + (block.lines[block.lines.length - 1] + 1);',
	        '      var li = document.createElement("li");',
	        '      li.innerHTML = `<span style=\'cursor:pointer;color:${block.color};font-weight:bold;\' class=\'reveal\'>${label}</span> <button class=\'copy\'>Copy</button> <button class=\'remove\'>Remove</button>`;',
	        '      li.style.background = "";',
	        '      li.style.borderRadius = "4px";',
	        '      li.style.marginBottom = "2px";',
	        '      li.querySelector(".reveal").onclick = function() { vscode.postMessage({ type: "revealBlock", block: block.lines }); };',
	        '      li.querySelector(".copy").onclick = function() { vscode.postMessage({ type: "copyBlock", block: block.lines, color: block.color }); };',
	        '      li.querySelector(".remove").onclick = function() { vscode.postMessage({ type: "removeBlock", block: block.lines, color: block.color }); };',
	        '      ul.appendChild(li);',
	        '    });',
	        '    // All blocks in all files',
	        '    const allBlocks = event.data.allBlocks || [];',
	        '    const allUl = document.getElementById("allBlocks");',
	        '    allUl.innerHTML = "";',
	        '    allBlocks.forEach(function(entry, idx) {',
	        '      var label = entry.block.length === 1 ? "Line " + (entry.block[0] + 1) : "Lines " + (entry.block[0] + 1) + "-" + (entry.block[entry.block.length - 1] + 1);',
	        '      var name = entry.name || "";',
	        '      var li = document.createElement("li");',
	        '      li.innerHTML = `<b>${entry.fileName}</b>: <span style=\'cursor:pointer;color:${entry.color};font-weight:bold;\' class=\'reveal\'>${label}</span> <input type=\'text\' class=\'blockName\' value=\'${name.replace(/\'/g, "&#39;").replace(/\"/g, "&quot;")}\' placeholder=\'(optional name)\' style=\'width:120px;margin-left:4px;\' /> <button class=\'copy\'>Copy</button> <button class=\'remove\'>Remove</button>`;',
	        '      li.style.background = "";',
	        '      li.style.borderRadius = "4px";',
	        '      li.style.marginBottom = "2px";',
	        '      li.querySelector(".reveal").onclick = function() { vscode.postMessage({ type: "revealBlockGlobal", file: entry.file, block: entry.block }); };',
	        '      li.querySelector(".copy").onclick = function() { vscode.postMessage({ type: "copyBlockGlobal", file: entry.file, block: entry.block, color: entry.color }); };',
	        '      li.querySelector(".remove").onclick = function() { vscode.postMessage({ type: "removeBlockGlobal", file: entry.file, block: entry.block, color: entry.color }); };',
	        '      li.querySelector(".blockName").onchange = function(e) { vscode.postMessage({ type: "renameBlock", file: entry.file, block: entry.block, name: e.target.value }); };',
	        '      allUl.appendChild(li);',
	        '    });',
	        '  }',
	        '});',
	        '</script>',
	        '</body></html>'
	    ].join('\n');
	}
	function colorToHex(color: string): string {
	    // Always return cyan for the preview
	    return '#00c8ff';
	}

	context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(editor => {
            if (editor) updateDecorations(editor, context);
        }, null, context.subscriptions),
        vscode.workspace.onDidChangeTextDocument(event => {
            const editor = vscode.window.activeTextEditor;
            if (editor && event.document === editor.document) {
                updateDecorations(editor, context);
            }
        }, null, context.subscriptions),
        vscode.workspace.onDidOpenTextDocument(() => {
            // Update all visible editors when a new document is opened
            updateAllDecorations();
            tryPostHighlights();
        }),
        vscode.window.onDidChangeVisibleTextEditors(() => {
            updateAllDecorations();
            tryPostHighlights();
        })
    );

    // On activation, update decorations for the current editor
    if (vscode.window.activeTextEditor) {
        updateDecorations(vscode.window.activeTextEditor, context);
    }

    // Ensure correct opacity and decorations on activation
    updateAllDecorationTypes();
    updateAllDecorations();
}

// This method is called when your extension is deactivated
export function deactivate() {}
