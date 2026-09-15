import { FormEvent, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Upload } from 'lucide-react';
import { PageShell } from '../../../components/system/PageShell';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Dialog } from '../../../components/ui/Dialog';
import { ErrorState } from '../../../components/ui/ErrorState';
import { FormActions, FormField } from '../../../components/ui/Form';
import { Input } from '../../../components/ui/Input';
import { LoadingState } from '../../../components/ui/LoadingState';
import { PageHeader } from '../../../components/ui/PageHeader';
import { useDepartamentos } from '../../departamentos/hooks/useDepartamentos';
import { useVagas } from '../hooks/useRecrutamento';
import {
  useAnexarCurriculo,
  useCandidatosDaVaga,
  useConverterEmColaborador,
  useCreateCandidato,
  useCreateEntrevista,
  useUpdateCandidato,
} from '../hooks/useRecrutamento';
import { ETAPAS_CANDIDATO, type Candidato, type EtapaCandidato } from '../types/recrutamento.types';

function proximaEtapa(etapa: EtapaCandidato): EtapaCandidato | null {
  const idx = ETAPAS_CANDIDATO.findIndex((e) => e.value === etapa);
  return idx >= 0 && idx < ETAPAS_CANDIDATO.length - 2 ? ETAPAS_CANDIDATO[idx + 1].value : null;
}
function etapaAnterior(etapa: EtapaCandidato): EtapaCandidato | null {
  const idx = ETAPAS_CANDIDATO.findIndex((e) => e.value === etapa);
  return idx > 0 ? ETAPAS_CANDIDATO[idx - 1].value : null;
}

