/* =========================================================
   SIMULADOR DE MÁQUINA DE POST
   ========================================================= */

const machine = {

    nodes: [],
    edges: [],

    nextNodeId: 1,
    nextEdgeId: 1,

    selectedNode: null,
    selectedEdge: null,

    connectionMode: false,
    connectionStart: null,

    inputWord: "",
    queue: [],

    currentNode: null,

    running: false,
    timer: null

};


/* =========================================================
   ELEMENTOS
   ========================================================= */

const canvas = document.getElementById("canvas");
const nodesContainer = document.getElementById("nodes");
const svg = document.getElementById("connections");

const properties = document.getElementById("properties");
const queueElement = document.getElementById("queue");

const executionStatus =
    document.getElementById("executionStatus");

const validationResult =
    document.getElementById("validationResult");

const modeText =
    document.getElementById("modeText");


/* =========================================================
   NOMES DOS TIPOS
   ========================================================= */

const nodeNames = {

    partida: "Partida",

    marcador: "X ← X#",

    atribuicao: "X ← Xs",

    teste: "X ← ler(X)",

    aceita: "ACEITA",

    rejeita: "REJEITA"

};


/* =========================================================
   ADICIONAR NÓ
   ========================================================= */

function addNode(type, x = 100, y = 100) {

    const node = {

        id: machine.nextNodeId++,

        type,

        x,
        y,

        symbol: "#"

    };

    machine.nodes.push(node);

    render();

    selectNode(node.id);

}


/* =========================================================
   RENDER
   ========================================================= */

function render() {

    renderNodes();
    renderEdges();

}


/* =========================================================
   RENDERIZAR NÓS
   ========================================================= */

function renderNodes() {

    nodesContainer.innerHTML = "";

    machine.nodes.forEach(node => {

        const element =
            document.createElement("div");

        element.className =
            `node ${node.type}`;

        if (machine.selectedNode === node.id) {

            element.classList.add("selected");

        }

        if (machine.currentNode === node.id) {

            element.classList.add("current");

        }

        element.dataset.id = node.id;

        element.style.left =
            node.x + "px";

        element.style.top =
            node.y + "px";

        element.textContent =
            getNodeLabel(node);

        nodesContainer.appendChild(element);

        setupNodeDragging(
            element,
            node
        );

    });

}


/* =========================================================
   TEXTO DOS NÓS
   ========================================================= */

function getNodeLabel(node) {

    switch (node.type) {

        case "partida":
            return "PARTIDA";

        case "marcador":
            return "X ← X#";

        case "teste":
            return "X ← ler(X)";

        case "atribuicao":
            return `X ← X${node.symbol}`;

        case "aceita":
            return "ACEITA";

        case "rejeita":
            return "REJEITA";

        default:
            return "";

    }

}


/* =========================================================
   ARRASTAR NÓ
   ========================================================= */

function setupNodeDragging(element, node) {

    let dragging = false;

    let offsetX = 0;
    let offsetY = 0;


    element.addEventListener(
        "mousedown",
        event => {

            if (machine.connectionMode) {

                event.stopPropagation();

                handleConnectionClick(node);

                return;

            }

            if (event.button !== 0) {
                return;
            }

            dragging = true;

            const rect =
                canvas.getBoundingClientRect();

            offsetX =
                event.clientX -
                rect.left -
                node.x;

            offsetY =
                event.clientY -
                rect.top -
                node.y;

            selectNode(node.id);

            event.preventDefault();

        }
    );


    document.addEventListener(
        "mousemove",
        event => {

            if (!dragging) {
                return;
            }

            const rect =
                canvas.getBoundingClientRect();

            node.x =
                event.clientX -
                rect.left -
                offsetX;

            node.y =
                event.clientY -
                rect.top -
                offsetY;

            node.x =
                Math.max(
                    5,
                    Math.min(
                        canvas.clientWidth - 150,
                        node.x
                    )
                );

            node.y =
                Math.max(
                    5,
                    Math.min(
                        canvas.clientHeight - 75,
                        node.y
                    )
                );

            render();

        }
    );


    document.addEventListener(
        "mouseup",
        () => {

            dragging = false;

        }
    );

}


