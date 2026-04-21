const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;

async function http<T = any>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json();
}

export const api = {
  listAgents: (category?: string) =>
    http<any[]>(`/agents${category && category !== 'all' ? `?category=${category}` : ''}`),
  getAgent: (id: string) => http<any>(`/agents/${id}`),
  deploy: (agent_id: string) =>
    http<any>('/deploy', { method: 'POST', body: JSON.stringify({ agent_id }) }),
  toggle: (deployment_id: string) =>
    http<any>(`/deploy/${deployment_id}/toggle`, { method: 'POST' }),
  myAgents: () => http<any[]>('/my-agents'),
  dashboard: () => http<any>('/dashboard'),
  leaderboard: () => http<any[]>('/leaderboard'),
  wallet: () => http<any>('/wallet'),
  withdraw: (amount: number) =>
    http<any>('/wallet/withdraw', { method: 'POST', body: JSON.stringify({ amount }) }),
  profile: () => http<any>('/profile'),
  categories: () => http<any[]>('/categories'),
};
