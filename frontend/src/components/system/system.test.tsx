import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageShell } from './PageShell';
import { SvgIcon } from './SvgIcon';

describe('System components', () => {
  it('SvgIcon masks the requested file so it inherits the current color', () => {
    const { container } = render(<SvgIcon name="settings" className="h-6 w-6" />);
    const icon = container.querySelector('span');
    expect(icon).toHaveClass('bg-current', 'h-6', 'w-6');
    expect(icon).toHaveStyle({ maskImage: 'url(/assets/svg/settings.svg)' });
  });

  it('PageShell renders its children inside a constrained container', () => {
    render(
      <PageShell>
        <p>conteúdo</p>
      </PageShell>,
    );
    expect(screen.getByText('conteúdo')).toBeInTheDocument();
  });
});