/* =========================================================
   SELECIONAR NÓ
   ========================================================= */

function selectNode(id) {

    machine.selectedNode = id;
    machine.selectedEdge = null;

    showNodeProperties();

    render();

}


/* =========================================================
   SELECIONAR CONEXÃO
   ========================================================= */

function selectEdge(id) {

    machine.selectedEdge = id;
    machine.selectedNode = null;

    showEdgeProperties();

    render();

}


/* =========================================================
   MODO CONEXÃO
   ========================================================= */

function startConnectionMode() {

    machine.connectionMode =
        !machine.connectionMode;

    machine.connectionStart = null;


    if (machine.connectionMode) {

        modeText.textContent =
            "Modo: conectando — clique em dois nós";

        modeText.classList.add(
            "connection-mode"
        );

    } else {

        modeText.textContent =
            "Modo: seleção";

        modeText.classList.remove(
            "connection-mode"
        );

    }

}


/* =========================================================
   CONEXÃO
   ========================================================= */

function handleConnectionClick(node) {

    if (!machine.connectionStart) {

        machine.connectionStart =
            node.id;

        modeText.textContent =
            "Agora clique no nó de destino.";

        return;

    }


    if (
        machine.connectionStart ===
        node.id
    ) {

        machine.connectionStart = null;

        modeText.textContent =
            "Escolha outro nó.";

        return;

    }


    createEdge(
        machine.connectionStart,
        node.id
    );

    machine.connectionStart = null;

    modeText.textContent =
        "Conexão criada.";

}


/* =========================================================
   CRIAR CONEXÃO
   ========================================================= */

function createEdge(from, to) {

    const source =
        machine.nodes.find(
            n => n.id === from
        );

    const target =
        machine.nodes.find(
            n => n.id === to
        );

    let label = "";

    if (source.type === "teste") {
        label = "ε";
    }


    /*
       Verifica quantas conexões já existem
       entre os mesmos dois estados.
    */

    const parallelEdges =
        machine.edges.filter(
            e =>
                e.from === from &&
                e.to === to
        );


    /*
       Se houver várias conexões entre os
       mesmos estados, elas ficam separadas.

       Primeira: acima
       Segunda: abaixo
       Terceira: mais acima
       Quarta: mais abaixo
    */

    const index =
        parallelEdges.length;


    let bendOffsetY = -45;

    if (index === 1) {
        bendOffsetY = 45;
    }

    if (index === 2) {
        bendOffsetY = -90;
    }

    if (index === 3) {
        bendOffsetY = 90;
    }


    const edge = {

        id: machine.nextEdgeId++,

        from,
        to,

        label,

        bendOffsetX: 0,

        bendOffsetY

    };


    machine.edges.push(edge);

    selectEdge(edge.id);

}


/* =========================================================
   RENDERIZAR CONEXÕES
   ========================================================= */

