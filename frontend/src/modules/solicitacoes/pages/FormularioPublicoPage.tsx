import { FormEvent, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { ErrorState } from '../../../components/ui/ErrorState';
import { FormActions } from '../../../components/ui/Form';
import { LoadingState } from '../../../components/ui/LoadingState';
import { CamposFormularioForm } from '../../../components/system/CamposFormularioForm';
import { anexarCampoFormularioPublico, criarSolicitacaoPublica, getFormularioPublico } from '../api/solicitacoes-publico.api';

export default function FormularioPublicoPage() {
  const { token } = useParams<{ token: string }>();

  const formularioQuery = useQuery({
    queryKey: ['formulario-publico', token],
    queryFn: () => getFormularioPublico(token!),
    enabled: !!token,
    retry: false,
  });

  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [arquivos, setArquivos] = useState<Record<string, File | null>>({});
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const enviarMutation = useMutation({
    mutationFn: async () => {
      const { id } = await criarSolicitacaoPublica(token!, respostas);
      // Sequencial, nunca Promise.all: cada upload faz read-modify-write no mesmo Json da solicitação.
      for (const [campoId, arquivo] of Object.entries(arquivos)) {
        if (arquivo) await anexarCampoFormularioPublico(token!, id, campoId, arquivo);
      }
    },
    onSuccess: () => setEnviado(true),
  });

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    try {
      await enviarMutation.mutateAsync();
    } catch {
      setErro('Não foi possível enviar suas respostas. Verifique os dados informados.');
    }
  }

  if (formularioQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-lg">
          <LoadingState rows={4} />
        </div>
      </div>
    );
  }

  if (formularioQuery.isError || !formularioQuery.data) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Card elevated className="w-full max-w-md p-6 text-center">
          <ErrorState message="Link inválido." />
          <Link to="/login" className="mt-4 inline-block text-sm font-bold text-[var(--color-primary)] hover:underline">
            Fazer login
          </Link>
        </Card>
      </div>
    );
  }

  const formulario = formularioQuery.data;

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card elevated className="w-full max-w-lg p-6">
        <h1 className="font-bricolage text-xl font-bold text-[var(--color-text-primary)]">{formulario.tipoNome}</h1>
        {enviado ? (
          <p className="mt-4 text-sm text-[var(--color-text-secondary)]">Respostas enviadas com sucesso. Obrigado!</p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
            <CamposFormularioForm
              campos={formulario.camposFormulario}
              valores={respostas}
              onChangeValor={(campoId, valor) => setRespostas((atual) => ({ ...atual, [campoId]: valor }))}
              arquivos={arquivos}
              onChangeArquivo={(campoId, arquivo) => setArquivos((atual) => ({ ...atual, [campoId]: arquivo }))}
            />
            {erro && <p className="text-sm text-[var(--color-danger)]">{erro}</p>}
            <FormActions>
              <Button type="submit" disabled={enviarMutation.isPending}>
                Enviar respostas
              </Button>
            </FormActions>
          </form>
        )}
      </Card>
    </div>
  );
}
