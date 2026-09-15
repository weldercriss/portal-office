# A API é a barreira real; o frontend só reflete a permissão

Rotas e itens de menu são filtrados por perfil (`ADMIN`/`USER`) e pela
rotina do usuário, espelhando o que os guards do backend já garantem (ver
`AI/SKILLS/BACKEND/autenticacao-e-autorizacao.md`):

- Toda a área `/configuracoes` exige `ADMIN`.
- Rotas de módulo (ex.: `/plantoes`, `/agendamentos`) exigem a rotina
  correspondente, verificada em `frontend/src/router/` (ver
  `ProtectedRoute.test.tsx`) e em `frontend/src/app/layouts/navigation.ts`
  para o item de menu.

Ocultar um botão ou item de menu **não substitui** o guard do backend — é
só UX. Ao adicionar uma tela ou ação nova, proteja primeiro no controller
(guard certo) e só depois replique a mesma condição no frontend para não
mostrar algo que a API vai recusar de qualquer forma. Nunca confie apenas na
ocultação de UI para impedir uma ação que a API ainda aceitaria.

## Checklist

- [ ] A permissão foi implementada no backend (guard) antes de qualquer
      filtro equivalente no frontend?
- [ ] Rota nova está protegida em `router/` e, se aplicável, o item de menu
      em `navigation.ts` está condicionado à mesma rotina/role da API?
