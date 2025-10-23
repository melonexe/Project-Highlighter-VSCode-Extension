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

	// Key for hiding highlights toggle
	const HIDE_KEY = 'line-highlighter.hideHighlights';

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

	// Highlight interface with timestamp
	interface Highlight {
		line: number;
		color: string;
		timestamp?: string;
	}

	// Extract timestamp from a line of text
	function extractTimestamp(text: string): string | undefined {
		// Common timestamp patterns
		const patterns = [
			/\b\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?\b/, // ISO format
			/\b\d{2}[-/]\d{2}[-/]\d{4}\s\d{2}:\d{2}:\d{2}(?:\.\d+)?\b/, // DD/MM/YYYY HH:MM:SS
			/\b\d{2}:\d{2}:\d{2}(?:\.\d+)?\b/, // HH:MM:SS
		];

		for (const pattern of patterns) {
			const match = text.match(pattern);
			if (match) {
				return match[0];
			}
		}
		return undefined;
	}

	// Refactored: highlights are now stored as Highlight[] per file
	function getHighlights(context: vscode.ExtensionContext, document: vscode.TextDocument): Highlight[] {
		const all = context.workspaceState.get<{ [key: string]: Highlight[] }>(HIGHLIGHT_KEY, {});
		return all[getFileKey(document)] || [];
	}

	function setHighlights(context: vscode.ExtensionContext, document: vscode.TextDocument, highlights: Highlight[]) {
		const all = context.workspaceState.get<{ [key: string]: Highlight[] }>(HIGHLIGHT_KEY, {});
		all[getFileKey(document)] = highlights;
		context.workspaceState.update(HIGHLIGHT_KEY, all);
	}

	function updateAllDecorations() {
	    highlightDecorationType = createDecorationType(getHighlightColor());
	    vscode.window.visibleTextEditors.forEach(editor => updateDecorations(editor, context));
	}

	function getHideHighlights(context: vscode.ExtensionContext): boolean {
		return context.workspaceState.get<boolean>(HIDE_KEY, false);
	}

	function setHideHighlights(context: vscode.ExtensionContext, hide: boolean) {
		context.workspaceState.update(HIDE_KEY, hide);
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

	// Helper to flash highlight a block with opposite color and smooth brightness ramp
	async function flashHighlightBlock(editor: vscode.TextEditor, blockLines: number[], originalColor: string) {
	    // Calculate opposite color
	    const getOppositeColor = (rgba: string): string => {
	        const match = rgba.match(/rgba?\((\d+), ?(\d+), ?(\d+)(?:, ?([\d.]+))?\)/);
	        if (!match) return 'rgba(255, 255, 255, 0.8)'; // fallback to white
	        const [_, r, g, b] = match;
	        const oppR = 255 - parseInt(r);
	        const oppG = 255 - parseInt(g);
	        const oppB = 255 - parseInt(b);
	        return `rgba(${oppR}, ${oppG}, ${oppB}, 0.8)`;
	    };

	    const oppositeColor = getOppositeColor(originalColor);
	    const flashDecorationType = vscode.window.createTextEditorDecorationType({
	        backgroundColor: oppositeColor,
	        isWholeLine: true
	    });

	    const ranges = blockLines.map(line => 
	        new vscode.Range(line, 0, line, editor.document.lineAt(line).text.length)
	    );

	    // Flash 2 times with ultra-smooth brightness ramp
	    for (let flash = 0; flash < 2; flash++) {
	        // Fade in (0 to max opacity over 300ms with 20 steps)
	        for (let step = 0; step <= 20; step++) {
	            const opacity = (step / 20) * 0.8; // Max opacity of 0.8
	            const currentColor = oppositeColor.replace(/[\d.]+\)$/, `${opacity})`);
	            
	            // Update decoration type with current opacity
	            flashDecorationType.dispose();
	            const currentDecorationType = vscode.window.createTextEditorDecorationType({
	                backgroundColor: currentColor,
	                isWholeLine: true
	            });
	            
	            editor.setDecorations(currentDecorationType, ranges);
	            await new Promise(resolve => setTimeout(resolve, 15)); // 15ms per step = 300ms total
	            currentDecorationType.dispose();
	        }
	        
	        // Fade out (max opacity to 0 over 300ms with 20 steps)
	        for (let step = 20; step >= 0; step--) {
	            const opacity = (step / 20) * 0.8;
	            const currentColor = oppositeColor.replace(/[\d.]+\)$/, `${opacity})`);
	            
	            const currentDecorationType = vscode.window.createTextEditorDecorationType({
	                backgroundColor: currentColor,
	                isWholeLine: true
	            });
	            
	            editor.setDecorations(currentDecorationType, ranges);
	            await new Promise(resolve => setTimeout(resolve, 15)); // 15ms per step = 300ms total
	            currentDecorationType.dispose();
	        }
	    }

	    // Dispose the flash decoration type and restore original decorations
	    flashDecorationType.dispose();
	    updateDecorations(editor, context);
	}

	// Update decorations to use color with current opacity
	function updateDecorations(editor: vscode.TextEditor, context: vscode.ExtensionContext) {
	    // If hide highlights is enabled, clear all decorations and return
	    if (getHideHighlights(context)) {
	        Object.keys(decorationTypes).forEach(k => {
	            const deco = decorationTypes[k];
	            if (deco) editor.setDecorations(deco, []);
	        });
	        return;
	    }
	
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

	// Output channel for SSRC stats
	const ssrcOutput = vscode.window.createOutputChannel('SSRC Stats');

	// Helper: parse syncBlockTS and rtpTimestamp from a log line
	function parseRtpLine(line: string): { syncBlockTS?: number, rtpTimestamp?: number, streamName?: string } {
		const result: { syncBlockTS?: number, rtpTimestamp?: number, streamName?: string } = {};
		try {
			const syncMatch = line.match(/syncBlockTS:\s*(\d+)/i);
			const rtpMatch = line.match(/rtpTimestamp:\s*(\d+)/i);
			const streamMatch = line.match(/stream:([^\s,]+)/i);
			if (syncMatch) result.syncBlockTS = parseInt(syncMatch[1], 10);
			if (rtpMatch) result.rtpTimestamp = parseInt(rtpMatch[1], 10);
			if (streamMatch) result.streamName = streamMatch[1];
		} catch (e) {
			// ignore
		}
		return result;
	}

	// Helper: perform the calculations and return a report string
	function calculateSsrcReport(opts: { fileName: string, streamName?: string, syncBlockTS: number, rtpTimestamp: number, sampleRate: number, packetTimeUs: number }) {
		const { fileName, streamName, syncBlockTS, rtpTimestamp, sampleRate, packetTimeUs } = opts;
	// Assumptions:
	// - rtpTimestamp and syncBlockTS are sample counters (wrap-around not handled here)
	// Note: compute rtpTimestamp - syncBlockTS per user request
	const sampleDiff = rtpTimestamp - syncBlockTS;
		const packetsPerSecond = 1_000_000 / packetTimeUs; // e.g., 125us -> 8000pps; 1000us -> 1000pps
		const samplesPerPacket = sampleRate / packetsPerSecond;
		const packetDiff = sampleDiff / samplesPerPacket;
		const seconds = sampleDiff / sampleRate;
		const milliseconds = seconds * 1000;

	const headerName = streamName || fileName || 'unknown';
	const lines: string[] = [];
	// Add EARLY/LATE/ON TIME label based on signed sample difference
	// Negative sampleDiff => EARLY (packet timestamp < arrival time)
	const timingLabel = sampleDiff < 0 ? 'EARLY' : (sampleDiff > 0 ? 'LATE' : 'ON TIME');
	lines.push(`***** ${timingLabel} *****`);
	lines.push('');
	// Keep signed differences (don't take absolute) so negative values remain negative
	const signedSamples = sampleDiff;
	const signedPackets = packetDiff;
	const signedSeconds = seconds;
	const signedMilliseconds = milliseconds;
		lines.push(`Stream name "${headerName}"`);
		lines.push('');
		lines.push(`syncBlockTS: ${syncBlockTS}`);
		lines.push(`rtpTimestamp: ${rtpTimestamp}`);
		lines.push('');
	lines.push(`Difference in samples: ${signedSamples} samples`);
	lines.push(`Difference in packets: ${signedPackets.toFixed(3)} packets`);
	lines.push(`Difference in seconds: ${signedSeconds.toFixed(6)} s`);
	lines.push(`Difference in milliseconds: ${signedMilliseconds.toFixed(3)} ms`);
		lines.push('');
		lines.push(`Sample rate: ${sampleRate} Hz`);
		lines.push(`Packet time: ${packetTimeUs} μs (${packetsPerSecond.toFixed(0)} packets/s)`);

		return lines.join('\n');
	}

	// Register calculate SSRC stats command
	context.subscriptions.push(vscode.commands.registerCommand('line-highlighter.calculateSsrcStats', async () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showWarningMessage('No active editor');
			return;
		}

		const selection = editor.selection;
		const lineText = editor.document.lineAt(selection.active.line).text;
		const parsed = parseRtpLine(lineText);

		if (parsed.syncBlockTS === undefined || parsed.rtpTimestamp === undefined) {
			vscode.window.showErrorMessage('Could not find syncBlockTS and/or rtpTimestamp in the selected line');
			return;
		}

		// Prompt for sample rate
		const sampleRatePick = await vscode.window.showQuickPick([
			{ label: '48000', description: '48 kHz' },
			{ label: '96000', description: '96 kHz' }
		], { placeHolder: 'Select sample rate' });
		if (!sampleRatePick) return;
		const sampleRate = parseInt(sampleRatePick.label, 10);

		// Prompt for packet time
		const packetTimePick = await vscode.window.showQuickPick([
			{ label: '125', description: '125 μs' },
			{ label: '1000', description: '1000 μs' }
		], { placeHolder: 'Select packet time (microseconds)' });
		if (!packetTimePick) return;
		const packetTimeUs = parseInt(packetTimePick.label, 10);

	const report = calculateSsrcReport({ fileName: vscode.workspace.asRelativePath(editor.document.uri), streamName: parsed.streamName, syncBlockTS: parsed.syncBlockTS, rtpTimestamp: parsed.rtpTimestamp, sampleRate, packetTimeUs });

		// Show in Output channel and a quick info popup
		ssrcOutput.clear();
		ssrcOutput.appendLine(report);
		ssrcOutput.show(true);
		vscode.window.showInformationMessage('SSRC stats calculated — see "SSRC Stats" output channel');
	}));
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

	        // Function to get timestamp for a block of highlights
	        const getBlockTimestamp = (doc: vscode.TextDocument, lines: number[]): string | undefined => {
	            for (const line of lines) {
	                try {
	                    const lineText = doc.lineAt(line).text;
	                    const timestamp = extractTimestamp(lineText);
	                    if (timestamp) {
	                        return timestamp;
	                    }
	                } catch (error) {
	                    console.warn(`Error reading line ${line}:`, error);
	                }
	            }
	            return undefined;
	        };

	        const highlights = getHighlights(context, editor.document)
	            .sort((a, b) => a.line - b.line || a.color.localeCompare(b.color));

	        // Group consecutive lines with the same color into blocks
	        const blocks: { lines: number[], color: string, timestamp?: string }[] = [];
	        let block: { lines: number[], color: string, timestamp?: string } | null = null;
	        for (let i = 0; i < highlights.length; i++) {
	            const h = highlights[i];
	            if (!block || h.line !== block.lines[block.lines.length - 1] + 1 || h.color !== block.color) {
	                if (block) blocks.push(block);
	                block = { lines: [h.line], color: h.color, timestamp: h.timestamp };
	            } else {
	                block.lines.push(h.line);
	                // Use the first valid timestamp in the block
	                if (!block.timestamp && h.timestamp) {
	                    block.timestamp = h.timestamp;
	                }
	            }
	        }
	        if (block) blocks.push(block);

	        // Sort blocks by timestamp if available
	        blocks.sort((a, b) => {
	            if (!a.timestamp && !b.timestamp) return 0;
	            if (!a.timestamp) return 1;
	            if (!b.timestamp) return -1;
	            return a.timestamp.localeCompare(b.timestamp);
	        });

	        // All blocks in all files
	        const allHighlights = getAllHighlights(context);
	        const blockNames = getBlockNames(context);
	        const allBlocks: Array<{ file: string, fileName: string, block: number[], color: string, name?: string, timestamp?: string }> = [];

	        for (const file in allHighlights) {
	            const fileHighlights = (allHighlights[file] || [])
	                .sort((a, b) => a.line - b.line || a.color.localeCompare(b.color));
	            let b: { lines: number[], color: string, timestamp?: string } | null = null;

	            // Get document for timestamp extraction
	            let doc: vscode.TextDocument | undefined;
	            try {
	                doc = vscode.workspace.textDocuments.find(d => d.uri.toString() === file);
	            } catch (error) {
	                console.warn(`Error accessing document ${file}:`, error);
	            }

	            for (let i = 0; i < fileHighlights.length; i++) {
	                const h = fileHighlights[i];
	                if (!b || h.line !== b.lines[b.lines.length - 1] + 1 || h.color !== b.color) {
	                    if (b) {
	                        const timestamp = doc ? getBlockTimestamp(doc, b.lines) : undefined;
	                        allBlocks.push({
	                            file,
	                            fileName: vscode.Uri.parse(file).fsPath.split(/[\\/]/).pop() || file,
	                            block: [...b.lines],
	                            color: b.color,
	                            name: blockNames[file]?.[blockKeyFromLines(b.lines)],
	                            timestamp
	                        });
	                    }
	                    b = { lines: [h.line], color: h.color };
	                } else {
	                    b.lines.push(h.line);
	                }
	            }
	            if (b) {
	                const timestamp = doc ? getBlockTimestamp(doc, b.lines) : undefined;
	                allBlocks.push({
	                    file,
	                    fileName: vscode.Uri.parse(file).fsPath.split(/[\\/]/).pop() || file,
	                    block: [...b.lines],
	                    color: b.color,
	                    name: blockNames[file]?.[blockKeyFromLines(b.lines)],
	                    timestamp
	                });
	            }
	        }

	        // Sort all blocks by timestamp if available
	        allBlocks.sort((a, b) => {
	            if (!a.timestamp && !b.timestamp) return 0;
	            if (!a.timestamp) return 1;
	            if (!b.timestamp) return -1;
	            return a.timestamp.localeCompare(b.timestamp);
	        });

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
				const existing = highlights.find(h => h.line === line);
				const lineText = editor.document.lineAt(line).text;
				const timestamp = extractTimestamp(lineText);
				if (existing) {
					// Overwrite color and update timestamp when re-highlighting
					existing.color = color;
					existing.timestamp = timestamp || existing.timestamp;
				} else {
					highlights.push({ line, color, timestamp });
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

	// Copy functionality for markdown format
	async function copyHighlightedLinesAsMarkdown(highlights: { line: number, color: string }[], document: vscode.TextDocument, filePath: string): Promise<string> {
	    const lines: string[] = [];
	    
	    // Add file path as heading
	    lines.push(`#### ${filePath}`);
	    lines.push(''); // Empty line after heading
	    
	    // Sort highlights by line number and group consecutive lines
	    const sortedHighlights = highlights.sort((a, b) => a.line - b.line);
	    const blocks: { lines: number[], color: string }[] = [];
	    
	    let currentBlock: { lines: number[], color: string } | null = null;
	    for (const highlight of sortedHighlights) {
	        if (!currentBlock || highlight.line !== currentBlock.lines[currentBlock.lines.length - 1] + 1 || highlight.color !== currentBlock.color) {
	            if (currentBlock) blocks.push(currentBlock);
	            currentBlock = { lines: [highlight.line], color: highlight.color };
	        } else {
	            currentBlock.lines.push(highlight.line);
	        }
	    }
	    if (currentBlock) blocks.push(currentBlock);
	    
	    // Process each block
	    for (let i = 0; i < blocks.length; i++) {
	        const block = blocks[i];
	        const blockLines: string[] = [];
	        
	        for (const lineNum of block.lines) {
	            try {
	                const lineText = document.lineAt(lineNum).text;
	                blockLines.push(lineText);
	            } catch (error) {
	                console.warn(`Line ${lineNum} not found in document`);
	            }
	        }
	        
	        if (blockLines.length > 0) {
	            // Detect language from file extension
	            const fileExtension = document.fileName.split('.').pop()?.toLowerCase() || '';
	            const languageMap: { [key: string]: string } = {
	                'ts': 'typescript',
	                'js': 'javascript',
	                'py': 'python',
	                'java': 'java',
	                'cpp': 'cpp',
	                'c': 'c',
	                'cs': 'csharp',
	                'php': 'php',
	                'rb': 'ruby',
	                'go': 'go',
	                'rs': 'rust',
	                'sh': 'bash',
	                'ps1': 'powershell',
	                'sql': 'sql',
	                'html': 'html',
	                'css': 'css',
	                'scss': 'scss',
	                'json': 'json',
	                'xml': 'xml',
	                'yaml': 'yaml',
	                'yml': 'yaml',
	                'md': 'markdown'
	            };
	            const language = languageMap[fileExtension] || '';
	            
	            lines.push(`\`\`\`${language}`);
	            lines.push(...blockLines);
	            lines.push('```');
	            
	            // Add spacing between blocks (but not after the last one)
	            if (i < blocks.length - 1) {
	                lines.push('');
	            }
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

	context.subscriptions.push(
	    vscode.commands.registerCommand('line-highlighter.copyHighlightsAllFilesMarkdown', async () => {
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
	                
	                const fileContent = await copyHighlightedLinesAsMarkdown(highlights, document, fileName);
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
	        vscode.window.showInformationMessage(`Copied ${totalLines} highlighted lines from ${contentParts.length} files as Markdown`);
	    })
	);

	context.subscriptions.push(
	    vscode.commands.registerCommand('line-highlighter.highlightCurrentSearchResults', async () => {
	        const editor = vscode.window.activeTextEditor;
	        if (!editor) {
	            vscode.window.showWarningMessage('No active editor');
	            return;
	        }

	        // Get the current search term from the find widget
	        const searchTerm = await vscode.window.showInputBox({
	            prompt: 'Enter search term to highlight (use same term as your current find)',
	            placeHolder: 'Search term from find widget...',
	            value: '', // Could potentially get this from clipboard or selection
	        });

	        if (!searchTerm) return;

	        const document = editor.document;
	        const text = document.getText();
	        const highlights = getHighlights(context, document);
	        const color = getHighlightColor();
	        let matchCount = 0;
	        let totalMatches = 0;

	        // Use regex to find all matches (like VS Code's find does)
	        const regex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
	        const lines = text.split('\n');
	        
	        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
	            const line = lines[lineIndex];
	            const matches = line.match(regex);
	            if (matches) {
	                totalMatches += matches.length;
	                // Only add if not already highlighted
	                if (!highlights.some(h => h.line === lineIndex)) {
	                    highlights.push({ line: lineIndex, color });
	                    matchCount++;
	                }
	            }
	        }

	        if (matchCount === 0 && totalMatches === 0) {
	            vscode.window.showInformationMessage(`No matches found for "${searchTerm}" in current file`);
	            return;
	        }

	        if (matchCount === 0) {
	            vscode.window.showInformationMessage(`Found ${totalMatches} matches for "${searchTerm}", but all matching lines are already highlighted`);
	            return;
	        }

	        setHighlights(context, document, highlights);
	        updateDecorations(editor, context);
	        tryPostHighlights();
	        
	        const totalLabel = totalMatches !== matchCount ? ` (${totalMatches} total matches)` : '';
	        vscode.window.showInformationMessage(`Highlighted ${matchCount} new lines containing "${searchTerm}"${totalLabel}`);
	    })
	);

	context.subscriptions.push(
	    vscode.commands.registerCommand('line-highlighter.highlightGlobalSearchResults', async () => {
	        // First check if search results are visible
	        const searchTerm = await vscode.window.showInputBox({
	            prompt: 'Enter search term to highlight from global search results',
	            placeHolder: 'Search term from search panel (Ctrl+Shift+F)...'
	        });

	        if (!searchTerm) return;

	        const color = getHighlightColor();
	        let totalMatches = 0;
	        let filesProcessed = 0;
	        let totalLines = 0;

	        // Show progress
	        await vscode.window.withProgress({
	            location: vscode.ProgressLocation.Notification,
	            title: `Highlighting search results for "${searchTerm}"...`,
	            cancellable: false
	        }, async (progress) => {
	            // Find all text files in workspace
	            const files = await vscode.workspace.findFiles('**/*', '**/node_modules/**');
	            
	            for (let i = 0; i < files.length; i++) {
	                const file = files[i];
	                progress.report({ 
	                    increment: (100 / files.length), 
	                    message: `Processing ${vscode.workspace.asRelativePath(file)}...` 
	                });

	                try {
	                    const document = await vscode.workspace.openTextDocument(file);
	                    
	                    // Skip binary files
	                    if (document.languageId === 'plaintext' && file.fsPath.match(/\.(exe|dll|bin|jpg|png|gif|pdf|zip|tar|gz)$/i)) {
	                        continue;
	                    }

	                    const text = document.getText();
	                    const highlights = getHighlights(context, document);
	                    const lines = text.split('\n');
	                    let fileMatches = 0;
	                    let fileLines = 0;

	                    // Use regex to find all matches (like VS Code's search does)
	                    const regex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
	                    
	                    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
	                        const line = lines[lineIndex];
	                        const matches = line.match(regex);
	                        if (matches) {
	                            totalMatches += matches.length;
	                            // Only add if not already highlighted
	                            if (!highlights.some(h => h.line === lineIndex)) {
	                                highlights.push({ line: lineIndex, color });
	                                fileLines++;
	                                totalLines++;
	                            }
	                            fileMatches += matches.length;
	                        }
	                    }

	                    if (fileLines > 0) {
	                        setHighlights(context, document, highlights);
	                        filesProcessed++;
	                        
	                        // Update decorations if this file is currently open
	                        const editor = vscode.window.visibleTextEditors.find(e => e.document.uri.toString() === document.uri.toString());
	                        if (editor) {
	                            updateDecorations(editor, context);
	                        }
	                    }
	                } catch (error) {
	                    // Skip files that can't be read
	                    console.warn(`Could not process file: ${file.fsPath}`, error);
	                }
	            }
	        });

	        tryPostHighlights();
	        
	        if (totalLines === 0 && totalMatches === 0) {
	            vscode.window.showInformationMessage(`No matches found for "${searchTerm}" in workspace`);
	        } else if (totalLines === 0) {
	            vscode.window.showInformationMessage(`Found ${totalMatches} matches for "${searchTerm}", but all matching lines are already highlighted`);
	        } else {
	            const matchLabel = totalMatches !== totalLines ? ` (${totalMatches} total matches)` : '';
	            vscode.window.showInformationMessage(`Highlighted ${totalLines} lines containing "${searchTerm}" across ${filesProcessed} files${matchLabel}`);
	        }
	    })
	);

	context.subscriptions.push(
	    vscode.commands.registerCommand('line-highlighter.clearAllHighlightsCurrentFile', async () => {
	        const editor = vscode.window.activeTextEditor;
	        if (!editor) {
	            vscode.window.showWarningMessage('No active editor');
	            return;
	        }

	        const highlights = getHighlights(context, editor.document);
	        if (highlights.length === 0) {
	            vscode.window.showInformationMessage('No highlights to clear in current file');
	            return;
	        }

	        const fileName = vscode.workspace.asRelativePath(editor.document.uri);
	        const confirmation = await vscode.window.showInputBox({
	            prompt: `Type "yes" to clear ALL ${highlights.length} highlights from ${fileName}`,
	            placeHolder: 'Type "yes" to confirm',
	            validateInput: (value) => {
	                if (value.toLowerCase() !== 'yes') {
	                    return 'Please type "yes" to confirm deletion';
	                }
	                return null;
	            }
	        });

	        if (confirmation?.toLowerCase() !== 'yes') {
	            vscode.window.showInformationMessage('Clear operation cancelled');
	            return;
	        }

	        // Clear all highlights for this file
	        setHighlights(context, editor.document, []);
	        updateDecorations(editor, context);
	        tryPostHighlights();
	        vscode.window.showInformationMessage(`Cleared ${highlights.length} highlights from ${fileName}`);
	    })
	);

	context.subscriptions.push(
	    vscode.commands.registerCommand('line-highlighter.clearAllHighlightsWorkspace', async () => {
	        const allHighlights = getAllHighlights(context);
	        const fileCount = Object.keys(allHighlights).length;
	        
	        if (fileCount === 0) {
	            vscode.window.showInformationMessage('No highlights to clear in workspace');
	            return;
	        }

	        // Count total highlights across all files
	        let totalHighlights = 0;
	        for (const highlights of Object.values(allHighlights)) {
	            totalHighlights += highlights.length;
	        }

	        const confirmation = await vscode.window.showInputBox({
	            prompt: `⚠️ Type "yes" to PERMANENTLY DELETE ALL ${totalHighlights} highlights from ${fileCount} files in the entire workspace`,
	            placeHolder: 'Type "yes" to confirm this DESTRUCTIVE action',
	            validateInput: (value) => {
	                if (value.toLowerCase() !== 'yes') {
	                    return 'Please type "yes" to confirm deletion of ALL highlights';
	                }
	                return null;
	            }
	        });

	        if (confirmation?.toLowerCase() !== 'yes') {
	            vscode.window.showInformationMessage('Workspace clear operation cancelled');
	            return;
	        }

	        // Clear everything
	        context.workspaceState.update(HIGHLIGHT_KEY, {});
	        context.workspaceState.update(BLOCK_NAMES_KEY, {});
	        
	        // Update all visible editors
	        vscode.window.visibleTextEditors.forEach(editor => {
	            updateDecorations(editor, context);
	        });
	        
	        tryPostHighlights();
	        vscode.window.showInformationMessage(`🧹 Cleared ${totalHighlights} highlights from ${fileCount} files in workspace`);
	    })
	);

	// --- Webview Sidebar Provider ---
	context.subscriptions.push(
	    vscode.window.registerWebviewViewProvider('line-highlighter.sidebar', {
	        resolveWebviewView(webviewView) {
	            currentWebviewView = webviewView;
	            webviewView.onDidDispose(() => { currentWebviewView = undefined; });
	            webviewView.webview.options = { enableScripts: true };
				webviewView.webview.html = getSidebarHtml(getHighlightColor(), getHideHighlights(context));
	            tryPostHighlights();
	            webviewView.webview.onDidReceiveMessage(async msg => {
	                if (msg.type === 'sidebarReady') {
	                    tryPostHighlights();
	                } else if (msg.type === 'setColor') {
	                    setHighlightColor(msg.color);
						webviewView.webview.html = getSidebarHtml(msg.color, getHideHighlights(context));
	                    // tryPostHighlights will be called by sidebarReady after reload
	                } else if (msg.type === 'setOpacity') {
	                    setOpacity(msg.value);
	                    updateAllDecorationTypes();
	                    updateAllDecorations();
						webviewView.webview.html = getSidebarHtml(getHighlightColor(), getHideHighlights(context));
	                    // tryPostHighlights will be called by sidebarReady after reload
					} else if (msg.type === 'setHide') {
						setHideHighlights(context, !!msg.value);
						updateAllDecorations();
						webviewView.webview.html = getSidebarHtml(getHighlightColor(), getHideHighlights(context));
	                } else if (msg.type === 'revealBlock') {
	                    const editor = vscode.window.activeTextEditor;
	                    if (!editor) return;
	                    const start = msg.block[0];
	                    const end = msg.block[msg.block.length - 1];
	                    
	                    // Center the range in the view
	                    const range = new vscode.Range(start, 0, end, editor.document.lineAt(end).text.length);
	                    editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
	                    
	                    // Flash with opposite color of the block
	                    const blockColor = msg.color || getHighlightColor();
	                    await flashHighlightBlock(editor, msg.block, blockColor);
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
	                    
	                    // Center the range in the view
	                    const range = new vscode.Range(start,  0, end, doc.lineAt(end).text.length);
	                    editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
	                    
	                    // Flash with opposite color of the block
	                    const blockColor = msg.color || getHighlightColor();
	                    await flashHighlightBlock(editor, msg.block, blockColor);
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
					} else if (msg.type === 'changeBlockColor') {
						// Change color for the given block in the current editor's document
						const editor = vscode.window.activeTextEditor;
						if (!editor) return;
						const highlights = getHighlights(context, editor.document);
						let changed = false;
						for (const line of msg.block) {
							const h = highlights.find(x => x.line === line);
							if (h) {
								h.color = msg.color;
								// Update timestamp if available on the line
								try { const txt = editor.document.lineAt(line).text; const ts = extractTimestamp(txt); if (ts) h.timestamp = ts; } catch (e) {}
								changed = true;
							}
						}
						if (changed) {
							setHighlights(context, editor.document, highlights);
							updateDecorations(editor, context);
							tryPostHighlights();
						}
					} else if (msg.type === 'changeBlockColorGlobal') {
						// Change color for the given block in another file
						try {
							const doc = await vscode.workspace.openTextDocument(vscode.Uri.parse(msg.file));
							const highlights = getHighlights(context, doc);
							let changed = false;
							for (const line of msg.block) {
								const h = highlights.find(x => x.line === line);
								if (h) {
									h.color = msg.color;
									// Update timestamp if available in the document
									try { const txt = doc.lineAt(line).text; const ts = extractTimestamp(txt); if (ts) h.timestamp = ts; } catch (e) {}
									changed = true;
								}
							}
							if (changed) {
								setHighlights(context, doc, highlights);
								// Update decorations if this file is open
								const openEditor = vscode.window.visibleTextEditors.find(e => e.document.uri.toString() === doc.uri.toString());
								if (openEditor) updateDecorations(openEditor, context);
								tryPostHighlights();
							}
						} catch (error) {
							console.error('Failed to change block color global:', error);
						}
	                } else if (msg.type === 'copyByColor') {
	                    vscode.commands.executeCommand('line-highlighter.copyHighlightsByColor');
	                } else if (msg.type === 'copyCurrentFile') {
	                    vscode.commands.executeCommand('line-highlighter.copyHighlightsCurrentFile');
	                } else if (msg.type === 'copyAllFiles') {
	                    vscode.commands.executeCommand('line-highlighter.copyHighlightsAllFiles');
	                } else if (msg.type === 'copyAllFilesMarkdown') {
	                    vscode.commands.executeCommand('line-highlighter.copyHighlightsAllFilesMarkdown');
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
	                } else if (msg.type === 'highlightCurrentSearch') {
	                    vscode.commands.executeCommand('line-highlighter.highlightCurrentSearchResults');
	                } else if (msg.type === 'highlightGlobalSearch') {
	                    vscode.commands.executeCommand('line-highlighter.highlightGlobalSearchResults');
	                } else if (msg.type === 'clearCurrentFile') {
	                    vscode.commands.executeCommand('line-highlighter.clearAllHighlightsCurrentFile');
	                } else if (msg.type === 'clearWorkspace') {
	                    vscode.commands.executeCommand('line-highlighter.clearAllHighlightsWorkspace');
	                }
	            });
	            vscode.window.onDidChangeActiveTextEditor(() => tryPostHighlights());
	            vscode.workspace.onDidChangeTextDocument(() => tryPostHighlights());
	        }
	    })
	);

	function getSidebarHtml(currentColor: string, hideHighlights: boolean) {
		const opacity = getOpacity();
	    // Color selection UI
	    const colorOptions = HIGHLIGHT_COLORS.map(c =>
	        `<button onclick="vscode.postMessage({ type: 'setColor', color: '${c.value}' })" style="width:28px;height:28px;margin:2px;border:${currentColor === c.value ? '2px solid #333' : '1px solid #ccc'};background:${c.value};cursor:pointer;" title="${c.name}"></button>`
	    ).join('');
	    return [
	        '<html><body>',
			'<div style="margin-bottom:10px;">',
			`<label><input type=\'checkbox\' id=\'hideCheckbox\' ${hideHighlights ? 'checked' : ''} /> Hide highlights</label>`,
			'</div>',
	        '<h3>Highlight Color</h3>',
	        `<div style="margin-bottom:10px;">Choose: ${colorOptions}</div>`,
	        `<div style="margin-bottom:10px;">Opacity: <input id="opacitySlider" type="range" min="0.1" max="1" step="0.01" value="${opacity}" style="vertical-align:middle;width:120px;" /> <span id="opacityValue">${Math.round(opacity*100)}%</span></div>`,
	        '<h3>Copy Highlighted Lines</h3>',
	        '<div style="margin-bottom:10px;">',
	        '<button onclick="vscode.postMessage({ type: \'copyByColor\' })" style="margin:2px;padding:4px 8px;font-size:12px;">Copy by Color</button>',
	        '<button onclick="vscode.postMessage({ type: \'copyCurrentFile\' })" style="margin:2px;padding:4px 8px;font-size:12px;">Copy Current File</button>',
	        '<button onclick="vscode.postMessage({ type: \'copyAllFiles\' })" style="margin:2px;padding:4px 8px;font-size:12px;">Copy All Files</button>',
	        '<button onclick="vscode.postMessage({ type: \'copyAllFilesMarkdown\' })" style="margin:2px;padding:4px 8px;font-size:12px;background-color:#28a745;color:white;border:none;">📋 Copy as Markdown</button>',
	        '</div>',
	        '<h3>Search & Highlight</h3>',
	        '<div style="margin-bottom:10px;">',
	        '<button onclick="vscode.postMessage({ type: \'highlightCurrentSearch\' })" style="margin:2px;padding:4px 8px;font-size:12px;">Highlight Find Results</button>',
	        '<button onclick="vscode.postMessage({ type: \'highlightGlobalSearch\' })" style="margin:2px;padding:4px 8px;font-size:12px;">Highlight Search Results</button>',
	        '</div>',
	        '<h3>Clear Highlights</h3>',
	        '<div style="margin-bottom:10px;">',
	        '<button onclick="vscode.postMessage({ type: \'clearCurrentFile\' })" style="margin:2px;padding:4px 8px;font-size:12px;background-color:#ff6b6b;color:white;border:none;">Clear Current File</button>',
	        '<button onclick="vscode.postMessage({ type: \'clearWorkspace\' })" style="margin:2px;padding:4px 8px;font-size:12px;background-color:#dc3545;color:white;border:none;">🧹 NUKE ALL</button>',
	        '</div>',
	        '<h3>Highlighted Blocks (Current File)</h3>',
	        '<ul id="blocks"></ul>',
	        '<h3>All Highlighted Blocks</h3>',
	        '<ul id="allBlocks"></ul>',
	        '<script>',
		'const vscode = acquireVsCodeApi();',
		'const COLOR_VALUES = ["rgba(0, 204, 255, 0.49)", "rgba(255, 187, 0, 0.49)", "rgba(0, 255, 128, 0.49)", "rgba(255, 0, 0, 0.49)", "rgba(174, 0, 255, 0.49)"];',
		'function showPaletteFor(block, file) {',
		'  // remove existing palette',
		'  const existing = document.getElementById("colorPalette");',
		'  if (existing) existing.remove();',
		'  const palette = document.createElement("div");',
		'  palette.id = "colorPalette";',
		'  palette.style.position = "fixed";',
		'  palette.style.zIndex = "10000";',
		'  palette.style.top = "40%";',
		'  palette.style.left = "50%";',
		'  palette.style.transform = "translate(-50%, -50%)";',
		'  palette.style.padding = "8px";',
		'  palette.style.border = "1px solid #ccc";',
		'  palette.style.background = "#fff";',
		'  palette.style.borderRadius = "6px";',
		'  palette.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";',
		'  COLOR_VALUES.forEach(function(c) {',
		'    const btn = document.createElement("button");',
		'    btn.style.width = "28px";',
		'    btn.style.height = "28px";',
		'    btn.style.margin = "4px";',
		'    btn.style.border = "1px solid #888";',
		'    btn.style.background = c;',
		'    btn.onclick = function() {',
		'      if (file) {',
		'        vscode.postMessage({ type: "changeBlockColorGlobal", file: file, block: block, color: c });',
		'      } else {',
		'        vscode.postMessage({ type: "changeBlockColor", block: block, color: c });',
		'      }',
		'      palette.remove();',
		'    };',
		'    palette.appendChild(btn);',
		'  });',
		'  const cancel = document.createElement("button");',
		'  cancel.textContent = "×";',
		'  cancel.style.marginLeft = "8px";',
		'  cancel.onclick = function() { palette.remove(); };',
		'  palette.appendChild(cancel);',
		'  document.body.appendChild(palette);',
		'}',
	        'window.addEventListener("DOMContentLoaded", function() {',
	        '  vscode.postMessage({ type: "sidebarReady" });',
	        '});',
	        'const slider = document.getElementById("opacitySlider");',
	        'const valSpan = document.getElementById("opacityValue");',
		'slider.oninput = function() {',
		'  valSpan.textContent = Math.round(slider.value*100) + "%";',
		'  vscode.postMessage({ type: "setOpacity", value: parseFloat(slider.value) });',
		'};',
		'const hideCheckbox = document.getElementById("hideCheckbox");',
		'if (hideCheckbox) {',
		'  hideCheckbox.onchange = function() {',
		'    vscode.postMessage({ type: "setHide", value: hideCheckbox.checked });',
		'  };',
		'}',
	        'window.addEventListener("message", function(event) {',
	        '  if (event.data.type === "highlightBlocks") {',
	        '    // Current file blocks',
	        '    const blocks = event.data.blocks;',
	        '    const ul = document.getElementById("blocks");',
	        '    ul.innerHTML = "";',
	        '    blocks.forEach(function(block) {',
	        '      var label = block.lines.length === 1 ? "Line " + (block.lines[0] + 1) : "Lines " + (block.lines[0] + 1) + "-" + (block.lines[block.lines.length - 1] + 1);',
	        '      var timestamp = block.timestamp ? ` (${block.timestamp})` : "";',
	        '      var li = document.createElement("li");',
		'      li.innerHTML = `<span style=\'cursor:pointer;color:${block.color};font-weight:bold;\' class=\'reveal\'>${label}</span><span style=\'color:#5bc0de;font-size:0.9em;margin-left:4px;\'>${timestamp}</span> <button class=\'copy\'>Copy</button> <button class=\'remove\'>Remove</button> <button class=\'color\'>Color</button>`;',
	        '      li.style.background = "";',
	        '      li.style.borderRadius = "4px";',
	        '      li.style.marginBottom = "2px";',
	        '      li.querySelector(".reveal").onclick = function() { vscode.postMessage({ type: "revealBlock", block: block.lines }); };',
	        '      li.querySelector(".copy").onclick = function() { vscode.postMessage({ type: "copyBlock", block: block.lines, color: block.color }); };',
		'      li.querySelector(".remove").onclick = function() { vscode.postMessage({ type: "removeBlock", block: block.lines, color: block.color }); };',
		'      li.querySelector(".color").onclick = function() { showPaletteFor(block.lines); };',
	        '      ul.appendChild(li);',
	        '    });',
	        '    // All blocks in all files',
	        '    const allBlocks = event.data.allBlocks || [];',
	        '    const allUl = document.getElementById("allBlocks");',
	        '    allUl.innerHTML = "";',
	        '    allBlocks.forEach(function(entry, idx) {',
	        '      var label = entry.block.length === 1 ? "Line " + (entry.block[0] + 1) : "Lines " + (entry.block[0] + 1) + "-" + (entry.block[entry.block.length - 1] + 1);',
	        '      var name = entry.name || "";',
	        '      var timestamp = entry.timestamp ? ` (${entry.timestamp})` : "";',
		'      var li = document.createElement("li");',
		'      li.innerHTML = `<b>${entry.fileName}</b>: <span style=\'cursor:pointer;color:${entry.color};font-weight:bold;\' class=\'reveal\'>${label}</span><span style=\'color:#5bc0de;font-size:0.9em;margin-left:4px;\'>${timestamp}</span> <input type=\'text\' class=\'blockName\' value=\'${name.replace(/\'/g, "&#39;").replace(/\"/g, "&quot;")}\' placeholder=\'(optional name)\' style=\'width:120px;margin-left:4px;\' /> <button class=\'copy\'>Copy</button> <button class=\'remove\'>Remove</button> <button class=\'color\'>Color</button>`;',
	        '      li.style.background = "";',
	        '      li.style.borderRadius = "4px";',
	        '      li.style.marginBottom = "2px";',
	        '      li.querySelector(".reveal").onclick = function() { vscode.postMessage({ type: "revealBlockGlobal", file: entry.file, block: entry.block }); };',
	        '      li.querySelector(".copy").onclick = function() { vscode.postMessage({ type: "copyBlockGlobal", file: entry.file, block: entry.block, color: entry.color }); };',
		'      li.querySelector(".remove").onclick = function() { vscode.postMessage({ type: "removeBlockGlobal", file: entry.file, block: entry.block, color: entry.color }); };',
		'      li.querySelector(".color").onclick = function() { showPaletteFor(entry.block, entry.file); };',
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

	// Command to toggle hide highlights (also bound to Ctrl+Alt+H)
	context.subscriptions.push(vscode.commands.registerCommand('line-highlighter.toggleHideHighlights', async () => {
		const current = getHideHighlights(context);
		setHideHighlights(context, !current);
		updateAllDecorations();
		if (currentWebviewView) {
			currentWebviewView.webview.html = getSidebarHtml(getHighlightColor(), getHideHighlights(context));
		}
	}));
}

// This method is called when your extension is deactivated
export function deactivate() {}
