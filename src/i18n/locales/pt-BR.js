const ptBR = {
  errors: {
    INVALID_CREDENTIALS: "E-mail ou senha incorretos.",
    INVALID_REFRESH_TOKEN: "Sessão expirada. Faça login novamente.",
    EMAIL_IN_USE: "Este e-mail já está cadastrado.",
    PASSWORD_MISMATCH: "As senhas não conferem.",
    FILE_REQUIRED: "É necessário enviar um arquivo.",
    INVALID_FILE_TYPE:
      "Tipo de arquivo inválido. Apenas JPEG, PNG e WebP são permitidos.",
    FILE_TOO_LARGE: "Arquivo muito grande. O tamanho máximo é 5MB.",
    VALIDATION_ERROR: "Dados inválidos. Verifique os campos e tente novamente.",
    INVALID_RELATIONS: "Parâmetro de consulta inválido.",
    ACCOUNT_SUSPENDED: "Conta suspensa. Entre em contato com o suporte.",
    GOOGLE_AUTH_FAILED: "Falha na autenticação com Google.",
    TRAINING_TEMPLATE_NOT_FOUND: "Modelo de treino não encontrado.",
    TRAINING_TEMPLATE_EXERCISE_NOT_FOUND:
      "Exercício não encontrado neste template.",
    FORBIDDEN_NOT_TEMPLATE_OWNER:
      "Você não tem permissão para editar este template.",
    FORBIDDEN_TRAINING_TEMPLATE_ACCESS:
      "Você não tem acesso a este modelo de treino.",
    INVALID_WEEK_DAY_FOR_SCHEDULE:
      "Dia da semana inválido para este agendamento.",
    STUDENT_NOT_FOUND: "Nenhum usuário encontrado com este e-mail.",
    STUDENT_ALREADY_LINKED: "Este aluno já está vinculado à sua conta.",
    CANNOT_LINK_SELF: "Você não pode se vincular como seu próprio aluno.",
    INVALID_PROTOCOL_TYPE: "Tipo de protocolo inválido.",
    TRAINING_NOT_FOUND: "Treino não encontrado.",
    FORBIDDEN_NOT_YOUR_TRAINING: "Este treino não está atribuído a você.",
    SESSION_ALREADY_IN_PROGRESS:
      "Você já possui uma sessão de treino em andamento.",
    WORKOUT_SESSION_NOT_FOUND: "Sessão de treino não encontrada.",
    FORBIDDEN_NOT_YOUR_SESSION: "Esta sessão não pertence a você.",
    EXERCISE_LOG_NOT_FOUND: "Registro de exercício não encontrado.",
    EXERCISE_LOG_NOT_IN_SESSION:
      "Registro de exercício não pertence a esta sessão.",
    SET_LOG_NOT_FOUND: "Registro de série não encontrado.",
    ANAMNESIS_HAS_STUDENT_LINKS:
      "Esta anamnese está vinculada a alunos. Crie uma nova versão antes de editar.",
    FORBIDDEN_GENERAL_ANAMNESIS:
      "Anamneses gerais não podem ser editadas. Copie-a primeiro.",
    FORBIDDEN_NOT_ANAMNESIS_OWNER:
      "Você não tem permissão para editar esta anamnese.",
    ANAMNESIS_NOT_LINKED_TO_STUDENT:
      "Esta anamnese não está vinculada ao seu perfil.",
    ANAMNESIS_RESPONSE_NOT_FOUND:
      "Nenhuma resposta encontrada para esta anamnese.",
    ANAMNESIS_NOT_FOUND: "Anamnese não encontrada.",
    ANAMNESIS_SECTION_NOT_FOUND: "Seção da anamnese não encontrada.",
    ANAMNESIS_QUESTION_NOT_FOUND: "Pergunta da anamnese não encontrada.",
    TRAINER_PROFILE_MISSING: "Perfil de treinador não encontrado.",
    IMPORT_FORMAT_CHANGED:
      "O arquivo não corresponde ao formato esperado do PrimeCoaching. Verifique se você exportou a planilha correta.",
    AI_CONVERSATION_NOT_FOUND: "Conversa não encontrada.",
    AI_RATE_LIMITED: "Muitas mensagens enviadas. Aguarde um momento.",
    AI_MODEL_ERROR:
      "O assistente está temporariamente indisponível. Tente novamente.",
    AI_OVERLOADED:
      "O assistente está sobrecarregado no momento. Tente novamente em instantes.",
    AI_CONTEXT_BUILD_FAILED:
      "Não foi possível carregar seus dados. Tente novamente.",
    RANKING_INSUFFICIENT_STUDENTS:
      "São necessários pelo menos 3 alunos ativos (últimos 14 dias) para exibir o ranking.",
    GAMIFICATION_CONFIG_NOT_FOUND:
      "Configuração de gamificação não encontrada.",
    GAMIFICATION_ACTION_DISABLED: "Esta ação está desativada pelo treinador.",
    STUDENT_NOT_TRAINEE: "Este aluno não pertence ao seu cadastro.",
    CHALLENGE_NOT_FOUND: "Campeonato não encontrado.",
    CHALLENGE_INVALID_DATES:
      "Datas do campeonato inválidas. A data de início deve ser hoje ou no futuro, e a data de término deve ser igual ou após a de início.",
    CHALLENGE_ALREADY_STARTED:
      "Este campeonato já começou e não pode ser alterado dessa forma.",
    CHALLENGE_ALREADY_ENDED: "Este campeonato já terminou.",
    CHALLENGE_ALREADY_CANCELLED: "Este campeonato já foi cancelado.",
    CHALLENGE_NOT_DELETABLE:
      "Este campeonato não pode ser excluído. Apenas campeonatos agendados podem ser excluídos.",
    CHALLENGE_FORBIDDEN_NOT_OWNER:
      "Você não tem permissão para acessar este campeonato.",
    CHALLENGE_PARTICIPANT_NOT_TRAINEE:
      "Um ou mais alunos selecionados não pertencem ao seu cadastro.",
    CHALLENGE_PARTICIPANT_DUPLICATE: "Este aluno já participa do campeonato.",
    CHALLENGE_PARTICIPANT_NOT_FOUND:
      "Participante não encontrado neste campeonato.",
    CHALLENGE_FILTER_EMPTY: "Nenhum aluno atende aos critérios do filtro.",
    CHALLENGE_DURATION_EXCEEDED:
      "A duração do campeonato não pode ultrapassar 365 dias.",
    GLOBAL_RANKING_REMOVED:
      "O ranking global foi descontinuado. Use os campeonatos.",
    CHALLENGE_NOT_ACTIVE: "Este campeonato não está ativo.",
  },

  messageCodes: {
    "auth.unauthorized": "Sessão expirada. Faça login novamente.",
    "auth.forbidden": "Você não tem permissão para esta ação.",
    "resource.notFound": "Recurso não encontrado.",
    "resource.conflict": "Este registro já existe.",
    "student.notFound": "Nenhum usuário encontrado com este e-mail.",
    "student.alreadyLinked": "Este aluno já está vinculado à sua conta.",
    "student.cannotLinkSelf":
      "Você não pode se vincular como seu próprio aluno.",
    "student.notLinked": "Este aluno não está vinculado à sua conta.",
    "request.badRequest":
      "Requisição inválida. Verifique os dados e tente novamente.",
    "request.rateLimitExceeded":
      "Muitas tentativas. Aguarde um momento e tente novamente.",
    "internal.serverError":
      "Erro interno do servidor. Tente novamente mais tarde.",
    "database.uniqueConstraint": "Este registro já existe.",
    "database.recordNotFound": "Registro não encontrado.",
    "validation.failed":
      "Dados inválidos. Verifique os campos e tente novamente.",
    "server.error": "Erro interno do servidor. Tente novamente mais tarde.",
    "server.unavailable": "Serviço temporariamente indisponível.",
    "rate.limited": "Muitas tentativas. Aguarde um momento e tente novamente.",
    "workoutSession.alreadyInProgress":
      "Você já possui uma sessão de treino em andamento.",
    "anamnesis.notFound": "Anamnese não encontrada.",
    "anamnesis.forbidden.notOwner": "Você não tem acesso a esta anamnese.",
    "anamnesis.forbidden.general": "Anamneses gerais não podem ser editadas.",
    "anamnesis.section.notFound": "Seção não encontrada.",
    "anamnesis.question.notFound": "Pergunta não encontrada.",
    "anamnesis.alreadyLinked": "Esta anamnese já está vinculada a este aluno.",
    "anamnesis.invalidQuestionType": "Tipo de pergunta inválido.",
    "anamnesis.hasStudentLinks":
      "Esta anamnese está vinculada a alunos. Crie uma nova versão antes de editar.",
    "anamnesis.response.notFound":
      "Nenhuma resposta encontrada para esta anamnese.",
    "anamnesis.notLinkedToStudent":
      "Esta anamnese não está vinculada ao seu perfil.",
    "anamnesis.invalidCondition":
      "Condição inválida para o tipo da pergunta pai.",
    "anamnesis.parentNotEligible":
      "Apenas perguntas Sim/Não, Escolha Única ou Múltipla Escolha podem ser perguntas pai.",
    "anamnesis.parentMustBeSameSection":
      "A pergunta pai deve estar na mesma seção.",
    "anamnesis.parentTypeLocked":
      "O tipo da pergunta não pode ser alterado porque existem perguntas condicionais vinculadas.",
    "anamnesis.conditionReferencesRemovedOption":
      "Não é possível remover uma opção referenciada por uma pergunta condicional.",
    "anamnesis.conditionalDepthExceeded":
      "Perguntas condicionais não podem ser encadeadas (apenas um nível).",
    "trainer.notFound": "Perfil de treinador não encontrado.",
    "trainingTemplateExercise.notFound":
      "Exercício não encontrado neste template.",
    "branding.notFound":
      "Personalização não encontrada. Salve as configurações primeiro.",
    "import.primecoaching.formatChanged":
      "O arquivo não corresponde ao formato esperado do PrimeCoaching. Verifique se você exportou a planilha correta.",
    "ai.conversationNotFound": "Conversa não encontrada.",
    "ai.rateLimited": "Muitas mensagens enviadas. Aguarde um momento.",
    "ai.modelError":
      "O assistente está temporariamente indisponível. Tente novamente.",
    "ai.overloaded":
      "O assistente está sobrecarregado no momento. Tente novamente em instantes.",
    "ai.trainerNotFound": "Perfil de treinador não encontrado.",
    "gamification.ranking.insufficientStudents":
      "São necessários pelo menos 3 alunos ativos (últimos 14 dias) para exibir o ranking.",
    "gamification.config.notFound":
      "Configuração de gamificação não encontrada.",
    "gamification.action.disabled": "Esta ação está desativada pelo treinador.",
    "student.notTrainee": "Este aluno não pertence ao seu cadastro.",
    "challenge.notFound": "Campeonato não encontrado.",
    "challenge.invalidDates":
      "Datas do campeonato inválidas. A data de início deve ser hoje ou no futuro, e a data de término deve ser igual ou após a de início.",
    "challenge.alreadyStarted":
      "Este campeonato já começou e não pode ser alterado dessa forma.",
    "challenge.alreadyEnded": "Este campeonato já terminou.",
    "challenge.alreadyCancelled": "Este campeonato já foi cancelado.",
    "challenge.notDeletable":
      "Este campeonato não pode ser excluído. Apenas campeonatos agendados podem ser excluídos.",
    "challenge.forbidden.notOwner":
      "Você não tem permissão para acessar este campeonato.",
    "challenge.participant.notTrainee":
      "Um ou mais alunos selecionados não pertencem ao seu cadastro.",
    "challenge.participant.duplicate": "Este aluno já participa do campeonato.",
    "challenge.participant.notFound":
      "Participante não encontrado neste campeonato.",
    "challenge.filter.empty": "Nenhum aluno atende aos critérios do filtro.",
    "challenge.durationExceeded":
      "A duração do campeonato não pode ultrapassar 365 dias.",
    "challenge.notActive": "Este campeonato não está ativo.",
    "gamification.globalRankingRemoved":
      "O ranking global foi descontinuado. Use os campeonatos.",
    "dashboard.invalidDateRange":
      "Intervalo de datas inválido (dataInicial > dataFinal).",
    "dashboard.windowTooLarge": "Janela de datas excede o máximo de 365 dias.",
    "legacy.PROTOCOL_STATUS_NOT_DELETABLE":
      "Rotinas ativas não podem ser excluídas. Arquive a rotina antes.",
    "nutritionist.notFound": "Perfil do nutricionista não encontrado.",
    "nutritionist.becomeSuccess": "Conta de nutricionista ativada.",
    "nutritionist.profileCompleted":
      "Perfil ativado. Você já aparece na listagem.",
    "diet.patientNotFound": "Paciente não encontrado.",
    "diet.patientAlreadyLinked": "Este paciente já está vinculado.",
    "diet.patientNotLinked": "Este paciente não está vinculado.",
    "diet.templateNotFound": "Modelo de dieta não encontrado.",
    "diet.protocolNotFound": "Protocolo de dieta não encontrado.",
    "diet.forbiddenNotTemplateOwner":
      "Você não tem permissão para editar este modelo.",
    "diet.forbiddenNotProtocolOwner":
      "Você não tem permissão para editar este protocolo.",
    "diet.forbiddenNotYourProtocol":
      "Este protocolo não está atribuído a você.",
    "diet.mealNotFound": "Refeição não encontrada.",
    "diet.foodItemNotFound": "Alimento não encontrado.",
    "exercise.supersetMembershipInvalid":
      "Os exercícios do bi-set precisam estar em sequência no treino.",
    "exercise.supersetMinMembers":
      "Um bi-set precisa de pelo menos 2 exercícios.",
    "exercise.supersetMaxMembers":
      "Um bi-set não pode ter mais de 6 exercícios.",
    "exercise.substituteSameTraining":
      "O substituto deve pertencer ao mesmo treino.",
    "exercise.substituteCannotChain":
      "Substitutos não podem ter substitutos.",
    "exercise.substituteCannotBeInSuperset":
      "O exercício substituto não pode fazer parte de um bi-set.",
    "exercise.substitutedAlready":
      "Este exercício já é substituto de outro.",
    "exercise.substituteNotFound": "Substituto não encontrado.",
    "exercise.logAlreadySubstituted":
      "Este exercício já foi substituído nesta sessão.",
    "subscription.planNotFound": "Plano não encontrado.",
    "subscription.planArchived": "Este plano está arquivado.",
    "subscription.bothDiscountsSet": "Escolha apenas um tipo de desconto.",
    "subscription.discountExceedsPrice": "O desconto não pode ser maior que o preço.",
    "subscription.notFound": "Assinatura não encontrada.",
    "subscription.cannotEditCancelled": "Esta assinatura já foi cancelada.",
    "subscription.paymentNotFound": "Pagamento não encontrado.",
  },

  httpStatus: {
    400: "Requisição inválida. Verifique os dados e tente novamente.",
    401: "Sessão expirada. Faça login novamente.",
    403: "Você não tem permissão para esta ação.",
    404: "Recurso não encontrado.",
    409: "Este registro já existe.",
    422: "Dados inválidos. Verifique os campos e tente novamente.",
    429: "Muitas tentativas. Aguarde um momento e tente novamente.",
    500: "Erro interno do servidor. Tente novamente mais tarde.",
    502: "Servidor indisponível. Tente novamente mais tarde.",
    503: "Serviço temporariamente indisponível. Tente novamente mais tarde.",
    529: "O assistente está sobrecarregado. Tente novamente em instantes.",
  },

  network: {
    timeout:
      "Tempo de conexão esgotado. Verifique sua internet e tente novamente.",
    offline:
      "Sem conexão com o servidor. Verifique sua internet e tente novamente.",
  },

  fallback: "Ocorreu um erro inesperado. Tente novamente.",

  branding: {
    pageTitle: "Sua Marca",
    saveSuccess: "Marca salva com sucesso.",
    savePartialError: "Algumas alterações falharam ao salvar. Tente novamente.",
    configured: "Marca configurada",
    preview: {
      title: "Prévia aproximada",
      disclaimer:
        "A aparência final pode variar conforme o dispositivo do aluno.",
      expand: "Ver prévia aproximada",
      collapse: "Ocultar prévia",
    },
    banner: {
      title: "Personalize o app dos seus alunos",
      desc: "Adicione sua logo, cores e mensagem de boas-vindas.",
      howItWorks: "Como funciona",
    },
    sections: {
      logo: "Logo",
      logoDesc: "Aparece no topo do app de todos os seus alunos.",
      colors: "Cores",
      colorsDesc: "Definem botões e destaques no app do aluno.",
      primaryColor: "Cor principal",
      secondaryColor: "Cor de destaque",
      cover: "Imagem de capa",
      coverDesc: "Banner exibido na tela inicial do aluno.",
      message: "Mensagem de boas-vindas",
      messageDesc: "Texto exibido para o aluno ao abrir o app.",
      messagePlaceholder: "Ex: Foco e consistência. Vamos treinar hoje!",
    },
    upload: {
      logo: "logo",
      cover: "imagem de capa",
      hint: "JPEG, PNG ou WebP · Máx. 5MB",
      change: "Trocar",
    },
    contrast: {
      warning: "Contraste baixo — textos brancos podem ficar ilegíveis.",
    },
    bottomSheet: {
      title: "O que você pode personalizar",
      logo: {
        title: "Logo",
        desc: "Aparece no canto superior do app do aluno, identificando sua marca a cada acesso.",
      },
      colors: {
        title: "Cores",
        desc: "A cor principal define botões, títulos e destaques. A de destaque é opcional.",
      },
      cover: {
        title: "Imagem de capa",
        desc: "Banner que aparece na tela principal do aluno. Use uma foto do seu espaço ou logomarca.",
      },
      message: {
        title: "Mensagem de boas-vindas",
        desc: "Texto motivacional que saúda o aluno ao entrar. Máximo 200 caracteres.",
      },
    },
  },

  fields: {
    email: "e-mail",
    password: "senha",
    currentPassword: "senha atual",
    newPassword: "nova senha",
    newPasswordConfirmation: "confirmação da nova senha",
    passwordConfirmation: "confirmação da senha",
    token: "código",
    firstName: "nome",
    lastName: "sobrenome",
    name: "nome",
    description: "descrição",
    gender: "gênero",
    birthDate: "data de nascimento",
    avatarUrl: "foto de perfil",
    startDate: "data de início",
    expirationDate: "data de expiração",
    assigneeId: "aluno",
    protocolTemplateId: "modelo de rotina",
    availableWeekDays: "dias da semana",
    defaultDurationWeeks: "duração em semanas",
    status: "status",
    line1: "endereço",
    line2: "complemento",
    neighborhood: "bairro",
    city: "cidade",
    state: "estado",
    stateCode: "UF",
    postalCode: "CEP",
    country: "país",
    countryCode: "código do país",
    professionalDocument: "documento profissional",
    gymName: "academia",
    serviceMode: "modalidade de atendimento",
    instagram: "Instagram",
    whatsapp: "WhatsApp",
    youtube: "YouTube",
    idToken: "token de autenticação",
    refreshToken: "token de atualização",
    code: "CEP",
    trainingTemplateId: "modelo de treino",
    weekDay: "dia da semana",
    order: "ordem",
    genderOrdination: "classificação",
    trainingLevel: "nível de treino",
    category: "categoria",
    bodySegment: "segmento corporal",
    primaryColor: "cor primária",
    secondaryColor: "cor secundária",
    welcomeMessage: "mensagem de boas-vindas",
    points: "pontos",
    reason: "motivo",
    endDate: "data de término",
    participantMode: "modo de participantes",
    minAge: "idade mínima",
    maxAge: "idade máxima",
    studentIds: "alunos",
    filter: "filtro",
  },

  validationRules: {
    required: "O campo {field} é obrigatório.",
    format: "O campo {field} está em formato inválido.",
    minLength: "O campo {field} é muito curto.",
    maxLength: "O campo {field} é muito longo.",
    minimum: "O valor de {field} é muito baixo.",
    maximum: "O valor de {field} é muito alto.",
    enum: "Valor inválido para {field}.",
    pattern: "O campo {field} está em formato inválido.",
    type: "O campo {field} possui tipo inválido.",
  },

  gamification: {
    config: {
      title: "Configurar gamificação",
      enabled: "Ativar sistema de pontos",
      pointsPerAction: "Pontos por ação",
      dailyCap: "Limite diário de pontos",
      rankingMode: "Modo padrão de ranking",
      anonymousRanking: "Ocultar nomes abaixo do top 3",
      defaultPreferences: "Preferências de pontuação",
      defaultBanner:
        "Estes valores serão usados como padrão ao criar novos desafios. Você pode personalizar cada desafio individualmente.",
      usingDefaults: "Usando preferências padrão",
      customized: "Personalizado ({count} alterações)",
      restoreDefaults: "Restaurar padrão",
      editRules: "Editar",
      viewDetails: "Ver detalhes",
      viewPreview: "Ver",
      readOnlyActive:
        "Não é possível alterar as regras com o campeonato em andamento.",
      readOnlyEnded: "Campeonato encerrado.",
      previewMessage:
        "Seus valores padrão serão aplicados. Você pode editar após criar o desafio.",
      pointsRules: "Regras de pontuação",
      defaultPoints: "Pontuação: preferências padrão",
    },
    field: {
      ptsWorkoutCompleted: "Treino completo",
      "ptsWorkoutCompleted.helper": "Pontos por completar um treino",
      ptsStreak7Days: "Sequência semanal",
      "ptsStreak7Days.helper":
        "Pontos por manter 7 dias consecutivos treinando",
      ptsStreak30Days: "Sequência mensal",
      "ptsStreak30Days.helper":
        "Pontos por manter 30 dias consecutivos treinando",
      ptsDailyCheckin: "Check-in diário",
      "ptsDailyCheckin.helper": "Pontos por registrar presença no treino",
      ptsEvolutionRecord: "Registro de evolução",
      "ptsEvolutionRecord.helper": "Pontos por registrar medidas corporais",
      ptsWorkoutFeedback: "Feedback de treino",
      "ptsWorkoutFeedback.helper": "Pontos por avaliar o treino realizado",
      dailyPointsCap: "Limite diário",
      "dailyPointsCap.helper": "Máximo de pontos por dia (vazio = sem limite)",
      anonymousRanking: "Ranking anônimo",
      "anonymousRanking.helper":
        "Ocultar nomes dos outros participantes no ranking",
    },
    ranking: {
      title: "Ranking",
      insufficientStudents:
        "São necessários pelo menos 3 alunos ativos para exibir o ranking.",
      anonymous: "Modo anônimo ativo",
      mode: {
        weekly: "Semanal",
        monthly: "Mensal",
        allTime: "Geral",
      },
    },
    points: {
      history: "Histórico de pontos",
      summary: "Resumo de pontos",
      action: {
        workoutCompleted: "Treino concluído",
        trainerBonus: "Bônus do treinador",
      },
    },
    bonus: {
      award: "Conceder bônus",
      reason: "Motivo (opcional)",
      reasonHelper: "O aluno verá este motivo no histórico de pontos",
      undo: "Bônus de +{points} enviado. Desfazer",
      undone: "Bônus desfeito",
    },
  },

  challenge: {
    create: {
      title: "Criar campeonato",
      name: "Nome",
      dateRange: "Período",
      preview: "Pré-visualizar",
      participantMode: {
        explicit: "Selecionar alunos",
        filter: "Por filtro",
        all: "Todos os alunos ativos",
      },
      addParticipantsLater:
        "Você pode adicionar participantes depois de criar o campeonato.",
      filter: {
        gender: "Gênero",
        ageRange: "Faixa etária",
        city: "Cidade",
        state: "Estado",
      },
    },
    status: {
      scheduled: "Agendado",
      active: "Ativo",
      completed: "Concluído",
      cancelled: "Cancelado",
    },
    ranking: {
      myPosition: "Minha posição",
    },
    participants: {
      title: "Participantes",
      add: "Adicionar participantes",
      remove: "Remover",
    },
    error: {
      notFound: "Campeonato não encontrado.",
      invalidDates:
        "Datas inválidas. Início deve ser hoje ou futuro e término após início.",
      alreadyStarted: "Este campeonato já começou.",
      alreadyEnded: "Este campeonato já terminou.",
      alreadyCancelled: "Este campeonato já foi cancelado.",
      notDeletable: "Apenas campeonatos agendados podem ser excluídos.",
      participantNotTrainee: "Um ou mais alunos não pertencem ao seu cadastro.",
      participantDuplicate: "Este aluno já participa do campeonato.",
      filterEmpty: "Nenhum aluno atende aos critérios.",
      durationExceeded: "A duração máxima é de 365 dias.",
    },
  },

  onboarding: {
    title: "Primeiros passos",
    progressPill: "{done} de 3",
    encouragement: {
      zero: "Vamos começar — 3 passos rápidos.",
      one: "Boa! Mais 2 para você decolar.",
      two: "Quase lá — falta só 1!",
    },
    profileCompleted: {
      title: "Complete seu perfil",
      description: "Adicione seus dados pessoais e endereço",
      doneSubtitle: "Concluído",
      missing: {
        prefix: "Falta: {fields}",
        connector: "e",
        more: "mais {count}",
      },
      raceFallback: "Revise seus dados",
    },
    firstStudentLinked: {
      title: "Vincule seu primeiro aluno",
      description: "Você pode começar com um aluno real ou de teste",
      doneSubtitle: "Concluído",
    },
    firstProtocolCreated: {
      title: "Crie seu primeiro protocolo",
      description: "Monte um treino do zero ou use um template",
      doneSubtitle: "Concluído",
    },
    allDone: {
      title: "Tudo pronto!",
      description: "Você já tem o essencial configurado. Bons treinos!",
      secondaryLink: "Ver meus alunos",
    },
    dismiss: {
      ariaLabel: "Dispensar checklist",
    },
    fields: {
      firstName: "nome",
      lastName: "sobrenome",
      birthDate: "data de nascimento",
      gender: "gênero",
      line1: "endereço",
      city: "cidade",
      state: "estado",
      postalCode: "CEP",
      country: "país",
    },
    aria: {
      pendingRow: "Complete {title}, pendente. {subtitle}",
      doneRow: "Complete {title}, concluído. Ir para {title}.",
    },
  },

  brandCalendar: {
    monthsLong: [
      "janeiro",
      "fevereiro",
      "março",
      "abril",
      "maio",
      "junho",
      "julho",
      "agosto",
      "setembro",
      "outubro",
      "novembro",
      "dezembro",
    ],
    weekdaysShort: ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"],
    weekdaysLong: [
      "segunda-feira",
      "terça-feira",
      "quarta-feira",
      "quinta-feira",
      "sexta-feira",
      "sábado",
      "domingo",
    ],
    dialogTitleFallback: "Escolha a data",
    placeholder: "dd/mm/aaaa",
    btnClear: "Limpar",
    ariaPrevMonth: "Mês anterior",
    ariaNextMonth: "Próximo mês",
    ariaClose: "Fechar calendário",
    ariaOpenCalendar: "Abrir calendário",
    errorOutOfRange: "Data fora do período permitido",
    ariaDayLabel: (weekdayLong, day, monthLong, year) =>
      `${weekdayLong}, ${day} de ${monthLong} de ${year}`,
    ariaToday: "Hoje",
    ariaSelected: "Selecionado",
    ariaDisabledDay: "Indisponível",
  },

  validation: {
    "validation.email.required": "O e-mail é obrigatório.",
    "validation.email.format": "E-mail em formato inválido.",
    "validation.password.required": "A senha é obrigatória.",
    "validation.password.minLength":
      "A senha deve ter pelo menos 8 caracteres.",
    "validation.newPassword.minLength":
      "A nova senha deve ter pelo menos 8 caracteres.",
    "validation.newPasswordConfirmation.minLength":
      "A confirmação da nova senha deve ter pelo menos 8 caracteres.",
    "validation.passwordConfirmation.minLength":
      "A confirmação da senha deve ter pelo menos 8 caracteres.",
    "validation.firstName.minLength": "O nome não pode estar vazio.",
    "validation.lastName.minLength": "O sobrenome não pode estar vazio.",
    "validation.name.required": "O nome é obrigatório.",
    "validation.name.minLength": "O nome não pode estar vazio.",
    "validation.startDate.required": "A data de início é obrigatória.",
    "validation.startDate.format": "A data de início está em formato inválido.",
    "validation.expirationDate.format":
      "A data de expiração está em formato inválido.",
    "validation.assigneeId.required": "O aluno é obrigatório.",
    "validation.assigneeId.format": "O aluno selecionado é inválido.",
    "validation.token.required": "O código é obrigatório.",
    "validation.token.minLength": "O código deve ter 6 dígitos.",
    "validation.token.maxLength": "O código deve ter 6 dígitos.",
    "validation.token.pattern": "O código deve conter apenas números.",
    "validation.postalCode.pattern": "CEP em formato inválido.",
    "validation.address.postalCode.pattern": "CEP em formato inválido.",
    "validation.code.minLength": "CEP em formato inválido.",
    "validation.code.maxLength": "CEP em formato inválido.",
  },

  diet: {
    patients: {
      title: "Pacientes",
      linkPatient: "Vincular paciente",
      linkPatientTitle: "Vincular paciente",
      emailLabel: "E-mail do paciente",
      emailPlaceholder: "paciente@email.com",
      linking: "Vinculando…",
      link: "Vincular",
      unlink: "Desvincular",
      unlinkConfirm: "Desvincular {name}? Esta ação não pode ser desfeita.",
      noPatients: "Nenhum paciente vinculado ainda",
      noPatientsDesc:
        "Vincule seu primeiro paciente para começar a prescrever dietas.",
      metabolicProfile: "Perfil Metabólico",
      metabolicProfileEmpty:
        "Preencha o perfil metabólico para calcular o gasto energético.",
      fillProfile: "Preencher perfil",
      lastMeasurement: "Última medição: há {days} dias",
      viewHistory: "Ver histórico",
      tmbFormula: "Fórmula TMB",
      activityLevel: "Nível de atividade",
      weightKg: "Peso (kg)",
      heightCm: "Altura (cm)",
      age: "Idade",
      gender: "Sexo",
      saveProfile: "Salvar perfil",
      tmbResult: "TMB",
      getResult: "GET",
      kcal: "kcal",
    },
    templates: {
      title: "Modelos de Dieta",
      newTemplate: "+ Novo modelo",
      createTitle: "Criar modelo",
      editTitle: "Editar modelo",
      name: "Nome",
      description: "Descrição",
      dietType: "Tipo de dieta",
      goalType: "Objetivo",
      noTemplates: "Nenhum modelo criado ainda",
      noTemplatesDesc:
        "Crie modelos de dieta reutilizáveis para agilizar a prescrição.",
      meals: "refeições",
    },
    protocols: {
      title: "Protocolos",
      newProtocol: "+ Novo protocolo",
      createTitle: "Criar protocolo",
      originBlank: "Em branco",
      originFromTemplate: "A partir de modelo",
      selectPatient: "Selecionar paciente",
      selectTemplate: "Selecionar modelo",
      startDate: "Data de início",
      endDate: "Data de término (opcional)",
      createAsDraft: "Criar como rascunho",
      publish: "Publicar",
      publishing: "Publicando…",
      unpublish: "Despublicar",
      publishConfirmTitle: "Publicar protocolo?",
      publishConfirmHasActive:
        "O paciente já possui um protocolo ativo. Ao publicar, ele será automaticamente concluído.",
      publishMinWarning:
        "Adicione ao menos uma refeição com um alimento antes de publicar.",
      published: "Protocolo publicado",
      unpublished: "Protocolo movido para rascunho",
      noProtocols: "Nenhum protocolo ainda",
      noProtocolsDesc: "Crie protocolos de dieta para seus pacientes.",
      patientLabel: "Paciente",
      statusLabel: "Status",
    },
    meals: {
      addMeal: "+ Adicionar refeição",
      mealType: "Tipo de refeição",
      scheduledTime: "Horário",
      notes: "Observações",
      noMeals: "Nenhuma refeição adicionada",
      addFood: "+ Adicionar alimento",
      deleteMeal: "Excluir refeição",
      deleteFood: "Remover alimento",
      deleteMealConfirm:
        "Excluir esta refeição e todos os alimentos? Esta ação não pode ser desfeita.",
      undoDeleteMeal: "Refeição excluída. Desfazer",
      undoDeleteFood: "Alimento removido. Desfazer",
      createMeal: "Criar refeição",
    },
    foods: {
      searchPlaceholder: "Buscar alimento…",
      noResults: "Nenhum alimento encontrado",
      recentFoods: "Recentes",
      quantity: "Quantidade (g)",
      unit: "Unidade",
      selectFood: "Selecionar",
      addFood: "Adicionar",
      calories: "kcal",
      protein: "Prot",
      carbs: "Carb",
      fat: "Gord",
      searchTitle: "Buscar alimento",
      quantityTitle: "Quantidade",
      back: "Voltar",
    },
    summary: {
      totalKcal: "kcal total",
      goal: "Meta",
      aligned: "Alinhado à meta",
      above: "Acima da meta (+{pct}%)",
      below: "Abaixo da meta (-{pct}%)",
      veryAbove: "Muito acima. Confirme.",
      veryBelow: "Muito abaixo. Confirme.",
      aware: "Tenho ciência",
      modelKcal: "Modelo: {kcal} kcal",
    },
    myDiet: {
      title: "Minha Dieta",
      noActive: "Seu nutricionista ainda não prescreveu uma dieta.",
    },
  },

  dashboard: {
    tabLabel: "Atividade",
    summarySectionTitle: "Resumo",
    recentSessionsTitle: "Sessões recentes",
    progressionTitle: "Progressão de carga",
    progressionSubtitle: "Comparado à 1ª sessão do período",
    completionRate: "Taxa de conclusão",
    completionRateAdherence: "de aderência",
    lastSession: "Última sessão",
    completed: "Concluídos",
    inProgress: "Em andamento",
    abandoned: "Abandonados",
    statusCompleted: "Concluído",
    statusAbandoned: "Abandonado",
    statusInProgress: "Em andamento",
    noDataInWindow: "Sem dados no período",
    noSessionsInPeriod: "Aluno ainda não treinou nesse período",
    seeLastYear: "Ver últimos 12 meses",
    noActiveProtocol: "Sem rotina ativa",
    assignProtocol: "Atribuir rotina",
    singleSessionTooltip: "Sem comparativo (apenas 1 sessão)",
    noLoadTracked: "Sem carga registrada (ex: prancha, mobilidade)",
    noLoadTrackedShort: "Sem carga registrada",
    show20Frequent: "Mostrando os 20 mais frequentes neste período",
    vsPreviousPeriod: "vs período anterior",
    comparedToFirst: "Comparado à 1ª sessão do período",
    seeAll: "Ver todas",
    seeAllExercises: "Ver todos os {count} exercícios",
    showLess: "Mostrar menos",
    askIArnold: "Perguntar ao iArnold",
    iArnoldPrefill: "Como posso ajudar com {studentName}?",
    blockLoadFailed: "Falha ao carregar",
    retry: "Tentar novamente",
    invalidPeriod: "Período inválido. Tente novamente.",
    studentNotFound: "Aluno não encontrado",
    back: "Voltar",
    sameDayHint: "Selecionando apenas 1 dia mostrará dados limitados.",
    activeProtocol: "Rotina atual",
    sessions: "sessão | sessões",
    sessionsCount: "{count} sessão | {count} sessões",
    activePlan: "Plano ativo: {name}",
    presets: {
      last30Days: "Últimos 30 dias",
      last90Days: "Últimos 90 dias",
      last6Months: "Últimos 6 meses",
      last1Year: "Último 1 ano",
      custom: "Personalizar",
    },
    period: {
      title: "Período",
      apply: "Aplicar",
      cancel: "Cancelar",
      customFrom: "De",
      customTo: "Até",
    },
    sets: "séries",
    reps: "reps",
    set: "Set",
    notRecorded: "Sem séries registradas",
  },

  trainerBriefing: {
    label: "Briefing · Seus alunos agora",
    updatedAt: "Atualizado {time}",
    stats: {
      activeStudents: "Alunos ativos",
      activeStudentsSub: "+{count} esta semana",
      stagnantProgress: "Progresso estagnado",
      stagnantProgressSub: "Sem evolução 14+ dias",
      inactiveStudents: "Inativos",
      inactiveStudentsSub: "Sem treino há 7+ dias",
      adherence: "Adesão geral",
      adherenceDeltaPos: "+{value}pp vs mês ant.",
      adherenceDeltaNeg: "{value}pp vs mês ant.",
      adherenceDeltaNeutral: "0pp vs mês ant.",
    },
    error: "Não foi possível carregar o briefing",
  },

  iArnold: {
    scrollPill: {
      new: "Ver nova resposta",
      aria: "Ir para a resposta mais recente",
    },
    skeleton: {
      thinking: "Pensando…",
      aria: "iArnold está processando sua pergunta",
      phrases: [
        "Alongando…",
        "Fazendo flexões…",
        "Em isometria na parede…",
        "Aquecendo os músculos…",
        "Mobilizando articulações…",
        "Ajustando a postura…",
        "Respirando fundo…",
        "Refinando a técnica…",
        "Soltando o quadril…",
        "Carregando a barra…",
        "Fazendo agachamentos…",
        "Em prancha…",
        "Subindo na barra…",
        "Em supino…",
        "Saltando corda…",
        "Pulando corda até mil…",
        "Fazendo burpees…",
      ],
    },
  },

  nutritionist: {
    activationTitle: "Ativar perfil de nutricionista?",
    activationBody:
      "Ao ativar, você poderá preencher seus dados profissionais e atender clientes como nutricionista na plataforma.",
    activateProfile: "Ativar perfil",
    cancel: "Cancelar",
    profileActivated: "Perfil ativado com sucesso.",
    goToOnboarding: "Completar cadastro",
    notFoundToast:
      "Este perfil não está ativo. Ative em Painel → Seja um Nutricionista.",
    onboardingIncompleteTitle: "Perfil de nutricionista incompleto",
    onboardingIncompleteDesc:
      "Complete seu perfil de nutricionista para começar a atender.",
    activationFailed: "Não foi possível ativar. Tente novamente.",
  },

  exercise: {
    prescriptionMode: {
      label: "Modo de prescrição",
    },
  },

  exerciseGroup: {
    select: "Selecionar",
    cancelSelection: "Cancelar seleção",
    groupAsBiset: "Agrupar em bi-set",
    biset: "Bi-set",
    dissolveBiset: "Desfazer bi-set",
    bisetCreated: "Bi-set criado.",
    bisetDissolved: "Bi-set desfeito.",
    selectionCount: "{selected}/6 selecionados",
    selectionInstruction:
      "Selecione 2 a 6 exercícios para agrupar em bi-set.",
    selectionInstructionLong:
      "Selecione 2 a 6 exercícios. Não precisam estar em sequência.",
    nonAdjacentConfirmTitle: "Reorganizar exercícios?",
    nonAdjacentConfirmBody:
      "Os exercícios serão reorganizados em sequência.",
    confirmGroupAndReorder: "Agrupar e reordenar",
    confirmDissolve:
      "Desfazer bi-set? Os exercícios serão mantidos como individuais.",
    alreadyInAnotherBiset: "Já em outro bi-set",
    bisetCreateFailed:
      "Não foi possível criar o bi-set. Tente novamente.",
    bisetCreateInconsistent:
      "Estado inconsistente — recarregue.",
    bisetReload: "Recarregar",
    noRest: "sem descanso",
  },

  training: {
    duration: {
      notEstimated: "Duração não estimada",
      quick: "Treino rápido",
      ariaNotEstimated: "Duração estimada não disponível",
      ariaQuick: "Treino rápido, menos de 5 minutos",
      ariaEstimated: "Duração estimada: {{value}}",
      minutesShort: "min",
      hoursShort: "h",
    },
  },

  subscription: {
    pageTitle: 'Financeiro',
    tabs: {
      billing: 'Cobranças',
      plans: 'Planos',
    },
    stat: {
      overdue: 'Atrasado',
      pending: 'Pendente no mês',
      paid: 'Recebido no mês',
      overdueTooltip: 'Cobranças vencidas em qualquer período, ignorando o filtro de mês.',
    },
    actions: {
      assignPlan: 'Atribuir plano',
      replacePlan: 'Trocar plano',
      cancelSubscription: 'Cancelar assinatura',
      viewHistory: 'Ver histórico',
      newPlan: 'Novo plano',
      markPaid: 'Marcar pago',
      paying: 'Pagando…',
      revertPayment: 'Reverter pagamento',
      undo: 'Desfazer',
      showArchived: 'Mostrar arquivados',
      addCharge: 'Adicionar cobrança',
    },
    empty: {
      noSubscription: 'Sem assinatura ativa',
      noChargesYet: 'Nenhuma cobrança ainda. Atribua um plano a um aluno para começar.',
      noPlans: 'Crie seu primeiro plano de assinatura',
      noHistory: 'Sem cobranças registradas para este aluno',
      searchNoResults: 'Nenhum aluno encontrado para "{query}"',
    },
    toast: {
      paymentRegistered: 'Pagamento registrado.',
      paymentReverted: 'Pagamento revertido.',
      planCreated: 'Plano criado.',
      planUpdated: 'Plano atualizado.',
      planArchived: 'Plano arquivado.',
      planUnarchived: 'Plano desarquivado.',
      planAssigned: 'Plano atribuído.',
      subscriptionCancelled: 'Assinatura cancelada.',
    },
    confirm: {
      replaceTitle: 'Confirmar troca de plano',
      replaceMessage: 'A assinatura atual será cancelada hoje. Histórico preservado.',
      cancelMessage: 'Cancelar a assinatura deste aluno? Ciclos futuros não serão gerados. O histórico será preservado.',
      deleteCycleMessage: 'Excluir esta cobrança? O histórico ficará sem este registro. Esta ação não pode ser desfeita.',
    },
  },

  substitute: {
    add: "Adicionar substituto",
    addedToast: "Substituto adicionado.",
    removeToast: "Substituto removido.",
    inlinePrefix: "Substituto: ",
    extraCount: "+{count} substituto | +{count} substitutos",
    altShort: "{count} alt.",
    swap: "Trocar",
    swapping: "Trocando…",
    swapTitle: "Trocar {name} por:",
    swapClose: "Fechar troca",
    swapped: "substituído",
    swappedTo: "Trocado por: {name}",
    swappedAgo: "Trocado há {seconds}s",
    swapUndo: "Desfazer",
    swapFailed: "Não foi possível trocar. Tente novamente.",
    composerTitle: "Adicionar substituto",
    composerNamePlaceholder: "Nome do exercício",
    tabCreate: "Criar substituto",
    tabLibrary: "Da biblioteca",
    importToast: "{count} substituto(s) adicionado(s).",
    importBtn: "Importar {count}",
    importBtnDefault: "Importar",
    importAdding: "Adicionando…",
    libraryEmpty: "Biblioteca vazia.",
    libraryNoResults: "Nenhum exercício encontrado.",
    deleteConfirm: 'Excluir "{name}"? Esta ação não pode ser desfeita.',
    deletedToast: "Substituto removido.",
    deleteAria: "Excluir substituto {name}",
  },
};

export default ptBR;
