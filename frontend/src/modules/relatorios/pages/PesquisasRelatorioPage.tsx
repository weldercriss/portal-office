import { useNavigate } from 'react-router-dom';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { ErrorState } from '../../../components/ui/ErrorState';
import { LoadingState } from '../../../components/ui/LoadingState';
import { Table, Td, Th, Tr } from '../../../components/ui/Table';
import { usePesquisas } from '../../pesquisas/hooks/usePesquisas';
import { TIPOS_PESQUISA } from '../../pesquisas/types/pesquisa.types';

function KpiTile({ label, valor }: { label: string; valor: string }) {
  return (
    <Card elevated className="flex-1 p-5">
      <p className="text-[13px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">{label}</p>
      <p className="mt-1 font-bricolage text-[28px] font-bold leading-tight text-[var(--color-text-primary)]">
        {valor}
      </p>
    </Card>
  );
}

export default function PesquisasRelatorioPage() {
  const navigate = useNavigate();
  const pesquisasQuery = usePesquisas();

  if (pesquisasQuery.isError) {
    return <ErrorState message="Não foi possível carregar o relatório." onRetry={() => pesquisasQuery.refetch()} />;
  }
  if (pesquisasQuery.isLoading) {
    return <LoadingState rows={4} />;
  }

  const pesquisas = pesquisasQuery.data ?? [];
  const ativas = pesquisas.filter((p) => p.ativa).length;
  const totalConvites = pesquisas.reduce((soma, p) => soma + (p._count?.convites ?? 0), 0);
  const totalRespostas = pesquisas.reduce((soma, p) => soma + (p._count?.respostas ?? 0), 0);
  const taxaMedia = totalConvites === 0 ? 0 : Math.round((totalRespostas / totalConvites) * 100);

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row">
        <KpiTile label="Pesquisas criadas" valor={String(pesquisas.length)} />
        <KpiTile label="Ativas" valor={String(ativas)} />
        <KpiTile label="Encerradas" valor={String(pesquisas.length - ativas)} />
        <KpiTile label="Taxa média de resposta" valor={`${taxaMedia}%`} />
      </div>

      {pesquisas.length === 0 ? (
        <p className="mt-6 text-sm text-[var(--color-text-secondary)]">Nenhuma pesquisa criada ainda.</p>
      ) : (
        <Card elevated className="mt-6 overflow-hidden">
          <Table>
            <thead>
              <tr>
                <Th>Título</Th>
                <Th>Tipo</Th>
                <Th>Convidados</Th>
                <Th>Respondido</Th>
                <Th>Status</Th>
                <Th className="text-right">Ações</Th>
              </tr>
            </thead>
            <tbody>
              {pesquisas.map((pesquisa) => {
                const total = pesquisa._count?.convites ?? 0;
                const respondidas = pesquisa._count?.respostas ?? 0;
                const percentual = total === 0 ? 0 : Math.round((respondidas / total) * 100);
                return (
                  <Tr key={pesquisa.id}>
                    <Td className="font-bold text-[var(--color-text-primary)]">{pesquisa.titulo}</Td>
                    <Td>{TIPOS_PESQUISA.find((opcao) => opcao.value === pesquisa.tipo)?.label ?? pesquisa.tipo}</Td>
                    <Td>{total}</Td>
                    <Td>
                      {respondidas}/{total} ({percentual}%)
                    </Td>
                    <Td>
                      <Badge tone={pesquisa.ativa ? 'success' : 'neutral'}>{pesquisa.ativa ? 'Ativa' : 'Encerrada'}</Badge>
                    </Td>
                    <Td className="text-right">
                      <Button variant="secondary" size="sm" onClick={() => navigate(`/pesquisas/${pesquisa.id}`)}>
                        Ver resultado
                      </Button>
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        </Card>
      )}
    </>
  );
}
