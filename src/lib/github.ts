// Browser-only module — do not import from SSR contexts.
const OWNER = 'jeffrey-liwanag-org';
const REPO = 'link-vault';
const API = 'https://api.github.com';
const PAT_KEY = 'linkVaultPAT';

export const getToken = () => localStorage.getItem(PAT_KEY);
export const setToken = (t: string) => localStorage.setItem(PAT_KEY, t);
export const clearToken = () => localStorage.removeItem(PAT_KEY);

function headers() {
  const t = getToken();
  if (!t) throw new Error('NO_TOKEN');
  return {
    Authorization: `Bearer ${t}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

export async function getFile(path: string): Promise<{ content: string; sha: string }> {
  const res = await fetch(`${API}/repos/${OWNER}/${REPO}/contents/${path}`, { headers: headers() });
  if (!res.ok) throw new Error(`GET ${path}: ${res.status}`);
  const { content, sha } = await res.json();
  // GitHub returns base64 with \n every 60 chars; decode to UTF-8 string
  const raw = atob(content.replace(/\n/g, ''));
  const bytes = Uint8Array.from(raw, c => c.charCodeAt(0));
  return { content: new TextDecoder().decode(bytes), sha };
}

export async function putFile(
  path: string,
  content: string,
  sha: string | undefined,
  message: string
): Promise<{ content: { sha: string } }> {
  const bytes = new TextEncoder().encode(content);
  let binary = '';
  bytes.forEach(b => (binary += String.fromCharCode(b)));
  const encoded = btoa(binary);
  const body: Record<string, string> = {
    message,
    content: encoded,
  };
  if (sha) body.sha = sha;
  const res = await fetch(`${API}/repos/${OWNER}/${REPO}/contents/${path}`, {
    method: 'PUT',
    headers: { ...headers(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PUT ${path}: ${res.status}`);
  return res.json();
}

export async function deleteFile(path: string, sha: string, message: string) {
  const res = await fetch(`${API}/repos/${OWNER}/${REPO}/contents/${path}`, {
    method: 'DELETE',
    headers: { ...headers(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, sha }),
  });
  if (!res.ok && res.status !== 404) throw new Error(`DELETE ${path}: ${res.status}`);
}

export async function validateToken(candidateToken?: string): Promise<boolean> {
  const token = candidateToken ?? getToken();
  if (!token) return false;
  const res = await fetch(`${API}/repos/${OWNER}/${REPO}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  return res.ok;
}

export async function createIssue(
  title: string,
  body: string,
  labels: string[]
): Promise<{ number: number; html_url: string }> {
  const res = await fetch(`${API}/repos/${OWNER}/${REPO}/issues`, {
    method: 'POST',
    headers: { ...headers(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, body, labels }),
  });
  if (!res.ok) throw new Error(`POST /issues: ${res.status}`);
  return res.json();
}
