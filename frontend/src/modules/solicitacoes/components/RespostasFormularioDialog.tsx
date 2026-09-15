import { Paperclip } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Dialog } from '../../../components/ui/Dialog';
import type { Solicitacao } from '../types/solicitacao.types';
import { visualizarAnexoSolicitacao } from '../utils/anexo';

interface RespostasFormularioDialogProps {
  solicitacao: Solicitacao | null;
  onOpenChange: (open: boolean) => void;
}

export function RespostasFormularioDialog({ solicitacao, onOpenChange }: RespostasFormularioDialogProps) {
  const [erro, setErro] = useState<string | null>(null);
  const campos = solicitacao?.tipo.camposFormulario ?? [];

  async function abrirAnexo(campoId: string) {
    if (!solicitacao) return;
    setErro(null);
    try {
      await visualizarAnexoSolicitacao(solicitacao.id, campoId);
    } catch {
      setErro('Não foi possível abrir o anexo.');
    }
  }

  return (
    <Dialog open={!!solicitacao} onOpenChange={onOpenChange} title="Respostas do formulário" className="max-w-lg">
      {erro && <p className="mb-3 text-sm text-[var(--color-danger)]">{erro}</p>}
      <div className="flex flex-col gap-4">
        {campos.length === 0 ? (
          <p className="text-sm text-[var(--color-text-secondary)]">Este tipo não tem campos configurados.</p>
        ) : (
          campos.map((campo) => {
            const valor = solicitacao?.respostasFormulario?.[campo.id];
            return (
              <div key={campo.id}>
                <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">{campo.label}</p>
                {campo.tipo === 'ARQUIVO' ? (
                  valor && typeof valor === 'object' && 'nome' in valor ? (
                    <Button variant="ghost" size="sm" className="gap-1.5 px-2" onClick={() => abrirAnexo(campo.id)}>
                      <Paperclip aria-hidden="true" className="h-4 w-4" />
                      {valor.nome}
                    </Button>
                  ) : (
                    <p className="text-sm text-[var(--color-text-secondary)]">—</p>
                  )
                ) : (
                  <p className="text-sm text-[var(--color-text-primary)]">
                    {Array.isArray(valor) ? valor.join(', ') : typeof valor === 'string' ? valor || '—' : '—'}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>
    </Dialog>
  );
}
