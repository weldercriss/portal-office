import { FormEvent, useEffect, useState } from 'react';
import { Download, Paperclip, Trash2 } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Dialog } from '../../../components/ui/Dialog';
import { FormActions, FormField } from '../../../components/ui/Form';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { useUsuarios } from '../../usuarios/hooks/useUsuarios';
import {
  useAnexarTermo,
  useCancelarAlocacao,
  useCreateAlocacao,
  useDevolverAlocacao,
  useRemoverTermo,
} from '../hooks/usePatrimonio';
import { ALOCACAO_STATUS_LABEL, ESTADO_EQUIPAMENTO_LABEL, type AlocacaoStatus, type EstadoEquipamento, type Equipamento } from '../types/patrimonio.types';
import { visualizarTermo } from '../utils/termo';

function toneAlocacao(status: AlocacaoStatus) {
  if (status === 'ASSINADO' || status === 'ENTREGUE') return 'success' as const;
  if (status === 'CANCELADA') return 'danger' as const;
  return 'warning' as const;
}

const hoje = () => new Date().toISOString().slice(0, 10);

interface VinculoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipamento: Equipamento | null;
}

export function VinculoDialog({ open, onOpenChange, equipamento }: VinculoDialogProps) {
  const usuariosQuery = useUsuarios();
  const createMutation = useCreateAlocacao();
  const devolverMutation = useDevolverAlocacao();
  const cancelarMutation = useCancelarAlocacao();
  const anexarTermoMutation = useAnexarTermo();
  const removerTermoMutation = useRemoverTermo();

  const vinculo = equipamento?.alocacoes[0] ?? null;

  const [colaboradorId, setColaboradorId] = useState('');
  const [dataInicio, setDataInicio] = useState(hoje());
  const [estadoNaEntrega, setEstadoNaEntrega] = useState<EstadoEquipamento | ''>('');
  const [observacoes, setObservacoes] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  const [encerrando, setEncerrando] = useState<'devolver' | 'cancelar' | null>(null);
  const [dataDevolucao, setDataDevolucao] = useState(hoje());
  const [estadoNaDevolucao, setEstadoNaDevolucao] = useState<EstadoEquipamento | ''>('');
  const [motivoDevolucao, setMotivoDevolucao] = useState('');
  const [erroEncerramento, setErroEncerramento] = useState<string | null>(null);

  const [termoArquivo, setTermoArquivo] = useState<File | null>(null);
  const [erroTermo, setErroTermo] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setColaboradorId('');
    setDataInicio(hoje());
    setEstadoNaEntrega(equipamento?.estado ?? '');
    setObservacoes('');
    setErro(null);
    setEncerrando(null);
    setDataDevolucao(hoje());
    setEstadoNaDevolucao('');
    setMotivoDevolucao('');
    setErroEncerramento(null);
    setTermoArquivo(null);
    setErroTermo(null);
  }, [open, equipamento]);

  const colaboradoresAptos = (usuariosQuery.data ?? []).filter(
    (usuario) => usuario.ativo && usuario.statusColaborador !== 'DESLIGADO',
  );

  async function handleCriar(event: FormEvent) {
    event.preventDefault();
    if (!equipamento) return;
    setErro(null);
    try {
      await createMutation.mutateAsync({
        equipamentoId: equipamento.id,
        colaboradorId,
        dataInicio,
        estadoNaEntrega: estadoNaEntrega || undefined,
        observacoes: observacoes || undefined,
      });
      onOpenChange(false);
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível vincular o equipamento.');
    }
  }

  async function handleEncerrar(event: FormEvent) {
    event.preventDefault();
    if (!vinculo) return;
    setErroEncerramento(null);
    try {
      if (encerrando === 'devolver') {
        await devolverMutation.mutateAsync({
          id: vinculo.id,
          input: { dataDevolucao, estadoNaDevolucao: estadoNaDevolucao || undefined, motivoDevolucao: motivoDevolucao || undefined },
        });
      } else {
        await cancelarMutation.mutateAsync({ id: vinculo.id, motivoDevolucao: motivoDevolucao || undefined });
      }
      onOpenChange(false);
    } catch (error) {
      setErroEncerramento(error instanceof Error ? error.message : 'Não foi possível encerrar o registro.');
    }
  }

  async function handleAnexarTermo() {
    if (!vinculo || !termoArquivo) return;
    setErroTermo(null);
    try {
      await anexarTermoMutation.mutateAsync({ id: vinculo.id, arquivo: termoArquivo });
      setTermoArquivo(null);
    } catch (error) {
      setErroTermo(error instanceof Error ? error.message : 'Não foi possível anexar o termo.');
    }
  }

  async function handleRemoverTermo() {
    if (!vinculo) return;
    setErroTermo(null);
    try {
      await removerTermoMutation.mutateAsync(vinculo.id);
    } catch (error) {
      setErroTermo(error instanceof Error ? error.message : 'Não foi possível remover o termo.');
    }
  }

  async function handleVisualizarTermo() {
    if (!vinculo) return;
    setErroTermo(null);
    try {
      await visualizarTermo(vinculo.id);
    } catch {
      setErroTermo('Não foi possível abrir o termo.');
    }
  }

  if (!equipamento) return null;

  const descricaoItem = [equipamento.tipo.nome, equipamento.numero ?? equipamento.marca].filter(Boolean).join(' — ');

  if (!vinculo) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange} title="Vincular a colaborador" className="max-w-lg">
        <form onSubmit={handleCriar} className="flex flex-col gap-4">
          <p className="text-sm text-[var(--color-text-secondary)]">{descricaoItem}</p>
          <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
            <FormField label="Colaborador" htmlFor="vinculo-colaborador" error={erro ?? undefined} className="sm:col-span-2">
              <Select
                id="vinculo-colaborador"
                value={colaboradorId}
                onChange={(e) => setColaboradorId(e.target.value)}
                required
              >
                <option value="">Selecione...</option>
                {colaboradoresAptos.map((usuario) => (
                  <option key={usuario.id} value={usuario.id}>
                    {usuario.nome}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Data de entrega" htmlFor="vinculo-data-inicio">
              <Input
                id="vinculo-data-inicio"
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                required
              />
            </FormField>
            <FormField label="Conservação na entrega" htmlFor="vinculo-estado-entrega">
              <Select
                id="vinculo-estado-entrega"
                value={estadoNaEntrega}
                onChange={(e) => setEstadoNaEntrega(e.target.value as EstadoEquipamento)}
              >
                {Object.entries(ESTADO_EQUIPAMENTO_LABEL).map(([valor, label]) => (
                  <option key={valor} value={valor}>
                    {label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Observações" htmlFor="vinculo-observacoes" hint="Opcional" className="sm:col-span-2">
              <Input id="vinculo-observacoes" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} maxLength={500} />
            </FormField>
          </div>
          <FormActions>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              Vincular
            </Button>
          </FormActions>
        </form>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Vínculo atual" className="max-w-lg">
      <div className="flex flex-col gap-5">
        <div>
          <p className="text-sm text-[var(--color-text-secondary)]">{descricaoItem}</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="font-bold text-[var(--color-text-primary)]">{vinculo.colaborador.nome}</span>
            <Badge tone={toneAlocacao(vinculo.status)}>{ALOCACAO_STATUS_LABEL[vinculo.status]}</Badge>
          </div>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Entregue em {vinculo.dataInicio.slice(0, 10).split('-').reverse().join('/')}
            {vinculo.estadoNaEntrega && ` · Conservação na entrega: ${ESTADO_EQUIPAMENTO_LABEL[vinculo.estadoNaEntrega]}`}
          </p>
          {vinculo.observacoes && <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{vinculo.observacoes}</p>}
        </div>

        <div className="rounded-[var(--radius-field)] border border-[var(--color-border)] p-3">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">Termo de responsabilidade</p>
          {erroTermo && <p className="mb-2 text-xs text-[var(--color-danger)]">{erroTermo}</p>}
          {vinculo.termoNome ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-[var(--color-text-secondary)]">{vinculo.termoNome}</span>
              <Button type="button" variant="secondary" size="sm" className="gap-1.5" onClick={handleVisualizarTermo}>
                <Download aria-hidden="true" className="h-4 w-4" />
                Abrir
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                className="gap-1.5"
                onClick={handleRemoverTermo}
                disabled={removerTermoMutation.isPending}
              >
                <Trash2 aria-hidden="true" className="h-4 w-4" />
                Remover
              </Button>
            </div>
          ) : (
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
                disabled={!termoArquivo || anexarTermoMutation.isPending}
              >
                <Paperclip aria-hidden="true" className="h-4 w-4" />
                Anexar
              </Button>
            </div>
          )}
        </div>

        {encerrando ? (
          <form onSubmit={handleEncerrar} className="flex flex-col gap-4 border-t border-[var(--color-border)] pt-4">
            <p className="text-sm font-bold text-[var(--color-text-primary)]">
              {encerrando === 'devolver' ? 'Registrar devolução' : 'Cancelar registro'}
            </p>
            {encerrando === 'devolver' && (
              <>
                <FormField label="Data da devolução" htmlFor="vinculo-data-devolucao">
                  <Input
                    id="vinculo-data-devolucao"
                    type="date"
                    value={dataDevolucao}
                    onChange={(e) => setDataDevolucao(e.target.value)}
                  />
                </FormField>
                <FormField label="Conservação na devolução" htmlFor="vinculo-estado-devolucao" hint="Opcional">
                  <Select
                    id="vinculo-estado-devolucao"
                    value={estadoNaDevolucao}
                    onChange={(e) => setEstadoNaDevolucao(e.target.value as EstadoEquipamento)}
                  >
                    <option value="">Manter conservação atual</option>
                    {Object.entries(ESTADO_EQUIPAMENTO_LABEL).map(([valor, label]) => (
                      <option key={valor} value={valor}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </FormField>
              </>
            )}
            <FormField
              label={encerrando === 'devolver' ? 'Motivo (opcional)' : 'Motivo do cancelamento'}
              htmlFor="vinculo-motivo"
              error={erroEncerramento ?? undefined}
            >
              <Input id="vinculo-motivo" value={motivoDevolucao} onChange={(e) => setMotivoDevolucao(e.target.value)} maxLength={300} />
            </FormField>
            <FormActions>
              <Button type="button" variant="secondary" onClick={() => setEncerrando(null)}>
                Voltar
              </Button>
              <Button type="submit" variant={encerrando === 'cancelar' ? 'danger' : 'primary'} disabled={devolverMutation.isPending || cancelarMutation.isPending}>
                Confirmar
              </Button>
            </FormActions>
          </form>
        ) : (
          <FormActions>
            <Button type="button" variant="danger" onClick={() => setEncerrando('cancelar')}>
              Cancelar registro
            </Button>
            <Button type="button" onClick={() => setEncerrando('devolver')}>
              Devolver ao estoque
            </Button>
          </FormActions>
        )}
      </div>
    </Dialog>
  );
}
