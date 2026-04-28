import { useState } from "react";
import { Scale } from "lucide-react";

export function LoginView({ isLoading, error, onSubmit }) {
  const [credentials, setCredentials] = useState({ username: "", password: "" });

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit(credentials);
  }

  return (
    <main className="login-shell">
      <section className="login-panel">
        <div className="brand login-brand">
          <Scale size={30} />
          <div>
            <strong>Rollie</strong>
            <span>Consultorio juridico</span>
          </div>
        </div>
        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            Usuario
            <input
              autoComplete="username"
              value={credentials.username}
              onChange={(event) => setCredentials((current) => ({ ...current, username: event.target.value }))}
            />
          </label>
          <label>
            Contraseña
            <input
              autoComplete="current-password"
              type="password"
              value={credentials.password}
              onChange={(event) => setCredentials((current) => ({ ...current, password: event.target.value }))}
            />
          </label>
          {error && <p className="error-text">{error}</p>}
          <button className="primary-button" type="submit" disabled={isLoading}>
            {isLoading ? "Ingresando" : "Ingresar"}
          </button>
        </form>
      </section>
    </main>
  );
}
