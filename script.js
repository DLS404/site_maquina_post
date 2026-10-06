/* =========================================================
   SIMULADOR DE MÁQUINA DE POST
   Versão simplificada:
   - Uma máquina por vez
   - Sem zoom
   - Sem pan
   - Nós arrastáveis
   - Conexões editáveis
   ========================================================= */


/* =========================================================
   ESTADO DA MÁQUINA
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
    paused: false,

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
   TIPOS DE NÓ
   ========================================================= */

const nodeNames = {

    partida: "Partida",

    teste: "X ← ler(X)",

    atribuicao: "X ← Xs",

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

        symbol: "#",

        name: nodeNames[type]

    };

    machine.nodes.push(node);

    render();

    selectNode(node.id);
}


/* =========================================================
   RENDERIZAÇÃO
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

        const element = document.createElement("div");

        element.className =
            `node ${node.type}`;

        if (machine.selectedNode === node.id) {
            element.classList.add("selected");
        }

        if (machine.currentNode === node.id) {
            element.classList.add("current");
        }

        element.dataset.id = node.id;

        element.style.left = node.x + "px";
        element.style.top = node.y + "px";

        element.textContent = getNodeLabel(node);

        nodesContainer.appendChild(element);

        setupNodeDragging(element, node);

    });

}


/* =========================================================
   TEXTO DO NÓ
   ========================================================= */