function renderEdges() {

    svg.querySelectorAll(
        ".edge-element"
    ).forEach(
        el => el.remove()
    );


    machine.edges.forEach(edge => {

        const source =
            machine.nodes.find(
                n => n.id === edge.from
            );

        const target =
            machine.nodes.find(
                n => n.id === edge.to
            );


        if (!source || !target) {
            return;
        }


        /*
           CENTRO DOS ESTADOS
        */

        const sx =
            source.x + 65;

        const sy =
            source.y + 30;

        const tx =
            target.x + 65;

        const ty =
            target.y + 30;


        /*
           CENTRO DA CONEXÃO
        */

        const middleX =
            (sx + tx) / 2;

        const middleY =
            (sy + ty) / 2;


        /*
           PONTO DE CONTROLE
        */

        const cx =
            middleX +
            (edge.bendOffsetX || 0);

        const cy =
            middleY +
            (edge.bendOffsetY || 0);


        /*
           LINHA / CURVA
        */

        const path =
            document.createElementNS(
                "http://www.w3.org/2000/svg",
                "path"
            );


        path.classList.add(
            "edge-element",
            "edge"
        );


        if (
            machine.selectedEdge ===
            edge.id
        ) {

            path.classList.add(
                "selected"
            );

        }


        path.setAttribute(
            "d",
            `M ${sx} ${sy}
             Q ${cx} ${cy}
               ${tx} ${ty}`
        );


        path.addEventListener(
            "click",
            event => {

                event.stopPropagation();

                selectEdge(edge.id);

            }
        );


        svg.appendChild(path);


        /*
           RÓTULO
        */

        if (edge.label) {

            /*
               Posição real no meio da curva.
            */

            const labelX =
                0.25 * sx +
                0.50 * cx +
                0.25 * tx;

            const labelY =
                0.25 * sy +
                0.50 * cy +
                0.25 * ty;


            /*
               Grupo para criar fundo branco
               atrás do símbolo.
            */

            const group =
                document.createElementNS(
                    "http://www.w3.org/2000/svg",
                    "g"
                );


            group.classList.add(
                "edge-element"
            );


            /*
               Fundo branco
            */

            const background =
                document.createElementNS(
                    "http://www.w3.org/2000/svg",
                    "rect"
                );


            background.setAttribute(
                "x",
                labelX - 12
            );

            background.setAttribute(
                "y",
                labelY - 13
            );

            background.setAttribute(
                "width",
                24
            );

            background.setAttribute(
                "height",
                20
            );

            background.setAttribute(
                "rx",
                4
            );

            background.setAttribute(
                "fill",
                "white"
            );

            background.setAttribute(
                "stroke",
                "#ffffff"
            );


            /*
               Símbolo
            */

            const label =
                document.createElementNS(
                    "http://www.w3.org/2000/svg",
                    "text"
                );


            label.classList.add(
                "edge-label"
            );


            label.setAttribute(
                "x",
                labelX
            );

            label.setAttribute(
                "y",
                labelY + 3
            );

            label.setAttribute(
                "text-anchor",
                "middle"
            );


            label.textContent =
                edge.label;


            group.appendChild(
                background
            );

            group.appendChild(
                label
            );


            svg.appendChild(group);

        }


        /*
           PONTO DE CONTROLE
        */

        if (
            machine.selectedEdge ===
            edge.id
        ) {

            const handle =
                document.createElementNS(
                    "http://www.w3.org/2000/svg",
                    "circle"
                );


            handle.classList.add(
                "edge-element",
                "edge-handle"
            );


            handle.setAttribute(
                "cx",
                cx
            );

            handle.setAttribute(
                "cy",
                cy
            );

            handle.setAttribute(
                "r",
                7
            );


            setupEdgeHandle(
                handle,
                edge
            );


            svg.appendChild(handle);

        }

    });

}
/* =========================================================
   MOVER CURVA
   ========================================================= */

function setupEdgeHandle(
    handle,
    edge
) {

    let dragging = false;


    handle.addEventListener(
        "mousedown",
        event => {

            dragging = true;

            event.stopPropagation();

            event.preventDefault();

        }
    );


    document.addEventListener(
        "mousemove",
        event => {

            if (!dragging) {
                return;
            }


            const rect =
                canvas.getBoundingClientRect();


            /*
               Posição atual do mouse
            */

            const mouseX =
                event.clientX -
                rect.left;

            const mouseY =
                event.clientY -
                rect.top;


            /*
               Localiza os dois estados
            */

            const source =
                machine.nodes.find(
                    n => n.id === edge.from
                );

            const target =
                machine.nodes.find(
                    n => n.id === edge.to
                );


            if (!source || !target) {
                return;
            }


            /*
               Centro atual da conexão
            */

            const sx =
                source.x + 65;

            const sy =
                source.y + 30;

            const tx =
                target.x + 65;

            const ty =
                target.y + 30;


            const middleX =
                (sx + tx) / 2;

            const middleY =
                (sy + ty) / 2;


            /*
               Guarda somente o deslocamento
               em relação ao centro.

               Assim, quando os estados
               forem movidos, a curva continua
               acompanhando-os.
            */

            edge.bendOffsetX =
                mouseX - middleX;

            edge.bendOffsetY =
                mouseY - middleY;


            renderEdges();

        }
    );


    document.addEventListener(
        "mouseup",
        () => {

            dragging = false;

        }
    );

}


