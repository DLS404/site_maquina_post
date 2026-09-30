
/* =========================================================
   ELEMENTOS HTML
   ========================================================= */

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const tipoOperacao =
    document.getElementById("tipoOperacao");

const btnAdicionar =
    document.getElementById("btnAdicionar");

const btnConectar =
    document.getElementById("btnConectar");

const btnSelecionar =
    document.getElementById("btnSelecionar");

const btnExcluir =
    document.getElementById("btnExcluir");

const btnInicio =
    document.getElementById("btnInicio");

const btnFim =
    document.getElementById("btnFim");

const btnNova =
    document.getElementById("btnNova");

const btnExemplo =
    document.getElementById("btnExemplo");

const btnExecutar =
    document.getElementById("btnExecutar");

const btnPasso =
    document.getElementById("btnPasso");

const btnPausar =
    document.getElementById("btnPausar");

const btnReiniciar =
    document.getElementById("btnReiniciar");

const entradaFila =
    document.getElementById("entradaFila");

const btnDefinirFila =
    document.getElementById("btnDefinirFila");

const filaVisual =
    document.getElementById("filaVisual");

const operacaoAtualHTML =
    document.getElementById("operacaoAtual");

const statusExecucaoHTML =
    document.getElementById("statusExecucao");

const quantidadeOperacoesHTML =
    document.getElementById("quantidadeOperacoes");

const informacoesOperacao =
    document.getElementById("informacoesOperacao");

const mensagens =
    document.getElementById("mensagens");

const modoAtualHTML =
    document.getElementById("modoAtual");


/* =========================================================
   CONFIGURAÇÕES VISUAIS
   ========================================================= */

const LARGURA_OPERACAO = 150;
const ALTURA_OPERACAO = 70;

const RAIO_PONTA_SETA = 7;


/* =========================================================
   MODELO DA MÁQUINA
   ========================================================= */

const maquina = {

    operacoes: [],

    inicio: null,

    fim: null

};


/* =========================================================
   ESTADO DO EDITOR
   ========================================================= */

let proximoId = 1;

let modo = "selecionar";

let operacaoSelecionada = null;

let operacaoArrastada = null;

let deslocamentoX = 0;

let deslocamentoY = 0;

let origemConexao = null;


/* =========================================================
   ESTADO DA SIMULAÇÃO
   ========================================================= */

let fila = [];

let filaInicial = [];

let operacaoAtual = null;

let executando = false;

let intervaloExecucao = null;


/* =========================================================
   AJUSTE DO CANVAS
   ========================================================= */

function ajustarCanvas() {

    const rect =
        canvas.getBoundingClientRect();

    const dpr =
        window.devicePixelRatio || 1;

    canvas.width =
        Math.round(rect.width * dpr);

    canvas.height =
        Math.round(rect.height * dpr);

    ctx.setTransform(
        dpr,
        0,
        0,
        dpr,
        0,
        0
    );

    desenhar();
}


window.addEventListener(
    "resize",
    ajustarCanvas
);


/* =========================================================
   UTILITÁRIOS DO CANVAS
   ========================================================= */

function obterPosicaoMouse(event) {

    const rect =
        canvas.getBoundingClientRect();

    return {

        x: event.clientX - rect.left,

        y: event.clientY - rect.top

    };
}


function obterOperacaoNaPosicao(x, y) {

    for (
        let i = maquina.operacoes.length - 1;
        i >= 0;
        i--
    ) {

        const operacao =
            maquina.operacoes[i];

        if (

            x >= operacao.x &&

            x <=
                operacao.x +
                LARGURA_OPERACAO &&

            y >= operacao.y &&

            y <=
                operacao.y +
                ALTURA_OPERACAO

        ) {

            return operacao;

        }

    }

    return null;
}


/* =========================================================
   CRIAÇÃO DE OPERAÇÕES
   ========================================================= */

function criarOperacao(x, y, tipo) {

    const operacao = {

        id: proximoId++,

        tipo: tipo,

        x: x - LARGURA_OPERACAO / 2,

        y: y - ALTURA_OPERACAO / 2,

        transicoes: []

    };


    maquina.operacoes.push(
        operacao
    );


    atualizarInterface();

    desenhar();

    mostrarMensagem(
        `Operação ${operacao.id} criada.`
    );

    return operacao;
}


/* =========================================================
   NOME DOS TIPOS
   ========================================================= */

