import type { CSSProperties } from 'react';
import { cn } from '../../lib/cn';

/**
 * Ícone renderizado a partir de um arquivo SVG em `public/assets/svg/<name>.svg`
 * usando CSS `mask`. Ao contrário de `<img>`, isso permite recolorir o ícone
 * via `currentColor` (classe `bg-current`), então ele acompanha o `text-*` do
 * elemento pai — necessário para os estados ativo/inativo da navegação.
 *
 * Tamanho e cor vêm do `className` (ex.: `h-6 w-6 text-white/70`).
 *
 * O conjunto veio do CS-OPS (ícones Tangram). Para ver os nomes disponíveis:
 * `ls public/assets/svg`.
 */
export function SvgIcon({ name, className }: { name: string; className?: string }) {
  const url = `/assets/svg/${name}.svg`;
  const maskStyle: CSSProperties = {
    maskImage: `url(${url})`,
    WebkitMaskImage: `url(${url})`,
    maskRepeat: 'no-repeat',
    WebkitMaskRepeat: 'no-repeat',
    maskPosition: 'center',
    WebkitMaskPosition: 'center',
    maskSize: 'contain',
    WebkitMaskSize: 'contain',
  };

  return <span aria-hidden="true" className={cn('inline-block shrink-0 bg-current', className)} style={maskStyle} />;
}