/* =========================================================
   PROPRIEDADES DO NÓ
   ========================================================= */

function showNodeProperties() {

    const node =
        machine.nodes.find(
            n => n.id === machine.selectedNode
        );


    if (!node) {

        properties.innerHTML =
            `<p class="empty">
                Selecione uma operação ou conexão.
             </p>`;

        return;

    }


    let html = `

        <div class="property">

            <label>Instrução</label>

            <input
                value="${nodeNames[node.type]}"
                disabled>

        </div>

    `;


    /*
       X ← X# é fixo.
    */

    if (node.type === "marcador") {

        html += `

            <div class="property">

                <small>
                    Acrescenta o símbolo #
                    ao final da fila.
                </small>

            </div>

        `;

    }


    /*
       X ← Xs permite escolher
       o símbolo acrescentado.
    */

    if (node.type === "atribuicao") {

        html += `

            <div class="property">

                <label>
                    Símbolo acrescentado
                </label>

                <select id="nodeSymbol">

                    <option value="#">#</option>

                    <option value="0">0</option>

                    <option value="1">1</option>

                    <option value="a">a</option>

                    <option value="b">b</option>

                </select>

            </div>

        `;

    }


    properties.innerHTML = html;


    if (node.type === "atribuicao") {

        const select =
            document.getElementById(
                "nodeSymbol"
            );


        select.value =
            node.symbol;


        select.addEventListener(
            "change",
            () => {

                node.symbol =
                    select.value;

                render();

            }
        );

    }

}


/* =========================================================
   PROPRIEDADES DA CONEXÃO
   ========================================================= */

function showEdgeProperties() {

    const edge =
        machine.edges.find(
            e => e.id === machine.selectedEdge
        );


    if (!edge) {

        properties.innerHTML =
            `<p class="empty">
                Selecione uma operação ou conexão.
             </p>`;

        return;

    }


    properties.innerHTML = `

        <div class="property">

            <label>
                Rótulo da conexão
            </label>

            <input
                id="edgeLabel"
                value="${edge.label}"
                placeholder="0, 1, # ou ε">

        </div>

        <button
            onclick="deleteSelectedEdge()"
            style="width:100%;">

            Excluir conexão

        </button>

    `;


    document
        .getElementById("edgeLabel")
        .addEventListener(
            "input",
            event => {

                edge.label =
                    event.target.value;

                renderEdges();

            }
        );

}


/* =========================================================
   EXCLUIR SELECIONADO
   ========================================================= */

function deleteSelected() {

    if (
        machine.selectedNode !== null
    ) {

        const id =
            machine.selectedNode;


        machine.nodes =
            machine.nodes.filter(
                n => n.id !== id
            );


        machine.edges =
            machine.edges.filter(
                e =>
                    e.from !== id &&
                    e.to !== id
            );


        machine.selectedNode =
            null;


        properties.innerHTML =
            `<p class="empty">
                Selecione uma operação ou conexão.
             </p>`;


        render();

        return;

    }


    if (
        machine.selectedEdge !== null
    ) {

        deleteSelectedEdge();

    }

}


/* =========================================================
   EXCLUIR CONEXÃO
   ========================================================= */

function deleteSelectedEdge() {

    if (
        machine.selectedEdge === null
    ) {

        return;

    }


    machine.edges =
        machine.edges.filter(
            e =>
                e.id !==
                machine.selectedEdge
        );


    machine.selectedEdge = null;


    properties.innerHTML =
        `<p class="empty">
            Selecione uma operação ou conexão.
         </p>`;


    render();

}