function nomeTipo(tipo) {

    const nomes = {

        entrada: "Entrada",

        escrever: "Escrever",

        apagar: "Apagar",

        testar: "Testar",

        parar: "Parar"

    };


    return nomes[tipo] || tipo;
}


/* =========================================================
   DESENHO DA MÁQUINA
   ========================================================= */

function desenhar() {

    const largura =
        canvas.clientWidth;

    const altura =
        canvas.clientHeight;


    ctx.clearRect(
        0,
        0,
        largura,
        altura
    );


    desenharGrade(
        largura,
        altura
    );


    /*
     * Primeiro desenhamos as conexões.
     * Assim elas ficam atrás das operações.
     */

    for (
        const origem
        of maquina.operacoes
    ) {

        for (
            const destinoId
            of origem.transicoes
        ) {

            const destino =
                maquina.operacoes.find(
                    operacao =>
                        operacao.id === destinoId
                );


            if (destino) {

                desenharConexao(
                    origem,
                    destino
                );

            }

        }

    }


    /*
     * Depois desenhamos as operações.
     */

    for (
        const operacao
        of maquina.operacoes
    ) {

        desenharOperacao(
            operacao
        );

    }


    /*
     * Se estivermos criando uma conexão,
     * desenhamos uma linha temporária.
     */

    if (origemConexao) {

        desenharConexaoTemporaria();

    }

}


/* =========================================================
   GRADE
   ========================================================= */

function desenharGrade(
    largura,
    altura
) {

    const tamanho = 25;

    ctx.save();

    ctx.strokeStyle = "#eeeeee";

    ctx.lineWidth = 1;


    for (
        let x = 0;
        x < largura;
        x += tamanho
    ) {

        ctx.beginPath();

        ctx.moveTo(x, 0);

        ctx.lineTo(x, altura);

        ctx.stroke();

    }


    for (
        let y = 0;
        y < altura;
        y += tamanho
    ) {

        ctx.beginPath();

        ctx.moveTo(0, y);

        ctx.lineTo(largura, y);

        ctx.stroke();

    }


    ctx.restore();

}


/* =========================================================
   DESENHAR OPERAÇÃO
   ========================================================= */

function desenharOperacao(
    operacao
) {

    let preenchimento =
        "#ffffff";


    let borda =
        "#333333";


    let espessura =
        2;


    /*
     * Operação selecionada
     */

    if (
        operacao ===
        operacaoSelecionada
    ) {

        preenchimento =
            "#e7f1ff";

        borda =
            "#2878d0";

        espessura =
            3;

    }


    /*
     * Operação atual
     */

    if (
        operacao ===
        operacaoAtual
    ) {

        preenchimento =
            "#fff2b8";

        borda =
            "#d69e00";

        espessura =
            4;

    }


    /*
     * Início
     */

    if (
        maquina.inicio ===
        operacao.id
    ) {

        borda =
            "#238636";

        espessura =
            4;

    }


    /*
     * Fim
     */

    if (
        maquina.fim ===
        operacao.id
    ) {

        borda =
            "#b42318";

        espessura =
            4;

    }


    ctx.save();


    ctx.beginPath();

    ctx.roundRect(

        operacao.x,

        operacao.y,

        LARGURA_OPERACAO,

        ALTURA_OPERACAO,

        8

    );


    ctx.fillStyle =
        preenchimento;

    ctx.fill();


    ctx.strokeStyle =
        borda;

    ctx.lineWidth =
        espessura;

    ctx.stroke();


    /*
     * Identificador
     */

    ctx.fillStyle =
        "#222";

    ctx.font =
        "bold 15px Arial";

    ctx.fillText(

        `#${operacao.id}`,

        operacao.x + 10,

        operacao.y + 22

    );


    /*
     * Nome da operação
     */

    ctx.font =
        "14px Arial";

    ctx.fillText(

        nomeTipo(
            operacao.tipo
        ),

        operacao.x + 10,

        operacao.y + 47

    );


    /*
     * Indicador de início
     */

    if (
        maquina.inicio ===
        operacao.id
    ) {

        ctx.font =
            "bold 11px Arial";

        ctx.fillStyle =
            "#238636";

        ctx.fillText(

            "INÍCIO",

            operacao.x + 90,

            operacao.y + 20

        );

    }


    /*
     * Indicador de fim
     */

    if (
        maquina.fim ===
        operacao.id
    ) {

        ctx.font =
            "bold 11px Arial";

        ctx.fillStyle =
            "#b42318";

        ctx.fillText(

            "FIM",

            operacao.x + 110,

            operacao.y + 20

        );

    }


    ctx.restore();

}


