/**
 * EvolutionGo API client (server-only).
 */

const BASE_URL = "https://api.conexaomental.online";

export async function evolutionApi(path: string, apikey: string, init: RequestInit = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      apikey,
      ...(init.headers ?? {}),
    },
  });
  
  const body = await res.text();
  let json: any = null;
  try { json = body ? JSON.parse(body) : null; } catch { /* ignore */ }
  
  if (!res.ok) {
    const msg = json?.message ?? body ?? `Evolution API ${res.status}`;
    throw new Error(msg);
  }
  return json;
}

export async function createInstance(instanceName: string, globalApikey: string) {
  // Criar instância com as configurações de integração e webhook habilitado
  const webhookUrl = `${process.env.VITE_SUPABASE_URL?.replace('.supabase.co', '.lovable.app')}/api/public/evolution/webhook`;

  return evolutionApi("/instance/create", globalApikey, {
    method: "POST",
    body: JSON.stringify({
      instanceName,
      token: Math.random().toString(36).substring(2, 15),
      number: "",
      qrcode: true,
      webhook: webhookUrl, // Enviar webhook na criação se suportado pela API
    }),
  });
}

export async function getConnectState(instanceName: string, globalApikey: string) {
  return evolutionApi(`/instance/connectionState/${instanceName}`, globalApikey);
}

export async function getQrCode(instanceName: string, globalApikey: string) {
  return evolutionApi(`/instance/connect/${instanceName}`, globalApikey);
}

export async function logoutInstance(instanceName: string, globalApikey: string) {
  return evolutionApi(`/instance/logout/${instanceName}`, globalApikey, { method: "DELETE" });
}

export async function deleteInstance(instanceName: string, globalApikey: string) {
  return evolutionApi(`/instance/delete/${instanceName}`, globalApikey, { method: "DELETE" });
}

export async function sendEvolutionText(instanceName: string, apikey: string, number: string, text: string) {
  return evolutionApi(`/message/sendText/${instanceName}`, apikey, {
    method: "POST",
    body: JSON.stringify({
      number,
      options: {
        delay: 1200,
        presence: "composing",
        linkPreview: false,
      },
      textMessage: {
        text,
      },
    }),
  });
}
