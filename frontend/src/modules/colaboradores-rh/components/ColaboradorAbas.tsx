import { FormEvent, useEffect, useState } from 'react';
import { Download, FileCheck2, Trash2 } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { FormActions, FormField } from '../../../components/ui/Form';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { useAuth } from '../../../shared/auth/AuthContext';
import { satisfazRole } from '../../../types/auth.types';
import { useCategoriasDocumento } from '../../categorias-documento/hooks/useCategoriasDocumento';
import { TermoAceiteDialog } from '../../patrimonio/components/TermoAceiteDialog';
import { useAlocacoes } from '../../patrimonio/hooks/usePatrimonio';
import { ALOCACAO_STATUS_LABEL, type AlocacaoEquipamento, type AlocacaoStatus } from '../../patrimonio/types/patrimonio.types';
import { visualizarTermo } from '../../patrimonio/utils/termo';
import type { Usuario } from '../../usuarios/types/usuario.types';
import { DocumentoPreviewDialog } from './DocumentoPreviewDialog';
import {
  useChecklist,
  useCreateDependente,
  useCreateHistorico,
  useDadosSensiveis,
  useDeleteDependente,
  useDeleteDocumento,
  useDeleteHistorico,
  useDependentes,
  useDocumentos,
  useGerarChecklistPadrao,
  useHistorico,
  useUpdateChecklistItem,
  useUpdateDadosSensiveis,
  useUploadDocumento,
} from '../hooks/useColaboradorRh';
import { useDocumentoPreview } from '../hooks/useDocumentoPreview';
import { agruparPorCompetencia } from '../utils/competencia';
import { calcularTempoExperiencia } from '../utils/tempoExperiencia';

const ABAS = ['dependentes', 'historico', 'checklist', 'documentos', 'equipamentos', 'saude'] as const;
type Aba = (typeof ABAS)[number];

const LABEL_ABA: Record<Aba, string> = {
  dependentes: 'Dependentes',
  historico: 'Histórico profissional',
  checklist: 'Checklist de admissão',
  documentos: 'Documentos',
  equipamentos: 'Equipamentos',
  saude: 'Saúde',
};

function formatarData(iso: string | null): string {
  if (!iso) return '—';
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return '—';
  return data.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

interface ColaboradorAbasProps {
  userId: string;
  usuario: Pick<Usuario, 'dataAdmissao' | 'dataDesligamento'> | undefined;
  podeAdministrar: boolean;
}

/** Tudo que fica vinculado ao colaborador: usado tanto na Ficha (admin vendo outro) quanto em Meu perfil (o próprio colaborador). */
export function ColaboradorAbas({ userId, usuario, podeAdministrar }: ColaboradorAbasProps) {
  const [aba, setAba] = useState<Aba>('dependentes');
  const abas = podeAdministrar ? ABAS : ABAS.filter((item) => item !== 'checklist');

  return (
    <Card elevated className="p-6">
      <div className="mb-6 flex flex-wrap gap-1 border-b border-[var(--color-border)]">
        {abas.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setAba(item)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-bold transition-colors ${
              aba === item
                ? 'border-[var(--color-accent)] text-[var(--color-text-primary)]'
                : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            {LABEL_ABA[item]}
          </button>
        ))}
      </div>

      {aba === 'dependentes' && <SecaoDependentes userId={userId} podeAdministrar={podeAdministrar} />}
      {aba === 'historico' && (
        <SecaoHistorico
          userId={userId}
          dataAdmissao={usuario?.dataAdmissao ?? null}
          dataDesligamento={usuario?.dataDesligamento ?? null}
          podeAdministrar={podeAdministrar}
        />
      )}
      {aba === 'checklist' && podeAdministrar && <SecaoChecklist userId={userId} />}
      {aba === 'documentos' && <SecaoDocumentos userId={userId} podeAdministrar={podeAdministrar} />}
      {aba === 'equipamentos' && <SecaoEquipamentos userId={userId} />}
      {aba === 'saude' && <SecaoSaude userId={userId} />}
    </Card>
  );
}

