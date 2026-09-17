import { FormEvent, useState } from 'react';
import { Check, Pencil, Trash2, X } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Dialog } from '../../../components/ui/Dialog';
import { Input } from '../../../components/ui/Input';
import { StatusToggle } from '../../../components/ui/StatusToggle';
import {
  useCreateSubArea,
  useDeleteSubAreaPermanently,
  useSubAreas,
  useUpdateSubArea,
} from '../hooks/useSubAreas';

interface SubAreasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  groupNome: string;
}

export function SubAreasDialog({ open, onOpenChange, groupId, groupNome }: SubAreasDialogProps) {
  const subAreasQuery = useSubAreas({ groupId, all: true });
  const createMutation = useCreateSubArea();
  const updateMutation = useUpdateSubArea();
  const deleteMutation = useDeleteSubAreaPermanently();

  const [nome, setNome] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nomeEdicao, setNomeEdicao] = useState('');

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    try {
      await createMutation.mutateAsync({ nome, groupId });
      setNome('');
    } catch {
      setErro('Não foi possível criar a área.');
    }
  }

  function handleExcluir(id: string) {
    deleteMutation.mutate(id);
  }

  function iniciarEdicao(id: string, nomeAtual: string) {
    setEditandoId(id);
    setNomeEdicao(nomeAtual);
  }

  function salvarEdicao(id: string) {
    if (!nomeEdicao.trim()) return;
    updateMutation.mutate(
      { id, input: { nome: nomeEdicao.trim() } },
      { onSuccess: () => setEditandoId(null) },
    );
  }

  const subAreas = subAreasQuery.data ?? [];

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Áreas de ${groupNome}`}
      className="max-w-5xl"
      fitViewport
    >
      <div className="flex flex-col gap-4">
        {subAreas.length === 0 ? (
          <p className="text-sm text-[var(--color-text-secondary)]">Nenhuma área cadastrada ainda.</p>
        ) : (
          <ul className="grid max-h-[45vh] grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
            {subAreas.map((subArea) => (
              <li
                key={subArea.id}
                className="flex flex-col gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2"
              >
                {editandoId === subArea.id ? (
                  <div className="flex items-center gap-1">
                    <Input
                      autoFocus
                      value={nomeEdicao}
                      onChange={(e) => setNomeEdicao(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          salvarEdicao(subArea.id);
                        }
                        if (e.key === 'Escape') setEditandoId(null);
                      }}
                      className="h-8 py-1"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-[var(--color-success)]"
                      onClick={() => salvarEdicao(subArea.id)}
                      aria-label="Salvar nome"
                      title="Salvar"
                    >
                      <Check aria-hidden="true" className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setEditandoId(null)}
                      aria-label="Cancelar edição"
                      title="Cancelar"
                    >
                      <X aria-hidden="true" className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <span className="break-words text-sm font-medium text-[var(--color-text-primary)]">{subArea.nome}</span>
                )}
                <div className="flex items-center justify-between gap-1">
                  <StatusToggle
                    checked={subArea.ativo}
                    onChange={() => updateMutation.mutate({ id: subArea.id, input: { ativo: !subArea.ativo } })}
                    label={subArea.ativo ? 'Desativar área' : 'Reativar área'}
                  />
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => iniciarEdicao(subArea.id, subArea.nome)}
                      aria-label={`Editar ${subArea.nome}`}
                      title="Editar área"
                    >
                      <Pencil aria-hidden="true" className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-[var(--color-danger)]"
                      onClick={() => handleExcluir(subArea.id)}
                      aria-label={`Excluir ${subArea.nome}`}
                      title="Excluir área permanentemente"
                    >
                      <Trash2 aria-hidden="true" className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-2 border-t border-[var(--color-border)] pt-4">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label htmlFor="nome-subarea" className="mb-1 block text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
                Nova área
              </label>
              <Input
                id="nome-subarea"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Adoção"
                required
              />
            </div>
            <Button type="submit" disabled={createMutation.isPending}>
              Adicionar
            </Button>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </div>
          {erro && <p className="text-sm text-[var(--color-danger)]">{erro}</p>}
        </form>
      </div>
    </Dialog>
  );
}
