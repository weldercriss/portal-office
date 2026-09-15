import type { ReactNode } from 'react';
import { PageShell } from '../../../components/system/PageShell';
import { Card } from '../../../components/ui/Card';
import { ErrorState } from '../../../components/ui/ErrorState';
import { LoadingState } from '../../../components/ui/LoadingState';
import { PageHeader } from '../../../components/ui/PageHeader';
import { AgendaGoogleCard } from '../components/AgendaGoogleCard';
import { ContaGoogleCard } from '../components/ContaGoogleCard';
import { TelegramCard } from '../components/TelegramCard';
import { useMeuPerfil } from '../hooks/useUsuarios';
import type { Usuario } from '../types/usuario.types';

function Campo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">{label}</span>
      <span className="text-sm text-[var(--color-text-primary)]">{children}</span>
    </div>
  );
}

function formatarData(iso: string | null): string {
  if (!iso) return '—';
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return '—';
  return data.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

export default function MeuPerfilPage() {
  const perfilQuery = useMeuPerfil();

  if (perfilQuery.isError) {
    return (
      <PageShell>
        <ErrorState message="Não foi possível carregar seu perfil." onRetry={() => perfilQuery.refetch()} />
      </PageShell>
    );
  }

  if (perfilQuery.isLoading || !perfilQuery.data) {
    return (
      <PageShell>
        <LoadingState rows={4} />
      </PageShell>
    );
  }

  const perfil: Usuario = perfilQuery.data;

  return (
    <PageShell>
      <PageHeader title="Meu perfil" description="Seus dados cadastrais." />

      <Card elevated className="p-6">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Campo label="Nome">{perfil.nome}</Campo>
          <Campo label="E-mail">{perfil.email}</Campo>
          <Campo label="Departamento">{perfil.group?.nome ?? '—'}</Campo>
          <Campo label="Área">{perfil.subArea?.nome ?? '—'}</Campo>
          <Campo label="Senioridade">{perfil.senioridade ?? '—'}</Campo>
          <Campo label="Data de nascimento">{formatarData(perfil.dataNascimento)}</Campo>
          <Campo label="Data de admissão">{formatarData(perfil.dataAdmissao)}</Campo>
          <Campo label="Telefone">{perfil.telefone ?? '—'}</Campo>
          <Campo label="Telegram">{perfil.telegramUsername ?? '—'}</Campo>
        </div>

      </Card>

      <ContaGoogleCard email={perfil.email} googleLinkedAt={perfil.googleLinkedAt} />

      <TelegramCard conectado={Boolean(perfil.telegramChatId)} />

      <AgendaGoogleCard />
    </PageShell>
  );
}