/* =========================================================
   CONEXÕES
   ========================================================= */

function obterCentro(
    operacao
) {

    return {

        x:
            operacao.x +
            LARGURA_OPERACAO / 2,

        y:
            operacao.y +
            ALTURA_OPERACAO / 2

    };

}


function desenharConexao(
    origem,
    destino
) {

    const pontoOrigem =
        obterCentro(origem);

    const pontoDestino =
        obterCentro(destino);


    /*
     * Calcula a direção da linha.
     */

    const dx =
        pontoDestino.x -
        pontoOrigem.x;

    const dy =
        pontoDestino.y -
        pontoOrigem.y;


    const distancia =
        Math.sqrt(
            dx * dx +
            dy * dy
        );


    if (distancia === 0) {
        return;
    }


    const ux =
        dx / distancia;

    const uy =
        dy / distancia;


    /*
     * Começa e termina próximo às caixas.
     */

    const inicioX =
        pontoOrigem.x +
        ux * 35;

    const inicioY =
        pontoOrigem.y +
        uy * 25;


    const fimX =
        pontoDestino.x -
        ux * 35;

    const fimY =
        pontoDestino.y -
        uy * 25;


    ctx.save();


    ctx.beginPath();

    ctx.moveTo(
        inicioX,
        inicioY
    );

    ctx.lineTo(
        fimX,
        fimY
    );


    ctx.strokeStyle =
        "#555";

    ctx.lineWidth =
        2;

    ctx.stroke();


    /*
     * Desenha a ponta da seta.
     */

    const angulo =
        Math.atan2(
            fimY - inicioY,
            fimX - inicioX
        );


    ctx.beginPath();

    ctx.moveTo(
        fimX,
        fimY
    );

    ctx.lineTo(

        fimX -
        RAIO_PONTA_SETA *
        Math.cos(
            angulo - Math.PI / 6
        ),

        fimY -
        RAIO_PONTA_SETA *
        Math.sin(
            angulo - Math.PI / 6
        )

    );


    ctx.lineTo(

        fimX -
        RAIO_PONTA_SETA *
        Math.cos(
            angulo + Math.PI / 6
        ),

        fimY -
        RAIO_PONTA_SETA *
        Math.sin(
            angulo + Math.PI / 6
        )

    );


    ctx.closePath();


    ctx.fillStyle =
        "#555";

    ctx.fill();


    ctx.restore();

}


/* =========================================================
   CONEXÃO TEMPORÁRIA
   ========================================================= */

let ultimaPosicaoMouse = {
    x: 0,
    y: 0
};


function desenharConexaoTemporaria() {

    const centro =
        obterCentro(
            origemConexao
        );


    ctx.save();


    ctx.beginPath();

    ctx.moveTo(
        centro.x,
        centro.y
    );

    ctx.lineTo(
        ultimaPosicaoMouse.x,
        ultimaPosicaoMouse.y
    );


    ctx.strokeStyle =
        "#2878d0";

    ctx.lineWidth =
        2;

    ctx.setLineDash([
        6,
        6
    ]);

    ctx.stroke();

    ctx.restore();

}


/* =========================================================
   EVENTOS DO MOUSE
   ========================================================= */

