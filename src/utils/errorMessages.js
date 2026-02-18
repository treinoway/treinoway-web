const STATUS_MESSAGES = {
  400: 'Requisição inválida. Verifique os dados e tente novamente.',
  401: 'Sessão expirada. Faça login novamente.',
  403: 'Você não tem permissão para esta ação.',
  404: 'Recurso não encontrado.',
  409: 'Este registro já existe.',
  422: 'Dados inválidos. Verifique os campos e tente novamente.',
  429: 'Muitas tentativas. Aguarde um momento e tente novamente.',
  500: 'Erro interno do servidor. Tente novamente mais tarde.',
  502: 'Servidor indisponível. Tente novamente mais tarde.',
  503: 'Serviço temporariamente indisponível. Tente novamente mais tarde.',
};

const MESSAGE_MAP = {
  'Unauthorized': 'E-mail ou senha incorretos.',
  'Invalid credentials': 'E-mail ou senha incorretos.',
  'User not found': 'Usuário não encontrado.',
  'Validation error': 'Dados inválidos. Verifique os campos.',
  'Token expired': 'Sessão expirada. Faça login novamente.',
  'Invalid token': 'Sessão inválida. Faça login novamente.',
  'Forbidden': 'Você não tem permissão para esta ação.',
  'Not found': 'Recurso não encontrado.',
  'Internal server error': 'Erro interno do servidor. Tente novamente mais tarde.',
};

export function getErrorMessage(error, fallback) {
  if (!error.response) {
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return 'Tempo de conexão esgotado. Verifique sua internet e tente novamente.';
    }
    return 'Sem conexão com o servidor. Verifique sua internet e tente novamente.';
  }

  const backendMessage = error.response?.data?.message;
  if (backendMessage && MESSAGE_MAP[backendMessage]) {
    return MESSAGE_MAP[backendMessage];
  }

  const status = error.response?.status;
  if (status && STATUS_MESSAGES[status]) {
    return STATUS_MESSAGES[status];
  }

  return fallback || 'Ocorreu um erro inesperado. Tente novamente.';
}
