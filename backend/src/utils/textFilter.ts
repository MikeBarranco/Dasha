// Filtro de lenguaje del foro (validación autoritativa en el servidor).
//
// Espejo de frontend/src/lib/textFilter.ts: el front bloquea al instante para
// dar buena experiencia, pero el servidor SIEMPRE revalida porque un cliente
// puede saltarse la validación del navegador. Si editas una lista, edita la otra.
//
// Coincidencia por PALABRA COMPLETA sobre el texto normalizado (sin acentos, sin
// "leet", sin letras repetidas) para atrapar evasiones (put0, putooo) sin castigar
// palabras normales del español de México (coger, chido, concha, etc.).

const BANNED_WORDS = [
  // insultos
  'pendejo', 'pendeja', 'pendejos', 'pendejas', 'imbecil', 'idiota',
  'estupido', 'estupida', 'cabron', 'cabrona', 'cabrones', 'culero',
  'culera', 'culeros', 'mamon', 'mamona', 'mamada', 'mamadas', 'gilipollas',
  'tarado', 'tarada', 'mongolo', 'mongola',
  // vulgares / sexuales
  'verga', 'vergas', 'chinga', 'chingar', 'chingada', 'chingado', 'chingas',
  'chingue', 'chinguen', 'pinche', 'pinches', 'puto', 'puta', 'putos', 'putas',
  'cono', 'cojones', 'polla', 'follar', 'mierda', 'mierdas',
  // discriminatorios
  'maricon', 'marica', 'joto', 'jota', 'naco', 'naca',
  // ingles
  'fuck', 'fucking', 'fucked', 'shit', 'bitch', 'asshole', 'dick', 'cunt',
  'bastard', 'motherfucker', 'faggot', 'nigger', 'nigga',
];

const LEET: Record<string, string> = {
  '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's',
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[013457@$]/g, (c) => LEET[c] ?? c)
    .replace(/(.)\1{2,}/g, '$1');
}

const banned = new Set(BANNED_WORDS);

// Devuelve la primera palabra prohibida encontrada, o null si el texto está limpio.
export function findBannedWord(text: string): string | null {
  const tokens = normalize(text).split(/[^a-z]+/).filter(Boolean);
  for (const token of tokens) {
    if (banned.has(token)) return token;
  }
  return null;
}

export function containsBannedWord(text: string): boolean {
  return findBannedWord(text) !== null;
}