function SecaoDependentes({ userId, podeAdministrar }: { userId: string; podeAdministrar: boolean }) {
  const query = useDependentes(userId);
  const createMutation = useCreateDependente(userId);
  const deleteMutation = useDeleteDependente(userId);
  const [nome, setNome] = useState('');
  const [parentesco, setParentesco] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await createMutation.mutateAsync({ nome, parentesco, dataNascimento: dataNascimento || undefined });
    setNome('');
    setParentesco('');
    setDataNascimento('');
  }

  return (
    <>
      <ul className="mb-4 flex flex-col gap-2">
        {(query.data ?? []).map((dependente) => (
          <li
            key={dependente.id}
            className="flex items-center justify-between rounded-lg border border-[var(--color-border)] px-3 py-2"
          >
            <div>
              <p className="text-sm font-bold text-[var(--color-text-primary)]">{dependente.nome}</p>
              <p className="text-xs text-[var(--color-text-secondary)]">
                {dependente.parentesco} · {formatarData(dependente.dataNascimento)}
              </p>
            </div>
            {podeAdministrar && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-[var(--color-danger)]"
                onClick={() => deleteMutation.mutate(dependente.id)}
                aria-label={`Excluir ${dependente.nome}`}
              >
                <Trash2 aria-hidden="true" className="h-4 w-4" />
              </Button>
            )}
          </li>
        ))}
        {(query.data ?? []).length === 0 && (
          <p className="text-sm text-[var(--color-text-secondary)]">Nenhum dependente cadastrado.</p>
        )}
      </ul>
      {podeAdministrar && (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 border-t border-[var(--color-border)] pt-4 sm:grid-cols-3">
          <FormField label="Nome" htmlFor="dep-nome">
            <Input id="dep-nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
          </FormField>
          <FormField label="Parentesco" htmlFor="dep-parentesco">
            <Input id="dep-parentesco" value={parentesco} onChange={(e) => setParentesco(e.target.value)} required />
          </FormField>
          <FormField label="Data de nascimento" htmlFor="dep-nascimento">
            <Input id="dep-nascimento" type="date" value={dataNascimento} onChange={(e) => setDataNascimento(e.target.value)} />
          </FormField>
          <FormActions>
            <Button type="submit" disabled={createMutation.isPending}>
              Adicionar dependente
            </Button>
          </FormActions>
        </form>
      )}
    </>
  );
}