canvas.addEventListener(
    "mousedown",
    function (event) {

        const posicao =
            obterPosicaoMouse(
                event
            );


        ultimaPosicaoMouse =
            posicao;


        const operacao =
            obterOperacaoNaPosicao(
                posicao.x,
                posicao.y
            );


        /*
         * MODO CONEXÃO
         */

        if (
            modo ===
            "conectar"
        ) {

            if (!operacao) {
                return;
            }


            if (
                !origemConexao
            ) {

                origemConexao =
                    operacao;

                mostrarMensagem(
                    `Operação ${operacao.id} selecionada como origem.`
                );

            } else {

                if (
                    origemConexao.id ===
                    operacao.id
                ) {

                    mostrarMensagem(
                        "A origem e o destino não podem ser a mesma operação."
                    );

                    return;

                }


                /*
                 * Evita conexões duplicadas.
                 */

                if (
                    !origemConexao.transicoes.includes(
                        operacao.id
                    )
                ) {

                    origemConexao.transicoes.push(
                        operacao.id
                    );

                    mostrarMensagem(
                        `Conexão criada: ${origemConexao.id} → ${operacao.id}.`
                    );

                } else {

                    mostrarMensagem(
                        "Essa conexão já existe."
                    );

                }


                origemConexao =
                    null;

                desenhar();

            }

            return;
        }


        /*
         * MODO EXCLUSÃO
         */

        if (
            modo ===
            "excluir"
        ) {

            if (operacao) {

                excluirOperacao(
                    operacao
                );

            }

            return;
        }


        /*
         * MODO DEFINIR INÍCIO
         */

        if (
            modo ===
            "inicio"
        ) {

            if (operacao) {

                maquina.inicio =
                    operacao.id;

                mostrarMensagem(
                    `Operação ${operacao.id} definida como início.`
                );

                desenhar();

                atualizarInterface();

            }

            return;
        }


        /*
         * MODO DEFINIR FIM
         */

        if (
            modo ===
            "fim"
        ) {

            if (operacao) {

                maquina.fim =
                    operacao.id;

                mostrarMensagem(
                    `Operação ${operacao.id} definida como fim.`
                );

                desenhar();

                atualizarInterface();

            }

            return;
        }


        /*
         * MODO SELECIONAR
         */

        if (
            modo ===
            "selecionar"
        ) {

            if (operacao) {

                operacaoSelecionada =
                    operacao;


                operacaoArrastada =
                    operacao;


                deslocamentoX =
                    posicao.x -
                    operacao.x;


                deslocamentoY =
                    posicao.y -
                    operacao.y;


                atualizarInformacoesOperacao();

                desenhar();

            } else {

                operacaoSelecionada =
                    null;

                atualizarInformacoesOperacao();

                desenhar();

            }

        }

    }
);


canvas.addEventListener(
    "mousemove",
    function (event) {

        const posicao =
            obterPosicaoMouse(
                event
            );


        ultimaPosicaoMouse =
            posicao;


        /*
         * Atualiza linha temporária.
         */

        if (
            origemConexao
        ) {

            desenhar();

        }


        /*
         * Move operação.
         */

        if (
            operacaoArrastada &&
            modo ===
                "selecionar"
        ) {

            operacaoArrastada.x =
                posicao.x -
                deslocamentoX;


            operacaoArrastada.y =
                posicao.y -
                deslocamentoY;


            limitarOperacaoAoCanvas(
                operacaoArrastada
            );


            desenhar();

        }

    }
);


canvas.addEventListener(
    "mouseup",
    function () {

        operacaoArrastada =
            null;

    }
);


/* =========================================================
   LIMITAR OPERAÇÃO AO CANVAS
   ========================================================= */

function limitarOperacaoAoCanvas(
    operacao
) {

    const largura =
        canvas.clientWidth;

    const altura =
        canvas.clientHeight;


    operacao.x =
        Math.max(
            0,
            Math.min(
                operacao.x,
                largura -
                    LARGURA_OPERACAO
            )
        );


    operacao.y =
        Math.max(
            0,
            Math.min(
                operacao.y,
                altura -
                    ALTURA_OPERACAO
            )
        );

}


/* =========================================================
   EXCLUSÃO
   ========================================================= */

function excluirOperacao(
    operacao
) {

    const id =
        operacao.id;


    /*
     * Remove a operação.
     */

    maquina.operacoes =
        maquina.operacoes.filter(
            item =>
                item.id !== id
        );


    /*
     * Remove conexões que
     * apontavam para ela.
     */

    for (
        const outra
        of maquina.operacoes
    ) {

        outra.transicoes =
            outra.transicoes.filter(
                destinoId =>
                    destinoId !== id
            );

    }


    /*
     * Remove início/fim
     * caso necessário.
     */

    if (
        maquina.inicio === id
    ) {

        maquina.inicio =
            null;

    }


    if (
        maquina.fim === id
    ) {

        maquina.fim =
            null;

    }


    if (
        operacaoSelecionada ===
        operacao
    ) {

        operacaoSelecionada =
            null;

    }


    if (
        operacaoAtual ===
        operacao
    ) {

        operacaoAtual =
            null;

    }


    mostrarMensagem(
        `Operação ${id} excluída.`
    );


    atualizarInterface();

    atualizarInformacoesOperacao();

    desenhar();

}


/* =========================================================
   MODOS DO EDITOR
   ========================================================= */