function getNodeLabel(node) {

    switch (node.type) {

        case "partida":
            return "PARTIDA";

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

    element.addEventListener("mousedown", event => {

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

    });


    document.addEventListener("mousemove", event => {

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
            Math.max(5, Math.min(
                canvas.clientWidth - 140,
                node.x
            ));

        node.y =
            Math.max(5, Math.min(
                canvas.clientHeight - 70,
                node.y
            ));

        render();

    });


    document.addEventListener("mouseup", () => {

        dragging = false;

    });

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
   CONEXÕES
   ========================================================= */

function startConnectionMode() {

    machine.connectionMode =
        !machine.connectionMode;

    machine.connectionStart = null;

    if (machine.connectionMode) {

        modeText.textContent =
            "Modo: conectando... clique em dois nós";

        modeText.classList.add("connection-mode");

    } else {

        modeText.textContent =
            "Modo: seleção";

        modeText.classList.remove("connection-mode");

    }

}


/* =========================================================
   CLIQUE PARA CONECTAR
   ========================================================= */

function handleConnectionClick(node) {

    if (!machine.connectionStart) {

        machine.connectionStart =
            node.id;

        modeText.textContent =
            "Agora clique no nó de destino.";

        return;

    }

    if (machine.connectionStart === node.id) {

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
        "Conexão criada. Clique em outros nós.";

}


/* =========================================================
   CRIAR CONEXÃO
   ========================================================= */

function createEdge(from, to) {

    const source =
        machine.nodes.find(n => n.id === from);

    const target =
        machine.nodes.find(n => n.id === to);

    const edge = {

        id: machine.nextEdgeId++,

        from,
        to,

        label:
            source.type === "teste"
                ? "ε"
                : "",

        bendX:
            (source.x + target.x) / 2,

        bendY:
            (source.y + target.y) / 2 - 50

    };

    machine.edges.push(edge);

    selectEdge(edge.id);

}


/* =========================================================
   RENDERIZAR CONEXÕES
   ========================================================= */

function renderEdges() {

    svg.querySelectorAll(".edge-element")
        .forEach(el => el.remove());

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

        const sx =
            source.x + 65;

        const sy =
            source.y + 30;

        const tx =
            target.x + 65;

        const ty =
            target.y + 30;

        const cx =
            edge.bendX;

        const cy =
            edge.bendY;


        const path =
            document.createElementNS(
                "http://www.w3.org/2000/svg",
                "path"
            );

        path.classList.add(
            "edge-element",
            "edge"
        );

        if (machine.selectedEdge === edge.id) {
            path.classList.add("selected");
        }

        const d =
            `M ${sx} ${sy}
             Q ${cx} ${cy}
               ${tx} ${ty}`;

        path.setAttribute("d", d);

        path.addEventListener(
            "click",
            event => {

                event.stopPropagation();

                selectEdge(edge.id);

            }
        );


        svg.appendChild(path);


        /* LABEL */

        if (edge.label) {

            const label =
                document.createElementNS(
                    "http://www.w3.org/2000/svg",
                    "text"
                );

            label.classList.add(
                "edge-element",
                "edge-label"
            );

            label.setAttribute(
                "x",
                cx
            );

            label.setAttribute(
                "y",
                cy - 8
            );

            label.setAttribute(
                "text-anchor",
                "middle"
            );

            label.textContent =
                edge.label;

            svg.appendChild(label);

        }


        /* HANDLE DA CURVA */

        if (machine.selectedEdge === edge.id) {

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
   MOVER CURVA DA CONEXÃO
   ========================================================= */

function setupEdgeHandle(handle, edge) {

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

            edge.bendX =
                event.clientX -
                rect.left;

            edge.bendY =
                event.clientY -
                rect.top;

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

            <label>Tipo</label>

            <input
                value="${nodeNames[node.type]}"
                disabled>

        </div>

    `;


    if (node.type === "atribuicao") {

        html += `

            <div class="property">

                <label>Símbolo a adicionar</label>

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

        select.value = node.symbol;

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

            <label>Rótulo da conexão</label>

            <input
                id="edgeLabel"
                value="${edge.label}"
                placeholder="Ex.: 0, 1 ou ε">

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

    if (machine.selectedNode !== null) {

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

        machine.selectedNode = null;

        properties.innerHTML =
            `<p class="empty">
                Selecione uma operação ou conexão.
             </p>`;

        render();

        return;

    }


    if (machine.selectedEdge !== null) {

        deleteSelectedEdge();

    }

}


/* =========================================================
   EXCLUIR CONEXÃO
   ========================================================= */

function deleteSelectedEdge() {

    if (machine.selectedEdge === null) {
        return;
    }

    machine.edges =
        machine.edges.filter(
            e => e.id !== machine.selectedEdge
        );

    machine.selectedEdge = null;

    properties.innerHTML =
        `<p class="empty">
            Selecione uma operação ou conexão.
         </p>`;

    render();

}


/* =========================================================
   TECLA DELETE
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

            machine.connectionMode = false;

            machine.connectionStart = null;

            modeText.textContent =
                "Modo: seleção";

            modeText.classList.remove(
                "connection-mode"
            );

            machine.selectedNode = null;
            machine.selectedEdge = null;

            render();

        }

    }
);


/* =========================================================
   FILA
   ========================================================= */

function setInputWord() {

    const input =
        document.getElementById(
            "inputWord"
        );

    machine.inputWord =
        input.value.trim();

    machine.queue =
        [...machine.inputWord];

    machine.currentNode = null;

    updateQueue();

    executionStatus.textContent =
        "Entrada definida.";

    render();

}


/* =========================================================
   ATUALIZAR FILA
   ========================================================= */

function updateQueue() {

    if (machine.queue.length === 0) {

        queueElement.textContent = "ε";

        return;

    }

    queueElement.textContent =
        machine.queue.join("");

}


/* =========================================================
   VALIDAR MÁQUINA
   ========================================================= */

function validateMachine() {

    const errors = [];
    const warnings = [];


    const starts =
        machine.nodes.filter(
            n => n.type === "partida"
        );

    if (starts.length === 0) {

        errors.push(
            "A máquina precisa ter uma instrução de partida."
        );

    }

    if (starts.length > 1) {

        errors.push(
            "A máquina deve possuir apenas uma instrução de partida."
        );

    }


    const terminals =
        machine.nodes.filter(
            n =>
                n.type === "aceita" ||
                n.type === "rejeita"
        );

    if (terminals.length === 0) {

        warnings.push(
            "A máquina não possui uma instrução de parada."
        );

    }


    machine.nodes.forEach(node => {

        if (
            node.type !== "aceita" &&
            node.type !== "rejeita"
        ) {

            const outgoing =
                machine.edges.filter(
                    e => e.from === node.id
                );

            if (outgoing.length === 0) {

                warnings.push(
                    `O nó "${getNodeLabel(node)}" não possui saída.`
                );

            }

        }

    });


    machine.edges.forEach(edge => {

        const source =
            machine.nodes.find(
                n => n.id === edge.from
            );

        if (
            source &&
            source.type === "teste" &&
            !edge.label
        ) {

            warnings.push(
                "Existe uma conexão de teste sem rótulo."
            );

        }

    });


    if (errors.length === 0) {

        validationResult.innerHTML =
            `<div class="success">
                ✓ Máquina estruturalmente válida.
             </div>`;

    } else {

        validationResult.innerHTML =
            `<div class="error">
                ${errors.map(
                    e => "✗ " + e
                ).join("<br>")}
             </div>`;

    }


    if (warnings.length > 0) {

        validationResult.innerHTML +=
            `<div class="warning" style="margin-top:8px;">
                ${warnings.map(
                    w => "⚠ " + w
                ).join("<br>")}
             </div>`;

    }

}


/* =========================================================
   ENCONTRAR PRÓXIMO NÓ
   ========================================================= */

function getNextNode(currentNode, symbol) {

    const outgoing =
        machine.edges.filter(
            e => e.from === currentNode.id
        );


    if (currentNode.type === "teste") {

        let edge =
            outgoing.find(
                e => e.label === symbol
            );

        if (!edge) {

            edge =
                outgoing.find(
                    e => e.label === "ε" &&
                    symbol === "ε"
                );

        }

        if (!edge) {
            return null;
        }

        return machine.nodes.find(
            n => n.id === edge.to
        );

    }


    if (outgoing.length === 0) {
        return null;
    }

    return machine.nodes.find(
        n => n.id === outgoing[0].to
    );

}


/* =========================================================
   EXECUTAR UM PASSO
   ========================================================= */

function stepMachine() {

    if (machine.currentNode === null) {

        const start =
            machine.nodes.find(
                n => n.type === "partida"
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
            n => n.id === machine.currentNode
        );

    if (!current) {
        return false;
    }


    /* ACEITA */

    if (current.type === "aceita") {

        executionStatus.textContent =
            "✓ Palavra aceita.";

        machine.running = false;

        return false;

    }


    /* REJEITA */

    if (current.type === "rejeita") {

        executionStatus.textContent =
            "✗ Palavra rejeitada.";

        machine.running = false;

        return false;

    }


    let symbol =
        machine.queue.length > 0
            ? machine.queue[0]
            : "ε";


    /* TESTE */

    if (current.type === "teste") {

        if (machine.queue.length > 0) {

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


    /* ATRIBUIÇÃO */

    if (current.type === "atribuicao") {

        machine.queue.push(
            current.symbol
        );

        updateQueue();

    }


    const next =
        getNextNode(
            current,
            symbol
        );

    if (!next) {

        executionStatus.textContent =
            "A máquina não possui uma próxima instrução.";

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
    machine.paused = false;

    executionStatus.textContent =
        "Executando...";


    let steps = 0;

    machine.timer =
        setInterval(() => {

            if (!machine.running) {
                return;
            }

            const result =
                stepMachine();

            steps++;

            if (!result) {

                clearInterval(
                    machine.timer
                );

                machine.timer = null;

                machine.running = false;

                return;

            }


            if (steps > 10000) {

                clearInterval(
                    machine.timer
                );

                machine.timer = null;

                machine.running = false;

                executionStatus.textContent =
                    "⚠ Limite de passos atingido. Possível loop infinito.";

            }

        }, 500);

}


/* =========================================================
   PAUSAR
   ========================================================= */

function pauseMachine() {

    machine.running = false;

    if (machine.timer) {

        clearInterval(
            machine.timer
        );

        machine.timer = null;

    }

    executionStatus.textContent =
        "Execução pausada.";

}


/* =========================================================
   RESETAR EXECUÇÃO
   ========================================================= */

function resetExecution() {

    pauseMachine();

    machine.queue =
        [...machine.inputWord];

    machine.currentNode = null;

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

    machine.connectionMode = false;
    machine.connectionStart = null;

    machine.currentNode = null;

    machine.inputWord = "";
    machine.queue = [];

    document.getElementById(
        "inputWord"
    ).value = "";

    properties.innerHTML =
        `<p class="empty">
            Selecione uma operação ou conexão.
         </p>`;

    validationResult.innerHTML = "";

    modeText.textContent =
        "Modo: seleção";

    modeText.classList.remove(
        "connection-mode"
    );

    updateQueue();

    render();

}


/* =========================================================
   EXEMPLO DE MÁQUINA
   =========================================================

   Exemplo simples:

   PARTIDA
      ↓
   TESTE
    ↙   ↘
   0     1
    ↓     ↓
   TESTE  TESTE
      ...

   Para deixar o exemplo mais simples,
   usamos uma máquina que lê o primeiro
   símbolo e aceita se for 0.
   ========================================================= */

function loadExample() {

    newMachine();


    const start = {

        id: machine.nextNodeId++,

        type: "partida",

        x: 100,
        y: 270,

        symbol: "#"

    };


    const test = {

        id: machine.nextNodeId++,

        type: "teste",

        x: 300,
        y: 270,

        symbol: "#"

    };


    const accept = {

        id: machine.nextNodeId++,

        type: "aceita",

        x: 550,
        y: 180,

        symbol: "#"

    };


    const reject = {

        id: machine.nextNodeId++,

        type: "rejeita",

        x: 550,
        y: 360,

        symbol: "#"

    };


    machine.nodes.push(
        start,
        test,
        accept,
        reject
    );


    machine.edges.push({

        id: machine.nextEdgeId++,

        from: start.id,

        to: test.id,

        label: "",

        bendX: 200,

        bendY: 270

    });


    machine.edges.push({

        id: machine.nextEdgeId++,

        from: test.id,

        to: accept.id,

        label: "0",

        bendX: 425,

        bendY: 200

    });


    machine.edges.push({

        id: machine.nextEdgeId++,

        from: test.id,

        to: reject.id,

        label: "1",

        bendX: 425,

        bendY: 340

    });


    render();

    setInputExample();

}


/* =========================================================
   INPUT DO EXEMPLO
   ========================================================= */

function setInputExample() {

    document.getElementById(
        "inputWord"
    ).value = "0";

    setInputWord();

}


/* =========================================================
   CLIQUE FORA DOS NÓS
   ========================================================= */

canvas.addEventListener(
    "mousedown",
    event => {

        if (
            event.target === canvas ||
            event.target === nodesContainer
        ) {

            machine.selectedNode = null;

            machine.selectedEdge = null;

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