import { FormEvent, useState } from 'react';
import { PageShell } from '../../../components/system/PageShell';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Dialog } from '../../../components/ui/Dialog';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { FormActions, FormField } from '../../../components/ui/Form';
import { Input } from '../../../components/ui/Input';
import { LoadingState } from '../../../components/ui/LoadingState';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Table, Td, Th, Tr } from '../../../components/ui/Table';
import { useCreateMasterUsuario, useMasterUsuarios } from '../hooks/useMasterUsuarios';

/**
 * Administração de plataforma: usuários master, invisíveis na lista de
 * colaboradores. Só um master acessa esta tela e só um master cria outro
 * master — reforçado pelo backend (`@Roles('MASTER')`), não só pela UI.
 */
export default function MasterUsuariosPage() {
  const usuariosQuery = useMasterUsuarios();
  const createMutation = useCreateMasterUsuario();

  const [dialogAberto, setDialogAberto] = useState(false);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  const usuarios = usuariosQuery.data ?? [];

  function abrirNovo() {
    setNome('');
    setEmail('');
    setSenha('');
    setErro(null);
    setDialogAberto(true);
  }

  async function salvar(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    try {
      await createMutation.mutateAsync({ nome, email, senha });
      setDialogAberto(false);
    } catch {
      setErro('Não foi possível criar o usuário master.');
    }
  }

  return (
    <PageShell>
      <PageHeader
        title="Usuários master"
        description="Administração da própria plataforma — não são colaboradores e não aparecem em Configurações → Colaboradores."
        actions={<Button onClick={abrirNovo}>Novo master</Button>}
      />

      {usuariosQuery.isError ? (
        <ErrorState message="Não foi possível carregar os usuários master." onRetry={() => usuariosQuery.refetch()} />
      ) : usuariosQuery.isLoading ? (
        <LoadingState rows={3} />
      ) : usuarios.length === 0 ? (
        <EmptyState title="Nenhum usuário master" description="Crie o primeiro usuário master além desta conta." />
      ) : (
        <Card elevated className="overflow-hidden">
          <Table>
            <thead>
              <tr>
                <Th>Nome</Th>
                <Th>E-mail</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((usuario) => (
                <Tr key={usuario.id}>
                  <Td className="font-bold text-[var(--color-text-primary)]">{usuario.nome}</Td>
                  <Td>{usuario.email}</Td>
                  <Td>
                    <Badge tone={usuario.ativo ? 'success' : 'neutral'}>{usuario.ativo ? 'Ativo' : 'Inativo'}</Badge>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}

      <Dialog open={dialogAberto} onOpenChange={setDialogAberto} title="Novo usuário master" className="max-w-md">
        <form onSubmit={salvar} className="flex flex-col gap-4">
          <FormField label="Nome" htmlFor="master-nome">
            <Input id="master-nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
          </FormField>
          <FormField label="E-mail" htmlFor="master-email">
            <Input id="master-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </FormField>
          <FormField label="Senha" htmlFor="master-senha" error={erro ?? undefined}>
            <Input
              id="master-senha"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              minLength={6}
              required
            />
          </FormField>
          <FormActions>
            <Button type="button" variant="secondary" onClick={() => setDialogAberto(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              Salvar
            </Button>
          </FormActions>
        </form>
      </Dialog>
    </PageShell>
  );
}
