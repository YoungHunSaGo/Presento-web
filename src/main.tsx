import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/auth/AuthContext';
import { errorStatus } from '@/api/client';
import App from './App';
import './styles/global.css';
import './styles/components.css';
import './styles/pages.css';

// 4xx(404·403·409 등)는 다시 불러도 같은 답이라 재시도하지 않는다. 네트워크 오류·5xx만 한 번 더 시도.
const retry = (n: number, e: unknown) => { const s = errorStatus(e); return n < 1 && !(s && s >= 400 && s < 500); };
const queryClient = new QueryClient({ defaultOptions: { queries: { retry, refetchOnWindowFocus: false } } });

async function enableMocks() {
  if (import.meta.env.VITE_USE_MOCK !== 'true') return;
  const { worker } = await import('./mocks/browser');
  await worker.start({ onUnhandledRequest: 'bypass' });
}

enableMocks().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AuthProvider><App /></AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </StrictMode>,
  );
});
