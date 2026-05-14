import { login } from './actions';

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="card w-full max-w-md">
        <div className="text-center mb-6">
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
              required
              autoComplete="email"
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
              className="input"
              placeholder="••••••••"
            />
          </div>

          {searchParams.error && (
            <p className="text-sm text-danger">
              {decodeURIComponent(searchParams.error)}
            </p>
          )}

          <button type="submit" className="btn-primary w-full">
            Entrar
          </button>
        </form>
      </div>
    </main>
  );
}