/* =========================================================
   DELETE / ESC
   ========================================================= */

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Delete" ||
            event.key === "Backspace"
        ) {

            const active =
                document.activeElement;


            if (
                active.tagName === "INPUT" ||
                active.tagName === "SELECT"
            ) {

                return;

            }


            deleteSelected();

        }


        if (event.key === "Escape") {

            machine.connectionMode =
                false;

            machine.connectionStart =
                null;

            machine.selectedNode =
                null;

            machine.selectedEdge =
                null;


            modeText.textContent =
                "Modo: seleção";


            modeText.classList.remove(
                "connection-mode"
            );


            render();

        }

    }
);


/* =========================================================
   DEFINIR ENTRADA
   ========================================================= */

function setInputWord() {

    const input =
        document.getElementById(
            "inputWord"
        );


    machine.inputWord =
        input.value.trim();


    /*
       IMPORTANTE:
       A entrada começa somente
       com a palavra.

       O # será acrescentado
       pela instrução X ← X#.
    */

    machine.queue =
        [...machine.inputWord];


    machine.currentNode =
        null;


    updateQueue();


    executionStatus.textContent =
        "Entrada definida.";

}


/* =========================================================
   ATUALIZAR FILA
   ========================================================= */

function updateQueue() {

    if (
        machine.queue.length === 0
    ) {

        queueElement.textContent =
            "ε";

        return;

    }


    queueElement.textContent =
        machine.queue.join("");

}


/* =========================================================
   VALIDAR
   ========================================================= */

function validateMachine() {

    const errors = [];
    const warnings = [];


    const starts =
        machine.nodes.filter(
            n =>
                n.type === "partida"
        );


    if (starts.length === 0) {

        errors.push(
            "A máquina precisa possuir uma instrução de partida."
        );

    }


    if (starts.length > 1) {

        errors.push(
            "A máquina deve possuir somente uma instrução de partida."
        );

    }


    const markers =
        machine.nodes.filter(
            n =>
                n.type === "marcador"
        );


    if (markers.length === 0) {

        warnings.push(
            "A máquina não possui a instrução X ← X#."
        );

    }


    const tests =
        machine.nodes.filter(
            n =>
                n.type === "teste"
        );


    tests.forEach(test => {

        const outgoing =
            machine.edges.filter(
                e =>
                    e.from === test.id
            );


        if (
            outgoing.length === 0
        ) {

            warnings.push(
                "Um teste não possui nenhuma saída."
            );

        }

    });


    if (errors.length === 0) {

        validationResult.innerHTML =
            `<div class="success">
                ✓ Estrutura básica válida.
             </div>`;

    } else {

        validationResult.innerHTML =
            `<div class="error">
                ${errors
                    .map(e => "✗ " + e)
                    .join("<br>")}
             </div>`;

    }


    if (warnings.length > 0) {

        validationResult.innerHTML +=
            `<div class="warning"
                  style="margin-top:8px;">

                ${warnings
                    .map(w => "⚠ " + w)
                    .join("<br>")}

             </div>`;

    }

}


/* =========================================================
   PRÓXIMO NÓ
   ========================================================= */

function getNextNode(
    currentNode,
    symbol
) {

    const outgoing =
        machine.edges.filter(
            e =>
                e.from ===
                currentNode.id
        );


    /*
       TESTE
    */

    if (
        currentNode.type ===
        "teste"
    ) {

        const edge =
            outgoing.find(
                e =>
                    e.label ===
                    symbol
            );


        if (!edge) {

            return null;

        }


        return machine.nodes.find(
            n =>
                n.id === edge.to
        );

    }


    /*
       Outros nós possuem
       somente uma saída.
    */

    if (
        outgoing.length === 0
    ) {

        return null;

    }


    return machine.nodes.find(
        n =>
            n.id ===
            outgoing[0].to
    );

}


