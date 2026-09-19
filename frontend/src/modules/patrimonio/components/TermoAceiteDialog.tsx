import { FormEvent, useEffect, useState } from 'react';
import { FileCheck2 } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Dialog } from '../../../components/ui/Dialog';
import { FormActions, FormField } from '../../../components/ui/Form';
import { useAnexarTermo } from '../hooks/usePatrimonio';
import type { AlocacaoEquipamento } from '../types/patrimonio.types';

interface TermoAceiteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vinculo: AlocacaoEquipamento | null;
  descricaoItem: string;
}

/**
 * Assinatura acontece no Clicksign; aqui o colaborador só confirma o aceite
 * e importa de volta o PDF assinado, fechando o registro no portal.
 */
export function TermoAceiteDialog({ open, onOpenChange, vinculo, descricaoItem }: TermoAceiteDialogProps) {
  const anexarTermoMutation = useAnexarTermo();
  const [aceite, setAceite] = useState(false);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setAceite(false);
    setArquivo(null);
    setErro(null);
  }, [open]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!vinculo) return;
    if (!aceite) {
      setErro('Confirme que você assinou o termo no Clicksign para continuar.');
      return;
    }
    if (!arquivo) {
      setErro('Importe o PDF assinado.');
      return;
    }
    setErro(null);
    try {
      await anexarTermoMutation.mutateAsync({ id: vinculo.id, arquivo });
      onOpenChange(false);
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível registrar o aceite.');
    }
  }

  if (!vinculo) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Aceitar termo de responsabilidade" className="max-w-lg">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <p className="text-sm text-[var(--color-text-secondary)]">{descricaoItem}</p>

        <FormField label="Termo assinado (PDF)" htmlFor="termo-aceite-arquivo" hint="Baixe do Clicksign depois de assinar e importe aqui">
          <input
            id="termo-aceite-arquivo"
            type="file"
            accept=".pdf,application/pdf"
            onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
            className="text-sm text-[var(--color-text-secondary)]"
          />
        </FormField>

        <label className="flex items-start gap-2 text-sm text-[var(--color-text-secondary)]">
          <input type="checkbox" className="mt-0.5" checked={aceite} onChange={(e) => setAceite(e.target.checked)} />
          Assinei o termo no Clicksign e aceito as condições de responsabilidade pelo equipamento.
        </label>

        {erro && <p className="text-sm text-[var(--color-danger)]">{erro}</p>}

        <FormActions>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" className="gap-1.5" disabled={anexarTermoMutation.isPending}>
            <FileCheck2 aria-hidden="true" className="h-4 w-4" />
            Confirmar aceite
          </Button>
        </FormActions>
      </form>
    </Dialog>
  );
}
