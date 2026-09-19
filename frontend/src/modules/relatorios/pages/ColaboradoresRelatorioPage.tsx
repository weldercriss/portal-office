import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardTitle } from '../../../components/ui/Card';
import { ErrorState } from '../../../components/ui/ErrorState';
import { LoadingState } from '../../../components/ui/LoadingState';
import { Select } from '../../../components/ui/Select';
import { Table, Td, Th, Tr } from '../../../components/ui/Table';
import { useDepartamentos } from '../../departamentos/hooks/useDepartamentos';
import { useColaboradoresRelatorio } from '../hooks/useRelatorios';
import type { RelatorioAniversariantesPorMes } from '../types/relatorios.types';

const MES_LABEL = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function dataCurta(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' });
}

function AniversariantesPorMesCard({ dados }: { dados: RelatorioAniversariantesPorMes[] }) {
  const pontos = dados.map((item) => ({ mes: MES_LABEL[item.mes], total: item.total }));
  return (
    <Card elevated className="mt-6 p-6">
      <CardTitle>Aniversariantes por mês</CardTitle>
      <div className="mt-4 h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={pontos} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
            <XAxis dataKey="mes" tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
            <Tooltip
              cursor={{ fill: 'var(--color-surface-hover)' }}
              contentStyle={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 8,
                fontSize: 13,
              }}
              labelStyle={{ color: 'var(--color-text-primary)', fontWeight: 700 }}
              formatter={(value) => [value, 'Aniversariantes']}
            />
            <Bar dataKey="total" fill="var(--color-primary)" radius={[4, 4, 0, 0]} maxBarSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export default function ColaboradoresRelatorioPage() {
  const [departamentoId, setDepartamentoId] = useState('');

  const departamentosQuery = useDepartamentos();
  const relatorioQuery = useColaboradoresRelatorio(departamentoId || undefined);

  return (
    <>
      <div className="flex flex-wrap gap-3">
        <Select
          aria-label="Departamento"
          value={departamentoId}
          onChange={(e) => setDepartamentoId(e.target.value)}
          className="max-w-[220px]"
        >
          <option value="">Todos os departamentos</option>
          {(departamentosQuery.data ?? []).map((dep) => (
            <option key={dep.id} value={dep.id}>
              {dep.nome}
            </option>
          ))}
        </Select>
      </div>

      {relatorioQuery.isError ? (
        <ErrorState message="Não foi possível carregar o relatório." onRetry={() => relatorioQuery.refetch()} />
      ) : relatorioQuery.isLoading || !relatorioQuery.data ? (
        <LoadingState rows={5} />
      ) : (
        <>
          <Card elevated className="mt-6 p-5">
            <p className="text-[13px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
              Total de colaboradores
            </p>
            <p className="mt-1 font-bricolage text-[28px] font-bold leading-tight text-[var(--color-text-primary)]">
              {relatorioQuery.data.totalColaboradores}
            </p>
          </Card>

          <Card elevated className="mt-6 p-6">
            <CardTitle>Colaboradores por departamento</CardTitle>
            {relatorioQuery.data.porDepartamento.length === 0 ? (
              <p className="mt-4 text-sm text-[var(--color-text-secondary)]">Nenhum colaborador cadastrado ainda.</p>
            ) : (
              <Table className="mt-4">
                <thead>
                  <tr>
                    <Th>Departamento</Th>
                    <Th>Colaboradores</Th>
                  </tr>
                </thead>
                <tbody>
                  {relatorioQuery.data.porDepartamento.map((item) => (
                    <Tr key={item.departamentoId ?? 'sem-departamento'}>
                      <Td className="font-bold text-[var(--color-text-primary)]">{item.departamento}</Td>
                      <Td>{item.total}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>

          <AniversariantesPorMesCard dados={relatorioQuery.data.aniversariantesPorMes} />

          <div className="mt-6 grid items-start gap-6 lg:grid-cols-2">
            <Card elevated className="p-6">
              <CardTitle>Aniversariantes</CardTitle>
              {relatorioQuery.data.aniversariantes.length === 0 ? (
                <p className="mt-4 text-sm text-[var(--color-text-secondary)]">Nenhum aniversariante cadastrado.</p>
              ) : (
                <Table className="mt-4">
                  <thead>
                    <tr>
                      <Th>Nome</Th>
                      <Th>Departamento</Th>
                      <Th>Data</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {relatorioQuery.data.aniversariantes.map((item) => (
                      <Tr key={item.id}>
                        <Td className="font-bold text-[var(--color-text-primary)]">{item.nome}</Td>
                        <Td>{item.departamento}</Td>
                        <Td>{dataCurta(item.data)}</Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card>

            <Card elevated className="p-6">
              <CardTitle>Aniversários de casa</CardTitle>
              {relatorioQuery.data.aniversariosCasa.length === 0 ? (
                <p className="mt-4 text-sm text-[var(--color-text-secondary)]">Nenhum aniversário de casa cadastrado.</p>
              ) : (
                <Table className="mt-4">
                  <thead>
                    <tr>
                      <Th>Nome</Th>
                      <Th>Departamento</Th>
                      <Th>Admissão</Th>
                      <Th>Anos de casa</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {relatorioQuery.data.aniversariosCasa.map((item) => (
                      <Tr key={item.id}>
                        <Td className="font-bold text-[var(--color-text-primary)]">{item.nome}</Td>
                        <Td>{item.departamento}</Td>
                        <Td>{dataCurta(item.data)}</Td>
                        <Td>{item.anos}</Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card>
          </div>
        </>
      )}
    </>
  );
}