function SecaoHistorico({
  userId,
  dataAdmissao,
  dataDesligamento,
  podeAdministrar,
}: {
  userId: string;
  dataAdmissao: string | null;
  dataDesligamento: string | null;
  podeAdministrar: boolean;
}) {
  const query = useHistorico(userId);
  const createMutation = useCreateHistorico(userId);
  const deleteMutation = useDeleteHistorico(userId);
  const [cargo, setCargo] = useState('');
  const [externo, setExterno] = useState(false);
  const [departamento, setDepartamento] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [observacao, setObservacao] = useState('');

  const historico = query.data ?? [];
  const tempoExperiencia = calcularTempoExperiencia(
    dataAdmissao ? { dataInicio: dataAdmissao, dataFim: dataDesligamento } : null,
    historico.filter((item) => item.externo).map((item) => ({ dataInicio: item.dataInicio, dataFim: item.dataFim })),
  );

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await createMutation.mutateAsync({
      cargo,
      externo,
      departamento: externo ? undefined : departamento || undefined,
      empresa: externo ? empresa || undefined : undefined,
      dataInicio,
      observacao: observacao || undefined,
    });
    setCargo('');
    setDepartamento('');
    setEmpresa('');
    setDataInicio('');
    setObservacao('');
  }

  return (
    <>
      <p className="mb-4 text-sm text-[var(--color-text-secondary)]">
        Tempo de experiência total (nesta empresa + anteriores): <strong className="text-[var(--color-text-primary)]">{tempoExperiencia}</strong>
      </p>
      <ul className="mb-4 flex flex-col gap-2">
        {historico.map((item) => (
          <li key={item.id} className="flex items-center justify-between rounded-lg border border-[var(--color-border)] px-3 py-2">
            <div>
              <p className="text-sm font-bold text-[var(--color-text-primary)]">
                {item.cargo} {item.externo && <span className="font-normal text-[var(--color-text-secondary)]">(empresa anterior)</span>}
              </p>
              <p className="text-xs text-[var(--color-text-secondary)]">
                {(item.externo ? item.empresa : item.departamento) ?? '—'} · desde {formatarData(item.dataInicio)}
                {item.dataFim ? ` até ${formatarData(item.dataFim)}` : ''}
              </p>
              {item.observacao && <p className="text-xs text-[var(--color-text-secondary)]">{item.observacao}</p>}
            </div>
            {podeAdministrar && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-[var(--color-danger)]"
                onClick={() => deleteMutation.mutate(item.id)}
                aria-label={`Excluir ${item.cargo}`}
              >
                <Trash2 aria-hidden="true" className="h-4 w-4" />
              </Button>
            )}
          </li>
        ))}
        {historico.length === 0 && (
          <p className="text-sm text-[var(--color-text-secondary)]">Nenhum registro de histórico ainda.</p>
        )}
      </ul>
      {podeAdministrar && (
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 border-t border-[var(--color-border)] pt-4 sm:grid-cols-2">
        <div className="flex gap-1 border-b border-[var(--color-border)] sm:col-span-2">
          <button
            type="button"
            onClick={() => setExterno(false)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-bold transition-colors ${!externo ? 'border-[var(--color-accent)] text-[var(--color-text-primary)]' : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`}
          >
            Nesta empresa
          </button>
          <button
            type="button"
            onClick={() => setExterno(true)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-bold transition-colors ${externo ? 'border-[var(--color-accent)] text-[var(--color-text-primary)]' : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`}
          >
            Empresa anterior
          </button>
        </div>
        <FormField label="Cargo" htmlFor="hist-cargo">
          <Input id="hist-cargo" value={cargo} onChange={(e) => setCargo(e.target.value)} required />
        </FormField>
        {externo ? (
          <FormField label="Empresa" htmlFor="hist-empresa">
            <Input id="hist-empresa" value={empresa} onChange={(e) => setEmpresa(e.target.value)} />
          </FormField>
        ) : (
          <FormField label="Departamento (opcional)" htmlFor="hist-departamento">
            <Input id="hist-departamento" value={departamento} onChange={(e) => setDepartamento(e.target.value)} />
          </FormField>
        )}
        <FormField label="Data de início" htmlFor="hist-inicio">
          <Input id="hist-inicio" type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} required />
        </FormField>
        <FormField label="Observação (opcional)" htmlFor="hist-obs">
          <Input id="hist-obs" value={observacao} onChange={(e) => setObservacao(e.target.value)} />
        </FormField>
        <FormActions>
          <Button type="submit" disabled={createMutation.isPending}>
            Adicionar ao histórico
          </Button>
        </FormActions>
      </form>
      )}
    </>
  );
}

const TIPOS_CHECKLIST = ['ADMISSAO', 'DESLIGAMENTO'] as const;
const LABEL_TIPO_CHECKLIST: Record<(typeof TIPOS_CHECKLIST)[number], string> = {
  ADMISSAO: 'Admissão',
  DESLIGAMENTO: 'Desligamento',
};
const SEM_CATEGORIA = 'Outros';

