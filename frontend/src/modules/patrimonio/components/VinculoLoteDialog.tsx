import { FormEvent, useEffect, useState } from 'react';
import { Paperclip } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Dialog } from '../../../components/ui/Dialog';
import { FormActions, FormField } from '../../../components/ui/Form';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { useUsuarios } from '../../usuarios/hooks/useUsuarios';
import { useAnexarTermoLote, useCreateAlocacao } from '../hooks/usePatrimonio';
import type { Equipamento } from '../types/patrimonio.types';

const hoje = () => new Date().toISOString().slice(0, 10);

interface VinculoLoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipamentos: Equipamento[];
  onConcluido: () => void;
}

/**
 * Entrega vários itens pro mesmo colaborador de uma vez, com um único termo
 * assinado cobrindo todos — o documento físico costuma sair assim, um por
 * entrega e não um por item.
 */
export function VinculoLoteDialog({ open, onOpenChange, equipamentos, onConcluido }: VinculoLoteDialogProps) {
  const usuariosQuery = useUsuarios();
  const createMutation = useCreateAlocacao();
  const anexarTermoLoteMutation = useAnexarTermoLote();

  const [colaboradorId, setColaboradorId] = useState('');
  const [dataInicio, setDataInicio] = useState(hoje());
  const [observacoes, setObservacoes] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  const [alocacaoIds, setAlocacaoIds] = useState<string[] | null>(null);
  const [termoArquivo, setTermoArquivo] = useState<File | null>(null);
  const [erroTermo, setErroTermo] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setColaboradorId('');
    setDataInicio(hoje());
    setObservacoes('');
    setErro(null);
    setAlocacaoIds(null);
    setTermoArquivo(null);
    setErroTermo(null);
  }, [open]);

  const colaboradoresAptos = (usuariosQuery.data ?? []).filter(
    (usuario) => usuario.ativo && usuario.statusColaborador !== 'DESLIGADO',
  );

  async function handleCriar(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    const resultados = await Promise.allSettled(
      equipamentos.map((eq) =>
        createMutation.mutateAsync({
          equipamentoId: eq.id,
          colaboradorId,
          dataInicio,
          observacoes: observacoes || undefined,
        }),
      ),
    );

    const criadas = resultados.filter((r) => r.status === 'fulfilled') as PromiseFulfilledResult<{ id: string }>[];
    const falhas = resultados.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];

    if (criadas.length > 0) setAlocacaoIds(criadas.map((r) => r.value.id));
    if (falhas.length > 0) {
      const motivo = falhas[0].reason instanceof Error ? falhas[0].reason.message : 'Não foi possível vincular.';
      setErro(`${falhas.length} de ${equipamentos.length} item(ns) não foram vinculados: ${motivo}`);
    }
  }

  async function handleAnexarTermo() {
    if (!alocacaoIds || !termoArquivo) return;
    setErroTermo(null);
    try {
      await anexarTermoLoteMutation.mutateAsync({ ids: alocacaoIds, arquivo: termoArquivo });
      onConcluido();
    } catch (error) {
      setErroTermo(error instanceof Error ? error.message : 'Não foi possível anexar o termo.');
    }
  }

  if (equipamentos.length === 0) return null;

  if (alocacaoIds) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange} title="Anexar termo da entrega" className="max-w-lg">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-[var(--color-text-secondary)]">
            {alocacaoIds.length} equipamento(s) vinculado(s). Anexe o termo de responsabilidade assinado — um único
            arquivo cobre todos os itens desta entrega.
          </p>
          {erroTermo && <p className="text-xs text-[var(--color-danger)]">{erroTermo}</p>}
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(e) => setTermoArquivo(e.target.files?.[0] ?? null)}
              className="text-sm text-[var(--color-text-secondary)]"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="gap-1.5"
              onClick={handleAnexarTermo}
              disabled={!termoArquivo || anexarTermoLoteMutation.isPending}
            >
              <Paperclip aria-hidden="true" className="h-4 w-4" />
              Anexar
            </Button>
          </div>
          <FormActions>
            <Button type="button" variant="secondary" onClick={onConcluido}>
              Anexar depois
            </Button>
          </FormActions>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Vincular equipamentos selecionados" className="max-w-lg">
      <form onSubmit={handleCriar} className="flex flex-col gap-4">
        <ul className="list-inside list-disc text-sm text-[var(--color-text-secondary)]">
          {equipamentos.map((eq) => (
            <li key={eq.id}>
              {eq.tipo.nome}
              {(eq.numero || eq.marca) && ` — ${eq.numero ?? eq.marca}`}
            </li>
          ))}
        </ul>
        <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
          <FormField label="Colaborador" htmlFor="vinculo-lote-colaborador" error={erro ?? undefined} className="sm:col-span-2">
            <Select id="vinculo-lote-colaborador" value={colaboradorId} onChange={(e) => setColaboradorId(e.target.value)} required>
              <option value="">Selecione...</option>
              {colaboradoresAptos.map((usuario) => (
                <option key={usuario.id} value={usuario.id}>
                  {usuario.nome}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Data de entrega" htmlFor="vinculo-lote-data-inicio">
            <Input id="vinculo-lote-data-inicio" type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} required />
          </FormField>
          <FormField label="Observações" htmlFor="vinculo-lote-observacoes" hint="Opcional">
            <Input id="vinculo-lote-observacoes" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} maxLength={500} />
          </FormField>
        </div>
        <FormActions>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!colaboradorId || createMutation.isPending}>
            Vincular {equipamentos.length} item(ns)
          </Button>
        </FormActions>
      </form>
    </Dialog>
  );
}
