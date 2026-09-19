import { FormEvent, useEffect, useMemo, useState } from 'react';
import { SearchField } from '../../../components/system/SearchField';
import { Button } from '../../../components/ui/Button';
import { Dialog } from '../../../components/ui/Dialog';
import { FormActions, FormField } from '../../../components/ui/Form';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Skeleton } from '../../../components/ui/Skeleton';
import { useUsuarios } from '../../usuarios/hooks/useUsuarios';
import { CamposFormularioEditor } from '../../../components/system/CamposFormularioEditor';
import type { CampoFormulario, CampoFormularioTipo } from '../../tipos-solicitacao/types/tipo-solicitacao.types';
import { useCreatePesquisa } from '../hooks/usePesquisas';
import { TIPOS_PESQUISA, type PesquisaTipo } from '../types/pesquisa.types';

interface PesquisaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TIPOS_CAMPO_PESQUISA: CampoFormularioTipo[] = ['TEXTO', 'NUMERO', 'DATA', 'SELECAO'];

export function PesquisaDialog({ open, onOpenChange }: PesquisaDialogProps) {
  const usuariosQuery = useUsuarios();
  const createMutation = useCreatePesquisa();

  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [tipo, setTipo] = useState<PesquisaTipo>('NPS');
  const [campos, setCampos] = useState<CampoFormulario[]>([]);
  const [modoDestinatarios, setModoDestinatarios] = useState<'colaboradores' | 'equipe'>('colaboradores');
  const [busca, setBusca] = useState('');
  const [colaboradoresSelecionados, setColaboradoresSelecionados] = useState<Set<string>>(new Set());
  const [gestorId, setGestorId] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitulo('');
    setDescricao('');
    setTipo('NPS');
    setCampos([]);
    setModoDestinatarios('colaboradores');
    setBusca('');
    setColaboradoresSelecionados(new Set());
    setGestorId('');
    setErro(null);
  }, [open]);

  const colaboradoresAtivos = useMemo(
    () => (usuariosQuery.data ?? []).filter((u) => u.ativo && u.statusColaborador !== 'PENDENTE'),
    [usuariosQuery.data],
  );
  const colaboradoresFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return colaboradoresAtivos;
    return colaboradoresAtivos.filter((c) => c.nome.toLowerCase().includes(termo) || c.email.toLowerCase().includes(termo));
  }, [colaboradoresAtivos, busca]);

  function alternarColaborador(id: string) {
    setColaboradoresSelecionados((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(id)) proximo.delete(id);
      else proximo.add(id);
      return proximo;
    });
  }

  const podeEnviar =
    !!titulo.trim() &&
    campos.length > 0 &&
    campos.every((campo) => campo.label.trim()) &&
    (modoDestinatarios === 'colaboradores' ? colaboradoresSelecionados.size > 0 : !!gestorId);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    try {
      await createMutation.mutateAsync({
        titulo: titulo.trim(),
        descricao: descricao.trim() || undefined,
        tipo,
        campos,
        destinatarios:
          modoDestinatarios === 'colaboradores' ? { userIds: [...colaboradoresSelecionados] } : { gestorId },
      });
      onOpenChange(false);
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível criar a pesquisa.');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Nova pesquisa" className="max-w-3xl" fitViewport>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
          <FormField label="Título" htmlFor="pesquisa-titulo">
            <Input id="pesquisa-titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={160} required />
          </FormField>
          <FormField label="Tipo" htmlFor="pesquisa-tipo">
            <Select id="pesquisa-tipo" value={tipo} onChange={(e) => setTipo(e.target.value as PesquisaTipo)}>
              {TIPOS_PESQUISA.map((opcao) => (
                <option key={opcao.value} value={opcao.value}>
                  {opcao.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Descrição (opcional)" htmlFor="pesquisa-descricao" className="sm:col-span-2">
            <Input id="pesquisa-descricao" value={descricao} onChange={(e) => setDescricao(e.target.value)} maxLength={2000} />
          </FormField>
        </div>

        <FormField label="Perguntas" htmlFor="pesquisa-campos">
          <CamposFormularioEditor value={campos} onChange={setCampos} tiposPermitidos={TIPOS_CAMPO_PESQUISA} />
        </FormField>

        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setModoDestinatarios('colaboradores')}
              className={`rounded-full px-3 py-1.5 text-sm font-bold transition-colors ${
                modoDestinatarios === 'colaboradores'
                  ? 'bg-[var(--color-primary)] text-[var(--color-text-inverse)]'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'
              }`}
            >
              Colaboradores específicos
            </button>
            <button
              type="button"
              onClick={() => setModoDestinatarios('equipe')}
              className={`rounded-full px-3 py-1.5 text-sm font-bold transition-colors ${
                modoDestinatarios === 'equipe'
                  ? 'bg-[var(--color-primary)] text-[var(--color-text-inverse)]'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'
              }`}
            >
              Equipe de um gestor
            </button>
          </div>

          {modoDestinatarios === 'colaboradores' ? (
            <FormField label={`Destinatários (${colaboradoresSelecionados.size})`} htmlFor="pesquisa-colaboradores">
              <div className="flex flex-col gap-2">
                <SearchField value={busca} onChange={setBusca} placeholder="Buscar por nome ou e-mail" />
                {usuariosQuery.isLoading ? (
                  <Skeleton className="h-40 w-full" />
                ) : (
                  <div
                    id="pesquisa-colaboradores"
                    className="flex max-h-48 flex-col gap-1 overflow-y-auto rounded-[var(--radius-field)] border border-[var(--color-border)] p-2"
                  >
                    {colaboradoresFiltrados.map((colaborador) => (
                      <label
                        key={colaborador.id}
                        className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-[var(--color-surface-hover)]"
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 shrink-0"
                          checked={colaboradoresSelecionados.has(colaborador.id)}
                          onChange={() => alternarColaborador(colaborador.id)}
                        />
                        <span className="flex-1 truncate">{colaborador.nome}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </FormField>
          ) : (
            <FormField label="Gestor" htmlFor="pesquisa-gestor" hint="Convida os liderados diretos deste gestor no momento da criação.">
              <Select id="pesquisa-gestor" value={gestorId} onChange={(e) => setGestorId(e.target.value)} required>
                <option value="">— Selecione —</option>
                {colaboradoresAtivos.map((colaborador) => (
                  <option key={colaborador.id} value={colaborador.id}>
                    {colaborador.nome}
                  </option>
                ))}
              </Select>
            </FormField>
          )}
        </div>

        {erro && <p className="text-sm text-[var(--color-danger)]">{erro}</p>}

        <FormActions>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={createMutation.isPending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!podeEnviar || createMutation.isPending}>
            {createMutation.isPending ? 'Criando...' : 'Criar pesquisa'}
          </Button>
        </FormActions>
      </form>
    </Dialog>
  );
}
