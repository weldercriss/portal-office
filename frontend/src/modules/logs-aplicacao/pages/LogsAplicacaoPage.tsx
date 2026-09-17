import { useState } from 'react';
import { ListToolbar } from '../../../components/system/ListToolbar';
import { PageShell } from '../../../components/system/PageShell';
import { SearchField } from '../../../components/system/SearchField';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { Input } from '../../../components/ui/Input';
import { LoadingState } from '../../../components/ui/LoadingState';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Select } from '../../../components/ui/Select';
import { Table, Td, Th, Tr } from '../../../components/ui/Table';
import { useUsuarios } from '../../usuarios/hooks/useUsuarios';
import { LogAplicacaoDetalheDialog } from '../components/LogAplicacaoDetalheDialog';
import { useLogsAplicacao } from '../hooks/useLogsAplicacao';
import { RESULTADO_LOG_APLICACAO } from '../types/log-aplicacao.types';
import type { LogAplicacaoResultado } from '../types/log-aplicacao.types';

const METODOS_HTTP = ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'];

const TOM_RESULTADO: Record<LogAplicacaoResultado, 'success' | 'warning' | 'danger' | 'neutral'> = {
  SUCESSO: 'success',
  ERRO_CLIENTE: 'warning',
  ERRO_SERVIDOR: 'danger',
  ABORTADA: 'neutral',
};

export default function LogsAplicacaoPage() {
  const [busca, setBusca] = useState('');
  const [resultado, setResultado] = useState<LogAplicacaoResultado | ''>('');
  const [metodo, setMetodo] = useState('');
  const [statusHttp, setStatusHttp] = useState('');
  const [usuarioId, setUsuarioId] = useState('');
  const [detalheId, setDetalheId] = useState<string | null>(null);

  const usuariosQuery = useUsuarios();
  const usuarios = usuariosQuery.data ?? [];

  const logsQuery = useLogsAplicacao({
    resultado: resultado || undefined,
    metodo: metodo || undefined,
    statusHttp: statusHttp ? Number(statusHttp) : undefined,
    usuarioId: usuarioId || undefined,
    busca: busca || undefined,
  });

  const logs = logsQuery.data?.logs ?? [];

  return (
    <PageShell>
      <PageHeader
        title="Logs da aplicação"
        description="Histórico técnico das requisições recebidas pela API, para diagnóstico administrativo."
        actions={
          <Button variant="secondary" disabled={logsQuery.isFetching} onClick={() => logsQuery.refetch()}>
            Atualizar
          </Button>
        }
      />

      {logsQuery.data && (
        <p className="pb-4 text-sm text-[var(--color-text-secondary)]">
          Ciclo {logsQuery.data.ciclo} — {logsQuery.data.quantidade} de {logsQuery.data.limite} requisições
        </p>
      )}

      <ListToolbar>
        <SearchField value={busca} onChange={setBusca} placeholder="Buscar por rota ou request ID" />
        <Select
          aria-label="Filtrar por resultado"
          value={resultado}
          onChange={(e) => setResultado(e.target.value as LogAplicacaoResultado | '')}
          className="max-w-[180px]"
        >
          <option value="">Todos os resultados</option>
          {RESULTADO_LOG_APLICACAO.map((opcao) => (
            <option key={opcao.value} value={opcao.value}>
              {opcao.label}
            </option>
          ))}
        </Select>
        <Select aria-label="Filtrar por método" value={metodo} onChange={(e) => setMetodo(e.target.value)} className="max-w-[140px]">
          <option value="">Todos os métodos</option>
          {METODOS_HTTP.map((valor) => (
            <option key={valor} value={valor}>
              {valor}
            </option>
          ))}
        </Select>
        <Input
          type="number"
          aria-label="Filtrar por status HTTP"
          placeholder="Status HTTP"
          value={statusHttp}
          onChange={(e) => setStatusHttp(e.target.value)}
          className="max-w-[140px]"
        />
        <Select
          aria-label="Filtrar por usuário"
          value={usuarioId}
          onChange={(e) => setUsuarioId(e.target.value)}
          className="max-w-[200px]"
        >
          <option value="">Todos os usuários</option>
          {usuarios.map((usuario) => (
            <option key={usuario.id} value={usuario.id}>
              {usuario.nome}
            </option>
          ))}
        </Select>
      </ListToolbar>

      {logsQuery.isError ? (
        <ErrorState message="Não foi possível carregar os logs da aplicação." onRetry={() => logsQuery.refetch()} />
      ) : logsQuery.isLoading ? (
        <LoadingState rows={6} />
      ) : logs.length === 0 ? (
        <EmptyState title="Nenhum log encontrado" description="Nenhuma requisição do ciclo atual corresponde aos filtros aplicados." />
      ) : (
        <Card elevated className="overflow-hidden">
          <Table>
            <thead>
              <tr>
                <Th>Data/hora</Th>
                <Th>Resultado</Th>
                <Th>Método</Th>
                <Th>Rota</Th>
                <Th>Usuário</Th>
                <Th>Status</Th>
                <Th>Duração</Th>
                <Th className="text-right">Ações</Th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <Tr key={log.id} className="cursor-pointer" onClick={() => setDetalheId(log.id)}>
                  <Td>{new Date(log.finalizadoEm).toLocaleString('pt-BR')}</Td>
                  <Td>
                    <Badge tone={TOM_RESULTADO[log.resultado]}>
                      {RESULTADO_LOG_APLICACAO.find((opcao) => opcao.value === log.resultado)?.label}
                    </Badge>
                  </Td>
                  <Td className="font-mono text-xs">{log.metodo}</Td>
                  <Td className="font-mono text-xs">{log.rota}</Td>
                  <Td>{log.usuarioNome ?? '—'}</Td>
                  <Td>{log.statusHttp}</Td>
                  <Td>{log.duracaoMs} ms</Td>
                  <Td className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDetalheId(log.id);
                      }}
                    >
                      Detalhes
                    </Button>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}

      <LogAplicacaoDetalheDialog id={detalheId} onOpenChange={(open) => !open && setDetalheId(null)} />
    </PageShell>
  );
}
