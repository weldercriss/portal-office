import { FormEvent, useState } from 'react';
import { PageShell } from '../../../components/system/PageShell';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Dialog } from '../../../components/ui/Dialog';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { FormActions } from '../../../components/ui/Form';
import { LoadingState } from '../../../components/ui/LoadingState';
import { PageHeader } from '../../../components/ui/PageHeader';
import { CamposFormularioForm } from '../../../components/system/CamposFormularioForm';
import { usePesquisasPendentes, useResponderPesquisa } from '../hooks/usePesquisas';
import { TIPOS_PESQUISA, type Pesquisa } from '../types/pesquisa.types';

export default function PesquisasPage() {
  const pendentesQuery = usePesquisasPendentes();
  const responderMutation = useResponderPesquisa();
  const [emResposta, setEmResposta] = useState<Pesquisa | null>(null);
  const [valores, setValores] = useState<Record<string, string>>({});
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);

  function abrir(pesquisa: Pesquisa) {
    setEmResposta(pesquisa);
    setValores({});
    setErro(null);
    setEnviado(false);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!emResposta) return;
    setErro(null);
    try {
      await responderMutation.mutateAsync({ id: emResposta.id, input: { respostas: valores } });
      setEnviado(true);
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível enviar sua resposta.');
    }
  }

  const pendentes = pendentesQuery.data ?? [];

  return (
    <PageShell>
      <PageHeader title="Pesquisas" description="Pesquisas anônimas — sua resposta nunca é associada ao seu usuário." />

      {pendentesQuery.isError ? (
        <ErrorState message="Não foi possível carregar suas pesquisas pendentes." onRetry={() => pendentesQuery.refetch()} />
      ) : pendentesQuery.isLoading ? (
        <LoadingState rows={3} />
      ) : pendentes.length === 0 ? (
        <EmptyState
          title="Nenhuma pesquisa pendente"
          description="Quando houver uma nova pesquisa ou pedido de feedback para você, ela aparece aqui."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {pendentes.map((pesquisa) => (
            <Card key={pesquisa.id} elevated className="flex items-center justify-between gap-3 p-4">
              <div>
                <p className="font-bold text-[var(--color-text-primary)]">{pesquisa.titulo}</p>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {TIPOS_PESQUISA.find((opcao) => opcao.value === pesquisa.tipo)?.label ?? pesquisa.tipo}
                  {pesquisa.descricao ? ` — ${pesquisa.descricao}` : ''}
                </p>
              </div>
              <Button onClick={() => abrir(pesquisa)}>Responder</Button>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={!!emResposta}
        onOpenChange={(aberto) => !aberto && setEmResposta(null)}
        title={emResposta?.titulo ?? ''}
        className="max-w-lg"
      >
        {emResposta &&
          (enviado ? (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-[var(--color-text-secondary)]">
                Resposta enviada. Obrigado pela participação — ela é totalmente anônima.
              </p>
              <FormActions>
                <Button onClick={() => setEmResposta(null)}>Fechar</Button>
              </FormActions>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <CamposFormularioForm
                campos={emResposta.campos}
                valores={valores}
                onChangeValor={(campoId, valor) => setValores((atual) => ({ ...atual, [campoId]: valor }))}
                arquivos={{}}
                onChangeArquivo={() => undefined}
              />
              {erro && <p className="text-sm text-[var(--color-danger)]">{erro}</p>}
              <FormActions>
                <Button type="button" variant="secondary" onClick={() => setEmResposta(null)} disabled={responderMutation.isPending}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={responderMutation.isPending}>
                  {responderMutation.isPending ? 'Enviando...' : 'Enviar resposta'}
                </Button>
              </FormActions>
            </form>
          ))}
      </Dialog>
    </PageShell>
  );
}
