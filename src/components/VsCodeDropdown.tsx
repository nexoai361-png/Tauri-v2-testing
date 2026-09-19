import { createSignal, onMount, onCleanup, For, Show } from 'solid-js';

export interface DropdownOption {
  id: string;
  name: string;
  [key: string]: any;
}

interface VsCodeDropdownProps {
  options: DropdownOption[];
  selectedId: string;
  onSelect: (option: DropdownOption) => void;
  label?: string;
  icon?: string;
  widthClass?: string;
}

export function VsCodeDropdown(props: VsCodeDropdownProps) {
  const [isOpen, setIsOpen] = createSignal(false);
  let containerRef!: HTMLDivElement;

  const selectedOption = () => props.options.find((o) => o.id === props.selectedId) || props.options[0];

  const handleClickOutside = (e: MouseEvent) => {
    if (containerRef && !containerRef.contains(e.target as Node)) {
      setIsOpen(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  onMount(() => {
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
  });

  onCleanup(() => {
    document.removeEventListener('mousedown', handleClickOutside);
    document.removeEventListener('keydown', handleKeyDown);
  });

  return (
    <div ref={containerRef} class={`relative font-sans text-xs ${props.widthClass || 'w-48'}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen())}
        class={`w-full flex items-center justify-between px-2.5 py-1.5 bg-[#3c3c3c] text-white border transition-all select-none ${
          isOpen()
            ? 'border-[#007acc] bg-[#2d2d2d] shadow-md ring-1 ring-[#007acc]'
            : 'border-[#333333] hover:border-[#007acc] hover:bg-[#454545]'
        }`}
      >
        <span class="flex items-center gap-1.5 truncate">
          <Show when={props.icon}>
            <span class="material-symbols-outlined text-sm text-[#007acc]">{props.icon}</span>
          </Show>
          <span class="truncate font-medium text-white">{selectedOption()?.name}</span>
        </span>
        <span class={`material-symbols-outlined text-sm text-[#cccccc] transition-transform duration-150 ${isOpen() ? 'rotate-180 text-[#007acc]' : ''}`}>
          expand_more
        </span>
      </button>

      {/* VS Code Dropdown Menu Popup */}
      <Show when={isOpen()}>
        <div class="absolute left-0 right-0 top-full mt-1 z-50 bg-[#252526] border border-[#007acc] shadow-2xl max-h-56 overflow-y-auto font-sans select-none animate-in fade-in zoom-in-95 duration-100">
          <For each={props.options}>
            {(option) => {
              const isSelected = () => option.id === props.selectedId;
              return (
                <button
                  type="button"
                  onClick={() => {
                    props.onSelect(option);
                    setIsOpen(false);
                  }}
                  class={`w-full text-left px-3 py-1.5 flex items-center justify-between text-xs transition-colors ${
                    isSelected()
                      ? 'bg-[#04395e] text-white font-bold border-l-2 border-l-[#007acc]'
                      : 'text-[#cccccc] hover:bg-[#2a2d2e] hover:text-white border-l-2 border-l-transparent'
                  }`}
                >
                  <span class="truncate">{option.name}</span>
                  <Show when={isSelected()}>
                    <span class="material-symbols-outlined text-xs text-[#007acc]">check</span>
                  </Show>
                </button>
              );
            }}
          </For>
        </div>
      </Show>
    </div>
  );
}
