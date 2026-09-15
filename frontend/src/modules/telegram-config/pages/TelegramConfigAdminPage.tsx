import { FormEvent, useEffect, useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Card, CardTitle } from '../../../components/ui/Card';
import { ErrorState } from '../../../components/ui/ErrorState';
import { FormActions, FormField } from '../../../components/ui/Form';
import { Input } from '../../../components/ui/Input';
import { LoadingState } from '../../../components/ui/LoadingState';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Skeleton } from '../../../components/ui/Skeleton';
import { StatusToggle } from '../../../components/ui/StatusToggle';
import { Table, Td, Th, Tr } from '../../../components/ui/Table';
import {
  useAdicionarGrupoConectado,
  useGruposConectados,
  useGruposDetectados,
  useRemoverGrupoConectado,
  useSetTelegramTipoEnviar,
  useTelegramConfig,
  useTelegramTipos,
  useTestarEnvioTelegram,
  useUpdateTelegramConfig,
} from '../hooks/useTelegramConfig';
import type { TelegramGrupoDetectado } from '../types/telegram-config.types';

type ModoGrupo = 'nenhum' | 'detectar' | 'manual';

/** Conecta um ou mais grupos/tópicos onde eventos de Agendamento de salas são postados, além do aviso pessoal. */
function GrupoCard() {
  const gruposConectadosQuery = useGruposConectados();
  const adicionarMutation = useAdicionarGrupoConectado();
  const removerMutation = useRemoverGrupoConectado();
  const [modo, setModo] = useState<ModoGrupo>('nenhum');
  const gruposDetectadosQuery = useGruposDetectados(modo === 'detectar');

  const [chatIdManual, setChatIdManual] = useState('');
  const [topicIdManual, setTopicIdManual] = useState('');
  const [nomeManual, setNomeManual] = useState('');
  const [erroManual, setErroManual] = useState<string | null>(null);

  const gruposConectados = gruposConectadosQuery.data ?? [];
  const gruposDetectados = gruposDetectadosQuery.data ?? [];

  function abrirManual() {
    setChatIdManual('');
    setTopicIdManual('');
    setNomeManual('');
    setErroManual(null);
    setModo('manual');
  }

  async function conectarDetectado(grupo: TelegramGrupoDetectado) {
    await adicionarMutation.mutateAsync({
      chatId: grupo.chatId,
      topicId: grupo.topicId || undefined,
      nome: grupo.chatTitle ?? undefined,
    });
    setModo('nenhum');
  }

  async function conectarManual(event: FormEvent) {
    event.preventDefault();
    setErroManual(null);
    try {
      await adicionarMutation.mutateAsync({
        chatId: chatIdManual.trim(),
        topicId: topicIdManual.trim() || undefined,
        nome: nomeManual.trim() || undefined,
      });
      setModo('nenhum');
    } catch {
      setErroManual('Não foi possível conectar. Confira o chat ID.');
    }
  }

  return (
    <Card elevated className="p-6">
      <CardTitle>Grupos do Telegram</CardTitle>
      <p className="mb-4 text-sm text-[var(--color-text-secondary)]">
        Eventos de Agendamento de salas podem ser postados em um ou mais grupos (e tópicos, se você usa tópicos), além
        do aviso pessoal ao solicitante. Escolha quais tipos vão pro grupo na tabela abaixo.
      </p>

      {gruposConectados.length > 0 && (
        <ul className="mb-4 flex flex-col gap-2">
          {gruposConectados.map((grupo) => (
            <li
              key={grupo.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-button)] border border-[var(--color-border)] px-3 py-2"
            >
              <span className="text-sm text-[var(--color-text-primary)]">
                <strong>{grupo.nome ?? grupo.chatId}</strong>
                {grupo.topicId ? ` — tópico ${grupo.topicId}` : ''}
              </span>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => removerMutation.mutate(grupo.id)}
                disabled={removerMutation.isPending}
              >
                Desconectar
              </Button>
            </li>
          ))}
        </ul>
      )}

      {modo === 'nenhum' && (
        <div className="flex flex-wrap gap-3">
          <Button type="button" onClick={() => setModo('detectar')}>
            Detectar automaticamente
          </Button>
          <Button type="button" variant="secondary" onClick={abrirManual}>
            Inserir manualmente
          </Button>
        </div>
      )}

      {modo === 'detectar' && (
        <div className="flex flex-col gap-3 rounded-card border border-[var(--color-border)] p-4">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Adicione o bot ao grupo — e, se usar tópicos, entre no tópico certo — e mande <strong>/id</strong> (ou
            qualquer mensagem) por lá. Assim que o bot receber, o grupo aparece aqui.
          </p>
          {gruposDetectadosQuery.isLoading ? (
            <Skeleton className="h-8 w-full" />
          ) : gruposDetectados.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">
              Nenhuma mensagem recebida ainda. Se o bot não tiver um webhook público registrado, ele nunca vai ver a
              mensagem — nesse caso, use "Inserir manualmente".
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {gruposDetectados.map((grupo) => (
                <li
                  key={grupo.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-button)] border border-[var(--color-border)] px-3 py-2"
                >
                  <span className="text-sm text-[var(--color-text-primary)]">
                    {grupo.chatTitle ?? grupo.chatId}
                    {grupo.topicId ? ` — tópico ${grupo.topicId}` : ' — chat geral'}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => conectarDetectado(grupo)}
                    disabled={adicionarMutation.isPending}
                  >
                    Usar este
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="secondary" size="sm" onClick={abrirManual}>
              Inserir manualmente
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => setModo('nenhum')}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {modo === 'manual' && (
        <form
          onSubmit={conectarManual}
          className="flex flex-col gap-4 rounded-card border border-[var(--color-border)] p-4"
        >
          <FormField
            label="Chat ID do grupo"
            htmlFor="grupo-chat-id"
            error={erroManual ?? undefined}
            hint="Número negativo (ex: -1001234567890). Encaminhe uma mensagem do grupo pro @RawDataBot pra descobrir, ou mande /id no grupo se o webhook já estiver registrado."
          >
            <Input
              id="grupo-chat-id"
              value={chatIdManual}
              onChange={(e) => setChatIdManual(e.target.value)}
              placeholder="-1001234567890"
              required
            />
          </FormField>
          <FormField
            label="Topic ID (opcional)"
            htmlFor="grupo-topic-id"
            hint="Só se o grupo usa tópicos. É o número no final do link do tópico (ex: t.me/c/123/456 → 456). Vazio posta no chat geral."
          >
            <Input
              id="grupo-topic-id"
              value={topicIdManual}
              onChange={(e) => setTopicIdManual(e.target.value)}
              placeholder="42"
            />
          </FormField>
          <FormField label="Nome (opcional, só pra identificar aqui)" htmlFor="grupo-nome">
            <Input id="grupo-nome" value={nomeManual} onChange={(e) => setNomeManual(e.target.value)} placeholder="Time Ops" />
          </FormField>
          <FormActions>
            <Button type="button" variant="secondary" onClick={() => setModo('nenhum')}>
              Cancelar
            </Button>
            <Button type="submit" disabled={adicionarMutation.isPending}>
              Conectar
            </Button>
          </FormActions>
        </form>
      )}
    </Card>
  );
}

export default function TelegramConfigAdminPage() {
  const configQuery = useTelegramConfig();
  const tiposQuery = useTelegramTipos();
  const updateConfigMutation = useUpdateTelegramConfig();
  const setTipoMutation = useSetTelegramTipoEnviar();
  const testarMutation = useTestarEnvioTelegram();

  const [botToken, setBotToken] = useState('');
  const [ativo, setAtivo] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  useEffect(() => {
    if (configQuery.data) {
      setBotToken(configQuery.data.botToken);
      setAtivo(configQuery.data.ativo);
    }
  }, [configQuery.data]);

  async function salvarConfig(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    setSalvo(false);
    try {
      await updateConfigMutation.mutateAsync({ botToken, ativo });
      setSalvo(true);
    } catch {
      setErro('Não foi possível salvar a configuração do bot.');
    }
  }

  if (configQuery.isError || tiposQuery.isError) {
    return (
      <ErrorState
        message="Não foi possível carregar a configuração do Telegram."
        onRetry={() => {
          configQuery.refetch();
          tiposQuery.refetch();
        }}
      />
    );
  }

  if (configQuery.isLoading || tiposQuery.isLoading || !configQuery.data) {
    return <LoadingState rows={5} />;
  }

  const tipos = tiposQuery.data ?? [];

  return (
    <>
      <PageHeader
        title="Integração com Telegram"
        description="Configure o bot que envia notificações automáticas de eventos pelo Telegram."
      />

      <div className="flex flex-col gap-6">
        <Card elevated className="p-6">
          <CardTitle>Bot</CardTitle>
          <form onSubmit={salvarConfig} className="flex flex-col gap-4">
            <FormField label="Token do bot (via BotFather)" htmlFor="telegram-bot-token" error={erro ?? undefined}>
              <Input
                id="telegram-bot-token"
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                placeholder="123456789:AAExxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                required
              />
            </FormField>
            <StatusToggle checked={ativo} onChange={setAtivo} label="Integração ativa" />
            <FormActions>
              {salvo && <span className="mr-auto text-sm text-[var(--color-success)]">Salvo.</span>}
              <Button type="submit" disabled={updateConfigMutation.isPending}>
                Salvar
              </Button>
            </FormActions>
          </form>
        </Card>

        <Card elevated className="p-6">
          <CardTitle>Simular notificação de evento</CardTitle>
          <p className="mb-4 text-sm text-[var(--color-text-secondary)]">
            Envia para o seu Telegram uma mensagem de teste simulando um novo plantão vinculado.
            A mensagem é identificada como simulação e não cria nem altera eventos reais.
          </p>
          <div className="flex items-center gap-3">
            <Button type="button" onClick={() => testarMutation.mutate()} disabled={testarMutation.isPending}>
              {testarMutation.isPending ? 'Enviando...' : 'Enviar simulação de evento'}
            </Button>
            {testarMutation.data?.enviado && (
              <span className="text-sm text-[var(--color-success)]">Simulação enviada! Confira seu Telegram.</span>
            )}
            {testarMutation.data && !testarMutation.data.enviado && (
              <span className="text-sm text-[var(--color-danger)]">{testarMutation.data.motivo}</span>
            )}
            {testarMutation.isError && (
              <span className="text-sm text-[var(--color-danger)]">Não foi possível testar o envio.</span>
            )}
          </div>
        </Card>

        <GrupoCard />

        <Card elevated className="overflow-hidden">
          <div className="p-6 pb-0">
            <CardTitle>Notificações enviadas via Telegram</CardTitle>
          </div>
          <Table>
            <thead>
              <tr>
                <Th>Tipo de notificação</Th>
                <Th className="text-right">Enviar pessoalmente</Th>
                <Th className="text-right">Enviar para o grupo</Th>
              </tr>
            </thead>
            <tbody>
              {tipos.map((tipo) => (
                <Tr key={tipo.id}>
                  <Td className="font-bold text-[var(--color-text-primary)]">{tipo.nome}</Td>
                  <Td className="text-right">
                    <StatusToggle
                      checked={tipo.enviar}
                      onChange={(enviar) => setTipoMutation.mutate({ tipo: tipo.tipo, enviar })}
                      label={`Enviar "${tipo.nome}" pessoalmente via Telegram`}
                    />
                  </Td>
                  <Td className="text-right">
                    {tipo.grupoDisponivel ? (
                      <StatusToggle
                        checked={tipo.enviarGrupo}
                        onChange={(enviarGrupo) => setTipoMutation.mutate({ tipo: tipo.tipo, enviarGrupo })}
                        label={`Enviar "${tipo.nome}" para o grupo`}
                      />
                    ) : (
                      <span className="text-xs text-[var(--color-text-muted)]">—</span>
                    )}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>
      </div>
    </>
  );
}