export default function VagaDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const vagaId = id ?? '';
  const vagasQuery = useVagas();
  const vaga = vagasQuery.data?.find((v) => v.id === vagaId);
  const candidatosQuery = useCandidatosDaVaga(vagaId);
  const updateMutation = useUpdateCandidato(vagaId);
  const createMutation = useCreateCandidato(vagaId);
  const anexarMutation = useAnexarCurriculo(vagaId);
  const criarEntrevistaMutation = useCreateEntrevista(vagaId);
  const converterMutation = useConverterEmColaborador(vagaId);
  const departamentosQuery = useDepartamentos();

  const [dialogNovo, setDialogNovo] = useState(false);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');

  const [candidatoEntrevista, setCandidatoEntrevista] = useState<Candidato | null>(null);
  const [dataEntrevista, setDataEntrevista] = useState('');

  const [candidatoConverter, setCandidatoConverter] = useState<Candidato | null>(null);
  const [groupId, setGroupId] = useState('');
  const [telegramUsername, setTelegramUsername] = useState('');
  const [senhaGerada, setSenhaGerada] = useState<{ nome: string; senha: string } | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function handleCriarCandidato(event: FormEvent) {
    event.preventDefault();
    await createMutation.mutateAsync({ nome, email, telefone: telefone || undefined });
    setNome('');
    setEmail('');
    setTelefone('');
    setDialogNovo(false);
  }

  function moverEtapa(candidato: Candidato, etapa: EtapaCandidato) {
    updateMutation.mutate({ id: candidato.id, input: { etapa } });
  }

  async function handleUploadCurriculo(candidatoId: string, arquivo: File | null) {
    if (!arquivo) return;
    await anexarMutation.mutateAsync({ id: candidatoId, arquivo });
  }

  async function handleCriarEntrevista(event: FormEvent) {
    event.preventDefault();
    if (!candidatoEntrevista) return;
    await criarEntrevistaMutation.mutateAsync({ candidatoId: candidatoEntrevista.id, input: { data: dataEntrevista } });
    setCandidatoEntrevista(null);
    setDataEntrevista('');
  }

  async function handleConverter(event: FormEvent) {
    event.preventDefault();
    if (!candidatoConverter) return;
    setErro(null);
    try {
      const resultado = await converterMutation.mutateAsync({
        candidatoId: candidatoConverter.id,
        input: { groupId: groupId || undefined, telegramUsername },
      });
      if (resultado.senhaGerada) {
        setSenhaGerada({ nome: resultado.nome, senha: resultado.senhaGerada });
      }
      setCandidatoConverter(null);
      setGroupId('');
      setTelegramUsername('');
    } catch {
      setErro('Não foi possível converter o candidato em colaborador. Confira se o e-mail já não está cadastrado.');
    }
  }

  if (candidatosQuery.isError) {
    return (
      <PageShell>
        <ErrorState message="Não foi possível carregar os candidatos." onRetry={() => candidatosQuery.refetch()} />
      </PageShell>
    );
  }
  if (candidatosQuery.isLoading) {
    return (
      <PageShell>
        <LoadingState rows={5} />
      </PageShell>
    );
  }

  const candidatos = candidatosQuery.data ?? [];

  return (
    <PageShell>
      <PageHeader
        title={vaga ? vaga.titulo : 'Vaga'}
        description={vaga?.departamento?.nome ?? 'Funil de candidatos desta vaga.'}
      />

      <div className="mb-4 flex justify-end">
        <Button onClick={() => setDialogNovo(true)}>Novo candidato</Button>
      </div>

      <div className="grid grid-cols-1 gap-4 overflow-x-auto sm:grid-cols-2 lg:grid-cols-5">
        {ETAPAS_CANDIDATO.map((etapa) => (
          <div key={etapa.value} className="flex min-w-[220px] flex-col gap-3">
            <h2 className="text-[13px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
              {etapa.label} ({candidatos.filter((c) => c.etapa === etapa.value).length})
            </h2>
            <div className="flex flex-col gap-2">
              {candidatos
                .filter((c) => c.etapa === etapa.value)
                .map((candidato) => {
                  const anterior = etapaAnterior(candidato.etapa);
                  const proxima = proximaEtapa(candidato.etapa);
                  return (
                    <Card key={candidato.id} elevated className="flex flex-col gap-2 p-3">
                      <p className="text-sm font-bold text-[var(--color-text-primary)]">{candidato.nome}</p>
                      <p className="text-xs text-[var(--color-text-secondary)]">{candidato.email}</p>

                      <label className="flex items-center gap-1 text-xs text-[var(--color-text-secondary)]">
                        <Upload aria-hidden="true" className="h-3.5 w-3.5" />
                        {candidato.curriculoNome ?? 'Anexar currículo'}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,application/pdf"
                          className="hidden"
                          onChange={(e) => handleUploadCurriculo(candidato.id, e.target.files?.[0] ?? null)}
                        />
                      </label>

                      <div className="flex items-center justify-between gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-1.5"
                          disabled={!anterior}
                          onClick={() => anterior && moverEtapa(candidato, anterior)}
                          aria-label="Etapa anterior"
                        >
                          <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setCandidatoEntrevista(candidato)}>
                          Entrevista
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-1.5"
                          disabled={!proxima}
                          onClick={() => proxima && moverEtapa(candidato, proxima)}
                          aria-label="Próxima etapa"
                        >
                          <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      {candidato.etapa === 'APROVADO' && (
                        <Button size="sm" className="mt-1" onClick={() => setCandidatoConverter(candidato)}>
                          Converter em colaborador
                        </Button>
                      )}
                    </Card>
                  );
                })}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={dialogNovo} onOpenChange={setDialogNovo} title="Novo candidato">
        <form onSubmit={handleCriarCandidato} className="flex flex-col gap-4">
          <FormField label="Nome" htmlFor="cand-nome">
            <Input id="cand-nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
          </FormField>
          <FormField label="E-mail" htmlFor="cand-email">
            <Input id="cand-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </FormField>
          <FormField label="Telefone (opcional)" htmlFor="cand-telefone">
            <Input id="cand-telefone" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
          </FormField>
          <FormActions>
            <Button type="button" variant="secondary" onClick={() => setDialogNovo(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              Adicionar
            </Button>
          </FormActions>
        </form>
      </Dialog>

      <Dialog
        open={!!candidatoEntrevista}
        onOpenChange={(open) => !open && setCandidatoEntrevista(null)}
        title={`Agendar entrevista — ${candidatoEntrevista?.nome ?? ''}`}
      >
        <form onSubmit={handleCriarEntrevista} className="flex flex-col gap-4">
          <FormField label="Data e hora" htmlFor="entrevista-data">
            <Input
              id="entrevista-data"
              type="datetime-local"
              value={dataEntrevista}
              onChange={(e) => setDataEntrevista(e.target.value)}
              required
            />
          </FormField>
          <FormActions>
            <Button type="button" variant="secondary" onClick={() => setCandidatoEntrevista(null)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={criarEntrevistaMutation.isPending}>
              Agendar
            </Button>
          </FormActions>
        </form>
      </Dialog>

      <Dialog
        open={!!candidatoConverter}
        onOpenChange={(open) => !open && setCandidatoConverter(null)}
        title={`Converter em colaborador — ${candidatoConverter?.nome ?? ''}`}
      >
        <form onSubmit={handleConverter} className="flex flex-col gap-4">
          <FormField label="Departamento (opcional)" htmlFor="conv-departamento">
            <select
              id="conv-departamento"
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className="w-full rounded-[var(--radius-button)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
            >
              <option value="">— Sem departamento —</option>
              {(departamentosQuery.data ?? []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nome}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Username do Telegram" htmlFor="conv-telegram" error={erro ?? undefined}>
            <Input
              id="conv-telegram"
              value={telegramUsername}
              onChange={(e) => setTelegramUsername(e.target.value)}
              placeholder="@usuario"
              required
            />
          </FormField>
          <FormActions>
            <Button type="button" variant="secondary" onClick={() => setCandidatoConverter(null)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={converterMutation.isPending}>
              Converter
            </Button>
          </FormActions>
        </form>
      </Dialog>

      <Dialog open={!!senhaGerada} onOpenChange={(open) => !open && setSenhaGerada(null)} title="Colaborador criado">
        <div className="flex flex-col gap-5">
          <p className="text-sm leading-6 text-[var(--color-text-secondary)]">
            <strong>{senhaGerada?.nome}</strong> foi cadastrado como colaborador com a senha temporária abaixo.
          </p>
          <p className="rounded-[var(--radius-button)] border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-center font-mono text-lg font-bold tracking-wide text-[var(--color-text-primary)]">
            {senhaGerada?.senha}
          </p>
          <FormActions>
            <Button type="button" onClick={() => setSenhaGerada(null)}>
              Entendi
            </Button>
          </FormActions>
        </div>
      </Dialog>
    </PageShell>
  );
}