/* =========================================================
   EXECUTAR PASSO
   ========================================================= */

function stepMachine() {

    /*
       PRIMEIRO PASSO:
       entra na PARTIDA.
    */

    if (
        machine.currentNode === null
    ) {

        const start =
            machine.nodes.find(
                n =>
                    n.type ===
                    "partida"
            );


        if (!start) {

            executionStatus.textContent =
                "Erro: não existe partida.";

            return false;

        }


        machine.currentNode =
            start.id;


        render();

        return true;

    }


    const current =
        machine.nodes.find(
            n =>
                n.id ===
                machine.currentNode
        );


    if (!current) {

        return false;

    }


    /*
       ACEITA
    */

    if (
        current.type ===
        "aceita"
    ) {

        executionStatus.textContent =
            "✓ Palavra aceita.";

        machine.running = false;

        return false;

    }


    /*
       REJEITA
    */

    if (
        current.type ===
        "rejeita"
    ) {

        executionStatus.textContent =
            "✗ Palavra rejeitada.";

        machine.running = false;

        return false;

    }


    /*
       X ← X#
       
       Este é o ponto importante:
       o # é colocado no final
       da fila.
    */

    if (
        current.type ===
        "marcador"
    ) {

        machine.queue.push("#");

        updateQueue();

    }


    /*
       X ← Xs
    */

    if (
        current.type ===
        "atribuicao"
    ) {

        machine.queue.push(
            current.symbol
        );

        updateQueue();

    }


    /*
       X ← ler(X)
    */

    if (
        current.type ===
        "teste"
    ) {

        let symbol = "ε";


        /*
           Se houver símbolo,
           lê o primeiro e remove.
        */

        if (
            machine.queue.length > 0
        ) {

            symbol =
                machine.queue.shift();

            updateQueue();

        }


        const next =
            getNextNode(
                current,
                symbol
            );


        if (!next) {

            executionStatus.textContent =
                `Não existe saída para "${symbol}".`;

            machine.running = false;

            return false;

        }


        machine.currentNode =
            next.id;


        render();

        return true;

    }


    /*
       Para partida, X←X# e X←Xs
       buscamos a próxima instrução.
    */

    const next =
        getNextNode(
            current,
            ""
        );


    if (!next) {

        executionStatus.textContent =
            "A instrução não possui uma saída.";

        machine.running = false;

        return false;

    }


    machine.currentNode =
        next.id;


    render();

    return true;

}


/* =========================================================
   EXECUÇÃO AUTOMÁTICA
   ========================================================= */

function executeMachine() {

    if (machine.running) {

        return;

    }


    machine.running = true;


    executionStatus.textContent =
        "Executando...";


    let steps = 0;


    machine.timer =
        setInterval(
            () => {

                if (
                    !machine.running
                ) {

                    return;

                }


                const result =
                    stepMachine();


                steps++;


                if (!result) {

                    clearInterval(
                        machine.timer
                    );

                    machine.timer =
                        null;

                    machine.running =
                        false;

                    return;

                }


                if (
                    steps >= 10000
                ) {

                    clearInterval(
                        machine.timer
                    );

                    machine.timer =
                        null;

                    machine.running =
                        false;


                    executionStatus.textContent =
                        "⚠ Limite de passos atingido. Possível loop infinito.";

                }

            },
            500
        );

}


/* =========================================================
   PAUSAR
   ========================================================= */

function pauseMachine() {

    machine.running =
        false;


    if (machine.timer) {

        clearInterval(
            machine.timer
        );

        machine.timer =
            null;

    }


    executionStatus.textContent =
        "Execução pausada.";

}


/* =========================================================
   RESETAR
   ========================================================= */

function resetExecution() {

    pauseMachine();


    machine.queue =
        [...machine.inputWord];


    machine.currentNode =
        null;


    updateQueue();


    executionStatus.textContent =
        "Máquina parada.";


    render();

}