function mudarModo(
    novoModo
) {

    modo =
        novoModo;


    origemConexao =
        null;


    /*
     * Remove classes dos botões.
     */

    btnConectar.classList.remove(
        "ativo"
    );

    btnSelecionar.classList.remove(
        "ativo"
    );

    btnExcluir.classList.remove(
        "ativo"
    );

    btnInicio.classList.remove(
        "ativo"
    );

    btnFim.classList.remove(
        "ativo"
    );


    /*
     * Atualiza botão ativo.
     */

    if (
        novoModo ===
        "conectar"
    ) {

        btnConectar.classList.add(
            "ativo"
        );

    }


    if (
        novoModo ===
        "selecionar"
    ) {

        btnSelecionar.classList.add(
            "ativo"
        );

    }


    if (
        novoModo ===
        "excluir"
    ) {

        btnExcluir.classList.add(
            "ativo"
        );

    }


    if (
        novoModo ===
        "inicio"
    ) {

        btnInicio.classList.add(
            "ativo"
        );

    }


    if (
        novoModo ===
        "fim"
    ) {

        btnFim.classList.add(
            "ativo"
        );

    }


    const nomes = {

        selecionar:
            "Selecionar",

        conectar:
            "Conectar",

        excluir:
            "Excluir",

        inicio:
            "Definir início",

        fim:
            "Definir fim"

    };


    modoAtualHTML.textContent =
        `Modo: ${nomes[novoModo]}`;

}


/* =========================================================
   BOTÕES DO EDITOR
   ========================================================= */

btnAdicionar.addEventListener(
    "click",
    function () {

        const tipo =
            tipoOperacao.value;


        const largura =
            canvas.clientWidth;

        const altura =
            canvas.clientHeight;


        /*
         * Cria no centro da área.
         */

        criarOperacao(
            largura / 2,
            altura / 2,
            tipo
        );

    }
);


btnSelecionar.addEventListener(
    "click",
    function () {

        mudarModo(
            "selecionar"
        );

    }
);


btnConectar.addEventListener(
    "click",
    function () {

        mudarModo(
            "conectar"
        );

        mostrarMensagem(
            "Clique na operação de origem e depois na operação de destino."
        );

    }
);


btnExcluir.addEventListener(
    "click",
    function () {

        mudarModo(
            "excluir"
        );

        mostrarMensagem(
            "Clique em uma operação para excluí-la."
        );

    }
);


btnInicio.addEventListener(
    "click",
    function () {

        mudarModo(
            "inicio"
        );

        mostrarMensagem(
            "Clique na operação que será o início da máquina."
        );

    }
);


btnFim.addEventListener(
    "click",
    function () {

        mudarModo(
            "fim"
        );

        mostrarMensagem(
            "Clique na operação que será o fim da máquina."
        );

    }
);


/* =========================================================
   FILA
   ========================================================= */

function definirFila() {

    const texto =
        entradaFila.value.trim();


    if (!texto) {

        fila =
            [];

        filaInicial =
            [];

        atualizarFilaVisual();

        return;

    }


    /*
     * Aceita:
     *
     * A B B A
     *
     * ou:
     *
     * ABBA
     *
     */

    if (
        texto.includes(" ")
    ) {

        fila =
            texto
                .split(/\s+/)
                .filter(
                    item =>
                        item.length > 0
                );

    } else {

        fila =
            [...texto];

    }


    filaInicial =
        [...fila];


    atualizarFilaVisual();


    mostrarMensagem(
        "Fila definida com sucesso."
    );

}


btnDefinirFila.addEventListener(
    "click",
    definirFila
);


/* =========================================================
   VISUALIZAÇÃO DA FILA
   ========================================================= */

function atualizarFilaVisual() {

    filaVisual.innerHTML = "";


    if (
        fila.length === 0
    ) {

        filaVisual.textContent =
            "Fila vazia";

        return;

    }


    for (
        const simbolo
        of fila
    ) {

        const elemento =
            document.createElement(
                "div"
            );


        elemento.className =
            "item-fila";


        elemento.textContent =
            simbolo;


        filaVisual.appendChild(
            elemento
        );

    }

}


/* =========================================================
   SIMULAÇÃO
   ========================================================= */

