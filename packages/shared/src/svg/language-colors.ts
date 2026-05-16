// Shared palette of GitHub language colors used by multiple renderers.
// Source: https://github.com/ozh/github-colors (subset)

const PALETTE: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Svelte: '#ff3e00',
  Python: '#3572A5',
  Go: '#00ADD8',
  Rust: '#dea584',
  HTML: '#e34c26',
  CSS: '#563d7c',
  SCSS: '#c6538c',
  Shell: '#89e051',
  Ruby: '#701516',
  Java: '#b07219',
  Kotlin: '#A97BFF',
  Swift: '#F05138',
  C: '#555555',
  'C++': '#f34b7d',
  'C#': '#178600',
  Vue: '#41b883',
  PHP: '#4F5D95',
  Elixir: '#6e4a7e',
  Haskell: '#5e5086',
  Lua: '#000080',
  Dart: '#00B4AB',
  R: '#198CE7',
  Julia: '#a270ba',
  Zig: '#ec915c',
  Nim: '#ffc200',
  OCaml: '#3be133',
  Clojure: '#db5855',
  Erlang: '#B83998',
  Scala: '#c22d40',
  Perl: '#0298c3',
  ObjectiveC: '#438eff',
};

export function languageColor(name: string): string {
  return PALETTE[name] ?? '#8b949e';
}
