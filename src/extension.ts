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
	function getHighlightColor(): string {
	    // Always return the correct cyan color
	    return 'rgba(0, 204, 255, 0.49)';
	}
	function setHighlightColor(color: string) {
	    // No-op: color is now fixed
	}

	// Decoration type for highlighted lines
	function createDecorationType(color: string) {
	    return vscode.window.createTextEditorDecorationType({
	        backgroundColor: color,
	        isWholeLine: true
	    });
	}
	let highlightDecorationType = createDecorationType(getHighlightColor());

	function getFileKey(document: vscode.TextDocument) {
	    return document.uri.toString();
	}

	function getHighlights(context: vscode.ExtensionContext, document: vscode.TextDocument): number[] {
	    const all = context.workspaceState.get<{ [key: string]: number[] }>(HIGHLIGHT_KEY, {});
	    return all[getFileKey(document)] || [];
	}

	function setHighlights(context: vscode.ExtensionContext, document: vscode.TextDocument, lines: number[]) {
	    const all = context.workspaceState.get<{ [key: string]: number[] }>(HIGHLIGHT_KEY, {});
	    all[getFileKey(document)] = lines;
	    context.workspaceState.update(HIGHLIGHT_KEY, all);
	}

	function updateAllDecorations() {
	    vscode.window.visibleTextEditors.forEach(editor => updateDecorations(editor, context));
	}

	function updateDecorations(editor: vscode.TextEditor, context: vscode.ExtensionContext) {
	    const lines = getHighlights(context, editor.document);
	    const ranges = lines.map(line => new vscode.Range(line, 0, line, editor.document.lineAt(line).text.length));
	    editor.setDecorations(highlightDecorationType, ranges);
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

	// Helper to get all highlights across all files
	function getAllHighlights(context: vscode.ExtensionContext) {
	    const all = context.workspaceState.get<{ [key: string]: number[] }>(HIGHLIGHT_KEY, {});
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
	        const lines = getHighlights(context, editor.document).sort((a, b) => a - b);
	        // Group consecutive lines into blocks
	        const blocks = [];
	        let block: number[] = [];
	        for (let i = 0; i < lines.length; i++) {
	            if (block.length === 0 || lines[i] === block[block.length - 1] + 1) {
	                block.push(lines[i]);
	            } else {
	                blocks.push([...block]);
	                block = [lines[i]];
	            }
	        }
	        if (block.length) blocks.push(block);
	        // All blocks in all files
	        const allHighlights = getAllHighlights(context);
	        const blockNames = getBlockNames(context);
	        const allBlocks: Array<{ file: string, fileName: string, block: number[], name?: string }> = [];
	        for (const file in allHighlights) {
	            const fileLines = allHighlights[file].sort((a, b) => a - b);
	            let b: number[] = [];
	            for (let i = 0; i < fileLines.length; i++) {
	                if (b.length === 0 || fileLines[i] === b[b.length - 1] + 1) {
	                    b.push(fileLines[i]);
	                } else {
	                    allBlocks.push({ file, fileName: vscode.Uri.parse(file).fsPath.split(/[\\/]/).pop() || file, block: [...b], name: blockNames[file]?.[blockKeyFromLines(b)] });
	                    b = [fileLines[i]];
	                }
	            }
	            if (b.length) allBlocks.push({ file, fileName: vscode.Uri.parse(file).fsPath.split(/[\\/]/).pop() || file, block: [...b], name: blockNames[file]?.[blockKeyFromLines(b)] });
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
	        let lines = getHighlights(context, editor.document);
	        for (let line = start; line <= end; line++) {
	            if (!lines.includes(line)) {
	                lines.push(line);
	            }
	        }
	        setHighlights(context, editor.document, lines);
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
	        let lines = getHighlights(context, editor.document);
	        lines = lines.filter(line => line < start || line > end);
	        setHighlights(context, editor.document, lines);
	        updateDecorations(editor, context);
	        tryPostHighlights();
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
	                if (msg.type === 'setColor') {
	                    setHighlightColor(msg.color);
	                    highlightDecorationType = createDecorationType(msg.color);
	                    updateAllDecorations();
	                    webviewView.webview.html = getSidebarHtml(msg.color);
	                    tryPostHighlights();
	                } else if (msg.type === 'revealBlock') {
	                    const editor = vscode.window.activeTextEditor;
	                    if (!editor) return;
	                    const start = msg.block[0];
	                    const end = msg.block[msg.block.length - 1];
	                    editor.revealRange(new vscode.Range(start, 0, end, editor.document.lineAt(end).text.length));
	                } else if (msg.type === 'removeBlock') {
	                    const editor = vscode.window.activeTextEditor;
	                    if (!editor) return;
	                    let lines = getHighlights(context, editor.document);
	                    lines = lines.filter(line => !msg.block.includes(line));
	                    setHighlights(context, editor.document, lines);
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
	                    let lines = getHighlights(context, doc);
	                    lines = lines.filter(line => !msg.block.includes(line));
	                    setHighlights(context, doc, lines);
	                    updateDecorations(await vscode.window.showTextDocument(doc), context);
	                    tryPostHighlights();
	                } else if (msg.type === 'renameBlock') {
	                    setBlockName(context, msg.file, blockKeyFromLines(msg.block), msg.name);
	                    tryPostHighlights();
	                }
	            });
	            vscode.window.onDidChangeActiveTextEditor(() => tryPostHighlights());
	            vscode.workspace.onDidChangeTextDocument(() => tryPostHighlights());
	        }
	    })
	);

	function getSidebarHtml(currentColor: string) {
	    // Always show the correct cyan color in the preview
	    return [
	        '<html><body>',
	        '<h3>Highlight Color</h3>',
	        '<div style="margin-bottom:10px;">Current color: <span style="display:inline-block;width:24px;height:24px;background:#00c8ff;border:1px solid #ccc;vertical-align:middle;"></span></div>',
	        '<h3>Highlighted Blocks (Current File)</h3>',
	        '<ul id="blocks"></ul>',
	        '<h3>All Highlighted Blocks</h3>',
	        '<ul id="allBlocks"></ul>',
	        '<script>',
	        'const vscode = acquireVsCodeApi();',
	        'window.addEventListener("message", function(event) {',
	        '  if (event.data.type === "highlightBlocks") {',
	        '    // Current file blocks',
	        '    const blocks = event.data.blocks;',
	        '    const ul = document.getElementById("blocks");',
	        '    ul.innerHTML = "";',
	        '    blocks.forEach(function(block) {',
	        '      var label = block.length === 1 ? "Line " + (block[0] + 1) : "Lines " + (block[0] + 1) + "-" + (block[block.length - 1] + 1);',
	        '      var li = document.createElement("li");',
	        '      li.innerHTML = "<span style=\'cursor:pointer;color:#007acc\' class=\'reveal\'>" + label + "</span> <button class=\'remove\'>Remove</button>";',
	        '      li.querySelector(".reveal").onclick = function() { vscode.postMessage({ type: "revealBlock", block: block }); };',
	        '      li.querySelector(".remove").onclick = function() { vscode.postMessage({ type: "removeBlock", block: block }); };',
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
	        '      li.innerHTML = "<b>" + entry.fileName + "</b>: <span style=\'cursor:pointer;color:#007acc\' class=\'reveal\'>" + label + "</span> " +',
	        '        "<input type=\'text\' class=\'blockName\' value=\'" + name.replace(/\'/g, "&#39;").replace(/\"/g, "&quot;") + "\' placeholder=\'(optional name)\' style=\'width:120px;margin-left:4px;\' /> " +',
	        '        "<button class=\'remove\'>Remove</button>";',
	        '      li.querySelector(".reveal").onclick = function() { vscode.postMessage({ type: "revealBlockGlobal", file: entry.file, block: entry.block }); };',
	        '      li.querySelector(".remove").onclick = function() { vscode.postMessage({ type: "removeBlockGlobal", file: entry.file, block: entry.block }); };',
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
        }, null, context.subscriptions)
    );

    // On activation, update decorations for the current editor
    if (vscode.window.activeTextEditor) {
        updateDecorations(vscode.window.activeTextEditor, context);
    }
}

// This method is called when your extension is deactivated
export function deactivate() {}