function iniciarSimulacao() {

    if (
        maquina.operacoes.length ===
        0
    ) {

        mostrarMensagem(
            "Não existem operações na máquina."
        );

        return;

    }


    if (
        maquina.inicio ===
        null
    ) {

        mostrarMensagem(
            "Defina uma operação como início."
        );

        return;

    }


    if (
        !operacaoAtual
    ) {

        operacaoAtual =
            encontrarOperacao(
                maquina.inicio
            );

    }


    executando =
        true;


    statusExecucaoHTML.textContent =
        "Executando";


    iniciarIntervalo();


    desenhar();

}


function iniciarIntervalo() {

    if (
        intervaloExecucao
    ) {

        clearInterval(
            intervaloExecucao
        );

    }


    intervaloExecucao =
        setInterval(
            function () {

                const sucesso =
                    executarPasso();


                if (
                    !sucesso
                ) {

                    pausarSimulacao();

                }

            },
            1000
        );

}


function pausarSimulacao() {

    executando =
        false;


    if (
        intervaloExecucao
    ) {

        clearInterval(
            intervaloExecucao
        );

        intervaloExecucao =
            null;

    }


    statusExecucaoHTML.textContent =
        "Pausado";


    desenhar();

}


/* =========================================================
   EXECUTAR UM PASSO
   ========================================================= */

function executarPasso() {

    if (
        !operacaoAtual
    ) {

        mostrarMensagem(
            "Não existe operação atual."
        );

        return false;

    }


    /*
     * Mostra a operação atual.
     */

    operacaoAtualHTML.textContent =
        `#${operacaoAtual.id} - ${nomeTipo(operacaoAtual.tipo)}`;


    /*
     * Executa a instrução.
     */

    const resultado =
        executarInstrucao(
            operacaoAtual
        );


    if (
        resultado.parar
    ) {

        executando =
            false;


        statusExecucaoHTML.textContent =
            "Finalizado";


        mostrarMensagem(
            "Execução finalizada."
        );


        desenhar();


        return false;

    }


    /*
     * Determina próxima operação.
     */

    if (
        resultado.proximaOperacaoId
    ) {

        operacaoAtual =
            encontrarOperacao(
                resultado.proximaOperacaoId
            );

    } else {

        /*
         * Se não houver transição,
         * a execução termina.
         */

        mostrarMensagem(
            `A operação #${operacaoAtual.id} não possui próxima transição.`
        );


        executando =
            false;


        statusExecucaoHTML.textContent =
            "Finalizado";


        desenhar();


        return false;

    }


    atualizarFilaVisual();

    desenhar();


    return true;

}


/* =========================================================
   EXECUÇÃO DAS INSTRUÇÕES
   ========================================================= */

function executarInstrucao(
    operacao
) {

    switch (
        operacao.tipo
    ) {

        case "entrada":

            mostrarMensagem(
                "Operação de entrada."
            );

            break;


        case "escrever":

            /*
             * Nesta primeira versão,
             * adicionamos um símbolo X.
             *
             * Posteriormente vamos substituir
             * pelo comportamento exato da
             * Máquina de Post definida no material.
             */

            fila.push("X");


            mostrarMensagem(
                "Símbolo X adicionado à fila."
            );

            break;


        case "apagar":

            if (
                fila.length > 0
            ) {

                const removido =
                    fila.shift();


                mostrarMensagem(
                    `Símbolo ${removido} removido da fila.`
                );

            } else {

                mostrarMensagem(
                    "A fila está vazia."
                );

            }

            break;


        case "testar":

            mostrarMensagem(
                "Teste realizado."
            );

            break;


        case "parar":

            return {

                parar: true,

                proximaOperacaoId:
                    null

            };

    }


    /*
     * Usa a primeira transição
     * como próxima operação.
     */

    const proxima =
        operacao.transicoes[0];


    return {

        parar: false,

        proximaOperacaoId:
            proxima || null

    };

}


/* =========================================================
   BUSCAR OPERAÇÃO
   ========================================================= */

function encontrarOperacao(
    id
) {

    return maquina.operacoes.find(
        operacao =>
            operacao.id === id
    ) || null;

}


/* =========================================================
   REINICIAR SIMULAÇÃO
   ========================================================= */

function reiniciarSimulacao() {

    pausarSimulacao();


    fila =
        [...filaInicial];


    if (
        maquina.inicio !==
        null
    ) {

        operacaoAtual =
            encontrarOperacao(
                maquina.inicio
            );

    } else {

        operacaoAtual =
            null;

    }


    statusExecucaoHTML.textContent =
        "Parado";


    operacaoAtualHTML.textContent =
        "-";


    atualizarFilaVisual();

    desenhar();


    mostrarMensagem(
        "Simulação reiniciada."
    );

}


