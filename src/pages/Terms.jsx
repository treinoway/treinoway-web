import { Link } from 'react-router-dom';
import { Scale } from 'lucide-react';

const Terms = () => {
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
              <Scale size={32} strokeWidth={2} />
            </div>
            <div className="legal-hero-text">
              <p className="legal-eyebrow">Termos e Condições de Uso</p>
              <h1 className="legal-title">Termos e Condições de Uso da TeuFit</h1>
              <p className="legal-last-updated">Última atualização: 1.º de setembro de 2026</p>
            </div>
          </div>

          <div className="legal-body">

            <section className="legal-section">
              <h2 className="legal-section-title">1. Aceitação e quem somos</h2>
              <p>
                Estes Termos e Condições de Uso (&ldquo;Termos&rdquo;) regulam o acesso e o uso da
                plataforma <strong>TeuFit</strong>, incluindo o aplicativo e a versão web (em conjunto,
                a &ldquo;Plataforma&rdquo; ou o &ldquo;Serviço&rdquo;).
              </p>
              <p>
                A Plataforma é operada por <strong>ADEILDO PEREIRA DOS SANTOS NETO LTDA</strong>, inscrita
                no CNPJ sob o n.º <strong>62.464.274/0001-99</strong>, com sede na Avenida Paulista, 1471,
                Sala 1110 CXPST 7753, Bela Vista, São Paulo/SP, CEP 01311-927 (&ldquo;TeuFit&rdquo;,
                &ldquo;nós&rdquo; ou &ldquo;Empresa&rdquo;).
              </p>
              <p>
                Ao criar uma conta ou utilizar a Plataforma, você concorda integralmente com estes Termos
                e com a nossa{' '}
                <Link to="/privacy-policy" className="legal-contact-link">Política de Privacidade</Link>.
                Caso não concorde com qualquer disposição aqui prevista, você não deve utilizar o Serviço.
              </p>
              <p>
                Estes Termos se aplicam a todos os usuários da Plataforma, incluindo personal trainers,
                alunos, nutricionistas e administradores de conta, com as obrigações específicas de cada
                perfil detalhadas nas seções seguintes.
              </p>
            </section>

            <section className="legal-section">
              <h2 className="legal-section-title">2. Definições</h2>
              <ul className="legal-list">
                <li><strong>TeuFit / Plataforma:</strong> o software, aplicativo e serviços web descritos
                  nestes Termos;</li>
                <li><strong>Personal trainer:</strong> profissional que utiliza a Plataforma para montar,
                  ajustar e acompanhar treinos de seus alunos;</li>
                <li><strong>Aluno:</strong> usuário que executa e registra treinos prescritos por um
                  personal trainer através da Plataforma;</li>
                <li><strong>Conta:</strong> o cadastro individual de um usuário na Plataforma;</li>
                <li><strong>Conteúdo do Usuário:</strong> treinos, anotações, fotos de progresso e demais
                  dados inseridos por um usuário na Plataforma;</li>
                <li><strong>Anamnese:</strong> formulário de saúde e histórico físico preenchido pelo
                  aluno a pedido do personal trainer;</li>
                <li><strong>Assinatura da Plataforma:</strong> o plano pago contratado pelo personal
                  trainer diretamente com a TeuFit para uso da Plataforma;</li>
                <li><strong>Assinatura do Aluno:</strong> o registro, dentro da Plataforma, da relação de
                  cobrança entre o aluno e o seu personal trainer — sem intermediação financeira da
                  TeuFit, conforme detalhado na Seção 4;</li>
                <li><strong>Recursos de IA:</strong> funcionalidades da Plataforma que utilizam modelos de
                  inteligência artificial para gerar sugestões de treino.</li>
              </ul>
            </section>

            <section className="legal-section">
              <h2 className="legal-section-title">3. Cadastro e conta</h2>
              <p>
                Para criar uma conta na condição de <strong>personal trainer</strong>, você deve ter pelo
                menos <strong>18 anos de idade</strong>: é o personal trainer quem contrata a Assinatura da
                Plataforma e presta serviço profissional aos seus alunos, o que exige capacidade civil
                plena. Na condição de <strong>aluno</strong>, o cadastro é permitido a partir dos{' '}
                <strong>13 anos de idade</strong>.
              </p>
              <p>
                Não é permitido o cadastro de crianças menores de 13 anos. Para adolescentes entre 13 e 17
                anos, o tratamento de dados pessoais se dá em execução de contrato e no melhor interesse do
                adolescente, conforme o art. 14, <em>caput</em>, da LGPD — nos mesmos termos da Seção 10 da
                nossa{' '}
                <Link to="/privacy-policy" className="legal-contact-link">Política de Privacidade</Link>.
              </p>
              <p>
                Você é responsável por fornecer informações verdadeiras, completas e atualizadas no
                cadastro e por manter a confidencialidade das suas credenciais de acesso. Todas as
                atividades realizadas na sua conta são de sua responsabilidade. Caso identifique uso não
                autorizado da sua conta, você deve notificar a TeuFit imediatamente pelo e-mail indicado
                na Seção 19.
              </p>
              <p>
                O cadastro na Plataforma é <strong>aberto</strong>: qualquer pessoa que atenda aos
                requisitos acima pode criar uma conta livremente. O que depende de um profissional é o{' '}
                <em>conteúdo</em> de treino — o aluno vincula-se ao seu personal trainer por meio de um
                código para receber os treinos prescritos e acompanhar sua evolução.
              </p>
            </section>

            <section className="legal-section">
              <h2 className="legal-section-title">4. O que a TeuFit é e o que não é</h2>
              <p>
                A TeuFit é uma <strong>ferramenta de software</strong> que permite ao personal trainer
                montar, organizar e acompanhar programas de treino, e ao aluno executar e registrar os
                treinos prescritos. A TeuFit <strong>não presta serviço de personal training, não
                prescreve, não supervisiona, não valida e não revisa</strong> os treinos criados pelos
                personal trainers na Plataforma. A TeuFit não é uma academia, um estúdio ou uma
                consultoria de treinamento físico.
              </p>
              <p>
                A TeuFit também <strong>não é intermediária da relação entre o aluno e o seu personal
                trainer</strong>, inclusive no aspecto financeiro. Para deixar isso inequívoco, existem
                dois fluxos financeiros distintos na Plataforma:
              </p>
              <ul className="legal-list">
                <li>
                  <strong>TeuFit → Personal trainer:</strong> o personal trainer contrata diretamente com
                  a TeuFit uma Assinatura da Plataforma, paga por meio do nosso processador de pagamentos
                  (Asaas), conforme Seção 9. Esse é o único fluxo em que dinheiro efetivamente passa pela
                  TeuFit;
                </li>
                <li>
                  <strong>Aluno → Personal trainer:</strong> a cobrança do aluno pelo serviço de
                  consultoria do personal trainer é combinada diretamente entre eles, fora da Plataforma.
                  A funcionalidade de &ldquo;Assinatura do Aluno&rdquo; dentro da TeuFit é apenas um
                  registro de controle — o próprio personal trainer marca manualmente o pagamento como
                  recebido. <strong>Nenhum valor financeiro do aluno passa pela TeuFit</strong> nesse
                  fluxo: a TeuFit não processa, não custodia, não garante e não intermedeia esse
                  pagamento, e não é parte do contrato entre aluno e personal trainer.
                </li>
              </ul>
              <p>
                A responsabilidade técnica pela prescrição de treinos e pelo acompanhamento do aluno é
                exclusiva do personal trainer, profissional autônomo e independente, conforme detalhado
                na Seção 5.
              </p>
            </section>

            <section className="legal-section">
              <h2 className="legal-section-title">5. Obrigações do personal trainer</h2>
              <ul className="legal-list">
                <li>
                  É o único responsável, técnica e profissionalmente, pela prescrição, adequação e
                  acompanhamento dos treinos oferecidos aos seus alunos;
                </li>
                <li>
                  Deve possuir a qualificação profissional exigida por lei para o exercício da atividade
                  (incluindo, quando aplicável, registro no Conselho Regional de Educação Física — CREF) e
                  observar as normas éticas e técnicas da sua profissão;
                </li>
                <li>
                  Mantém relação direta e independente com seus alunos, incluindo a cobrança pelos seus
                  serviços de consultoria, que ocorre fora da Plataforma, conforme Seção 4;
                </li>
                <li>
                  Deve tratar os dados de anamnese e saúde dos alunos com o devido cuidado e usá-los
                  apenas para a finalidade da consultoria contratada;
                </li>
                <li>
                  Ao utilizar Recursos de IA, deve revisar e validar as sugestões geradas antes de
                  disponibilizá-las a qualquer aluno, conforme Seção 8;
                </li>
                <li>
                  Deve cumprir a legislação aplicável à sua relação com os alunos, incluindo o Código de
                  Defesa do Consumidor e a LGPD, nos casos em que essas normas se apliquem à sua atuação
                  profissional.
                </li>
              </ul>
            </section>

            <section className="legal-section">
              <h2 className="legal-section-title">6. Obrigações do aluno</h2>
              <ul className="legal-list">
                <li>Fornecer informações verdadeiras e completas no formulário de anamnese;</li>
                <li>
                  Seguir as orientações do seu personal trainer e utilizar a Plataforma para registrar a
                  execução dos treinos de forma honesta;
                </li>
                <li>
                  Interromper imediatamente a atividade física e buscar orientação médica em caso de dor,
                  mal-estar ou qualquer sinal de risco à saúde, conforme Seção 7;
                </li>
                <li>Manter seus dados cadastrais atualizados;</li>
                <li>
                  Caso tenha entre 13 e 17 anos, contar com a ciência e a supervisão de um dos pais ou do
                  responsável legal para a prática dos treinos, conforme Seção 3.
                </li>
              </ul>
            </section>

            <section className="legal-section">
              <h2 className="legal-section-title">7. Saúde, risco físico e isenção de responsabilidade</h2>
              <p>
                A prática de atividade física envolve <strong>risco inerente de lesão</strong>, incluindo
                lesões musculares, articulares e, em casos raros, riscos cardiovasculares. Ao utilizar a
                Plataforma para executar treinos, o aluno declara estar em condições físicas adequadas
                para a prática de exercícios.
              </p>
              <p>
                Recomendamos fortemente que o aluno realize uma <strong>avaliação médica prévia</strong>
                antes de iniciar qualquer programa de treino, especialmente na presença de condições de
                saúde preexistentes, gravidez, ou após lesões recentes. O aluno deve{' '}
                <strong>interromper imediatamente</strong> a atividade diante de dor, tontura, falta de ar
                ou qualquer mal-estar, e buscar atendimento médico quando necessário.
              </p>
              <p>
                A <strong>responsabilidade técnica pela prescrição</strong> dos treinos — incluindo carga,
                volume, progressão e adequação ao perfil do aluno — é exclusivamente do personal trainer
                responsável, profissional autônomo e independente que não atua como preposto, empregado ou
                representante da TeuFit. A TeuFit não prescreve, não supervisiona, não valida e não revisa
                os treinos, conforme Seção 4, e não possui meios de avaliar clinicamente a adequação de um
                treino a um aluno específico.
              </p>
              <p>
                Dentro dos limites da lei aplicável, a TeuFit não se responsabiliza por lesões, danos à
                saúde ou quaisquer prejuízos decorrentes da execução de treinos prescritos por personal
                trainers ou da inobservância, pelo aluno, das orientações médicas e de segurança
                aplicáveis. Nada nesta seção exclui responsabilidades que não podem ser afastadas por lei,
                incluindo as previstas no Código de Defesa do Consumidor.
              </p>
            </section>

            <section className="legal-section">
              <h2 className="legal-section-title">8. Recursos de Inteligência Artificial</h2>
              <p>
                A Plataforma oferece Recursos de IA que auxiliam o personal trainer na criação de
                sugestões de treino, utilizando modelos de linguagem de terceiros. Esses recursos são{' '}
                <strong>assistivos</strong>: eles apoiam o trabalho do profissional, mas não o substituem.
              </p>
              <ul className="legal-list">
                <li>
                  As saídas geradas por modelos de IA podem conter erros, imprecisões, sugestões
                  inadequadas ou desatualizadas — são geradas por sistemas probabilísticos, não por
                  julgamento clínico ou profissional;
                </li>
                <li>
                  Toda sugestão gerada por IA <strong>exige revisão e validação por um profissional
                  habilitado</strong> (o personal trainer) antes de ser utilizada com qualquer aluno;
                </li>
                <li>
                  A TeuFit não garante que as saídas de IA sejam adequadas, seguras ou completas para um
                  caso específico, e não se responsabiliza por danos decorrentes do uso de sugestões de IA
                  que não tenham sido revisadas e validadas pelo profissional responsável;
                </li>
                <li>
                  O uso de Recursos de IA está sujeito aos limites de uso vigentes de cada plano de
                  Assinatura da Plataforma, divulgados na própria Plataforma;
                </li>
                <li>
                  Os dados utilizados para gerar sugestões de IA são tratados conforme a nossa{' '}
                  <Link to="/privacy-policy" className="legal-contact-link">Política de Privacidade</Link>.
                </li>
              </ul>
            </section>

            <section className="legal-section">
              <h2 className="legal-section-title">9. Planos, pagamento e cobrança</h2>
              <p>
                A TeuFit oferece diferentes planos de Assinatura da Plataforma para personal trainers, com
                recursos e limites que variam entre eles. Os valores vigentes de cada plano são os
                divulgados na Plataforma no momento da contratação ou da renovação, e não são
                reproduzidos nestes Termos justamente para evitar divergência com o preço efetivamente
                praticado.
              </p>
              <p>
                O pagamento das Assinaturas da Plataforma é processado por meio do nosso parceiro de
                pagamentos <strong>Asaas</strong>, nas modalidades PIX, cartão de crédito ou boleto
                bancário, em ciclo mensal ou anual conforme escolhido pelo personal trainer. A renovação é{' '}
                <strong>automática</strong> ao final de cada ciclo, salvo cancelamento prévio conforme
                Seção 10.
              </p>
              <p>
                Em caso de falha ou atraso no pagamento, a Plataforma concede um{' '}
                <strong>prazo de tolerância de 7 (sete) dias</strong> antes de restringir o acesso aos
                recursos do plano contratado. Persistindo a inadimplência após esse prazo, a TeuFit poderá
                suspender ou rebaixar a conta ao plano gratuito, sem prejuízo dos valores já devidos.
              </p>
              <p>
                A TeuFit pode alterar os valores dos planos a qualquer momento, mediante{' '}
                <strong>aviso prévio de 30 (trinta) dias</strong> ao personal trainer. Caso não concorde
                com o novo valor, o personal trainer poderá cancelar sua Assinatura da Plataforma antes da
                data de vigência do reajuste, sem multa.
              </p>
              <p>
                Reforçamos: a Assinatura do Aluno é um registro de controle de cobrança entre aluno e
                personal trainer, sem qualquer intermediação financeira da TeuFit. Nenhuma disposição
                desta seção se aplica a valores cobrados pelo personal trainer do seu aluno — ver Seção 4.
              </p>
            </section>

            <section className="legal-section">
              <h2 className="legal-section-title">10. Cancelamento e reembolso</h2>
              <p>
                O personal trainer pode cancelar sua Assinatura da Plataforma a qualquer momento pela
                própria Plataforma. Em conformidade com o art. 49 do Código de Defesa do Consumidor, o
                usuário que contratar uma Assinatura da Plataforma pela internet tem direito de{' '}
                <strong>arrependimento no prazo de 7 (sete) dias corridos</strong> a contar da contratação,
                com direito a reembolso integral do valor pago, sem necessidade de justificativa.
              </p>
              <p>
                Após esse prazo de 7 dias, o cancelamento passa a produzir efeitos apenas{' '}
                <strong>ao final do ciclo de cobrança em curso</strong> — mensal ou anual, conforme o plano
                contratado —, sem reembolso proporcional pelo período já pago e não utilizado. O acesso aos
                recursos do plano permanece ativo até o fim desse ciclo.
              </p>
              <p>
                Cancelamentos e eventuais reembolsos relativos à cobrança do aluno pelo personal trainer
                não são regidos por estes Termos, já que a TeuFit não é parte nem intermediária financeira
                dessa relação, conforme Seção 4. Essas questões devem ser resolvidas diretamente entre
                aluno e personal trainer.
              </p>
            </section>

            <section className="legal-section">
              <h2 className="legal-section-title">11. Conteúdo do usuário e propriedade intelectual</h2>
              <p>
                Você mantém a titularidade sobre o Conteúdo do Usuário que inserir na Plataforma (treinos
                elaborados, anotações, fotos de progresso, entre outros). Ao inserir esse conteúdo, você
                concede à TeuFit uma licença não exclusiva, mundial e gratuita para hospedar, processar,
                reproduzir e exibir esse conteúdo estritamente na medida necessária para operar o Serviço.
              </p>
              <p>
                A Plataforma, seu software, design, marca <strong>TeuFit</strong>, logotipo e demais
                elementos de propriedade intelectual pertencem à TeuFit ou aos seus licenciadores. É vedado
                copiar, modificar, fazer engenharia reversa, redistribuir ou comercializar a Plataforma ou
                qualquer parte dela sem autorização expressa da TeuFit.
              </p>
            </section>

            <section className="legal-section">
              <h2 className="legal-section-title">12. Uso aceitável</h2>
              <p>Ao usar a Plataforma, você concorda em não:</p>
              <ul className="legal-list">
                <li>Se passar por outra pessoa ou fornecer informações falsas de identidade;</li>
                <li>
                  Inserir conteúdo ilegal, ofensivo, discriminatório ou que viole direitos de terceiros;
                </li>
                <li>
                  Tentar acessar áreas restritas, contornar controles de segurança ou comprometer a
                  integridade da Plataforma;
                </li>
                <li>
                  Realizar coleta automatizada de dados (scraping) ou uso abusivo dos Recursos de IA fora
                  dos limites do seu plano;
                </li>
                <li>Compartilhar suas credenciais de acesso com terceiros;</li>
                <li>
                  Utilizar a Plataforma para finalidade distinta do acompanhamento de treinos entre
                  personal trainer e aluno.
                </li>
              </ul>
            </section>

            <section className="legal-section">
              <h2 className="legal-section-title">13. Suspensão e encerramento</h2>
              <p>
                A TeuFit pode suspender ou encerrar contas que violem estes Termos, forneçam informações
                falsas, pratiquem fraude, ou permaneçam inadimplentes após o prazo de tolerância previsto
                na Seção 9. Sempre que possível, notificaremos o usuário antes da suspensão ou do
                encerramento.
              </p>
              <p>
                Você também pode encerrar sua conta a qualquer momento. O tratamento e a retenção dos
                dados após o encerramento seguem o disposto na nossa{' '}
                <Link to="/privacy-policy" className="legal-contact-link">Política de Privacidade</Link>.
              </p>
            </section>

            <section className="legal-section">
              <h2 className="legal-section-title">14. Disponibilidade e alterações do serviço</h2>
              <p>
                A TeuFit desenvolve a Plataforma de forma contínua: funcionalidades podem ser
                <strong> adicionadas, alteradas ou removidas</strong> ao longo do tempo, à medida que o
                Serviço evolui. A <strong>disponibilidade do Serviço não é garantida de forma contínua,
                ininterrupta ou livre de erros</strong>, podendo haver indisponibilidades decorrentes de
                manutenção, falhas técnicas ou de fatores fora do controle razoável da TeuFit.
              </p>
              <p>
                A TeuFit pode realizar manutenções programadas ou emergenciais, e pode modificar ou
                descontinuar funcionalidades da Plataforma a qualquer momento, buscando, sempre que
                razoável, comunicar o usuário com antecedência.
              </p>
            </section>

            <section className="legal-section">
              <h2 className="legal-section-title">15. Limitação de responsabilidade</h2>
              <p>
                Nos limites permitidos pela legislação aplicável, a TeuFit não se responsabiliza por danos
                indiretos, lucros cessantes, ou pelos resultados da execução de treinos prescritos por
                personal trainers, conforme detalhado na Seção 7. A responsabilidade total da TeuFit
                perante um personal trainer, quando aplicável, fica limitada aos valores efetivamente
                pagos à TeuFit a título de Assinatura da Plataforma nos 12 (doze) meses anteriores ao
                evento que originou a reclamação.
              </p>
              <p>
                Nada nesta seção exclui ou limita direitos que não podem ser afastados por lei, incluindo
                os direitos do consumidor previstos no Código de Defesa do Consumidor, nem exclui
                responsabilidade por dolo ou culpa grave da TeuFit.
              </p>
            </section>

            <section className="legal-section">
              <h2 className="legal-section-title">16. Privacidade</h2>
              <p>
                O tratamento de dados pessoais na Plataforma é regido pela nossa{' '}
                <Link to="/privacy-policy" className="legal-contact-link">Política de Privacidade</Link>,
                que integra estes Termos por referência e detalha quais dados coletamos, para que
                finalidade, com quem compartilhamos e quais direitos você possui como titular, em
                conformidade com a LGPD.
              </p>
            </section>

            <section className="legal-section">
              <h2 className="legal-section-title">17. Alterações destes Termos</h2>
              <p>
                Podemos atualizar estes Termos periodicamente para refletir mudanças no Serviço, na
                legislação ou nas nossas práticas de negócio. A data da última revisão está indicada no
                topo deste documento.
              </p>
              <p>
                Alterações significativas serão comunicadas por e-mail ou por notificação dentro da
                Plataforma com pelo menos 15 dias de antecedência. O uso continuado da Plataforma após a
                data de vigência das alterações indica a aceitação dos Termos atualizados.
              </p>
            </section>

            <section className="legal-section">
              <h2 className="legal-section-title">18. Lei aplicável e foro</h2>
              <p>
                Estes Termos são regidos pelas leis da República Federativa do Brasil, incluindo o Código
                de Defesa do Consumidor, o Marco Civil da Internet (Lei 12.965/2014) e a LGPD (Lei
                13.709/2018), no que forem aplicáveis.
              </p>
              <p>
                Fica eleito o foro da Comarca de São Paulo/SP para dirimir quaisquer controvérsias
                decorrentes destes Termos, ressalvada a prerrogativa do consumidor de acionar o foro do
                seu próprio domicílio, conforme assegurado pelo Código de Defesa do Consumidor.
              </p>
            </section>

            <section className="legal-section">
              <h2 className="legal-section-title">19. Contato</h2>
              <p>
                Para dúvidas sobre estes Termos, entre em contato conosco:
              </p>
              <div className="legal-contact-block">
                <p><strong>ADEILDO PEREIRA DOS SANTOS NETO LTDA</strong></p>
                <p>CNPJ: 62.464.274/0001-99</p>
                <p>Avenida Paulista, 1471, Sala 1110 CXPST 7753, Bela Vista, São Paulo/SP, CEP 01311-927</p>
                <p>
                  E-mail:{' '}
                  <a
                    href="mailto:contato@teufit.com.br"
                    className="legal-contact-link"
                  >
                    contato@teufit.com.br
                  </a>
                </p>
              </div>
            </section>

          </div>
        </div>
      </main>

      <footer className="legal-footer">
        <div className="legal-footer-inner">
          <span className="legal-footer-brand">TeuFit</span>
          <span className="legal-footer-sep" aria-hidden="true">·</span>
          <span className="legal-footer-copy">
            Termos e Condições de Uso — Última atualização: 1.º de setembro de 2026
          </span>
          <span className="legal-footer-sep" aria-hidden="true">·</span>
          <Link to="/privacy-policy" className="legal-contact-link">Política de Privacidade</Link>
          <span className="legal-footer-sep" aria-hidden="true">·</span>
          <Link to="/account-deletion" className="legal-contact-link">Exclusão de Conta</Link>
          <span className="legal-footer-sep" aria-hidden="true">·</span>
          <Link to="/login" className="legal-contact-link">Voltar para o login</Link>
        </div>
      </footer>
    </div>
  );
};

export default Terms;
