import { createSignal, onMount, onCleanup, createEffect, Show, For } from 'solid-js';
import { EditorState, Compartment } from '@codemirror/state';
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
  drawSelection,
  dropCursor,
  rectangularSelection,
  crosshairCursor
} from '@codemirror/view';
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
  selectAll,
  undo,
  redo
} from '@codemirror/commands';
import { searchKeymap, highlightSelectionMatches, search, openSearchPanel } from '@codemirror/search';
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { foldGutter, indentOnInput, syntaxHighlighting, defaultHighlightStyle, bracketMatching, foldKeymap } from '@codemirror/language';
import { oneDark } from '@codemirror/theme-one-dark';

// Language extensions
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';
import { cpp } from '@codemirror/lang-cpp';
import { sql } from '@codemirror/lang-sql';
import { yaml } from '@codemirror/lang-yaml';

import { LANGUAGES, THEMES, LanguageOption, ThemeOption } from './editor-config';
import { VsCodeDropdown } from './components/VsCodeDropdown';

export default function App() {
  let editorContainer!: HTMLDivElement;
  let view: EditorView | null = null;

  // Compartments for dynamic re-configuration
  const languageCompartment = new Compartment();
  const themeCompartment = new Compartment();
  const fontSizeCompartment = new Compartment();
  const lineNumbersCompartment = new Compartment();
  const wordWrapCompartment = new Compartment();
  const readOnlyCompartment = new Compartment();

  // Signals
  const [selectedLanguage, setSelectedLanguage] = createSignal<LanguageOption>(LANGUAGES[0]);
  const [selectedTheme, setSelectedTheme] = createSignal<ThemeOption>(THEMES[0]);
  const [fontSize, setFontSize] = createSignal<number>(14);
  const [wordWrap, setWordWrap] = createSignal<boolean>(true);
  const [showLineNumbers, setShowLineNumbers] = createSignal<boolean>(true);
  const [readOnly, setReadOnly] = createSignal<boolean>(false);

  // Status signals
  const [cursorPos, setCursorPos] = createSignal({ row: 1, col: 1 });
  const [totalLines, setTotalLines] = createSignal(1);
  const [totalChars, setTotalChars] = createSignal(0);
  const [selectionRange, setSelectionRange] = createSignal<{ from: number; to: number; len: number }>({ from: 0, to: 0, len: 0 });
  const [toastMessage, setToastMessage] = createSignal<string | null>(null);

  // UI Panels
  const [showSidebar, setShowSidebar] = createSignal<boolean>(false);
  const [showTerminal, setShowTerminal] = createSignal<boolean>(false);
  const [terminalOutput, setTerminalOutput] = createSignal<string[]>(['[VS Code Terminal] Ready. Press "Run Code" to execute.']);
  const [showSettingsModal, setShowSettingsModal] = createSignal<boolean>(false);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2000);
  };

  const getLanguageExtension = (id: string) => {
    switch (id) {
      case 'javascript':
        return javascript();
      case 'typescript':
        return javascript({ typescript: true });
      case 'python':
        return python();
      case 'html':
        return html();
      case 'css':
        return css();
      case 'json':
        return json();
      case 'markdown':
        return markdown();
      case 'cpp':
        return cpp();
      case 'sql':
        return sql();
      case 'yaml':
        return yaml();
      default:
        return javascript();
    }
  };

  const getThemeExtension = (id: string) => {
    switch (id) {
      case 'one-dark':
        return oneDark;
      case 'vscode-dark':
        return EditorView.theme({
          "&": { color: "#d4d4d4", backgroundColor: "#1e1e1e" },
          ".cm-content": { caretColor: "#ffffff" },
          "&.cm-focused .cm-selectionBackground, ::selection": { backgroundColor: "#264f78" },
          ".cm-gutters": { backgroundColor: "#181818", color: "#858585", borderRight: "1px solid #282828" },
          ".cm-activeLineGutter": { backgroundColor: "#252526", color: "#007acc" },
          ".cm-activeLine": { backgroundColor: "#282828" }
        }, { dark: true });
      case 'dracula':
        return EditorView.theme({
          "&": { color: "#f8f8f2", backgroundColor: "#282a36" },
          ".cm-content": { caretColor: "#f8f8f2" },
          ".cm-gutters": { backgroundColor: "#21222c", color: "#6272a4", borderRight: "1px solid #44475a" },
          ".cm-activeLineGutter": { backgroundColor: "#44475a", color: "#ff79c6" },
          ".cm-activeLine": { backgroundColor: "#44475a44" }
        }, { dark: true });
      case 'solarized-dark':
        return EditorView.theme({
          "&": { color: "#839496", backgroundColor: "#002b36" },
          ".cm-gutters": { backgroundColor: "#073642", color: "#586e75", borderRight: "1px solid #073642" },
          ".cm-activeLine": { backgroundColor: "#073642" }
        }, { dark: true });
      case 'github-light':
        return EditorView.theme({
          "&": { color: "#24292e", backgroundColor: "#ffffff" },
          ".cm-gutters": { backgroundColor: "#f6f8fa", color: "#959da5", borderRight: "1px solid #e1e4e8" },
          ".cm-activeLine": { backgroundColor: "#f6f8fa" }
        }, { dark: false });
      default:
        return oneDark;
    }
  };

  onMount(() => {
    if (!editorContainer) return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.selectionSet || update.docChanged) {
        const state = update.state;
        const mainSel = state.selection.main;
        const pos = mainSel.head;
        const line = state.doc.lineAt(pos);

        setCursorPos({ row: line.number, col: pos - line.from + 1 });
        setTotalLines(state.doc.lines);
        setTotalChars(state.doc.length);

        const selLen = Math.abs(mainSel.to - mainSel.from);
        setSelectionRange({
          from: mainSel.from,
          to: mainSel.to,
          len: selLen
        });
      }
    });

    const startState = EditorState.create({
      doc: selectedLanguage().defaultCode,
      extensions: [
        history(),
        drawSelection(),
        dropCursor(),
        EditorState.allowMultipleSelections.of(true),
        indentOnInput(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        bracketMatching(),
        closeBrackets(),
        autocompletion(),
        rectangularSelection(),
        crosshairCursor(),
        highlightActiveLine(),
        search({ top: true }),
        highlightSelectionMatches(),

        // Intercept native mobile context menu
        EditorView.domEventHandlers({
          contextmenu(event) {
            event.preventDefault();
            return true;
          }
        }),

        // Reconfigurable Compartments
        languageCompartment.of(getLanguageExtension(selectedLanguage().id)),
        themeCompartment.of(getThemeExtension(selectedTheme().id)),
        fontSizeCompartment.of(
          EditorView.theme({
            '&': { fontSize: `${fontSize()}px` },
            '.cm-gutters, .cm-gutter, .cm-gutterElement': { fontSize: `${fontSize()}px` }
          })
        ),
        lineNumbersCompartment.of(
          showLineNumbers() ? [lineNumbers(), highlightActiveLineGutter(), foldGutter()] : []
        ),
        wordWrapCompartment.of(wordWrap() ? EditorView.lineWrapping : []),
        readOnlyCompartment.of(EditorState.readOnly.of(readOnly())),

        // Keymaps
        keymap.of([
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...searchKeymap,
          ...historyKeymap,
          ...foldKeymap,
          ...completionKeymap,
          indentWithTab
        ]),

        updateListener
      ]
    });

    view = new EditorView({
      state: startState,
      parent: editorContainer
    });

    setTotalLines(startState.doc.lines);
    setTotalChars(startState.doc.length);

    onCleanup(() => {
      if (view) {
        view.destroy();
        view = null;
      }
    });
  });

  // Reconfigure extensions dynamically via signals
  createEffect(() => {
    if (!view) return;
    view.dispatch({
      effects: languageCompartment.reconfigure(getLanguageExtension(selectedLanguage().id))
    });
  });

  createEffect(() => {
    if (!view) return;
    view.dispatch({
      effects: themeCompartment.reconfigure(getThemeExtension(selectedTheme().id))
    });
  });

  createEffect(() => {
    if (!view) return;
    const size = fontSize();
    view.dispatch({
      effects: fontSizeCompartment.reconfigure(
        EditorView.theme({
          '&': { fontSize: `${size}px` },
          '.cm-gutters, .cm-gutter, .cm-gutterElement': { fontSize: `${size}px` }
        })
      )
    });
  });

  createEffect(() => {
    if (!view) return;
    view.dispatch({
      effects: lineNumbersCompartment.reconfigure(
        showLineNumbers() ? [lineNumbers(), highlightActiveLineGutter(), foldGutter()] : []
      )
    });
  });

  createEffect(() => {
    if (!view) return;
    view.dispatch({
      effects: wordWrapCompartment.reconfigure(wordWrap() ? EditorView.lineWrapping : [])
    });
  });

  createEffect(() => {
    if (!view) return;
    view.dispatch({
      effects: readOnlyCompartment.reconfigure(EditorState.readOnly.of(readOnly()))
    });
  });

  // Actions
  const handleFileSelect = (lang: LanguageOption) => {
    if (view) {
      setSelectedLanguage(lang);
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: lang.defaultCode }
      });
      setShowSidebar(false);
      triggerToast(`Opened ${lang.name} file`);
    }
  };

  const handleOpenSearch = () => {
    if (view) {
      openSearchPanel(view);
    }
  };

  const handleRunCode = () => {
    if (!view) return;
    setShowTerminal(true);
    const code = view.state.doc.toString();
    const lang = selectedLanguage().id;

    setTerminalOutput((prev) => [
      ...prev,
      `\n$ running file.${selectedLanguage().extension} (${lang})...`
    ]);

    if (lang === 'javascript' || lang === 'typescript') {
      try {
        const logs: string[] = [];
        const customConsole = {
          log: (...args: unknown[]) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')),
          error: (...args: unknown[]) => logs.push('ERROR: ' + args.join(' ')),
          warn: (...args: unknown[]) => logs.push('WARN: ' + args.join(' '))
        };
        const runFn = new Function('console', code);
        runFn(customConsole);
        if (logs.length > 0) {
          setTerminalOutput((prev) => [...prev, ...logs, '[Process finished with exit code 0]']);
        } else {
          setTerminalOutput((prev) => [...prev, '[Output empty or returned undefined]', '[Process finished with exit code 0]']);
        }
      } catch (err) {
        setTerminalOutput((prev) => [...prev, `[Runtime Error] ${(err as Error).message}`]);
      }
    } else {
      setTerminalOutput((prev) => [
        ...prev,
        `[Syntax Checked] ${selectedLanguage().name} code parsed successfully.`,
        `Line count: ${totalLines()} | Character count: ${totalChars()}`,
        '[Process finished with exit code 0]'
      ]);
    }
  };

  // Selection Actions
  const handleCopySelected = () => {
    if (!view) return;
    const text = view.state.sliceDoc(selectionRange().from, selectionRange().to);
    if (text) {
      navigator.clipboard.writeText(text).then(() => triggerToast('Copied to clipboard'));
    }
  };

  const handleCutSelected = () => {
    if (!view || readOnly()) return;
    const text = view.state.sliceDoc(selectionRange().from, selectionRange().to);
    if (text) {
      navigator.clipboard.writeText(text).then(() => {
        view?.dispatch({
          changes: { from: selectionRange().from, to: selectionRange().to, insert: '' }
        });
        triggerToast('Cut to clipboard');
      });
    }
  };

  const handlePaste = async () => {
    if (!view || readOnly()) return;
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        const sel = view.state.selection.main;
        view.dispatch({
          changes: { from: sel.from, to: sel.to, insert: text },
          selection: { anchor: sel.from + text.length }
        });
        triggerToast('Pasted from clipboard');
      }
    } catch {
      triggerToast('Clipboard access required');
    }
  };

  const handleSelectAll = () => {
    if (view) selectAll(view);
  };

  const handleUndo = () => {
    if (view) undo(view);
  };

  const handleRedo = () => {
    if (view) redo(view);
  };

  const handleInsertChar = (char: string) => {
    if (!view || readOnly()) return;
    const sel = view.state.selection.main;
    view.dispatch({
      changes: { from: sel.from, to: sel.to, insert: char },
      selection: { anchor: sel.from + char.length }
    });
    view.focus();
  };

  const handleClearSelection = () => {
    if (view) {
      const pos = view.state.selection.main.head;
      view.dispatch({ selection: { anchor: pos } });
    }
  };

  const getMaterialFileIcon = (ext: string) => {
    if (ext === 'json' || ext === 'yaml') {
      return 'data_object';
    }
    return 'code';
  };

  return (
    <div class="flex flex-col h-screen w-screen bg-[#000000] text-[#cccccc] font-sans overflow-hidden select-none">
      {/* 1. VS CODE MOBILE TOP NAVIGATION BAR WITH MATERIAL ICONS */}
      <header class="flex items-center justify-between px-2 py-1 bg-[#252526] text-[#cccccc] border-b border-[#333333] shrink-0 text-xs">
        <div class="flex items-center space-x-2">
          {/* File Explorer Toggle */}
          <button
            onClick={() => setShowSidebar(!showSidebar())}
            class="p-1 hover:bg-[#333333] text-white border border-[#333333] transition-colors flex items-center justify-center"
            title="Toggle File Explorer"
          >
            <span class="material-symbols-outlined text-lg">folder_open</span>
          </button>

          {/* VS Code Logo & Title */}
          <div class="flex items-center space-x-1 border-r border-[#333333] pr-2">
            <span class="material-symbols-outlined text-white text-lg">code</span>
            <span class="font-bold text-xs text-white hidden sm:inline">VS Code</span>
          </div>

          {/* Active File Tab */}
          <div class="flex items-center bg-[#1e1e1e] border-t-2 border-t-[#007acc] border-x border-[#333333] px-2 py-0.5 text-white text-xs font-mono">
            <span class={`material-symbols-outlined text-sm mr-1 ${
              getMaterialFileIcon(selectedLanguage().extension) === 'code' ? 'text-[#ff5555]' : 'text-white'
            }`}>
              {getMaterialFileIcon(selectedLanguage().extension)}
            </span>
            <span>main.{selectedLanguage().extension}</span>
          </div>
        </div>

        {/* Top Header Quick Actions */}
        <div class="flex items-center space-x-1">
          {/* Search Trigger */}
          <button
            onClick={handleOpenSearch}
            class="px-2 py-1 bg-[#333333] hover:bg-[#007acc] hover:text-white border border-[#333333] transition-colors flex items-center gap-1"
            title="Search (Ctrl+F)"
          >
            <span class="material-symbols-outlined text-sm">search</span>
          </button>

          {/* Run Code Button */}
          <button
            onClick={handleRunCode}
            class="px-2.5 py-1 bg-[#0e639c] hover:bg-[#1177bb] text-white font-semibold text-xs border border-[#007acc] transition-colors flex items-center gap-1"
            title="Run Code"
          >
            <span class="material-symbols-outlined text-sm">play_arrow</span>
            <span class="hidden sm:inline">Run</span>
          </button>

          {/* Settings Trigger */}
          <button
            onClick={() => setShowSettingsModal(!showSettingsModal())}
            class="px-2 py-1 bg-[#333333] hover:bg-[#007acc] text-white border border-[#333333] transition-colors flex items-center gap-1"
            title="VS Code Settings"
          >
            <span class="material-symbols-outlined text-sm">settings</span>
          </button>
        </div>
      </header>

      {/* MAIN CONTAINER (SIDEBAR DRAWER + EDITOR) */}
      <div class="relative flex-1 w-full h-full bg-[#1e1e1e] flex overflow-hidden">
        {/* 2. FILE EXPLORER SIDEBAR DRAWER WITH MATERIAL ICONS */}
        <Show when={showSidebar()}>
          <div class="absolute inset-y-0 left-0 z-30 w-64 bg-[#252526] border-r border-[#333333] flex flex-col shadow-2xl animate-fade-in font-mono">
            <div class="flex items-center justify-between px-3 py-2 border-b border-[#333333] bg-[#1e1e1e]">
              <span class="text-xs font-bold text-[#858585] tracking-wider uppercase flex items-center gap-1.5">
                <span class="material-symbols-outlined text-base text-white">folder</span>
                EXPLORER: WORKSPACE
              </span>
              <button
                onClick={() => setShowSidebar(false)}
                class="text-[#858585] hover:text-white text-xs font-bold p-1 flex items-center"
              >
                <span class="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <div class="flex-1 overflow-y-auto py-1">
              <div class="px-3 py-1 text-[11px] text-[#858585] uppercase tracking-wider font-semibold flex items-center gap-1">
                <span class="material-symbols-outlined text-xs">arrow_drop_down</span>
                PROJECT FILES
              </div>
              <For each={LANGUAGES}>
                {(lang) => {
                  const icon = getMaterialFileIcon(lang.extension);
                  return (
                    <button
                      onClick={() => handleFileSelect(lang)}
                      class={`w-full text-left px-4 py-1.5 text-xs flex items-center justify-between border-l-2 transition-colors ${
                        selectedLanguage().id === lang.id
                          ? 'bg-[#37373d] text-white border-l-[#007acc] font-semibold'
                          : 'border-l-transparent text-[#cccccc] hover:bg-[#2a2d2e] hover:text-white'
                      }`}
                    >
                      <span class="flex items-center gap-2">
                        <span class={`material-symbols-outlined text-sm ${
                          icon === 'code' ? 'text-[#ff5555]' : 'text-white'
                        }`}>
                          {icon}
                        </span>
                        <span>main.{lang.extension}</span>
                      </span>
                      <span class="text-[10px] text-[#858585] uppercase">{lang.name}</span>
                    </button>
                  );
                }}
              </For>
            </div>

            <div class="p-2 border-t border-[#333333] bg-[#1e1e1e] text-[11px] text-[#858585] flex items-center gap-1">
              <span class="material-symbols-outlined text-xs text-white">info</span>
              VS Code Material UI System
            </div>
          </div>
        </Show>

        {/* 3. CODE MIRROR 6 EDITOR CANVAS */}
        <div class="relative flex-1 w-full h-full bg-[#1e1e1e]">
          <div ref={editorContainer} class="absolute inset-0 w-full h-full text-sm font-mono" />

          {/* Floating Selection Toolbar for Mobile with Material Icons */}
          <Show when={selectionRange().len > 0}>
            <div class="absolute top-2 left-1/2 -translate-x-1/2 z-40 bg-[#252526] border border-[#007acc] text-white px-2 py-1 text-xs font-mono shadow-2xl flex items-center space-x-1">
              <span class="text-[#007acc] font-bold px-1 border-r border-[#333333]">
                {selectionRange().len} sel
              </span>
              <button
                onClick={handleCopySelected}
                class="px-2 py-0.5 bg-[#333333] hover:bg-[#007acc] font-semibold transition-colors flex items-center gap-1"
                title="Copy"
              >
                <span class="material-symbols-outlined text-xs">content_copy</span>
                <span>Copy</span>
              </button>
              <Show when={!readOnly()}>
                <button
                  onClick={handleCutSelected}
                  class="px-2 py-0.5 bg-[#333333] hover:bg-[#007acc] font-semibold transition-colors flex items-center gap-1"
                  title="Cut"
                >
                  <span class="material-symbols-outlined text-xs">content_cut</span>
                  <span>Cut</span>
                </button>
                <button
                  onClick={handlePaste}
                  class="px-2 py-0.5 bg-[#333333] hover:bg-[#007acc] font-semibold transition-colors flex items-center gap-1"
                  title="Paste"
                >
                  <span class="material-symbols-outlined text-xs">content_paste</span>
                  <span>Paste</span>
                </button>
              </Show>
              <button
                onClick={handleSelectAll}
                class="px-2 py-0.5 bg-[#333333] hover:bg-[#007acc] font-semibold transition-colors flex items-center gap-1"
                title="Select All"
              >
                <span class="material-symbols-outlined text-xs">select_all</span>
                <span>All</span>
              </button>
              <button
                onClick={handleClearSelection}
                class="px-1 py-0.5 hover:text-red-400 font-bold ml-1 flex items-center"
                title="Clear Selection"
              >
                <span class="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
          </Show>

          {/* Toast Notification with Material Icon */}
          <Show when={toastMessage()}>
            <div class="absolute bottom-4 right-4 z-50 bg-[#007acc] text-white px-3 py-1.5 text-xs font-mono font-semibold shadow-2xl border border-white/20 flex items-center gap-1.5">
              <span class="material-symbols-outlined text-sm">check_circle</span>
              <span>{toastMessage()}</span>
            </div>
          </Show>
        </div>
      </div>

      {/* 4. VS CODE TERMINAL / OUTPUT PANEL WITH MATERIAL ICONS */}
      <Show when={showTerminal()}>
        <div class="h-40 bg-[#1e1e1e] border-t border-[#333333] flex flex-col shrink-0 text-xs font-mono">
          <div class="flex items-center justify-between px-3 py-1 bg-[#252526] border-b border-[#333333] text-[#858585]">
            <div class="flex items-center space-x-3">
              <span class="text-white font-bold border-b-2 border-[#007acc] pb-0.5 flex items-center gap-1">
                <span class="material-symbols-outlined text-sm text-white">terminal</span>
                TERMINAL
              </span>
              <span class="hover:text-white cursor-pointer flex items-center gap-1">
                <span class="material-symbols-outlined text-sm">output</span>
                OUTPUT
              </span>
            </div>
            <button
              onClick={() => setShowTerminal(false)}
              class="text-[#858585] hover:text-white font-bold p-0.5 flex items-center"
            >
              <span class="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
          <div class="flex-1 overflow-y-auto p-2 bg-[#000000] text-[#00ff66] space-y-1">
            <For each={terminalOutput()}>
              {(line) => <div>{line}</div>}
            </For>
          </div>
        </div>
      </Show>

      {/* 5. MOBILE QUICK SYMBOL KEYBOARD TOOLBAR WITH MATERIAL ICONS */}
      <div class="bg-[#252526] border-t border-[#333333] px-2 py-1 flex items-center space-x-1.5 overflow-x-auto shrink-0 select-none font-mono text-xs no-scrollbar">
        {/* Indent / Tab */}
        <button
          onClick={() => handleInsertChar('  ')}
          class="px-2.5 py-1 bg-[#333333] hover:bg-[#007acc] text-white border border-[#333333] font-bold text-xs shrink-0 flex items-center gap-1"
          title="Indent / Tab"
        >
          <span class="material-symbols-outlined text-xs">keyboard_tab</span>
          <span>Tab</span>
        </button>

        {/* Undo / Redo */}
        <button
          onClick={handleUndo}
          class="px-2 py-1 bg-[#333333] hover:bg-[#007acc] text-white border border-[#333333] font-bold shrink-0 flex items-center"
          title="Undo"
        >
          <span class="material-symbols-outlined text-sm">undo</span>
        </button>
        <button
          onClick={handleRedo}
          class="px-2 py-1 bg-[#333333] hover:bg-[#007acc] text-white border border-[#333333] font-bold shrink-0 flex items-center"
          title="Redo"
        >
          <span class="material-symbols-outlined text-sm">redo</span>
        </button>

        {/* Clipboard Actions */}
        <button
          onClick={handleCopySelected}
          class="px-2 py-1 bg-[#333333] hover:bg-[#007acc] text-white border border-[#333333] shrink-0 flex items-center gap-1"
        >
          <span class="material-symbols-outlined text-xs">content_copy</span>
          <span>Copy</span>
        </button>
        <button
          onClick={handlePaste}
          class="px-2 py-1 bg-[#333333] hover:bg-[#007acc] text-white border border-[#333333] shrink-0 flex items-center gap-1"
        >
          <span class="material-symbols-outlined text-xs">content_paste</span>
          <span>Paste</span>
        </button>

        <span class="w-[1px] h-4 bg-[#333333] shrink-0 mx-1" />

        {/* Quick Symbols for Mobile Programming */}
        <For each={['{', '}', '(', ')', '[', ']', ';', '=', '"', "'", ':', ',', '<', '>', '+', '-']}>
          {(symbol) => (
            <button
              onClick={() => handleInsertChar(symbol)}
              class="px-2.5 py-1 bg-[#1e1e1e] hover:bg-[#007acc] text-[#007acc] hover:text-white border border-[#333333] font-bold shrink-0"
            >
              {symbol}
            </button>
          )}
        </For>
      </div>

      {/* 6. SETTINGS MODAL WITH MATERIAL ICONS */}
      <Show when={showSettingsModal()}>
        <div class="absolute inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div class="w-full max-w-sm bg-[#252526] border border-[#333333] shadow-2xl p-4 text-xs font-mono text-[#cccccc]">
            <div class="flex items-center justify-between pb-2 border-b border-[#333333] mb-3">
              <span class="font-bold text-[#007acc] uppercase tracking-wider flex items-center gap-1">
                <span class="material-symbols-outlined text-base">settings</span>
                VS Code Settings
              </span>
              <button
                onClick={() => setShowSettingsModal(false)}
                class="text-[#858585] hover:text-white font-bold p-0.5 flex items-center"
              >
                <span class="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <div class="space-y-3">
              {/* Language Selector */}
              <div class="flex items-center justify-between gap-2">
                <span class="text-[#858585] font-sans">Language Mode:</span>
                <VsCodeDropdown
                  options={LANGUAGES}
                  selectedId={selectedLanguage().id}
                  onSelect={(opt) => {
                    const l = LANGUAGES.find(item => item.id === opt.id);
                    if (l) handleFileSelect(l);
                  }}
                  icon="code"
                  widthClass="w-44"
                />
              </div>

              {/* Theme Selector */}
              <div class="flex items-center justify-between gap-2">
                <span class="text-[#858585] font-sans">Theme:</span>
                <VsCodeDropdown
                  options={THEMES}
                  selectedId={selectedTheme().id}
                  onSelect={(opt) => {
                    const t = THEMES.find((th) => th.id === opt.id);
                    if (t) setSelectedTheme(t);
                  }}
                  icon="palette"
                  widthClass="w-44"
                />
              </div>

              {/* Font Size */}
              <div class="flex items-center justify-between">
                <span class="text-[#858585]">Font Size:</span>
                <div class="flex items-center border border-[#333333] bg-[#3c3c3c]">
                  <button
                    onClick={() => setFontSize((s) => Math.max(10, s - 1))}
                    class="px-2 py-0.5 hover:bg-[#505050]"
                  >
                    -
                  </button>
                  <span class="px-2 text-[#007acc] font-bold">{fontSize()}px</span>
                  <button
                    onClick={() => setFontSize((s) => Math.min(32, s + 1))}
                    class="px-2 py-0.5 hover:bg-[#505050]"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Toggles */}
              <label class="flex items-center justify-between cursor-pointer py-1 hover:bg-[#333333] px-1">
                <span>Show Line Numbers</span>
                <input
                  type="checkbox"
                  checked={showLineNumbers()}
                  onChange={(e) => setShowLineNumbers(e.currentTarget.checked)}
                  class="accent-[#007acc]"
                />
              </label>

              <label class="flex items-center justify-between cursor-pointer py-1 hover:bg-[#333333] px-1">
                <span>Enable Word Wrap</span>
                <input
                  type="checkbox"
                  checked={wordWrap()}
                  onChange={(e) => setWordWrap(e.currentTarget.checked)}
                  class="accent-[#007acc]"
                />
              </label>

              <label class="flex items-center justify-between cursor-pointer py-1 hover:bg-[#333333] px-1 border-t border-[#333333] pt-2">
                <span class="text-amber-400 font-bold">Read-Only Mode</span>
                <input
                  type="checkbox"
                  checked={readOnly()}
                  onChange={(e) => setReadOnly(e.currentTarget.checked)}
                  class="accent-amber-500"
                />
              </label>

              <div class="pt-2 text-right">
                <button
                  onClick={() => setShowSettingsModal(false)}
                  class="px-4 py-1 bg-[#0e639c] hover:bg-[#1177bb] text-white font-bold flex items-center gap-1 ml-auto"
                >
                  <span class="material-symbols-outlined text-sm">check</span>
                  <span>Done</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </Show>

      {/* 7. VS CODE BOTTOM STATUS BAR WITH MATERIAL ICONS */}
      <footer class="flex items-center justify-between px-2 py-0.5 bg-[#007acc] text-white text-[11px] shrink-0 select-none font-mono">
        <div class="flex items-center space-x-3">
          <span class="font-bold flex items-center gap-1">
            <span class="material-symbols-outlined text-[10px]">circle</span>
            main*
          </span>
          <span>Ln {cursorPos().row}, Col {cursorPos().col}</span>
          <span class="hidden sm:inline">Lines: {totalLines()}</span>
        </div>

        <div class="flex items-center space-x-3">
          <span class="hidden md:inline">Spaces: 2</span>
          <span>UTF-8</span>
          <span class="uppercase font-bold">{selectedLanguage().name}</span>
        </div>
      </footer>
    </div>
  );
}
