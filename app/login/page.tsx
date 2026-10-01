import Image from 'next/image';
import { login } from './actions';
import { SubmitButton } from './SubmitButton';

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <main className="flex min-h-screen min-h-[100dvh] items-center justify-center pb-[max(2rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-[max(2rem,env(safe-area-inset-top))]">
      <div className="card w-full max-w-md p-5 sm:p-6">
        <div className="mb-6 flex flex-col items-center text-center">
          <Image src="/logo.svg" alt="" width={56} height={56} priority className="mb-3" />
          <h1 className="text-2xl font-semibold text-primary">Altor</h1>
          <p className="text-text-dim text-sm">Sistema de Gestão</p>
        </div>

        <form action={login} className="space-y-4">
          <div>
            <label htmlFor="email" className="label">
              E-mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              required
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="next"
              className="input"
              placeholder="seu@email.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="label">
              Senha
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              enterKeyHint="go"
              className="input"
              placeholder="••••••••"
            />
          </div>

          {searchParams.error && (
            <p role="alert" className="text-sm text-danger break-words">
              {decodeURIComponent(searchParams.error)}
            </p>
          )}

          <SubmitButton />
        </form>
      </div>
    </main>
  );
}
