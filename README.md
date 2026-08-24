# ⏱️ Cronômetro & Temporizador Pro

Aplicação web moderna, precisa e responsiva de **Cronômetro (Stopwatch)** e **Temporizador (Countdown Timer)** desenvolvida em HTML5, CSS3 puro (Vanilla CSS) e JavaScript ES6+.

---

## ✨ Funcionalidades

### ⏱️ Cronômetro (Stopwatch)
- **Alta Precisão**: Contagem sem *drift* temporal baseada em `performance.now()` e renderização suave a 60fps (`requestAnimationFrame`).
- **Anel Circular SVG Dinâmico**: Indicador visual circular sincronizado com a contagem de segundos.
- **Registro de Voltas (Laps)**:
  - Tabela com histórico detalhado (tempo da volta e tempo acumulado).
  - Identificação e destaque visual em tempo real da **volta mais rápida** (verde) e **mais lenta** (vermelho).
  - Cálculo automático de tempo médio das voltas.
- **Exportação & Compartilhamento**:
  - Download das voltas em formato `.csv`.
  - Cópia formatada para a área de transferência com notificação toast.

### ⏳ Temporizador (Countdown Timer)
- **Presets Rápidos**: 1 min, 3 min, 5 min, 10 min, 15 min e 25 min (Pomodoro).
- **Personalização Completa**: Campos de entrada para definir horas, minutos e segundos.
- **Alarme Sonoro**: Efeito de alarme ao término da contagem regressiva.

### 🎨 Design & Experiência do Usuário (UI/UX)
- **Dark Glassmorphism**: Interface moderna em tons escuros refinados com efeitos de vidro e luzes neon/glow.
- **100% Responsivo**: Adaptado para smartphones, tablets e computadores.
- **Sons Integrados (Web Audio API)**: Bips sintetizados nativamente sem necessidade de bibliotecas ou arquivos externos.
- **Atalhos de Teclado**:
  - `Espaço`: Iniciar / Pausar
  - `L`: Registrar Volta
  - `R`: Zerar / Redefinir
  - `T`: Alternar entre Cronômetro e Temporizador

---

## 🚀 Como Executar

Não requer instalação de dependências ou servidores complexos.

1. Clone ou baixe este repositório.
2. Abra o arquivo `index.html` em qualquer navegador web moderno.

---

## 🛠️ Tecnologias Utilizadas

- **HTML5** (Semântica, SEO e Acessibilidade ARIA)
- **CSS3** (Variáveis CSS, Glassmorphism, Flexbox/Grid e Animações)
- **JavaScript ES6+** (Orientado a objetos, Web Audio API, animação vetorial SVG)

---

## 📄 Licença

Este projeto está sob a licença [MIT](LICENSE).
