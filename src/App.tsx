import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes, Link } from 'react-router-dom';
import { AppLayout, Loading, RequireAuth } from '@/components/Layout';
import { AuthPage } from '@/pages/AuthPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { useAuth } from '@/auth/AuthContext';

const NewPresentationPage = lazy(() => import('@/pages/NewPresentationPage').then((m) => ({ default: m.NewPresentationPage })));
const PresentationDetailPage = lazy(() => import('@/pages/PresentationDetailPage').then((m) => ({ default: m.PresentationDetailPage })));
const RecordPage = lazy(() => import('@/pages/RecordPage').then((m) => ({ default: m.RecordPage })));
const ProgressPage = lazy(() => import('@/pages/ProgressPage').then((m) => ({ default: m.ProgressPage })));
const ReportPage = lazy(() => import('@/pages/ReportPage').then((m) => ({ default: m.ReportPage })));
const MyPage = lazy(() => import('@/pages/MyPage').then((m) => ({ default: m.MyPage })));
const page = (el: JSX.Element) => <Suspense fallback={<main className="page"><Loading /></main>}>{el}</Suspense>;

function GuestOnly({ children }: { children: JSX.Element }) { const { isAuthed } = useAuth(); return isAuthed ? <Navigate to="/" replace /> : children; }

// 명세 2장 화면 목록의 경로 그대로
export default function App() {
  return (
    <Routes>
      {/* 두 경로가 같은 자리에 같은 컴포넌트를 그리므로 key 로 나눠, 오가면 에러 문구·입력값이 새로 시작되게 한다. */}
      <Route path="/login" element={<GuestOnly><AuthPage key="login" mode="login" /></GuestOnly>} />
      <Route path="/signup" element={<GuestOnly><AuthPage key="signup" mode="signup" /></GuestOnly>} />
      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/presentations/new" element={page(<NewPresentationPage />)} />
          <Route path="/presentations/:id" element={page(<PresentationDetailPage />)} />
          <Route path="/presentations/:id/record" element={page(<RecordPage />)} />
          <Route path="/analyses/:id/progress" element={page(<ProgressPage />)} />
          <Route path="/analyses/:id" element={page(<ReportPage />)} />
          <Route path="/mypage" element={page(<MyPage />)} />
          <Route path="*" element={<main className="page page-center"><div className="stack" style={{ gap: 16, alignItems: 'center' }}><h1 className="t-h1">페이지를 찾을 수 없습니다</h1><Link className="btn btn-primary" to="/">내 발표로 가기</Link></div></main>} />
        </Route>
      </Route>
    </Routes>
  );
}
