# Máquina de Post

Um simulador de Máquina de Post que roda direto no navegador. Você desenha a máquina na tela, arrasta os estados, liga as setas, digita uma palavra e assiste a fila sendo consumida passo a passo até a máquina aceitar ou rejeitar.

Foi feito por Dani, estudante de ciência da computação, porque desenhar máquina de Post no papel é bom até o momento em que você erra uma seta e precisa refazer tudo. Aqui dá para errar à vontade, apertar `Ctrl + Z` e seguir em frente.

Não precisa instalar nada, não tem servidor e não tem dependência. São três arquivos: `index.html`, `style.css` e `script.js`.

---

## Um minuto de teoria

A Máquina de Post é um modelo de computação com uma única estrutura de dados: **uma fila**. Ela tem poucas instruções:

- **Partida**: onde tudo começa.
- **Atribuição** (`X ← X·s`): coloca um símbolo `s` no final da fila.
- **Teste** (`X ← ler(X)`): tira o primeiro símbolo da fila e segue pela seta correspondente a ele. Se a fila estiver vazia, o símbolo lido é a palavra vazia (ε).
- **Aceita**: a palavra foi aceita.
- **Rejeita**: a palavra foi rejeitada.

Com isso dá para fazer bem mais do que parece, e é justamente por isso que ela é um bom objeto de estudo em computabilidade.

---

## O que dá para fazer aqui

**Construir a máquina**
- Adicionar estados pelos botões da barra de ferramentas (Partida, Atribuição, Teste, Aceita, Rejeita).
- Arrastar os estados pela tela e selecionar vários de uma vez, com o retângulo de seleção.
- Conectar estados no modo **Conectar** e depois ajustar a curva das setas arrastando a alça no meio delas.
- Reconectar uma seta arrastando a ponta dela para outro estado.
- Desfazer até 50 ações.

**Definir o alfabeto**
- Você escolhe os símbolos (Σ), o símbolo auxiliar (padrão `#`) e como a palavra vazia aparece (padrão `ε`).
- O painel avisa se algo não faz sentido: símbolo com mais de um caractere, símbolo repetido, auxiliar ou ε dentro do alfabeto.
- Ao confirmar, o simulador atualiza sozinho as setas e atribuições que usavam o auxiliar ou o ε antigos.

**Testar com uma palavra**
- Digite a palavra no painel **Fila** e clique em **Definir**.
- **Executar** roda sozinho, **Passo** avança uma instrução por vez, **Pausar** e **Resetar** fazem o que o nome diz.
- A velocidade vai de lenta (1 s por passo) até máxima.
- O estado atual fica destacado na tela e a fila é atualizada a cada passo.

**Validar antes de rodar**
O botão **Validar** (e a própria execução) confere se a máquina está em ordem:
- o alfabeto foi confirmado;
- existe exatamente uma instrução de partida;
- só o teste tem mais de uma saída;
- cada teste tem **uma** transição para **cada** símbolo do alfabeto (e para ε), sem repetir nem usar símbolo desconhecido;
- as atribuições usam símbolos que existem;
- a palavra de entrada só tem símbolos do alfabeto.

Se faltar uma transição, o painel de propriedades do teste marca a linha que está faltando. Se a máquina não tiver nenhum estado Aceita, aparece só um aviso, já que isso não impede de rodar.

**Extras**
- Menu **Exemplos…**, com máquinas prontas para começar com `0`, reconhecer palavras que contêm `1`, reconhecer `aⁿbⁿ` e reconhecer `aⁿbⁿcⁿ`.
- Botão **Nova máquina**, para começar do zero.
- Tema claro e escuro. O site respeita o tema do seu sistema e lembra a sua escolha.

---

## Como usar (passo a passo)

1. Abra o `index.html` no navegador. Um duplo clique já resolve.
2. No painel **Alfabeto**, digite os símbolos, por exemplo `0, 1`, e clique em **Confirmar**.
3. Monte a máquina: adicione os estados e use **Conectar** para ligar um ao outro. Nos testes, escolha para onde cada símbolo leva.
4. Digite uma palavra em **Fila** e clique em **Definir**.
5. Clique em **Validar** para ver se está tudo certo.
6. Clique em **Executar** ou vá no **Passo** para acompanhar de perto.

Se você só quer ver funcionando, escolha uma opção em **Exemplos…** e depois clique em **Executar**.

### Atalhos

| Atalho | O que faz |
|---|---|
| `Ctrl + Z` | Desfaz a última ação |
| `Ctrl + A` | Seleciona tudo |
| `Delete` ou `Backspace` | Exclui o que está selecionado |
| `Esc` | Cancela o modo Conectar e as ações em andamento |
| `Enter` (nos campos do alfabeto) | Confirma o alfabeto |

No Mac, `Cmd` funciona no lugar do `Ctrl`.

---

## E no celular?

Funciona também. A interface se adapta em telas pequenas:

- o canvas é maior que a tela, então você arrasta o fundo para navegar;
- arrastar um estado move o estado;
- tem um botão **Selecionar área**, que só aparece em telas de toque, para fazer a seleção múltipla com o dedo;
- o botão **Ajustar à tela** alterna entre reduzir o canvas para caber na tela e voltar ao tamanho real;
- os botões e campos ficam maiores, e os campos usam fonte de 16 px para o iOS não dar zoom quando você toca neles.

---

## Como o projeto está organizado

```
.
├── index.html   # estrutura da página e o botão de tema
├── style.css    # visual: paleta suave, tema claro/escuro e regras para celular
└── script.js    # toda a lógica: editor, execução, validação e desfazer
```

Algumas decisões que valem saber:

- **Sem bibliotecas.** É HTML, CSS e JavaScript puros.
- **Visual sóbrio.** Nada de branco puro: a paleta é de tons de papel no claro e de cinza no escuro, com bordas retas e fontes do próprio sistema.
- **As setas são SVG** e os estados são elementos `div`, o que deixa fácil arrastar, selecionar e redesenhar.
- **Todo o estado da máquina** (estados, setas, fila, alfabeto) vive em um único objeto no `script.js`, e o histórico de desfazer guarda cópias dele.

---

## Limitações

- O simulador não salva a máquina. Se você recarregar a página, ela some, e só o tema escolhido é lembrado. Exportar e importar a máquina em arquivo seria um bom próximo passo.
- Máquinas que nunca terminam (loops infinitos) vão rodar até você clicar em **Pausar**. Faz parte do jogo, mas vale o aviso.

---

## Ideias para o futuro

- Exportar e importar a máquina em JSON.
- Mais exemplos prontos (por exemplo, reconhecer `aⁿbⁿ`).
- Mostrar o histórico de configurações da execução em uma lista.