function SecaoChecklist({ userId }: { userId: string }) {
  const { user } = useAuth();
  const podeVerObservacao = satisfazRole(user?.role, 'ADMIN');
  const [tipo, setTipo] = useState<(typeof TIPOS_CHECKLIST)[number]>('ADMISSAO');
  const query = useChecklist(userId, tipo);
  const gerarPadraoMutation = useGerarChecklistPadrao(userId, tipo);
  const updateMutation = useUpdateChecklistItem(userId, tipo);

  const itens = query.data ?? [];
  const porCategoria = new Map<string, typeof itens>();
  for (const item of itens) {
    const chave = item.categoria ?? SEM_CATEGORIA;
    porCategoria.set(chave, [...(porCategoria.get(chave) ?? []), item]);
  }

  return (
    <>
      <div className="mb-4 flex gap-1 border-b border-[var(--color-border)]">
        {TIPOS_CHECKLIST.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTipo(item)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-bold transition-colors ${
              tipo === item
                ? 'border-[var(--color-accent)] text-[var(--color-text-primary)]'
                : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            {LABEL_TIPO_CHECKLIST[item]}
          </button>
        ))}
      </div>

      {itens.length === 0 ? (
        <div className="flex flex-col items-start gap-3">
          <p className="text-sm text-[var(--color-text-secondary)]">Nenhum item de checklist ainda.</p>
          {podeVerObservacao && (
            <Button onClick={() => gerarPadraoMutation.mutate()} disabled={gerarPadraoMutation.isPending}>
              Gerar checklist de {LABEL_TIPO_CHECKLIST[tipo].toLowerCase()} padrão
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {Array.from(porCategoria.entries()).map(([categoria, itensCategoria]) => (
            <div key={categoria}>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--color-text-secondary)]">{categoria}</p>
              <ul className="flex flex-col gap-2">
                {itensCategoria.map((item) => (
                  <li key={item.id} className="rounded-lg border border-[var(--color-border)] px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-sm ${item.status === 'CONCLUIDO' ? 'text-[var(--color-text-secondary)] line-through' : 'font-medium text-[var(--color-text-primary)]'}`}
                      >
                        {item.titulo}
                      </span>
                      <label className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
                        <input
                          type="checkbox"
                          checked={item.status === 'CONCLUIDO'}
                          onChange={(e) =>
                            updateMutation.mutate({ id: item.id, status: e.target.checked ? 'CONCLUIDO' : 'PENDENTE' })
                          }
                        />
                        Concluído
                      </label>
                    </div>
                    {podeVerObservacao && (
                      <Input
                        aria-label={`Observação interna de ${item.titulo}`}
                        placeholder="Observação interna (só ADMIN/MASTER vê)"
                        defaultValue={item.observacaoInterna ?? ''}
                        className="mt-2 h-8 text-xs"
                        onBlur={(e) => {
                          if (e.target.value !== (item.observacaoInterna ?? '')) {
                            updateMutation.mutate({ id: item.id, observacaoInterna: e.target.value });
                          }
                        }}
                      />
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function SecaoDocumentos({ userId, podeAdministrar }: { userId: string; podeAdministrar: boolean }) {
  const query = useDocumentos(userId);
  const categoriasQuery = useCategoriasDocumento();
  const uploadMutation = useUploadDocumento(userId);
  const deleteMutation = useDeleteDocumento(userId);
  const { preview, abrir, fechar } = useDocumentoPreview();
  const [subAba, setSubAba] = useState<'documentos' | 'contracheque'>('documentos');
  const [nome, setNome] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [validade, setValidade] = useState('');
  const [competencia, setCompetencia] = useState('');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const categorias = categoriasQuery.data ?? [];
  const documentos = query.data ?? [];
  const categoriaHolerite = categorias.find((c) => c.nome === 'Holerite');
  const documentosGerais = documentos.filter((d) => d.categoria.nome !== 'Holerite');
  const contracheques = documentos.filter((d) => d.categoria.nome === 'Holerite');
  const pastasContracheque = agruparPorCompetencia(contracheques);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    if (!arquivo) {
      setErro('Selecione um arquivo');
      return;
    }
    if (!categoriaId) {
      setErro('Selecione uma categoria');
      return;
    }
    try {
      await uploadMutation.mutateAsync({
        nome,
        categoriaId,
        validade: validade || undefined,
        competencia: competencia ? `${competencia}-01` : undefined,
        arquivo,
      });
      setNome('');
      setValidade('');
      setCompetencia('');
      setArquivo(null);
    } catch {
      setErro('Não foi possível enviar o documento.');
    }
  }

  function listaDocumentos(itens: typeof documentos) {
    return (
      <ul className="mb-4 flex flex-col gap-2">
        {itens.map((doc) => (
          <li key={doc.id} className="flex items-center justify-between rounded-lg border border-[var(--color-border)] px-3 py-2">
            <div>
              <button
                type="button"
                onClick={() => abrir(userId, doc.id, doc.nome)}
                className="text-sm font-bold text-[var(--color-primary)] hover:underline"
              >
                {doc.nome}
              </button>
              <p className="text-xs text-[var(--color-text-secondary)]">
                {doc.categoria.nome} · enviado em {formatarData(doc.criadoEm)}
                {doc.validade ? ` · válido até ${formatarData(doc.validade)}` : ''}
              </p>
            </div>
            {podeAdministrar && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-[var(--color-danger)]"
                onClick={() => deleteMutation.mutate(doc.id)}
                aria-label={`Excluir ${doc.nome}`}
              >
                <Trash2 aria-hidden="true" className="h-4 w-4" />
              </Button>
            )}
          </li>
        ))}
        {itens.length === 0 && <p className="text-sm text-[var(--color-text-secondary)]">Nenhum documento aqui ainda.</p>}
      </ul>
    );
  }

  const temDocumento = documentos.length > 0;

  return (
    <>
      {temDocumento ? (
        <>
          <div className="mb-4 flex gap-1 border-b border-[var(--color-border)]">
            <button
              type="button"
              onClick={() => setSubAba('documentos')}
              className={`-mb-px border-b-2 px-4 py-2 text-sm font-bold transition-colors ${
                subAba === 'documentos'
                  ? 'border-[var(--color-accent)] text-[var(--color-text-primary)]'
                  : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              Documentos
            </button>
            <button
              type="button"
              onClick={() => setSubAba('contracheque')}
              className={`-mb-px border-b-2 px-4 py-2 text-sm font-bold transition-colors ${
                subAba === 'contracheque'
                  ? 'border-[var(--color-accent)] text-[var(--color-text-primary)]'
                  : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              Contracheque
            </button>
          </div>

          {subAba === 'documentos' ? (
            listaDocumentos(documentosGerais)
          ) : pastasContracheque.length === 0 ? (
            <p className="mb-4 text-sm text-[var(--color-text-secondary)]">Nenhum contracheque enviado ainda.</p>
          ) : (
            <div className="mb-4 flex flex-col gap-4">
              {pastasContracheque.map((pasta) => (
                <div key={pasta.chave}>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--color-text-secondary)]">{pasta.label}</p>
                  {listaDocumentos(pasta.itens)}
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <p className="mb-4 text-sm text-[var(--color-text-secondary)]">Nenhum documento enviado ainda.</p>
      )}

      {podeAdministrar && (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 border-t border-[var(--color-border)] pt-4 sm:grid-cols-2">
          <FormField label="Nome do documento" htmlFor="doc-nome">
            <Input id="doc-nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
          </FormField>
          <FormField label="Categoria" htmlFor="doc-categoria">
            <Select id="doc-categoria" value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} required>
              <option value="">— Selecione —</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Validade (opcional)" htmlFor="doc-validade">
            <Input id="doc-validade" type="date" value={validade} onChange={(e) => setValidade(e.target.value)} />
          </FormField>
          {categoriaId === categoriaHolerite?.id && (
            <FormField label="Competência (mês/ano)" htmlFor="doc-competencia">
              <Input id="doc-competencia" type="month" value={competencia} onChange={(e) => setCompetencia(e.target.value)} />
            </FormField>
          )}
          <FormField label="Arquivo (JPG/PNG/PDF/DOC/DOCX)" htmlFor="doc-arquivo" error={erro ?? undefined}>
            <Input
              id="doc-arquivo"
              type="file"
              accept=".pdf,.doc,.docx,image/jpeg,image/png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
            />
          </FormField>
          <FormActions>
            <Button type="submit" disabled={uploadMutation.isPending}>
              Enviar documento
            </Button>
          </FormActions>
        </form>
      )}
      <DocumentoPreviewDialog preview={preview} onOpenChange={(open) => !open && fechar()} />
    </>
  );
}

function toneAlocacao(status: AlocacaoStatus) {
  if (status === 'ASSINADO' || status === 'ENTREGUE') return 'success' as const;
  if (status === 'CANCELADA') return 'danger' as const;
  return 'warning' as const;
}

function descricaoAlocacao(alocacao: AlocacaoEquipamento): string {
  const eq = alocacao.equipamento;
  if (!eq) return 'Equipamento';
  return [eq.tipo.nome, eq.numero ?? eq.marca].filter(Boolean).join(' — ');
}

/**
 * Assinatura acontece no Clicksign; o colaborador confirma o aceite aqui
 * importando de volta o PDF assinado. Quem vê a ficha de outra pessoa só
 * acompanha o status — o aceite é sempre do próprio dono do equipamento.
 */
function SecaoEquipamentos({ userId }: { userId: string }) {
  const { user } = useAuth();
  const query = useAlocacoes({ colaboradorId: userId });
  const [termoAceiteAlvo, setTermoAceiteAlvo] = useState<AlocacaoEquipamento | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const alocacoes = query.data ?? [];

  async function handleVerTermo(alocacaoId: string) {
    setErro(null);
    try {
      await visualizarTermo(alocacaoId);
    } catch {
      setErro('Não foi possível abrir o termo.');
    }
  }

  return (
    <>
      {erro && <p className="mb-3 text-sm text-[var(--color-danger)]">{erro}</p>}
      <ul className="flex flex-col gap-2">
        {alocacoes.map((alocacao) => (
          <li
            key={alocacao.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2"
          >
            <div>
              <p className="text-sm font-bold text-[var(--color-text-primary)]">{descricaoAlocacao(alocacao)}</p>
              <p className="text-xs text-[var(--color-text-secondary)]">
                Entregue em {formatarData(alocacao.dataInicio)}
                {alocacao.dataDevolucao && ` · devolvido em ${formatarData(alocacao.dataDevolucao)}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={toneAlocacao(alocacao.status)}>{ALOCACAO_STATUS_LABEL[alocacao.status]}</Badge>
              {alocacao.termoNome ? (
                <Button variant="ghost" size="sm" className="h-8 gap-1 px-2" onClick={() => handleVerTermo(alocacao.id)}>
                  <Download aria-hidden="true" className="h-4 w-4" />
                  Termo
                </Button>
              ) : (
                user?.id === userId &&
                alocacao.status !== 'DEVOLVIDO' &&
                alocacao.status !== 'CANCELADA' && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-8 gap-1 px-2"
                    onClick={() => setTermoAceiteAlvo(alocacao)}
                  >
                    <FileCheck2 aria-hidden="true" className="h-4 w-4" />
                    Aceitar termo
                  </Button>
                )
              )}
            </div>
          </li>
        ))}
        {alocacoes.length === 0 && (
          <p className="text-sm text-[var(--color-text-secondary)]">Nenhum equipamento vinculado ainda.</p>
        )}
      </ul>

      <TermoAceiteDialog
        open={!!termoAceiteAlvo}
        onOpenChange={(open) => !open && setTermoAceiteAlvo(null)}
        vinculo={termoAceiteAlvo}
        descricaoItem={termoAceiteAlvo ? descricaoAlocacao(termoAceiteAlvo) : ''}
      />
    </>
  );
}

function SecaoSaude({ userId }: { userId: string }) {
  const query = useDadosSensiveis(userId);
  const updateMutation = useUpdateDadosSensiveis(userId);
  const [tipoSanguineo, setTipoSanguineo] = useState('');
  const [alergias, setAlergias] = useState('');
  const [condicoesSaude, setCondicoesSaude] = useState('');

  useEffect(() => {
    if (!query.data) return;
    setTipoSanguineo(query.data.tipoSanguineo ?? '');
    setAlergias(query.data.alergias ?? '');
    setCondicoesSaude(query.data.condicoesSaude ?? '');
  }, [query.data]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await updateMutation.mutateAsync({
      tipoSanguineo: tipoSanguineo || undefined,
      alergias: alergias || undefined,
      condicoesSaude: condicoesSaude || undefined,
    });
  }

  return (
    <>
      <p className="mb-4 text-sm text-[var(--color-text-secondary)]">
        Dado sensível (LGPD) — visível só para o próprio colaborador e para administradores.
      </p>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormField label="Tipo sanguíneo" htmlFor="saude-tipo-sanguineo">
          <Input id="saude-tipo-sanguineo" value={tipoSanguineo} onChange={(e) => setTipoSanguineo(e.target.value)} />
        </FormField>
        <FormField label="Alergias" htmlFor="saude-alergias">
          <Input id="saude-alergias" value={alergias} onChange={(e) => setAlergias(e.target.value)} />
        </FormField>
        <FormField label="Condições de saúde" htmlFor="saude-condicoes">
          <Input id="saude-condicoes" value={condicoesSaude} onChange={(e) => setCondicoesSaude(e.target.value)} />
        </FormField>
        <FormActions>
          <Button type="submit" disabled={updateMutation.isPending}>
            Salvar
          </Button>
        </FormActions>
      </form>
    </>
  );
}
