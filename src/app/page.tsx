export default function Home() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>Batten Journal</h1>
      <p>Deployment test - if you see this, routing works!</p>
      <div style={{ marginTop: '2rem' }}>
        <a href="/login" style={{ color: 'blue', marginRight: '1rem' }}>Login</a>
        <a href="/register" style={{ color: 'blue' }}>Register</a>
      </div>
    </div>
  )
}
