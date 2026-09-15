# Dado do servidor é do TanStack Query, não do `useState`

Se o dado vem da API, cache/loading/erro já são resolvidos pelo TanStack
Query — não reimplemente isso com `useState` + `useEffect` manual. Padrão
real do projeto, em `frontend/src/modules/solicitacoes/hooks/useSolicitacoes.ts`:

```ts
const SOLICITACOES_KEY = ['solicitacoes'] as const;

function invalidateSolicitacoes(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: SOLICITACOES_KEY });
  queryClient.invalidateQueries({ queryKey: MINHAS_SOLICITACOES_KEY });
}

export function useSolicitacoes(filtros: FiltrosSolicitacao = {}) {
  return useQuery({ queryKey: [...SOLICITACOES_KEY, filtros], queryFn: () => getSolicitacoes(filtros) });
}

export function useCreateSolicitacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSolicitacaoInput) => createSolicitacao(input),
    onSuccess: () => invalidateSolicitacoes(queryClient),
  });
}
```

Pontos do padrão:

- Uma constante de `queryKey` por recurso, reaproveitada entre o hook de
  leitura e as invalidações das mutations.
- Uma função `invalidate<Recurso>` centraliza quais queries uma mutação
  afeta — toda mutation nova do domínio chama essa função no `onSuccess`,
  em vez de cada uma decidir sozinha o que invalidar.
- Filtros entram na `queryKey` (`[...KEY, filtros]`) para o cache separar
  resultados por filtro.

`useState` fica para estado de UI local (diálogo aberto/fechado, aba
selecionada, valor de input antes de submeter) — nunca para espelhar dado
que já existe no cache do TanStack Query.

## Checklist

- [ ] Dado de servidor está em `useQuery`/`useMutation`, não replicado em
      `useState`?
- [ ] Mutations do domínio invalidam as queries afetadas via uma função
      `invalidate<Recurso>` central, não invalidação duplicada em cada uma?
- [ ] `useState` usado só para estado de UI local?
