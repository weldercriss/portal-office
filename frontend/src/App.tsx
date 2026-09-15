import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { queryClient } from './lib/queryClient';
import { AppRoutes } from './router/AppRoutes';
import { AuthProvider } from './shared/auth/AuthContext';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {/* Keep the current screen visible while a lazy route is loading. */}
        <BrowserRouter future={{ v7_startTransition: true }}>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
