import { Link } from 'react-router-dom';
import { UserX } from 'lucide-react';

const AccountDeletion = () => {
  return (
    <div className="legal-page">
      <header className="legal-header">
        <div className="legal-header-inner">
          <Link to="/login" className="legal-brand-link" aria-label="Ir para o login">
            <img src="/img/teufit-lockup.png" alt="TeuFit" className="legal-brand-logo" />
          </Link>
          <Link to="/login" className="legal-back-link">Entrar na plataforma</Link>
        </div>
      </header>

      <main className="legal-main">
        <div className="legal-container">

          <div className="legal-hero">
            <div className="legal-hero-icon" aria-hidden="true">
              <UserX size={32} strokeWidth={2} />
            </div>
            <div className="legal-hero-text">
              <p className="legal-eyebrow">Exclusão de Conta</p>
              <h1 className="legal-title">Exclusão de conta na TeuFit</h1>
              <p className="legal-last-updated">Última atualização: 24 de setembro de 2026</p>
            </div>
          </div>

          <div className="legal-body">

            <section className="legal-section">
              <h2 className="legal-section-title">1. Sobre este aplicativo</h2>
              <p>
                Esta página permite solicitar a exclusão da sua conta e dos dados pessoais
                associados ao aplicativo <strong>TeuFit</strong> (identificador de pacote{' '}
                <strong>br.com.teufit.app</strong>), inclusive caso você já tenha desinstalado o
                aplicativo do seu dispositivo.
              </p>
            </section>

            <section className="legal-section">
              <h2 className="legal-section-title">2. Como solicitar a exclusão</h2>
              <p>
                Você pode solicitar a exclusão da sua conta TeuFit por qualquer um dos caminhos
                abaixo, de forma gratuita.
              </p>

              <div className="legal-action-grid">
                <div className="legal-action-card">
                  <h3 className="legal-action-card-title">Pelo aplicativo</h3>
                  <p>
                    No aplicativo, acesse <strong>Perfil → Excluir conta</strong>. A exclusão é
                    processada após a confirmação.
                  </p>
                  <p>
                    <strong>Contas de treinador:</strong> a exclusão ainda não está disponível pelo
                    aplicativo. Solicite por e-mail, no canal ao lado.
                  </p>
                </div>

                <div className="legal-action-card legal-action-card--primary">
                  <p className="legal-action-card-eyebrow">Sem acesso ao aplicativo</p>
                  <h3 className="legal-action-card-title">Por e-mail</h3>
                  <p>
                    Envie uma mensagem para{' '}
                    <a
                      href="mailto:contato@teufit.com.br?subject=Exclus%C3%A3o%20de%20conta"
                      className="legal-contact-link"
                    >
                      contato@teufit.com.br
                    </a>
                    {' '}com o assunto &ldquo;Exclusão de conta&rdquo;. Responderemos e
                    processaremos a solicitação no prazo de até <strong>15 dias úteis</strong>.
                  </p>
                </div>
              </div>
            </section>

            <section className="legal-section">
              <h2 className="legal-section-title">3. Dados excluídos</h2>
              <p>Ao confirmar a exclusão da sua conta, removemos:</p>
              <ul className="legal-list">
                <li>
                  Dados de cadastro — nome, e-mail, data de nascimento, gênero, endereço,
                  contatos de redes sociais e WhatsApp, e foto de avatar;
                </li>
                <li>Dados de anamnese e saúde;</li>
                <li>Fotos de progresso;</li>
                <li>Histórico de treinos e registros de execução.</li>
              </ul>
            </section>

            <section className="legal-section">
              <h2 className="legal-section-title">4. Retenção de dados após a exclusão</h2>
              <p>
                Os dados listados na Seção 3 são eliminados ou anonimizados em até{' '}
                <strong>90 dias</strong> a partir da confirmação da exclusão. Duas exceções se
                aplicam, por exigência legal:
              </p>
              <ul className="legal-list">
                <li>
                  <strong>Logs de acesso:</strong> retidos por <strong>6 meses</strong>, conforme
                  obrigação legal estabelecida pelo Marco Civil da Internet (Lei 12.965/2014,
                  art. 15);
                </li>
                <li>
                  <strong>Registros de assinatura e cobrança:</strong> plano contratado, ciclo,
                  datas, valores e status de pagamento são retidos pelo prazo exigido pela
                  legislação fiscal e contábil aplicável, <strong>de forma desvinculada dos
                  demais dados pessoais</strong> eliminados, exclusivamente para cumprimento de
                  obrigação legal e regulatória (art. 7.º, inciso II, da LGPD).
                </li>
              </ul>
            </section>

            <section className="legal-section">
              <h2 className="legal-section-title">5. Importante</h2>
              <p>
                A exclusão de conta é <strong>irreversível</strong>. Caso deseje retomar o uso da
                plataforma após a exclusão, será necessário criar uma nova conta.
              </p>
              <p>
                Para o detalhamento completo sobre como tratamos dados pessoais, consulte a nossa{' '}
                <Link to="/privacy-policy" className="legal-contact-link">Política de Privacidade</Link>.
              </p>
            </section>

          </div>
        </div>
      </main>

      <footer className="legal-footer">
        <div className="legal-footer-inner">
          <span className="legal-footer-brand">TeuFit</span>
          <span className="legal-footer-sep" aria-hidden="true">·</span>
          <span className="legal-footer-copy">
            Exclusão de Conta — Última atualização: 24 de setembro de 2026
          </span>
          <span className="legal-footer-sep" aria-hidden="true">·</span>
          <Link to="/privacy-policy" className="legal-contact-link">Política de Privacidade</Link>
          <span className="legal-footer-sep" aria-hidden="true">·</span>
          <Link to="/login" className="legal-contact-link">Voltar para o login</Link>
        </div>
      </footer>
    </div>
  );
};

export default AccountDeletion;
