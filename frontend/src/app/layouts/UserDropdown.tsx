import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { ChevronDown, KeyRound, LogOut, User } from 'lucide-react';
import { SvgIcon } from '../../components/system/SvgIcon';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { FormActions, FormField } from '../../components/ui/Form';
import { Input } from '../../components/ui/Input';
import { changeMinhaSenha } from '../../modules/usuarios/api/usuarios.api';
import { resolverAvatarUrl } from '../../lib/avatarUrl';
import { useAuth } from '../../shared/auth/AuthContext';
import type { NavItem } from './navigation';

const MENU_ITEM_CLASSES =
  'flex w-full items-center gap-3 rounded-[10px] px-3 py-2 text-left text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]';

/**
 * Menu de conta do header — no Tangram a saída e a troca de senha vivem aqui,
 * não no rail. Em telas estreitas ele também carrega a navegação, já que o rail
 * fica oculto.
 */
export function UserDropdown({ navItems = [] }: { navItems?: NavItem[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [senhaDialogAberto, setSenhaDialogAberto] = useState(false);
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleLogout() {
    setIsOpen(false);
    await logout();
    navigate('/login', { replace: true });
  }

  function abrirAlteracaoSenha() {
    setIsOpen(false);
    setErro('');
    setSucesso(false);
    setSenhaDialogAberto(true);
  }



  async function handleChangePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (novaSenha !== confirmacao) {
      setErro('As novas senhas não conferem.');
      return;
    }
    setSalvando(true);
    setErro('');
    try {
      await changeMinhaSenha({ senhaAtual: temSenha ? senhaAtual : undefined, novaSenha });
      await refreshUser().catch(() => undefined);
      setSucesso(true);
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmacao('');
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível alterar a senha.');
    } finally {
      setSalvando(false);
    }
  }

  const inicial = user?.nome?.trim().charAt(0).toUpperCase() ?? '?';
  // Sessão antiga sem o campo é tratada como quem já tem senha.
  const temSenha = user?.temSenha !== false;
  const tituloSenha = temSenha ? 'Alterar senha' : 'Definir senha';

  return (
    <div className="relative flex items-center" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Menu da conta"
        aria-expanded={isOpen}
        className="flex items-center gap-2 rounded-[var(--radius-button)] px-1.5 py-1 text-white transition-colors hover:bg-white/10"
      >
        {user?.avatarUrl ? (
          <img
            src={resolverAvatarUrl(user.avatarUrl)!}
            alt=""
            referrerPolicy="no-referrer"
            className="h-8 w-8 rounded-full object-cover"
          />
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-xs font-bold">
            {inicial}
          </span>
        )}
        <span className="hidden text-sm font-medium text-white/90 sm:inline">{user?.nome}</span>
        <ChevronDown aria-hidden="true" className={`h-4 w-4 text-white/70 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 flex w-[240px] flex-col gap-1 rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-2 shadow-elegant">
          <div className="border-b border-[var(--color-border)] px-3 pb-3 pt-2">
            <p className="truncate text-sm font-bold text-[var(--color-text-primary)]">{user?.nome}</p>
            <p className="truncate text-xs text-[var(--color-text-muted)]">{user?.email}</p>
          </div>

          {navItems.length > 0 && (
            <div className="flex flex-col gap-1 border-b border-[var(--color-border)] pb-2 md:hidden">
              {navItems.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.end} onClick={() => setIsOpen(false)} className={MENU_ITEM_CLASSES}>
                  <SvgIcon name={item.icon} className="h-5 w-5" />
                  {item.label}
                </NavLink>
              ))}
            </div>
          )}

          <Link to="/perfil" onClick={() => setIsOpen(false)} className={MENU_ITEM_CLASSES}>
            <User aria-hidden="true" className="h-5 w-5" />
            Meu perfil
          </Link>
          <button type="button" onClick={abrirAlteracaoSenha} className={MENU_ITEM_CLASSES}>
            <KeyRound aria-hidden="true" className="h-5 w-5" />
            {tituloSenha}
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-[10px] px-3 py-2 text-left text-sm font-medium text-[var(--color-danger)] transition-colors hover:bg-[var(--color-danger-soft)]"
          >
            <LogOut aria-hidden="true" className="h-5 w-5" />
            Sair
          </button>
        </div>
      )}

      <Dialog open={senhaDialogAberto} onOpenChange={setSenhaDialogAberto} title={tituloSenha}>
        {sucesso ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-[var(--color-text-secondary)]">
              {temSenha ? 'Sua senha foi alterada com sucesso.' : 'Sua senha foi definida com sucesso.'}
            </p>
            <FormActions>
              <Button type="button" onClick={() => setSenhaDialogAberto(false)}>
                Fechar
              </Button>
            </FormActions>
          </div>
        ) : (
          <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
            {temSenha ? (
              <FormField label="Senha atual" htmlFor="senha-atual">
                <Input
                  id="senha-atual"
                  type="password"
                  value={senhaAtual}
                  onChange={(event) => setSenhaAtual(event.target.value)}
                  required
                  autoComplete="current-password"
                />
              </FormField>
            ) : (
              <p className="text-sm text-[var(--color-text-secondary)]">
                Você entrou pelo Google e ainda não tem senha. Defina uma para poder entrar também com e-mail e senha.
              </p>
            )}
            <FormField label="Nova senha" htmlFor="nova-senha">
              <Input
                id="nova-senha"
                type="password"
                value={novaSenha}
                onChange={(event) => setNovaSenha(event.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
              />
            </FormField>
            <FormField label="Confirmar nova senha" htmlFor="confirmar-senha" error={erro || undefined}>
              <Input
                id="confirmar-senha"
                type="password"
                value={confirmacao}
                onChange={(event) => setConfirmacao(event.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
              />
            </FormField>
            <FormActions>
              <Button type="submit" disabled={salvando}>
                {salvando ? 'Salvando...' : temSenha ? 'Salvar nova senha' : 'Definir senha'}
              </Button>
            </FormActions>
          </form>
        )}
      </Dialog>
    </div>
  );
}
