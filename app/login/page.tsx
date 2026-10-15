export const dynamic = "force-dynamic";

export default async function Login({ searchParams }: { searchParams: Promise<{ wrong?: string }> }) {
  const { wrong } = await searchParams;
  return (
    <form className="login" method="post" action="/api/login">
      <span className="lab">Game boards</span>
      <h1>Sign in</h1>
      <input id="password" name="password" type="password" autoComplete="current-password" placeholder="Password" required autoFocus />
      {wrong ? <span className="wrong">That is not the password.</span> : null}
      <button type="submit">Open</button>
    </form>
  );
}
