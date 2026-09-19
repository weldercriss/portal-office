import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardTitle } from '../../../components/ui/Card';
import { ErrorState } from '../../../components/ui/ErrorState';
import { LoadingState } from '../../../components/ui/LoadingState';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Table, Td, Th, Tr } from '../../../components/ui/Table';
import { useDepartamentos } from '../../departamentos/hooks/useDepartamentos';
import { useTurnover } from '../hooks/useRelatorios';

function labelMes(mes: string): string {
  const [ano, mesNumero] = mes.split('-');
  const data = new Date(Date.UTC(Number(ano), Number(mesNumero) - 1, 1));
  return data.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export default function TurnoverAdminPage() {
  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');
  const [departamentoId, setDepartamentoId] = useState('');

  const departamentosQuery = useDepartamentos();
  const turnoverQuery = useTurnover({ de: de || undefined, ate: ate || undefined, departamentoId: departamentoId || undefined });

  const dados = (turnoverQuery.data ?? []).map((item) => ({ ...item, label: labelMes(item.mes) }));

  return (
    <>
      <div className="flex flex-wrap gap-3">
        <Input type="month" aria-label="De" value={de} onChange={(e) => setDe(e.target.value)} className="max-w-[160px]" />
        <Input type="month" aria-label="Até" value={ate} onChange={(e) => setAte(e.target.value)} className="max-w-[160px]" />
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

      {turnoverQuery.isError ? (
        <ErrorState message="Não foi possível carregar o relatório." onRetry={() => turnoverQuery.refetch()} />
      ) : turnoverQuery.isLoading ? (
        <LoadingState rows={4} />
      ) : dados.length === 0 ? (
        <p className="mt-6 text-sm text-[var(--color-text-secondary)]">Nenhuma admissão ou desligamento no período.</p>
      ) : (
        <>
          <Card elevated className="mt-6 p-6">
            <CardTitle>Admissões × Desligamentos</CardTitle>
            <div className="mt-4 h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dados} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
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
                  />
                  <Legend wrapperStyle={{ fontSize: 13 }} />
                  <Bar dataKey="admissoes" name="Admissões" fill="var(--color-success)" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="desligamentos" name="Desligamentos" fill="var(--color-danger)" radius={[4, 4, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card elevated className="mt-6 overflow-hidden">
            <Table>
              <thead>
                <tr>
                  <Th>Mês</Th>
                  <Th>Admissões</Th>
                  <Th>Desligamentos</Th>
                </tr>
              </thead>
              <tbody>
                {dados.map((item) => (
                  <Tr key={item.mes}>
                    <Td className="font-bold text-[var(--color-text-primary)]">{item.label}</Td>
                    <Td>{item.admissoes}</Td>
                    <Td>{item.desligamentos}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </Card>
        </>
      )}
    </>
  );
}
