export const CATEGORY_EMOJI: Record<string, string> = {
  'Cadernos': '📓', 'Canetas': '🖊️', 'Acessórios': '🎒', 'Cervejas': '🍺',
  'Espumantes': '🍾', 'Organizadores': '🗂️', 'Áudio': '🎧', 'Marcadores': '🖍️',
  'Periféricos': '⌨️', 'Adesivos': '🏷️', 'Bebidas': '🥤', 'Vinhos': '🍷',
  'Destilados': '🥃', 'Alimentos': '🍱', 'Roupas': '👕', 'Eletrônicos': '📱',
  'Livros': '📚', 'Beleza': '💄', 'Saúde': '💊', 'Casa': '🏠', 'Brinquedos': '🧸',
};

export function getCategoryEmoji(cat: string): string {
  return CATEGORY_EMOJI[cat] ?? '🏷️';
}
