/** Escapa texto pra uso seguro dentro de sendMessage com parse_mode "HTML". */
export function escaparTelegramHtml(texto: string): string {
  return texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