/* =========================================================
   NOVA MÁQUINA
   ========================================================= */

function newMachine() {

    pauseMachine();


    machine.nodes = [];
    machine.edges = [];


    machine.nextNodeId = 1;
    machine.nextEdgeId = 1;


    machine.selectedNode = null;
    machine.selectedEdge = null;


    machine.connectionMode =
        false;

    machine.connectionStart =
        null;


    machine.currentNode =
        null;


    machine.inputWord =
        "";

    machine.queue = [];


    document.getElementById(
        "inputWord"
    ).value = "";


    properties.innerHTML =
        `<p class="empty">
            Selecione uma operação ou conexão.
         </p>`;


    validationResult.innerHTML =
        "";


    modeText.textContent =
        "Modo: seleção";


    modeText.classList.remove(
        "connection-mode"
    );


    updateQueue();

    render();

}


/* =========================================================
   EXEMPLO CORRETO
   =========================================================

   Máquina:

   PARTIDA
      |
   X ← X#
      |
   X ← ler(X)
     / | \
    0  1  #
    |  |  |
   ... ... ...


   Exemplo:
   entrada = 1010

   Depois de X ← X#:

   1010#

   ========================================================= */

function loadExample() {

    newMachine();


    const start = {

        id: machine.nextNodeId++,

        type: "partida",

        x: 80,
        y: 270

    };


    const marker = {

        id: machine.nextNodeId++,

        type: "marcador",

        x: 260,
        y: 270

    };


    const test = {

        id: machine.nextNodeId++,

        type: "teste",

        x: 470,
        y: 270

    };


    const accept = {

        id: machine.nextNodeId++,

        type: "aceita",

        x: 720,
        y: 150

    };


    const reject = {

        id: machine.nextNodeId++,

        type: "rejeita",

        x: 720,
        y: 390

    };


    machine.nodes.push(
        start,
        marker,
        test,
        accept,
        reject
    );


    /*
       PARTIDA → X ← X#
    */

    machine.edges.push({

        id: machine.nextEdgeId++,

        from: start.id,

        to: marker.id,

        label: "",

        bendOffsetX: 0,

        bendOffsetY: 0

    });


    /*
       X ← X# → X ← ler(X)
    */

    machine.edges.push({

        id: machine.nextEdgeId++,

        from: marker.id,

        to: test.id,

        label: "",

        bendOffsetX: 0,

        bendOffsetY: 0

    });


    /*
       TESTE → 0 → ACEITA
    */

    machine.edges.push({

        id: machine.nextEdgeId++,

        from: test.id,

        to: accept.id,

        label: "0",

        bendOffsetX: 0,

        bendOffsetY: -45

    });


    /*
       TESTE → ε → ACEITA
    */

    machine.edges.push({

        id: machine.nextEdgeId++,

        from: test.id,

        to: accept.id,

        label: "ε",

        bendOffsetX: 0,

        bendOffsetY: 45

    });


    /*
       TESTE → 1 → REJEITA
    */

    machine.edges.push({

        id: machine.nextEdgeId++,

        from: test.id,

        to: reject.id,

        label: "1",

        bendOffsetX: 0,

        bendOffsetY: -45

    });


    /*
       TESTE → # → REJEITA
    */

    machine.edges.push({

        id: machine.nextEdgeId++,

        from: test.id,

        to: reject.id,

        label: "#",

        bendOffsetX: 0,

        bendOffsetY: 45

    });


    render();


    document.getElementById(
        "inputWord"
    ).value = "0";


    setInputWord();

}


/* =========================================================
   CLIQUE NO FUNDO
   ========================================================= */

canvas.addEventListener(
    "mousedown",
    event => {

        if (
            event.target === canvas ||
            event.target === nodesContainer
        ) {

            machine.selectedNode =
                null;

            machine.selectedEdge =
                null;


            properties.innerHTML =
                `<p class="empty">
                    Selecione uma operação ou conexão.
                 </p>`;


            render();

        }

    }
);


/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */

render();