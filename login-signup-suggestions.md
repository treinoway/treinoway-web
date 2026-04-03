# Login & Signup — Sugestões de Redesign

**Objetivos:** moderno e minimalista, sem scroll, excelente primeira impressão.

---

## Problemas Críticos

### 1. Signup causa scroll em viewports abaixo de ~700px
Soma de conteúdo estimada (~700px) excede o espaço útil de iPhones comuns com barra de browser visível.

**Causas:**
- Logo de 120px no mobile
- Subtítulo desnecessário no header
- 3 campos de formulário
- Divider + botão Google + footer

**Soluções:**
- Logo: 120px → **64-80px** max no mobile
- Eliminar subtítulo do auth-header
- **Eliminar campo "Confirmar Senha"** — desnecessário quando há toggle de visibilidade. Padrão datado de 2010.

### 2. Sem link "Esqueci minha senha" no Login
Omissão funcional grave. Usuários que esquecem a senha ficam sem saída.

---

## Problemas Médios

### 3. Layout "gradiente + card branco" é genérico
Parece template Bootstrap de 2018. Sem personalidade ou relação com fitness/treinamento. Poderia ser um app bancário ou qualquer SaaS.

### 4. Logo desproporcional ao espaço disponível
Apps modernos (Notion, Linear, Figma) usam 32-48px nas telas de auth. 120px no mobile é caro demais verticalmente.

### 5. Hierarquia visual plana entre os dois CTAs
"Entrar" (email) e "Entrar com Google" têm o mesmo tamanho e peso visual. O usuário não sabe qual é o caminho principal.

### 6. `align-items: flex-start` no mobile
Card grudado no topo parece página incompleta. Desktop centraliza, mobile não — inconsistência perceptível.

---

## Sugestões em Ordem de Impacto

| # | Mudança | Impacto | Esforço |
|---|---------|---------|---------|
| 1 | Eliminar campo "Confirmar Senha" | Alto | Baixo |
| 2 | Adicionar link "Esqueci minha senha" | Alto | Baixo |
| 3 | Reduzir logo para 64px no mobile | Alto | Baixo |
| 4 | Eliminar subtítulo do auth-header | Médio | Baixo |
| 5 | Inverter hierarquia: Google primeiro, formulário depois | Alto | Baixo |
| 6 | Repensar layout visual (sair do padrão gradiente+card) | Alto | Médio |
| 7 | Animação de entrada sutil no card (fade-in + translate-y, 200ms) | Médio | Baixo |

---

## Alternativas de Layout

- **Fundo branco limpo** (estilo Vercel/Linear) — mais minimalista, elimina o padding duplo (page + card), mais espaço vertical disponível
- **Split-screen desktop** — área de branding à esquerda (ilustração/tagline de fitness), formulário à direita. Colapsa para só o formulário no mobile
- **Full-bleed com elemento visual** — imagem ou ilustração de fitness como fundo com overlay, card por cima com glassmorphism ou sólido

---

## Pontuação UX Atual: 5/10

**Positivos:** inputs acessíveis, labels corretos, loading states, toggle de visibilidade, validação inline.

**Negativos:** Signup quebra o objetivo "sem scroll" em dispositivos comuns; layout sem personalidade; ausência de "esqueci senha"; campo de confirmação de senha adiciona atrito desnecessário no caminho crítico de aquisição.

---

*Gerado por design-critic em 2026-04-02*
