import { useEffect, useMemo, useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Card, CardTitle } from '../../../components/ui/Card';
import { ErrorState } from '../../../components/ui/ErrorState';
import { FormField } from '../../../components/ui/Form';
import { LoadingState } from '../../../components/ui/LoadingState';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Select } from '../../../components/ui/Select';
import { useDepartamentos } from '../../departamentos/hooks/useDepartamentos';
import { useUsuarios } from '../../usuarios/hooks/useUsuarios';
import {
  useGroupRotinas,
  useRotinas,
  useSetGroupRotinas,
  useSetUserOverride,
  useUserOverrides,
} from '../hooks/usePermissoes';

function PorDepartamento() {
  const departamentosQuery = useDepartamentos();
  const rotinasQuery = useRotinas();
  const [groupId, setGroupId] = useState('');
  const groupRotinasQuery = useGroupRotinas(groupId || null);
  const setGroupRotinasMutation = useSetGroupRotinas(groupId || null);

  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [salvo, setSalvo] = useState(false);

  useEffect(() => {
    setSalvo(false);
    setSelecionadas(new Set((groupRotinasQuery.data ?? []).map((r) => r.chave)));
  }, [groupRotinasQuery.data]);

  const departamentos = departamentosQuery.data ?? [];
  const rotinas = rotinasQuery.data ?? [];

  function alternar(chave: string) {
    setSalvo(false);
    setSelecionadas((atual) => {
      const proxima = new Set(atual);
      if (proxima.has(chave)) proxima.delete(chave);
      else proxima.add(chave);
      return proxima;
    });
  }

  async function salvar() {
    await setGroupRotinasMutation.mutateAsync([...selecionadas]);
    setSalvo(true);
  }

  return (
    <Card elevated className="p-6">
      <CardTitle>Por departamento</CardTitle>
      <p className="mb-4 text-sm text-[var(--color-text-secondary)]">
        Escolha um departamento e marque as rotinas que todos os usuários dele podem acessar.
      </p>
      <div className="max-w-sm">
        <FormField label="Departamento" htmlFor="permissoes-departamento">
          <Select id="permissoes-departamento" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
            <option value="">Selecione um departamento</option>
            {departamentos.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nome}
              </option>
            ))}
          </Select>
        </FormField>
      </div>

      {groupId && groupRotinasQuery.isLoading && <LoadingState rows={3} />}

      {groupId && !groupRotinasQuery.isLoading && (
        <div className="mt-4 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            {rotinas.map((rotina) => (
              <label key={rotina.id} className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                <input
                  type="checkbox"
                  checked={selecionadas.has(rotina.chave)}
                  onChange={() => alternar(rotina.chave)}
                />
                {rotina.nome}
              </label>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Button type="button" onClick={salvar} disabled={setGroupRotinasMutation.isPending}>
              Salvar
            </Button>
            {salvo && <span className="text-sm text-[var(--color-success)]">Salvo.</span>}
          </div>
        </div>
      )}
    </Card>
  );
}

type Estado = 'herda' | 'liberado' | 'bloqueado';

function PorUsuario() {
  const usuariosQuery = useUsuarios();
  const rotinasQuery = useRotinas();
  const [userId, setUserId] = useState('');
  const overridesQuery = useUserOverrides(userId || null);
  const setOverrideMutation = useSetUserOverride(userId || null);

  const usuarios = usuariosQuery.data ?? [];
  const rotinas = rotinasQuery.data ?? [];

  const estados = useMemo(() => {
    const mapa = new Map<string, Estado>();
    for (const override of overridesQuery.data ?? []) {
      mapa.set(override.rotina.chave, override.concedida ? 'liberado' : 'bloqueado');
    }
    return mapa;
  }, [overridesQuery.data]);

  function alterar(chave: string, estado: Estado) {
    setOverrideMutation.mutate({ chave, concedida: estado === 'herda' ? null : estado === 'liberado' });
  }

  return (
    <Card elevated className="p-6">
      <CardTitle>Por usuário</CardTitle>
      <p className="mb-4 text-sm text-[var(--color-text-secondary)]">
        Libere ou bloqueie uma rotina para um usuário específico, independentemente do departamento dele.
      </p>
      <div className="max-w-sm">
        <FormField label="Usuário" htmlFor="permissoes-usuario">
          <Select id="permissoes-usuario" value={userId} onChange={(e) => setUserId(e.target.value)}>
            <option value="">Selecione um usuário</option>
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nome}
              </option>
            ))}
          </Select>
        </FormField>
      </div>

      {userId && overridesQuery.isLoading && <LoadingState rows={3} />}

      {userId && !overridesQuery.isLoading && (
        <div className="mt-4 flex flex-col gap-3">
          {rotinas.map((rotina) => {
            const estadoAtual = estados.get(rotina.chave) ?? 'herda';
            return (
              <div key={rotina.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] py-2 last:border-0">
                <span className="text-sm text-[var(--color-text-primary)]">{rotina.nome}</span>
                <Select
                  aria-label={`Permissão de ${rotina.nome}`}
                  className="max-w-[180px]"
                  value={estadoAtual}
                  onChange={(e) => alterar(rotina.chave, e.target.value as Estado)}
                >
                  <option value="herda">Herda do departamento</option>
                  <option value="liberado">Sempre liberado</option>
                  <option value="bloqueado">Sempre bloqueado</option>
                </Select>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

export default function PermissoesAdminPage() {
  const rotinasQuery = useRotinas();

  if (rotinasQuery.isError) {
    return <ErrorState message="Não foi possível carregar as rotinas." onRetry={() => rotinasQuery.refetch()} />;
  }

  return (
    <>
      <PageHeader title="Permissões" description="Defina quais rotinas cada departamento e cada usuário podem acessar." />
      <div className="flex flex-col gap-6">
        <PorDepartamento />
        <PorUsuario />
      </div>
    </>
  );
}
