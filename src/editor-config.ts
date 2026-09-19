export interface LanguageOption {
  id: string;
  name: string;
  extension: string;
  defaultCode: string;
}

export interface ThemeOption {
  id: string;
  name: string;
  isDark: boolean;
}

export const LANGUAGES: LanguageOption[] = [
  {
    id: 'javascript',
    name: 'JavaScript',
    extension: 'js',
    defaultCode: `// CodeMirror 6 Editor in SolidJS
function calculateFibonacci(n) {
  if (n <= 1) return n;
  let a = 0, b = 1;
  for (let i = 2; i <= n; i++) {
    let temp = a + b;
    a = b;
    b = temp;
  }
  return b;
}

console.log("Fibonacci(10) =", calculateFibonacci(10));
`
  },
  {
    id: 'typescript',
    name: 'TypeScript',
    extension: 'ts',
    defaultCode: `interface User {
  id: number;
  name: string;
  role: 'admin' | 'developer' | 'guest';
}

function greetUser(user: User): string {
  return \`Hello, \${user.name}! Access level: \${user.role}.\`;
}

const currentUser: User = { id: 1, name: "Alex", role: "developer" };
console.log(greetUser(currentUser));
`
  },
  {
    id: 'python',
    name: 'Python',
    extension: 'py',
    defaultCode: `# Python CodeMirror 6 Demo
import math

def is_prime(n: int) -> bool:
    if n <= 1:
        return False
    for i in range(2, int(math.isqrt(n)) + 1):
        if n % i == 0:
            return False
    return True

primes = [x for x in range(1, 50) if is_prime(x)]
print("Primes up to 50:", primes)
`
  },
  {
    id: 'html',
    name: 'HTML',
    extension: 'html',
    defaultCode: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>CodeMirror 6 SolidJS Editor</title>
  <style>
    body { font-family: monospace; background: #0d1117; color: #58a6ff; padding: 20px; }
    .card { border: 1px solid #30363d; padding: 15px; background: #161b22; }
  </style>
</head>
<body>
  <div class="card">
    <h1>CodeMirror 6 Active!</h1>
    <p>High performance modern editor built with SolidJS.</p>
  </div>
</body>
</html>
`
  },
  {
    id: 'css',
    name: 'CSS',
    extension: 'css',
    defaultCode: `/* Custom CodeMirror 6 Theme */
.cm-editor {
  font-family: 'Fira Code', 'Consolas', monospace;
  font-size: 14px;
  height: 100%;
}

.cm-gutters {
  background-color: #181818;
  border-right: 1px solid #282828;
  color: #858585;
}

.cm-activeLine {
  background-color: #252526;
}
`
  },
  {
    id: 'json',
    name: 'JSON',
    extension: 'json',
    defaultCode: `{
  "name": "cm6-solidjs-editor",
  "version": "1.0.0",
  "description": "CodeMirror 6 Editor in SolidJS",
  "engine": "CodeMirror 6",
  "features": [
    "Syntax Highlighting",
    "Line Numbers",
    "Code Folding",
    "Autocompletion",
    "Search & Replace",
    "Themes"
  ],
  "settings": {
    "tabSize": 2,
    "lineNumbers": true,
    "wordWrap": true
  }
}
`
  },
  {
    id: 'markdown',
    name: 'Markdown',
    extension: 'md',
    defaultCode: `# CodeMirror 6 (SolidJS)

A fast, modular, high-density code editor built with **CodeMirror 6** and **SolidJS**.

## Features
- **Modern CM6 Engine**: Built with modern DOM view and state extensions.
- **Line Numbers & Gutters**: Clean, perfectly aligned code gutters.
- **Autocompletion & Folding**: Full language support.

### Keyboard Shortcuts
- \`Ctrl + F\` : Find & Replace
- \`Ctrl + Z\` : Undo
- \`Ctrl + Y\` / \`Ctrl + Shift + Z\` : Redo
- \`Ctrl + Space\` : Trigger Autocompletion
`
  },
  {
    id: 'cpp',
    name: 'C / C++',
    extension: 'cpp',
    defaultCode: `#include <iostream>
#include <vector>

int main() {
    std::vector<std::string> stack = {"SolidJS", "CodeMirror 6", "Vite", "TypeScript"};
    std::cout << "Engine loaded:" << std::endl;
    for (const auto& item : stack) {
        std::cout << " - " << item << std::endl;
    }
    return 0;
}
`
  },
  {
    id: 'sql',
    name: 'SQL',
    extension: 'sql',
    defaultCode: `-- CodeMirror 6 SQL Query
SELECT 
    id, 
    username, 
    email, 
    created_at 
FROM users 
WHERE status = 'active' 
ORDER BY id DESC 
LIMIT 20;
`
  },
  {
    id: 'yaml',
    name: 'YAML',
    extension: 'yaml',
    defaultCode: `name: CodeMirror 6 SolidJS Workflow
on:
  push:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm install
      - run: npm run build
`
  }
];

export const THEMES: ThemeOption[] = [
  { id: 'one-dark', name: 'One Dark (Default)', isDark: true },
  { id: 'vscode-dark', name: 'VS Code Dark', isDark: true },
  { id: 'dracula', name: 'Dracula Dark', isDark: true },
  { id: 'solarized-dark', name: 'Solarized Dark', isDark: true },
  { id: 'github-light', name: 'GitHub Light', isDark: false }
];
