import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { login, signup } from '@/api/endpoints';
import { errorMessage } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Logo } from '@/components/Logo';
import { EvidenceTrack } from '@/components/EvidenceTrack';
import type { Feedback } from '@/api/types';

// 소개용 예시(가상 데이터). 화면 문구로는 노출하지 않는다.
const DEMO: Feedback[] = [[0, 31], [95, 108], [161, 165], [190, 204], [232, 245]].map(([s, e], i) => ({
  id: `demo-${i}`, category: 'DELIVERY', type: 'FILLER', severity: 'WARNING', start: s, end: e, title: '', description: '', evidence: null, suggestion: '',
}));

export function AuthPage({ mode }: { mode: 'login' | 'signup' }) {
  const isSignup = mode === 'signup';
  const nav = useNavigate(); const loc = useLocation(); const { signIn } = useAuth();
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [nickname, setNickname] = useState('');
  const m = useMutation({
    mutationFn: () => (isSignup ? signup({ email, password, nickname }) : login({ email, password })),
    onSuccess: (r) => { signIn(r); nav((loc.state as { from?: string } | null)?.from ?? '/', { replace: true }); },
  });
  const pwTooShort = isSignup && password.length > 0 && password.length < 8;
  const submit = (e: FormEvent) => { e.preventDefault(); if (!pwTooShort) m.mutate(); };
  return (
    <div className="auth">
      <div className="auth-logo"><Logo size={28} /></div>
      <div className="auth-grid">
        <section className="auth-pitch" aria-label="Presento 소개">
          <h1 className="t-display">고쳐야 할 장면만<br />잘라서 다시 보여줍니다.</h1>
          <p className="t-body c-2">발표 영상을 올리면 말이 빨라진 곳, 멈춘 곳, 시선이 흔들린 곳을 클립으로 나눕니다.</p>
          <figure className="auth-demo" aria-hidden="true">
            <div className="auth-demo-frame">
              <span className="t-data" style={{ color: 'var(--on-ink-2)' }}>01:35 – 01:48</span>
              <p className="auth-demo-cap">그래서 <span className="flag on-dark">이제</span> <span className="flag on-dark">약간</span> 이 기능이 있으면</p>
            </div>
            <div className="auth-demo-link" />
            <EvidenceTrack duration={292} feedbacks={DEMO} selectedId="demo-1" ticks={false} />
          </figure>
        </section>
        <div className="auth-divider" aria-hidden="true" />
        <form className="auth-form" onSubmit={submit} noValidate>
          <h2 className="t-h1">{isSignup ? '회원가입' : '로그인'}</h2>
          {isSignup && (
            <label className="field"><span>닉네임</span>
              <input className="input" value={nickname} onChange={(e) => setNickname(e.target.value)} autoComplete="nickname" maxLength={50} required /></label>
          )}
          <label className="field"><span>이메일</span>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required placeholder="name@school.ac.kr"
              aria-invalid={m.isError || undefined} /></label>
          <label className="field"><span>비밀번호</span>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={isSignup ? 'new-password' : 'current-password'} required
              aria-invalid={m.isError || pwTooShort || undefined} /></label>
          {isSignup && <p className={`field-msg${pwTooShort ? ' err' : ''}`}>비밀번호는 8자 이상</p>}
          {m.isError && <p className="field-msg err" role="alert">{errorMessage(m.error)}</p>}
          <button className="btn btn-primary btn-block" disabled={m.isPending || !email || !password || (isSignup && (!nickname || pwTooShort))}>
            {isSignup ? '가입하고 시작하기' : '로그인'}
          </button>
          <p className="t-small c-2">
            {isSignup ? '이미 계정이 있으면 ' : '계정이 없으면 '}
            <Link className="link" to={isSignup ? '/login' : '/signup'}>{isSignup ? '로그인' : '회원가입'}</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
