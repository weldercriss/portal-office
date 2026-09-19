import { FormEvent, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { PageShell } from '../../../components/system/PageShell';
import { Button } from '../../../components/ui/Button';
import { Card, CardTitle } from '../../../components/ui/Card';
import { ErrorState } from '../../../components/ui/ErrorState';
import { FormActions, FormField } from '../../../components/ui/Form';
import { Input } from '../../../components/ui/Input';
import { LoadingState } from '../../../components/ui/LoadingState';
import { PageHeader } from '../../../components/ui/PageHeader';
import { useConfigAvisoAniversario, useUpdateConfigAvisoAniversario } from '../hooks/useAvisosAniversario';

export default function AvisosAniversarioAdminPage() {
  const query = useConfigAvisoAniversario();
  const updateMutation = useUpdateConfigAvisoAniversario();
  const [dias, setDias] = useState<number[]>([]);
  const [novoDia, setNovoDia] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (query.data) setDias(query.data.diasAntecedencia);
  }, [query.data]);

  function adicionarDia(event: FormEvent) {
    event.preventDefault();
    const valor = Number(novoDia);
    if (!Number.isInteger(valor) || valor < 1) {
      setErro('Informe um número inteiro de dias, maior que zero.');
      return;
    }
    if (dias.includes(valor)) {
      setErro('Esse dia já está na lista.');
      return;
    }
    setErro(null);
    setDias([...dias, valor].sort((a, b) => b - a));
    setNovoDia('');
  }

  function removerDia(valor: number) {
    setDias(dias.filter((d) => d !== valor));
  }

  async function salvar() {
    if (dias.length === 0) {
      setErro('Mantenha ao menos um dia de antecedência.');
      return;
    }
    setErro(null);
    await updateMutation.mutateAsync(dias);
  }

  if (query.isError) {
    return (
      <PageShell>
        <ErrorState message="Não foi possível carregar a configuração." onRetry={() => query.refetch()} />
      </PageShell>
    );
  }

  if (query.isLoading) {
    return (
      <PageShell>
        <LoadingState rows={3} />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Avisos de aniversário"
        description="Dias de antecedência em que o RH e o gestor direto recebem o aviso de aniversário e de tempo de casa."
      />

      <Card elevated className="p-6">
        <CardTitle>Dias de antecedência</CardTitle>
        <div className="mt-4 flex flex-wrap gap-2">
          {dias.length === 0 && <p className="text-sm text-[var(--color-text-secondary)]">Nenhum dia configurado.</p>}
          {dias.map((dia) => (
            <span
              key={dia}
              className="flex items-center gap-1.5 rounded-full bg-[var(--color-primary-soft)] px-3 py-1.5 text-sm font-bold text-[var(--color-primary)]"
            >
              {dia} {dia === 1 ? 'dia' : 'dias'}
              <button
                type="button"
                onClick={() => removerDia(dia)}
                aria-label={`Remover ${dia} dias`}
                className="text-[var(--color-primary)] hover:opacity-70"
              >
                <X aria-hidden="true" className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>

        <form onSubmit={adicionarDia} className="mt-4 flex items-end gap-3 border-t border-[var(--color-border)] pt-4">
          <FormField label="Adicionar dia" htmlFor="novo-dia" error={erro ?? undefined} className="max-w-[160px]">
            <Input
              id="novo-dia"
              type="number"
              min={1}
              value={novoDia}
              onChange={(e) => setNovoDia(e.target.value)}
            />
          </FormField>
          <Button type="submit" variant="secondary">
            Adicionar
          </Button>
        </form>

        <FormActions>
          <Button onClick={salvar} disabled={updateMutation.isPending}>
            Salvar
          </Button>
        </FormActions>
      </Card>
    </PageShell>
  );
}