/* =========================================================
   BOTÕES DE EXECUÇÃO
   ========================================================= */

btnExecutar.addEventListener(
    "click",
    function () {

        iniciarSimulacao();

    }
);


btnPasso.addEventListener(
    "click",
    function () {

        if (
            !operacaoAtual
        ) {

            if (
                maquina.inicio ===
                null
            ) {

                mostrarMensagem(
                    "Defina o início da máquina antes de executar."
                );

                return;

            }


            operacaoAtual =
                encontrarOperacao(
                    maquina.inicio
                );

        }


        statusExecucaoHTML.textContent =
            "Executando passo";


        executarPasso();

    }
);


btnPausar.addEventListener(
    "click",
    function () {

        pausarSimulacao();

        mostrarMensagem(
            "Execução pausada."
        );

    }
);


btnReiniciar.addEventListener(
    "click",
    function () {

        reiniciarSimulacao();

    }
);


/* =========================================================
   NOVA MÁQUINA
   ========================================================= */

function novaMaquina() {

    pausarSimulacao();


    maquina.operacoes =
        [];

    maquina.inicio =
        null;

    maquina.fim =
        null;


    proximoId =
        1;


    operacaoSelecionada =
        null;


    operacaoAtual =
        null;


    origemConexao =
        null;


    fila =
        [];

    filaInicial =
        [];


    entradaFila.value =
        "";


    atualizarInterface();

    atualizarInformacoesOperacao();

    atualizarFilaVisual();

    desenhar();


    mostrarMensagem(
        "Nova máquina criada."
    );

}


btnNova.addEventListener(
    "click",
    novaMaquina
);


/* =========================================================
   EXEMPLO
   ========================================================= */

function carregarExemplo() {

    novaMaquina();


    const op1 =
        criarOperacao(
            180,
            150,
            "entrada"
        );


    const op2 =
        criarOperacao(
            430,
            150,
            "escrever"
        );


    const op3 =
        criarOperacao(
            680,
            150,
            "apagar"
        );


    const op4 =
        criarOperacao(
            930,
            150,
            "parar"
        );


    op1.transicoes.push(
        op2.id
    );


    op2.transicoes.push(
        op3.id
    );


    op3.transicoes.push(
        op4.id
    );


    maquina.inicio =
        op1.id;


    maquina.fim =
        op4.id;


    fila =
        ["A", "B", "B", "A"];


    filaInicial =
        [...fila];


    entradaFila.value =
        "A B B A";


    operacaoAtual =
        op1;


    atualizarInterface();

    atualizarFilaVisual();

    desenhar();


    mostrarMensagem(
        "Exemplo carregado. Clique em Próximo passo para testar."
    );

}


btnExemplo.addEventListener(
    "click",
    carregarExemplo
);


/* =========================================================
   INTERFACE
   ========================================================= */

function atualizarInterface() {

    quantidadeOperacoesHTML.textContent =
        maquina.operacoes.length;


    if (
        operacaoAtual
    ) {

        operacaoAtualHTML.textContent =
            `#${operacaoAtual.id} - ${nomeTipo(operacaoAtual.tipo)}`;

    } else {

        operacaoAtualHTML.textContent =
            "-";

    }

}


/* =========================================================
   INFORMAÇÕES DA OPERAÇÃO
   ========================================================= */

function atualizarInformacoesOperacao() {

    if (
        !operacaoSelecionada
    ) {

        informacoesOperacao.innerHTML =
            `
                <p>
                    Nenhuma operação selecionada.
                </p>
            `;

        return;

    }


    const quantidadeConexoes =
        operacaoSelecionada.transicoes.length;


    informacoesOperacao.innerHTML =
        `
            <p>
                <strong>ID:</strong>
                #${operacaoSelecionada.id}
            </p>

            <p>
                <strong>Tipo:</strong>
                ${nomeTipo(operacaoSelecionada.tipo)}
            </p>

            <p>
                <strong>Saídas:</strong>
                ${quantidadeConexoes}
            </p>
        `;

}


/* =========================================================
   MENSAGENS
   ========================================================= */

function mostrarMensagem(
    mensagem
) {

    mensagens.textContent =
        mensagem;

}


/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */

mudarModo(
    "selecionar"
);


ajustarCanvas();

atualizarInterface();

atualizarFilaVisual();
