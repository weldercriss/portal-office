import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Camera } from 'lucide-react';
import { PageShell } from '../../../components/system/PageShell';
import { PageHeader } from '../../../components/ui/PageHeader';
import { resolverAvatarUrl } from '../../../lib/avatarUrl';
import { useAuth } from '../../../shared/auth/AuthContext';
import { satisfazRole } from '../../../types/auth.types';
import { useMeuPerfil, useUsuarios } from '../../usuarios/hooks/useUsuarios';
import { ColaboradorAbas } from '../components/ColaboradorAbas';
import { useUploadAvatar } from '../hooks/useColaboradorRh';

export default function FichaColaboradorPage() {
  const { id } = useParams<{ id: string }>();
  const userId = id ?? '';
  const navigate = useNavigate();
  const { user } = useAuth();
  const podeAdministrar = satisfazRole(user?.role, 'ADMIN');
  const usuariosQuery = useUsuarios({ enabled: podeAdministrar });
  const meuPerfilQuery = useMeuPerfil({ enabled: !podeAdministrar });
  const usuario = podeAdministrar ? usuariosQuery.data?.find((u) => u.id === userId) : meuPerfilQuery.data;
  const uploadAvatarMutation = useUploadAvatar(userId);

  if (!podeAdministrar && user?.id !== userId) {
    return <Navigate to="/perfil" replace />;
  }

  return (
    <PageShell>
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-2 inline-flex items-center gap-1.5 self-start text-sm font-bold text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        Voltar
      </button>

      <div className="mb-4 flex items-center gap-4">
        <div className="group relative h-16 w-16 shrink-0">
          {usuario?.avatarUrl ? (
            <img
              src={resolverAvatarUrl(usuario.avatarUrl)!}
              alt=""
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-surface-hover)] text-xl font-bold text-[var(--color-text-secondary)]">
              {usuario?.nome?.trim().charAt(0).toUpperCase() ?? '?'}
            </span>
          )}
          {podeAdministrar && (
            <label
              className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100"
              title="Alterar foto"
            >
              <Camera aria-hidden="true" className="h-5 w-5" />
              <input
                type="file"
                accept="image/jpeg,image/png"
                className="sr-only"
                onChange={(e) => {
                  const arquivo = e.target.files?.[0];
                  if (arquivo) uploadAvatarMutation.mutate(arquivo);
                  e.target.value = '';
                }}
              />
            </label>
          )}
        </div>
        <PageHeader
          title={usuario ? `Ficha de ${usuario.nome}` : 'Ficha do colaborador'}
          description={usuario?.email}
        />
      </div>

      <ColaboradorAbas userId={userId} usuario={usuario} podeAdministrar={podeAdministrar} />
    </PageShell>
  );
}
