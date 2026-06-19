import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';

const PrivacyPolicy = () => {
  return (
    <div className="privacy-page">
      <header className="privacy-header">
        <div className="privacy-header-inner">
          <span className="privacy-brand">TeuFit</span>
          <Link to="/login" className="privacy-back-link">Entrar na plataforma</Link>
        </div>
      </header>

      <main className="privacy-main">
        <div className="privacy-container">

          <div className="privacy-hero">
            <div className="privacy-hero-icon" aria-hidden="true">
              <Shield size={32} strokeWidth={2} />
            </div>
            <div className="privacy-hero-text">
              <p className="privacy-eyebrow">Política de Privacidade</p>
              <h1 className="privacy-title">Privacidade e proteção de dados</h1>
              <p className="privacy-last-updated">Última atualização: 18 de junho de 2026</p>
            </div>
          </div>

          <div className="privacy-body">

            <section className="privacy-section">
              <h2 className="privacy-section-title">1. Introdução — quem somos</h2>
              <p>
                A <strong>TeuFit</strong> é uma plataforma de acompanhamento de treino online que conecta
                personal trainers e seus alunos. Por meio de nossos aplicativos e serviços web, o personal
                trainer pode montar, ajustar e acompanhar o progresso dos treinos dos alunos, enquanto o
                aluno executa e registra seus treinos de forma estruturada.
              </p>
              <p>
                Esta Política de Privacidade descreve como a TeuFit coleta, usa, armazena e protege os
                dados pessoais de nossos usuários, em conformidade com a Lei Geral de Proteção de Dados
                Pessoais (LGPD — Lei 13.709/2018).
              </p>
              <p>
                Ao utilizar a plataforma TeuFit, você concorda com as práticas descritas nesta política.
                Caso não concorde, interrompa o uso dos nossos serviços e entre em contato conosco para
                solicitar a exclusão dos seus dados.
              </p>
            </section>

            <section className="privacy-section">
              <h2 className="privacy-section-title">2. Dados que coletamos</h2>
              <p>
                Coletamos dados pessoais necessários para a prestação do serviço de acompanhamento de
                treino. As categorias são:
              </p>

              <h3 className="privacy-subsection-title">2.1 Dados de cadastro</h3>
              <ul className="privacy-list">
                <li>Nome completo;</li>
                <li>Endereço de e-mail;</li>
                <li>Data de nascimento;</li>
                <li>Informações de autenticação (senha criptografada via provedor de identidade).</li>
              </ul>

              <h3 className="privacy-subsection-title">2.2 Dados pessoais sensíveis — anamnese e saúde</h3>
              <p>
                A TeuFit coleta informações de saúde e físicas por meio do formulário de anamnese,
                preenchido pelo aluno a pedido do personal trainer. Esses dados são classificados como
                {' '}<strong>dados pessoais sensíveis</strong> nos termos do artigo 5.º, inciso II, e do
                artigo 11 da LGPD, e recebem tratamento especialmente cuidadoso:
              </p>
              <ul className="privacy-list">
                <li>Peso e altura;</li>
                <li>Histórico de saúde e condições médicas relevantes;</li>
                <li>Lesões, limitações físicas e restrições de movimento;</li>
                <li>Objetivos de treino e composição corporal;</li>
                <li>Nível de condicionamento físico atual;</li>
                <li>Medicamentos em uso e orientações médicas, quando informados voluntariamente pelo aluno.</li>
              </ul>
              <p>
                Esses dados são coletados exclusivamente com o consentimento expresso do titular (art. 11,
                inciso I, LGPD) e utilizados unicamente para a prestação do serviço de personal training
                contratado pelo aluno com o seu personal trainer.
              </p>

              <h3 className="privacy-subsection-title">2.3 Dados de treino e execução</h3>
              <ul className="privacy-list">
                <li>Registros de séries, repetições e carga de cada exercício executado;</li>
                <li>Sessões de treino (data, duração, treino realizado);</li>
                <li>Índice de esforço percebido (RPE) e notas de execução;</li>
                <li>Histórico de progressão em exercícios específicos.</li>
              </ul>

              <h3 className="privacy-subsection-title">2.4 Fotos de progresso</h3>
              <p>
                Caso o aluno ou o personal trainer opte por registrar fotos de progresso corporal, essas
                imagens são tratadas como dados pessoais sensíveis, armazenadas de forma segura e
                acessíveis apenas ao próprio aluno e ao seu personal trainer responsável.
              </p>

              <h3 className="privacy-subsection-title">2.5 Dados de uso e navegação</h3>
              <ul className="privacy-list">
                <li>Endereço IP e identificadores de dispositivo;</li>
                <li>Informações de sessão e autenticação;</li>
                <li>Registros de acesso (logs) para segurança e auditoria.</li>
              </ul>
            </section>

            <section className="privacy-section">
              <h2 className="privacy-section-title">3. Como e por que usamos seus dados (finalidade)</h2>
              <p>Utilizamos os dados pessoais coletados exclusivamente para as seguintes finalidades:</p>
              <ul className="privacy-list">
                <li>
                  <strong>Prestação do serviço:</strong> permitir que o personal trainer crie, ajuste e
                  acompanhe o plano de treino do aluno;
                </li>
                <li>
                  <strong>Execução de treinos:</strong> permitir que o aluno registre e acompanhe a execução
                  dos treinos no aplicativo;
                </li>
                <li>
                  <strong>Análises e relatórios de progresso:</strong> gerar gráficos e estatísticas de
                  evolução para o aluno e para o personal trainer;
                </li>
                <li>
                  <strong>Recursos de inteligência artificial:</strong> utilizar os dados de treino e anamnese
                  para gerar sugestões e análises automatizadas de treino dentro da plataforma — sempre com o
                  aluno e o personal trainer no controle das decisões finais;
                </li>
                <li>
                  <strong>Comunicação:</strong> enviar notificações e avisos relacionados ao serviço;
                </li>
                <li>
                  <strong>Segurança:</strong> prevenir fraudes, acessos não autorizados e garantir a
                  integridade da plataforma;
                </li>
                <li>
                  <strong>Cumprimento de obrigações legais</strong> quando exigido pela legislação brasileira.
                </li>
              </ul>
              <p>
                Não utilizamos seus dados pessoais para publicidade de terceiros, venda de cadastros ou
                qualquer finalidade incompatível com a prestação do serviço descrito acima.
              </p>
            </section>

            <section className="privacy-section">
              <h2 className="privacy-section-title">4. Base legal para o tratamento</h2>
              <p>O tratamento de dados na TeuFit é fundamentado nas seguintes hipóteses legais da LGPD:</p>
              <ul className="privacy-list">
                <li>
                  <strong>Consentimento (art. 7.º, inciso I; art. 11, inciso I):</strong> para dados pessoais
                  sensíveis de saúde coletados na anamnese e para fotos de progresso, o tratamento é condicionado
                  ao consentimento expresso e específico do titular;
                </li>
                <li>
                  <strong>Execução de contrato (art. 7.º, inciso V):</strong> para os dados necessários à
                  prestação do serviço de personal training (cadastro, dados de treino, comunicações do serviço);
                </li>
                <li>
                  <strong>Legítimo interesse (art. 7.º, inciso IX):</strong> para fins de segurança,
                  prevenção de fraudes e melhoria da plataforma, sempre observados os direitos e expectativas
                  dos titulares;
                </li>
                <li>
                  <strong>Cumprimento de obrigação legal (art. 7.º, inciso II):</strong> quando exigido
                  por autoridade competente ou legislação aplicável.
                </li>
              </ul>
            </section>

            <section className="privacy-section">
              <h2 className="privacy-section-title">5. Compartilhamento de dados</h2>
              <p>A TeuFit compartilha dados pessoais apenas nas seguintes situações:</p>
              <ul className="privacy-list">
                <li>
                  <strong>Com o personal trainer responsável:</strong> o aluno tem ciência de que seu personal
                  trainer acessa os dados de anamnese, treino, progresso e histórico de execução para
                  prestar o serviço de acompanhamento;
                </li>
                <li>
                  <strong>Com provedores de infraestrutura:</strong> empresas que prestam serviços de
                  hospedagem em nuvem, banco de dados e autenticação (como Firebase/Google) necessários
                  para o funcionamento da plataforma — esses provedores atuam como operadores sob
                  contrato de proteção de dados compatível com a LGPD;
                </li>
                <li>
                  <strong>Com serviços de inteligência artificial:</strong> modelos de IA utilizados
                  internamente pela TeuFit para gerar sugestões de treino. Os dados são processados de
                  acordo com as políticas de privacidade dos respectivos provedores;
                </li>
                <li>
                  <strong>Por obrigação legal:</strong> quando exigido por lei, decisão judicial ou
                  determinação de autoridade competente.
                </li>
              </ul>
              <p>
                <strong>A TeuFit não vende, aluga nem comercializa dados pessoais de nenhum usuário.</strong>
              </p>
            </section>

            <section className="privacy-section">
              <h2 className="privacy-section-title">6. Armazenamento e segurança</h2>
              <p>
                Os dados pessoais são armazenados em servidores seguros, com controle de acesso,
                criptografia em trânsito (TLS) e em repouso. Adotamos medidas técnicas e organizacionais
                adequadas para proteger os dados contra acesso não autorizado, perda, alteração ou
                divulgação indevida.
              </p>
              <p>
                Dados de saúde (anamnese) e fotos de progresso recebem controle de acesso adicional:
                apenas o próprio aluno e o personal trainer responsável por aquele aluno podem acessá-los.
              </p>
              <p>
                Em caso de incidente de segurança que possa gerar risco ou dano relevante aos titulares,
                a TeuFit notificará a Autoridade Nacional de Proteção de Dados (ANPD) e os titulares
                afetados, conforme previsto no art. 48 da LGPD.
              </p>
            </section>

            <section className="privacy-section">
              <h2 className="privacy-section-title">7. Direitos do titular (LGPD, art. 18)</h2>
              <p>
                Você, como titular dos dados, tem os seguintes direitos garantidos pela LGPD, que podem
                ser exercidos a qualquer momento mediante solicitação ao nosso encarregado (DPO):
              </p>
              <ul className="privacy-list">
                <li>
                  <strong>Confirmação e acesso:</strong> confirmar a existência de tratamento e acessar os
                  dados que mantemos sobre você;
                </li>
                <li>
                  <strong>Correção:</strong> solicitar a correção de dados incompletos, inexatos ou
                  desatualizados;
                </li>
                <li>
                  <strong>Anonimização, bloqueio ou eliminação:</strong> solicitar a anonimização, o
                  bloqueio ou a eliminação de dados desnecessários, excessivos ou tratados em
                  desconformidade com a LGPD;
                </li>
                <li>
                  <strong>Portabilidade:</strong> solicitar a portabilidade dos seus dados para outro
                  fornecedor de serviço, observados os segredos comerciais e industriais;
                </li>
                <li>
                  <strong>Eliminação:</strong> solicitar a eliminação dos dados pessoais tratados com base
                  no seu consentimento, ressalvadas as hipóteses de guarda obrigatória por lei;
                </li>
                <li>
                  <strong>Informação sobre compartilhamento:</strong> obter informações sobre com quais
                  entidades públicas e privadas a TeuFit compartilha seus dados;
                </li>
                <li>
                  <strong>Informação sobre não consentir:</strong> ser informado sobre a possibilidade
                  de não fornecer o consentimento e sobre as consequências da negativa;
                </li>
                <li>
                  <strong>Revogação do consentimento:</strong> revogar o consentimento a qualquer momento
                  por procedimento gratuito e facilitado, sem prejuízo da licitude do tratamento realizado
                  anteriormente à revogação;
                </li>
                <li>
                  <strong>Oposição:</strong> opor-se a tratamento realizado com fundamento em outra base
                  legal que não o consentimento, em caso de descumprimento da LGPD;
                </li>
                <li>
                  <strong>Revisão de decisões automatizadas:</strong> solicitar revisão de decisões tomadas
                  unicamente com base em tratamento automatizado de dados pessoais.
                </li>
              </ul>
              <p>
                Para exercer qualquer um desses direitos, entre em contato com nosso encarregado pelo
                e-mail indicado na seção 13 desta política. Atenderemos sua solicitação no prazo previsto
                pela LGPD.
              </p>
            </section>

            <section className="privacy-section">
              <h2 className="privacy-section-title">8. Retenção de dados</h2>
              <p>
                Os dados pessoais são mantidos pelo tempo necessário para a prestação do serviço e para
                o cumprimento de obrigações legais:
              </p>
              <ul className="privacy-list">
                <li>
                  <strong>Dados de conta e cadastro:</strong> mantidos enquanto a conta estiver ativa.
                  Após o encerramento da conta, os dados são eliminados ou anonimizados em até 90 dias,
                  salvo obrigação legal de guarda por prazo maior;
                </li>
                <li>
                  <strong>Dados de saúde e anamnese:</strong> mantidos enquanto a relação entre aluno e
                  personal trainer estiver ativa na plataforma. O aluno pode solicitar a exclusão a
                  qualquer momento;
                </li>
                <li>
                  <strong>Logs de acesso e segurança:</strong> mantidos por 6 meses, conforme
                  determinação do Marco Civil da Internet (Lei 12.965/2014).
                </li>
              </ul>
            </section>

            <section className="privacy-section">
              <h2 className="privacy-section-title">9. Exclusão de conta e de dados pessoais</h2>
              <p>
                Você pode solicitar a exclusão da sua conta e de todos os dados pessoais associados a
                qualquer momento, de forma gratuita, por qualquer dos canais abaixo:
              </p>
              <ul className="privacy-list">
                <li>
                  <strong>Pelo aplicativo:</strong> acesse a área de configurações ou perfil da conta e
                  selecione a opção <strong>Excluir conta</strong>. A solicitação será processada
                  imediatamente após a confirmação;
                </li>
                <li>
                  <strong>Por e-mail:</strong> envie uma solicitação para{' '}
                  <a
                    href="mailto:contato@treinoway.com"
                    className="privacy-contact-link"
                  >
                    contato@treinoway.com
                  </a>
                  {' '}com o assunto &ldquo;Exclusão de conta&rdquo;. Responderemos e processaremos a solicitação
                  no prazo de até 15 dias úteis.
                </li>
              </ul>
              <p>
                Após a exclusão da conta, os seguintes dados serão eliminados ou anonimizados em até
                90 dias:
              </p>
              <ul className="privacy-list">
                <li>Dados de cadastro (nome, e-mail, data de nascimento);</li>
                <li>Dados de anamnese e saúde;</li>
                <li>Fotos de progresso;</li>
                <li>Histórico de treinos e registros de execução.</li>
              </ul>
              <p>
                Excepcionalmente, logs de acesso são retidos por 6 meses após a exclusão da conta,
                conforme obrigação legal estabelecida pelo Marco Civil da Internet (Lei 12.965/2014,
                art. 15). Decorrido esse prazo, os logs também são eliminados de forma definitiva.
              </p>
              <p>
                A exclusão de conta é irreversível. Caso deseje retomar o uso da plataforma após a
                exclusão, será necessário criar uma nova conta.
              </p>
            </section>

            <section className="privacy-section">
              <h2 className="privacy-section-title">10. Menores de idade</h2>
              <p>
                O uso da plataforma TeuFit por menores de 18 anos requer o consentimento específico e em
                destaque de pelo menos um dos pais ou do responsável legal, em conformidade com o art. 14
                da LGPD.
              </p>
              <p>
                Caso identifiquemos que coletamos dados de menor de idade sem o consentimento adequado,
                excluiremos essas informações imediatamente. Pais ou responsáveis que identifiquem essa
                situação devem entrar em contato pelo e-mail indicado na seção 13.
              </p>
            </section>

            <section className="privacy-section">
              <h2 className="privacy-section-title">11. Cookies e tecnologias de rastreamento</h2>
              <p>
                A versão web da TeuFit utiliza tecnologias padrão de armazenamento local (cookies e
                localStorage) para as seguintes finalidades:
              </p>
              <ul className="privacy-list">
                <li>
                  <strong>Cookies estritamente necessários:</strong> manter a sessão autenticada do usuário
                  e garantir o funcionamento correto da plataforma. Não podem ser desativados;
                </li>
                <li>
                  <strong>Armazenamento local de sessão:</strong> armazenar tokens de autenticação de
                  forma segura no dispositivo do usuário para evitar logins repetidos.
                </li>
              </ul>
              <p>
                Não utilizamos cookies de rastreamento publicitário ou de terceiros para fins de
                publicidade comportamental. O uso de cookies de desempenho e analíticos, quando
                implementado, será comunicado com antecedência e sujeito ao consentimento do usuário.
              </p>
            </section>

            <section className="privacy-section">
              <h2 className="privacy-section-title">12. Alterações nesta política</h2>
              <p>
                Esta Política de Privacidade pode ser atualizada periodicamente para refletir mudanças
                no serviço, na legislação ou nas nossas práticas de proteção de dados. A data da última
                revisão está indicada no topo deste documento.
              </p>
              <p>
                Alterações significativas serão comunicadas por e-mail ou por notificação dentro da
                plataforma com pelo menos 15 dias de antecedência. O uso continuado da plataforma após
                a data de vigência das alterações indica a aceitação da política atualizada.
              </p>
            </section>

            <section className="privacy-section">
              <h2 className="privacy-section-title">13. Contato e encarregado pelo tratamento de dados (DPO)</h2>
              <p>
                Para exercer seus direitos como titular, esclarecer dúvidas sobre esta política ou
                reportar qualquer preocupação relacionada ao tratamento de dados pessoais, entre em
                contato com nosso Encarregado pelo Tratamento de Dados Pessoais (DPO):
              </p>
              <div className="privacy-contact-block">
                <p><strong>TeuFit</strong></p>
                <p>
                  E-mail:{' '}
                  <a
                    href="mailto:contato@treinoway.com"
                    className="privacy-contact-link"
                  >
                    contato@treinoway.com
                  </a>
                </p>
              </div>
              <p>
                Você também tem o direito de apresentar reclamação perante a Autoridade Nacional de
                Proteção de Dados (ANPD), caso entenda que seus direitos não foram atendidos.
              </p>
            </section>

          </div>
        </div>
      </main>

      <footer className="privacy-footer">
        <div className="privacy-footer-inner">
          <span className="privacy-footer-brand">TeuFit</span>
          <span className="privacy-footer-sep" aria-hidden="true">·</span>
          <span className="privacy-footer-copy">
            Política de Privacidade — Última atualização: 18 de junho de 2026
          </span>
        </div>
      </footer>
    </div>
  );
};

export default PrivacyPolicy;
