// Traduz mensagens de erro do Supabase Auth para português.
const MAP: Array<[RegExp, string]> = [
  [/password is known to be weak/i, "Esta senha é muito fraca ou já apareceu em vazamentos públicos. Escolha uma senha mais forte."],
  [/password should be at least (\d+)/i, "A senha deve ter pelo menos $1 caracteres."],
  [/password should contain/i, "A senha não atende aos requisitos de complexidade."],
  [/invalid login credentials/i, "E-mail ou senha inválidos."],
  [/email not confirmed/i, "Confirme seu e-mail antes de entrar."],
  [/user already registered/i, "Este e-mail já está cadastrado. Faça login."],
  [/user not found/i, "Usuário não encontrado."],
  [/invalid email/i, "E-mail inválido."],
  [/email rate limit exceeded/i, "Muitas tentativas. Aguarde alguns minutos e tente novamente."],
  [/over email send rate limit/i, "Limite de envio de e-mails atingido. Tente novamente mais tarde."],
  [/for security purposes.*after (\d+) seconds?/i, "Por segurança, aguarde $1 segundos antes de tentar novamente."],
  [/signup.*disabled/i, "Cadastros estão desativados no momento."],
  [/token has expired/i, "O link expirou. Solicite um novo."],
  [/invalid token|invalid.*jwt/i, "Link inválido ou expirado."],
  [/new password should be different/i, "A nova senha deve ser diferente da atual."],
  [/same_password|same password/i, "A nova senha deve ser diferente da atual."],
  [/weak_password/i, "Senha muito fraca. Use letras, números e símbolos."],
  [/network|fetch failed|failed to fetch/i, "Falha de conexão. Verifique sua internet."],
  [/unsupported provider|provider is not enabled/i, "Este provedor de login não está habilitado."],
  [/otp expired/i, "O código expirou. Solicite um novo."],
  [/captcha/i, "Falha na verificação de segurança. Tente novamente."],
];

export function translateAuthError(err: unknown): string {
  const msg = err instanceof Error ? err.message : typeof err === "string" ? err : "";
  if (!msg) return "Ocorreu um erro. Tente novamente.";
  for (const [re, pt] of MAP) {
    if (re.test(msg)) return msg.replace(re, pt);
  }
  return msg;
}
