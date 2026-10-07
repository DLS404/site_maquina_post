/* =========================================================
   SIMULADOR DE MÁQUINA DE POST
   ========================================================= */


/* =========================================================
   ESTRUTURA DA MÁQUINA
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
   SELEÇÃO MÚLTIPLA
   selectedNode / selectedEdge continuam funcionando:
   o getter devolve o item único selecionado (ou null) e
   atribuir null limpa a seleção.
   ========================================================= */

const selection = {
    nodes: new Set(),
    edges: new Set()
};

Object.defineProperty(machine, "selectedNode", {
    get() {
        return selection.nodes.size === 1 && selection.edges.size === 0
            ? [...selection.nodes][0]
            : null;
    },
    set(value) {
        selection.nodes.clear();
        if (value !== null && value !== undefined) {
            selection.edges.clear();
            selection.nodes.add(value);
        }
    }
});

Object.defineProperty(machine, "selectedEdge", {
    get() {
        return selection.edges.size === 1 && selection.nodes.size === 0
            ? [...selection.edges][0]
            : null;
    },
    set(value) {
        selection.edges.clear();
        if (value !== null && value !== undefined) {
            selection.nodes.clear();
            selection.edges.add(value);
        }
    }
});


/* =========================================================
   HISTÓRICO - CTRL + Z
   ========================================================= */

const undoHistory = [];

const MAX_UNDO = 50;

let historyLocked = false;


function saveHistory() {

    if (historyLocked) {
        return;
    }

    undoHistory.push({

        nodes: JSON.parse(
            JSON.stringify(machine.nodes)
        ),

        edges: JSON.parse(
            JSON.stringify(machine.edges)
        ),

        nextNodeId:
            machine.nextNodeId,

        nextEdgeId:
            machine.nextEdgeId

    });


    if (
        undoHistory.length >
        MAX_UNDO
    ) {

        undoHistory.shift();

    }

}


function undo() {

    if (
        undoHistory.length === 0
    ) {

        return;

    }


    const previous =
        undoHistory.pop();


    historyLocked = true;


    machine.nodes =
        JSON.parse(
            JSON.stringify(
                previous.nodes
            )
        );


    machine.edges =
        JSON.parse(
            JSON.stringify(
                previous.edges
            )
        );


    machine.nextNodeId =
        previous.nextNodeId;


    machine.nextEdgeId =
        previous.nextEdgeId;


    machine.selectedNode =
        null;

    machine.selectedEdge =
        null;


    properties.innerHTML =
        `
        <p class="empty">
            Selecione uma operação ou conexão.
        </p>
        `;


    render();


    historyLocked = false;

}


/* =========================================================
   ELEMENTOS DA INTERFACE
   ========================================================= */

const canvas =
    document.getElementById("canvas");

const nodesContainer =
    document.getElementById("nodes");

const svg =
    document.getElementById("connections");

const properties =
    document.getElementById("properties");

const queueElement =
    document.getElementById("queue");

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

    teste: "X ← ler(X)",

    atribuicao: "Atribuição",

    aceita: "Aceita",

    rejeita: "Rejeita"

};


/* =========================================================
   TAMANHOS DOS ESTADOS
   ========================================================= */

const NODE_WIDTH = 130;

const NODE_HEIGHT = 60;


function getNodeSize(node) {

    switch (node.type) {

        case "partida":

            return {

                width: 82,
                height: 52

            };


        case "aceita":
        case "rejeita":

            return {

                width: 120,
                height: 54

            };


        default:

            return {

                width: NODE_WIDTH,
                height: NODE_HEIGHT

            };

    }

}


/* =========================================================
   CENTRO DO ESTADO
   ========================================================= */

function nodeCenter(node) {

    const size =
        getNodeSize(node);


    return {

        x:
            node.x +
            size.width / 2,

        y:
            node.y +
            size.height / 2

    };

}


/* =========================================================
   PONTO DA BORDA DO ESTADO
   ========================================================= */

function getConnectionPoint(
    node,
    targetX,
    targetY
) {

    const size =
        getNodeSize(node);


    const cx =
        node.x +
        size.width / 2;


    const cy =
        node.y +
        size.height / 2;


    const dx =
        targetX - cx;


    const dy =
        targetY - cy;


    if (
        Math.abs(dx) < 0.001 &&
        Math.abs(dy) < 0.001
    ) {

        return {

            x: cx,
            y: cy

        };

    }


    /*
       Estados ovais.
    */

    if (
        node.type === "partida" ||
        node.type === "aceita" ||
        node.type === "rejeita"
    ) {

        const rx =
            size.width / 2;


        const ry =
            size.height / 2;


        const denominator =
            Math.sqrt(

                (
                    dx * dx
                ) /
                (
                    rx * rx
                )

                +

                (
                    dy * dy
                ) /
                (
                    ry * ry
                )

            );


        return {

            x:
                cx +
                dx /
                denominator,

            y:
                cy +
                dy /
                denominator

        };

    }


    /*
       Estados retangulares.
    */

    const halfW =
        size.width / 2;


    const halfH =
        size.height / 2;


    const scaleX =
        Math.abs(dx) /
        halfW;


    const scaleY =
        Math.abs(dy) /
        halfH;


    const scale =
        Math.max(
            scaleX,
            scaleY
        );


    return {

        x:
            cx +
            dx / scale,

        y:
            cy +
            dy / scale

    };

}


/* =========================================================
   GEOMETRIA DA CONEXÃO
   ========================================================= */

/*
   Quando uma ponta da seta está sendo arrastada para outro
   estado, esta variável guarda a pré-visualização.
*/
let reconnectPreview = null;


function getEdgeGeometry(edge) {

    const source =
        machine.nodes.find(n => n.id === edge.from);

    const target =
        machine.nodes.find(n => n.id === edge.to);

    if (!source || !target) {
        return null;
    }

    const sourceCenter = nodeCenter(source);
    const targetCenter = nodeCenter(target);

    const preview =
        reconnectPreview &&
        reconnectPreview.edgeId === edge.id
            ? reconnectPreview
            : null;

    let start;
    let end;

    if (preview && preview.end === "to") {

        const free = preview.hover
            ? nodeCenter(preview.hover)
            : { x: preview.x, y: preview.y };

        start = getConnectionPoint(source, free.x, free.y);

        end = preview.hover
            ? getConnectionPoint(
                preview.hover,
                sourceCenter.x,
                sourceCenter.y
            )
            : free;

    } else if (preview && preview.end === "from") {

        const free = preview.hover
            ? nodeCenter(preview.hover)
            : { x: preview.x, y: preview.y };

        start = preview.hover
            ? getConnectionPoint(
                preview.hover,
                targetCenter.x,
                targetCenter.y
            )
            : free;

        end = getConnectionPoint(target, free.x, free.y);

    } else {

        start = getConnectionPoint(
            source,
            targetCenter.x,
            targetCenter.y
        );

        end = getConnectionPoint(
            target,
            sourceCenter.x,
            sourceCenter.y
        );

    }

    const middleX = (start.x + end.x) / 2;
    const middleY = (start.y + end.y) / 2;

    if (edge.bendOffsetX === undefined) {
        edge.bendOffsetX = 0;
    }

    if (edge.bendOffsetY === undefined) {
        edge.bendOffsetY = 0;
    }

    const control = {
        x: middleX + edge.bendOffsetX,
        y: middleY + edge.bendOffsetY
    };

    return {
        source,
        target,
        start,
        end,
        control
    };

}


/* =========================================================
   ADICIONAR ESTADO
   ========================================================= */

function addNode(
    type,
    x = 100,
    y = 100
) {

    saveHistory();


    const node = {

        id:
            machine.nextNodeId++,

        type,

        x,

        y,

        symbol:
            "#"

    };


    machine.nodes.push(
        node
    );


    render();


    selectNode(
        node.id
    );

}


/* =========================================================
   RENDER GERAL
   ========================================================= */

function render() {

    renderNodes();

    renderEdges();

}


/* =========================================================
   RENDER DOS ESTADOS
   (os eventos de mouse ficam em um único listener no canvas)
   ========================================================= */

function renderNodes() {

    nodesContainer.innerHTML = "";

    machine.nodes.forEach(node => {

        const element = document.createElement("div");

        element.className = `node ${node.type}`;

        if (selection.nodes.has(node.id)) {
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

    });

}


/* =========================================================
   TEXTO DOS ESTADOS
   ========================================================= */

function getNodeLabel(node) {

    switch (
        node.type
    ) {

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
   ENCONTRAR ESTADO SOB O MOUSE
   ========================================================= */

function getNodeUnderMouse(event) {

    const rect =
        canvas.getBoundingClientRect();


    const x =
        event.clientX -
        rect.left;


    const y =
        event.clientY -
        rect.top;


    for (
        let i =
            machine.nodes.length - 1;

        i >= 0;

        i--
    ) {

        const node =
            machine.nodes[i];


        const size =
            getNodeSize(node);


        if (
            x >= node.x &&
            x <=
                node.x +
                size.width &&

            y >= node.y &&
            y <=
                node.y +
                size.height
        ) {

            return node;

        }

    }


    return null;

}


/* =========================================================
   PRÉ-VISUALIZAÇÃO DA CONEXÃO
   ========================================================= */

function createConnectionPreview(
    node,
    event
) {

    removeConnectionPreview();


    const center =
        nodeCenter(node);


    const path =
        document.createElementNS(
            "http://www.w3.org/2000/svg",
            "path"
        );


    path.id =
        "connection-preview";


    path.setAttribute(
        "fill",
        "none"
    );


    path.setAttribute(
        "stroke",
        "#1677ff"
    );


    path.setAttribute(
        "stroke-width",
        "2"
    );


    path.setAttribute(
        "stroke-dasharray",
        "6 5"
    );


    path.setAttribute(
        "pointer-events",
        "none"
    );


    path.setAttribute(
        "d",
        `
        M ${center.x} ${center.y}
        L ${center.x} ${center.y}
        `
    );


    svg.appendChild(
        path
    );


    updateConnectionPreview(
        event
    );

}


/* =========================================================
   ATUALIZAR PRÉ-VISUALIZAÇÃO
   ========================================================= */

function updateConnectionPreview(
    event
) {

    const path =
        document.getElementById(
            "connection-preview"
        );


    if (!path) {

        return;

    }


    const source =
        machine.nodes.find(
            n =>
                n.id ===
                machine.connectionStart
        );


    if (!source) {

        return;

    }


    const rect =
        canvas.getBoundingClientRect();


    const mouseX =
        event.clientX -
        rect.left;


    const mouseY =
        event.clientY -
        rect.top;


    const sourceCenter =
        nodeCenter(source);


    const start =
        getConnectionPoint(
            source,
            mouseX,
            mouseY
        );


    const target =
        getNodeUnderMouse(
            event
        );


    let endX =
        mouseX;


    let endY =
        mouseY;


    if (
        target &&
        target.id !==
            source.id
    ) {

        const targetCenter =
            nodeCenter(target);


        const end =
            getConnectionPoint(
                target,
                sourceCenter.x,
                sourceCenter.y
            );


        endX =
            end.x;


        endY =
            end.y;

    }


    path.setAttribute(
        "d",
        `
        M ${start.x} ${start.y}
        L ${endX} ${endY}
        `
    );

}


/* =========================================================
   REMOVER PRÉ-VISUALIZAÇÃO
   ========================================================= */

function removeConnectionPreview() {

    const preview =
        document.getElementById(
            "connection-preview"
        );


    if (preview) {

        preview.remove();

    }

}


/* =========================================================
   SELEÇÃO (ESTADOS E CONEXÕES)
   ========================================================= */

const EMPTY_PROPERTIES_HTML = `
    <p class="empty">
        Selecione uma operação ou conexão.
    </p>
`;


function sameSet(a, b) {

    if (a.size !== b.size) {
        return false;
    }

    for (const value of a) {
        if (!b.has(value)) {
            return false;
        }
    }

    return true;

}


function selectionCount() {

    return selection.nodes.size + selection.edges.size;

}


/* Mostra o painel certo conforme o que está selecionado. */

function refreshProperties() {

    const nodes = selection.nodes.size;
    const edges = selection.edges.size;

    if (nodes === 0 && edges === 0) {

        properties.innerHTML = EMPTY_PROPERTIES_HTML;

    } else if (nodes === 1 && edges === 0) {

        showNodeProperties();

    } else if (nodes === 0 && edges === 1) {

        showEdgeProperties();

    } else {

        showMultiProperties();

    }

}


function showMultiProperties() {

    const nodes = selection.nodes.size;
    const edges = selection.edges.size;

    const parts = [];

    if (nodes > 0) {
        parts.push(`${nodes} estado${nodes > 1 ? "s" : ""}`);
    }

    if (edges > 0) {
        parts.push(`${edges} conexõ${edges > 1 ? "es" : "o"}`);
    }

    properties.innerHTML = `
        <div class="property">
            <label>Seleção múltipla</label>
            <div style="background:#f5f5f5;padding:8px;border-radius:5px;margin-top:5px;">
                ${parts.join(" e ")}
            </div>
        </div>

        <div class="property">
            <small>
                Arraste um estado selecionado para mover o grupo.
                Pressione Delete para excluir tudo de uma vez.
            </small>
        </div>

        <button id="deleteSelectionButton" style="width:100%;">
            🗑 Excluir seleção
        </button>
    `;

    document
        .getElementById("deleteSelectionButton")
        .addEventListener("click", deleteSelected);

}


function clearSelection() {

    selection.nodes.clear();
    selection.edges.clear();

    refreshProperties();

    render();

}


function selectNode(id) {

    selection.nodes.clear();
    selection.edges.clear();

    selection.nodes.add(id);

    refreshProperties();

    render();

}


function selectEdge(id) {

    selection.nodes.clear();
    selection.edges.clear();

    selection.edges.add(id);

    refreshProperties();

    render();

}


function selectAll() {

    selection.nodes = new Set(machine.nodes.map(n => n.id));
    selection.edges = new Set(machine.edges.map(e => e.id));

    refreshProperties();

    render();

}


/* =========================================================
   MODO DE CONEXÃO
   ========================================================= */

function startConnectionMode() {

    machine.connectionMode =
        !machine.connectionMode;


    machine.connectionStart =
        null;


    removeConnectionPreview();


    if (
        machine.connectionMode
    ) {

        modeText.textContent =
            "Modo: conectar — arraste de um estado para outro";


        modeText.classList.add(
            "connection-mode"
        );


        canvas.classList.add(
            "connection-active"
        );

    } else {

        modeText.textContent =
            "Modo: seleção";


        modeText.classList.remove(
            "connection-mode"
        );


        canvas.classList.remove(
            "connection-active"
        );

    }

}


/* =========================================================
   CRIAR CONEXÃO
   ========================================================= */

function createEdge(
    from,
    to
) {

    const source =
        machine.nodes.find(
            n =>
                n.id ===
                from
        );


    const target =
        machine.nodes.find(
            n =>
                n.id ===
                to
        );


    if (
        !source ||
        !target
    ) {

        return;

    }


    /*
       Evita conexões normais duplicadas.
    */

    if (
        source.type !==
        "teste"
    ) {

        const alreadyExists =
            machine.edges.some(
                edge =>

                    edge.from ===
                        from &&

                    edge.to ===
                        to
            );


        if (
            alreadyExists
        ) {

            alert(
                "Essa conexão já existe."
            );


            return;

        }

    }


    /*
       No teste, permite várias conexões
       para o mesmo destino, pois cada
       uma pode possuir um símbolo diferente.
    */

    saveHistory();


    const parallelEdges =
        machine.edges.filter(
            edge =>

                edge.from ===
                    from &&

                edge.to ===
                    to
        );


    const index =
        parallelEdges.length;


    let bendOffsetY =
        0;


    if (
        index === 1
    ) {

        bendOffsetY =
            30;

    }


    if (
        index === 2
    ) {

        bendOffsetY =
            -30;

    }


    if (
        index === 3
    ) {

        bendOffsetY =
            45;

    }


    const edge = {

        id:
            machine.nextEdgeId++,

        from,

        to,

        label:
            "",

        bendOffsetX:
            0,

        bendOffsetY

    };


    machine.edges.push(
        edge
    );


    /*
       Seleciona automaticamente
       a conexão recém-criada.
    */

    selectEdge(
        edge.id
    );


    modeText.textContent =
        "Conexão criada. Defina o símbolo no painel.";

}


/* =========================================================
   MARCADOR DAS SETAS
   ========================================================= */

function createArrowMarker() {

    let defs =
        svg.querySelector(
            "defs"
        );


    if (!defs) {

        defs =
            document.createElementNS(
                "http://www.w3.org/2000/svg",
                "defs"
            );


        svg.insertBefore(
            defs,
            svg.firstChild
        );

    }


    let marker =
        svg.querySelector(
            "#post-arrowhead"
        );


    if (marker) {

        return marker;

    }


    marker =
        document.createElementNS(
            "http://www.w3.org/2000/svg",
            "marker"
        );


    marker.setAttribute(
        "id",
        "post-arrowhead"
    );


    marker.setAttribute(
        "markerWidth",
        "10"
    );


    marker.setAttribute(
        "markerHeight",
        "8"
    );


    marker.setAttribute(
        "refX",
        "9"
    );


    marker.setAttribute(
        "refY",
        "4"
    );


    marker.setAttribute(
        "orient",
        "auto"
    );


    marker.setAttribute(
        "markerUnits",
        "userSpaceOnUse"
    );


    const arrow =
        document.createElementNS(
            "http://www.w3.org/2000/svg",
            "path"
        );


    arrow.setAttribute(
        "d",
        "M 0 0 L 10 4 L 0 8 Z"
    );


    arrow.setAttribute(
        "fill",
        "#222"
    );


    marker.appendChild(
        arrow
    );


    defs.appendChild(
        marker
    );


    return marker;

}


/* =========================================================
   CAMADAS EXTRAS DO CANVAS
   ========================================================= */

const SVG_NS = "http://www.w3.org/2000/svg";

/*
   Camada por cima dos estados: guarda as alças da seta
   selecionada (curvar e reconectar as pontas).
*/
const overlay = document.createElementNS(SVG_NS, "svg");

overlay.id = "overlay";

canvas.appendChild(overlay);


/* Retângulo de seleção (estilo Windows). */
const selectionBox = document.createElement("div");

selectionBox.id = "selectionBox";

canvas.appendChild(selectionBox);


function svgElement(name, attributes = {}) {

    const element = document.createElementNS(SVG_NS, name);

    Object.entries(attributes).forEach(([key, value]) => {
        element.setAttribute(key, value);
    });

    return element;

}


/* =========================================================
   RENDER DAS CONEXÕES
   ========================================================= */

function renderEdges() {

    svg.querySelectorAll(".edge-element")
        .forEach(element => element.remove());

    overlay.innerHTML = "";

    createArrowMarker();

    const singleEdgeId =
        selection.edges.size === 1 && selection.nodes.size === 0
            ? [...selection.edges][0]
            : null;

    machine.edges.forEach(edge => {

        const geometry = getEdgeGeometry(edge);

        if (!geometry) {
            return;
        }

        const { start, end, control } = geometry;

        const d =
            `M ${start.x} ${start.y} ` +
            `Q ${control.x} ${control.y} ${end.x} ${end.y}`;

        const selected = selection.edges.has(edge.id);


        /* ---------- HITBOX (área de clique mais grossa) ---------- */

        const hitPath = svgElement("path", {
            d,
            fill: "none",
            stroke: "transparent",
            "stroke-width": "20",
            "pointer-events": "stroke"
        });

        hitPath.classList.add("edge-element", "edge-hit");
        hitPath.dataset.edgeHit = edge.id;
        hitPath.style.cursor = "grab";

        svg.appendChild(hitPath);


        /* ---------- LINHA VISÍVEL ---------- */

        const path = svgElement("path", {
            d,
            fill: "none",
            stroke: "#555",
            "stroke-width": "2",
            "marker-end": "url(#post-arrowhead)",
            "pointer-events": "none"
        });

        path.classList.add("edge-element", "edge");

        if (selected) {
            path.classList.add("selected");
        }

        svg.appendChild(path);


        /* ---------- RÓTULO ---------- */

        if (edge.label) {

            const labelX =
                0.20 * start.x + 0.60 * control.x + 0.20 * end.x;

            const labelY =
                0.20 * start.y + 0.60 * control.y + 0.20 * end.y;

            const group = svgElement("g", {
                "pointer-events": "none"
            });

            group.classList.add("edge-element");

            const background = svgElement("rect", {
                x: labelX - 13,
                y: labelY - 14,
                width: 26,
                height: 21,
                rx: 4,
                fill: "#ffffff"
            });

            const label = svgElement("text", {
                x: labelX,
                y: labelY + 4,
                "text-anchor": "middle"
            });

            label.classList.add("edge-label");
            label.textContent = edge.label;

            group.appendChild(background);
            group.appendChild(label);

            svg.appendChild(group);

        }


        /* ---------- ALÇAS (só com uma seta selecionada) ---------- */

        if (edge.id === singleEdgeId) {

            const handles = [
                { role: "ctrl", x: control.x, y: control.y, cls: "edge-handle", r: 7 },
                { role: "from", x: start.x, y: start.y, cls: "edge-end-handle", r: 6 },
                { role: "to", x: end.x, y: end.y, cls: "edge-end-handle", r: 6 }
            ];

            handles.forEach(h => {

                const circle = svgElement("circle", {
                    cx: h.x,
                    cy: h.y,
                    r: h.r
                });

                circle.classList.add(h.cls);
                circle.dataset.handle = h.role;
                circle.dataset.edge = edge.id;

                overlay.appendChild(circle);

            });

        }

    });

}


/* =========================================================
   INTERAÇÃO: ARRASTAR, SELECIONAR, RECONECTAR
   Um único conjunto de listeners cuida de tudo.
   ========================================================= */

const DRAG_THRESHOLD = 3;

let drag = null;


function canvasPoint(event) {

    const rect = canvas.getBoundingClientRect();

    return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
    };

}


function isAdditive(event) {

    return event.ctrlKey || event.shiftKey || event.metaKey;

}


function toggleInSelection(set, id) {

    if (set.has(id)) {
        set.delete(id);
    } else {
        set.add(id);
    }

}


canvas.addEventListener("pointerdown", event => {

    if (event.button !== 0) {
        return;
    }

    /* Tira o foco de selects/inputs para o Delete funcionar. */
    const active = document.activeElement;

    if (
        active &&
        ["INPUT", "SELECT", "TEXTAREA", "BUTTON"].includes(active.tagName)
    ) {
        active.blur();
    }

    event.preventDefault();

    try {
        canvas.setPointerCapture(event.pointerId);
    } catch (_) {}

    const target = event.target;

    const handleElement = target.closest("[data-handle]");
    const nodeElement = target.closest(".node");
    const hitElement = target.closest("[data-edge-hit]");

    const point = canvasPoint(event);

    if (handleElement) {
        startHandleDrag(handleElement, point);
        return;
    }

    if (nodeElement) {
        startNodePress(event, nodeElement, point);
        return;
    }

    if (hitElement && !machine.connectionMode) {
        startEdgePress(event, hitElement, point);
        return;
    }

    startMarquee(event, point);

});


document.addEventListener("pointermove", event => {

    if (!drag) {
        return;
    }

    const point = canvasPoint(event);

    switch (drag.type) {

        case "connect":
            updateConnectionPreview(event);
            break;

        case "nodes":
            moveSelectedNodes(point);
            break;

        case "edge":
            bendEdgeByBody(point);
            break;

        case "ctrl":
            moveControlHandle(point);
            break;

        case "reconnect":
            moveReconnectHandle(event, point);
            break;

        case "marquee":
            updateMarquee(point);
            break;

    }

});


document.addEventListener("pointerup", endDrag);

document.addEventListener("pointercancel", endDrag);


/* ---------- ESTADOS ---------- */

function startNodePress(event, nodeElement, point) {

    const id = Number(nodeElement.dataset.id);

    const node = machine.nodes.find(n => n.id === id);

    if (!node) {
        return;
    }

    /* Modo conectar: arrastar de um estado a outro. */
    if (machine.connectionMode) {

        machine.connectionStart = id;

        createConnectionPreview(node, event);

        drag = { type: "connect" };

        return;

    }

    /* Ctrl/Shift + clique: adiciona ou remove da seleção. */
    if (isAdditive(event)) {

        toggleInSelection(selection.nodes, id);

        refreshProperties();
        render();

        return;

    }

    /* Clique em estado fora da seleção: seleciona só ele. */
    if (!selection.nodes.has(id)) {

        selection.nodes.clear();
        selection.edges.clear();

        selection.nodes.add(id);

    }

    const origins = new Map();

    selection.nodes.forEach(nodeId => {

        const n = machine.nodes.find(item => item.id === nodeId);

        if (n) {
            origins.set(nodeId, { x: n.x, y: n.y });
        }

    });

    drag = {
        type: "nodes",
        startX: point.x,
        startY: point.y,
        moved: false,
        clickedId: id,
        multi: selectionCount() > 1,
        origins
    };

    refreshProperties();
    render();

}


function moveSelectedNodes(point) {

    let dx = point.x - drag.startX;
    let dy = point.y - drag.startY;

    if (!drag.moved) {

        if (Math.hypot(dx, dy) < DRAG_THRESHOLD) {
            return;
        }

        drag.moved = true;

        saveHistory();

    }

    /* Limita o grupo inteiro às bordas da área. */
    let minDx = -Infinity;
    let maxDx = Infinity;
    let minDy = -Infinity;
    let maxDy = Infinity;

    drag.origins.forEach((origin, id) => {

        const node = machine.nodes.find(n => n.id === id);

        if (!node) {
            return;
        }

        const size = getNodeSize(node);

        minDx = Math.max(minDx, 5 - origin.x);
        maxDx = Math.min(maxDx, canvas.clientWidth - size.width - 5 - origin.x);

        minDy = Math.max(minDy, 5 - origin.y);
        maxDy = Math.min(maxDy, canvas.clientHeight - size.height - 5 - origin.y);

    });

    dx = Math.max(minDx, Math.min(maxDx, dx));
    dy = Math.max(minDy, Math.min(maxDy, dy));

    drag.origins.forEach((origin, id) => {

        const node = machine.nodes.find(n => n.id === id);

        if (node) {
            node.x = origin.x + dx;
            node.y = origin.y + dy;
        }

    });

    render();

}


/* ---------- SETAS ---------- */

function bendWeightAt(edge, point) {

    const g = getEdgeGeometry(edge);

    if (!g) {
        return 0.5;
    }

    let bestT = 0.5;
    let bestDistance = Infinity;

    for (let i = 1; i < 40; i++) {

        const t = i / 40;
        const u = 1 - t;

        const x = u * u * g.start.x + 2 * t * u * g.control.x + t * t * g.end.x;
        const y = u * u * g.start.y + 2 * t * u * g.control.y + t * t * g.end.y;

        const distance = (x - point.x) ** 2 + (y - point.y) ** 2;

        if (distance < bestDistance) {
            bestDistance = distance;
            bestT = t;
        }

    }

    /* Mover o ponto de controle em Δ move a curva em 2t(1-t)·Δ. */
    return Math.max(2 * bestT * (1 - bestT), 0.15);

}


function startEdgePress(event, hitElement, point) {

    const id = Number(hitElement.dataset.edgeHit);

    const edge = machine.edges.find(e => e.id === id);

    if (!edge) {
        return;
    }

    if (isAdditive(event)) {

        toggleInSelection(selection.edges, id);

        refreshProperties();
        render();

        return;

    }

    if (!selection.edges.has(id)) {

        selection.nodes.clear();
        selection.edges.clear();

        selection.edges.add(id);

    }

    const single = selectionCount() === 1;

    drag = {
        type: "edge",
        edgeId: id,
        startX: point.x,
        startY: point.y,
        moved: false,
        single,
        multi: !single,
        startBend: {
            x: edge.bendOffsetX || 0,
            y: edge.bendOffsetY || 0
        },
        weight: single ? bendWeightAt(edge, point) : 1
    };

    refreshProperties();
    render();

}


function bendEdgeByBody(point) {

    if (!drag.single) {
        return;
    }

    const dx = point.x - drag.startX;
    const dy = point.y - drag.startY;

    if (!drag.moved) {

        if (Math.hypot(dx, dy) < DRAG_THRESHOLD) {
            return;
        }

        drag.moved = true;

        saveHistory();

    }

    const edge = machine.edges.find(e => e.id === drag.edgeId);

    if (!edge) {
        return;
    }

    edge.bendOffsetX = drag.startBend.x + dx / drag.weight;
    edge.bendOffsetY = drag.startBend.y + dy / drag.weight;

    renderEdges();

}


/* ---------- ALÇAS DA SETA SELECIONADA ---------- */

function startHandleDrag(handleElement, point) {

    const edge = machine.edges.find(
        e => e.id === Number(handleElement.dataset.edge)
    );

    if (!edge) {
        return;
    }

    const role = handleElement.dataset.handle;

    if (role === "ctrl") {

        const g = getEdgeGeometry(edge);

        drag = {
            type: "ctrl",
            edgeId: edge.id,
            startX: point.x,
            startY: point.y,
            moved: false,
            grabX: g ? g.control.x - point.x : 0,
            grabY: g ? g.control.y - point.y : 0
        };

        return;

    }

    drag = {
        type: "reconnect",
        edgeId: edge.id,
        end: role === "from" ? "from" : "to",
        startX: point.x,
        startY: point.y,
        moved: false
    };

}


function moveControlHandle(point) {

    if (!drag.moved) {

        if (
            Math.hypot(point.x - drag.startX, point.y - drag.startY) <
            DRAG_THRESHOLD
        ) {
            return;
        }

        drag.moved = true;

        saveHistory();

    }

    const edge = machine.edges.find(e => e.id === drag.edgeId);

    const g = edge && getEdgeGeometry(edge);

    if (!g) {
        return;
    }

    const middleX = (g.start.x + g.end.x) / 2;
    const middleY = (g.start.y + g.end.y) / 2;

    edge.bendOffsetX = point.x + drag.grabX - middleX;
    edge.bendOffsetY = point.y + drag.grabY - middleY;

    renderEdges();

}


function moveReconnectHandle(event, point) {

    if (!drag.moved) {

        if (
            Math.hypot(point.x - drag.startX, point.y - drag.startY) <
            DRAG_THRESHOLD
        ) {
            return;
        }

        drag.moved = true;

    }

    const edge = machine.edges.find(e => e.id === drag.edgeId);

    if (!edge) {
        return;
    }

    const otherId = drag.end === "to" ? edge.from : edge.to;

    let hover = getNodeUnderMouse(event);

    if (hover && hover.id === otherId) {
        hover = null;
    }

    reconnectPreview = {
        edgeId: edge.id,
        end: drag.end,
        x: point.x,
        y: point.y,
        hover
    };

    renderEdges();

}


/*
   Troca origem/destino de uma seta já existente.
   Mantém as mesmas regras de createEdge.
*/
function tryReconnectEdge(edge, from, to) {

    if (from === edge.from && to === edge.to) {
        return false;
    }

    if (from === to) {

        alert("Uma conexão não pode ligar um estado a ele mesmo.");

        return false;

    }

    const source = machine.nodes.find(n => n.id === from);
    const target = machine.nodes.find(n => n.id === to);

    if (!source || !target) {
        return false;
    }

    if (source.type !== "teste") {

        const alreadyExists = machine.edges.some(
            other =>
                other.id !== edge.id &&
                other.from === from &&
                other.to === to
        );

        if (alreadyExists) {

            alert("Essa conexão já existe.");

            return false;

        }

    }

    saveHistory();

    const index = machine.edges.filter(
        other =>
            other.id !== edge.id &&
            other.from === from &&
            other.to === to
    ).length;

    edge.from = from;
    edge.to = to;

    edge.bendOffsetX = 0;
    edge.bendOffsetY = [0, 30, -30, 45][index] ?? 0;

    /* O símbolo só existe em saídas de um teste e não pode repetir. */
    if (source.type !== "teste") {

        edge.label = "";

    } else if (
        edge.label &&
        machine.edges.some(
            other =>
                other.id !== edge.id &&
                other.from === from &&
                other.label === edge.label
        )
    ) {

        edge.label = "";

    }

    return true;

}


/* ---------- SELEÇÃO POR RETÂNGULO ---------- */

function startMarquee(event, point) {

    if (machine.connectionMode) {
        return;
    }

    const additive = isAdditive(event);

    drag = {
        type: "marquee",
        startX: point.x,
        startY: point.y,
        moved: false,
        additive,
        baseNodes: additive ? new Set(selection.nodes) : new Set(),
        baseEdges: additive ? new Set(selection.edges) : new Set()
    };

}


function updateMarquee(point) {

    if (!drag.moved) {

        if (
            Math.hypot(point.x - drag.startX, point.y - drag.startY) <
            DRAG_THRESHOLD
        ) {
            return;
        }

        drag.moved = true;

        selectionBox.style.display = "block";

    }

    const maxX = canvas.clientWidth;
    const maxY = canvas.clientHeight;

    const clamp = (value, max) => Math.max(0, Math.min(max, value));

    const rect = {
        left: clamp(Math.min(point.x, drag.startX), maxX),
        right: clamp(Math.max(point.x, drag.startX), maxX),
        top: clamp(Math.min(point.y, drag.startY), maxY),
        bottom: clamp(Math.max(point.y, drag.startY), maxY)
    };

    selectionBox.style.left = rect.left + "px";
    selectionBox.style.top = rect.top + "px";
    selectionBox.style.width = (rect.right - rect.left) + "px";
    selectionBox.style.height = (rect.bottom - rect.top) + "px";

    const hits = findItemsInRect(rect);

    const nodes = new Set(drag.baseNodes);
    const edges = new Set(drag.baseEdges);

    hits.nodes.forEach(id => nodes.add(id));
    hits.edges.forEach(id => edges.add(id));

    if (
        !sameSet(nodes, selection.nodes) ||
        !sameSet(edges, selection.edges)
    ) {

        selection.nodes = nodes;
        selection.edges = edges;

        refreshProperties();
        render();

    }

}


function pointInRect(x, y, rect) {

    return (
        x >= rect.left &&
        x <= rect.right &&
        y >= rect.top &&
        y <= rect.bottom
    );

}


/* Seleciona tudo o que o retângulo toca (como no Windows). */

function findItemsInRect(rect) {

    const nodes = [];
    const edges = [];

    machine.nodes.forEach(node => {

        const size = getNodeSize(node);

        const touches =
            node.x <= rect.right &&
            node.x + size.width >= rect.left &&
            node.y <= rect.bottom &&
            node.y + size.height >= rect.top;

        if (touches) {
            nodes.push(node.id);
        }

    });

    machine.edges.forEach(edge => {

        const g = getEdgeGeometry(edge);

        if (!g) {
            return;
        }

        for (let i = 0; i <= 30; i++) {

            const t = i / 30;
            const u = 1 - t;

            const x = u * u * g.start.x + 2 * t * u * g.control.x + t * t * g.end.x;
            const y = u * u * g.start.y + 2 * t * u * g.control.y + t * t * g.end.y;

            if (pointInRect(x, y, rect)) {
                edges.push(edge.id);
                break;
            }

        }

    });

    return { nodes, edges };

}


/* ---------- SOLTAR O MOUSE ---------- */

function endDrag(event) {

    if (!drag) {
        return;
    }

    const finished = drag;

    drag = null;

    try {
        canvas.releasePointerCapture(event.pointerId);
    } catch (_) {}

    const cancelled = event.type === "pointercancel";

    switch (finished.type) {

        case "connect": {

            removeConnectionPreview();

            const target = getNodeUnderMouse(event);

            const sourceId = machine.connectionStart;

            machine.connectionStart = null;

            if (!cancelled && target && target.id !== sourceId) {
                createEdge(sourceId, target.id);
            }

            break;

        }

        case "nodes":

            /* Clique simples num item de um grupo: fica só ele. */
            if (!finished.moved && finished.multi && !isAdditive(event)) {
                selectNode(finished.clickedId);
            }

            break;

        case "edge":

            if (!finished.moved && finished.multi && !isAdditive(event)) {
                selectEdge(finished.edgeId);
            }

            break;

        case "reconnect": {

            const preview = reconnectPreview;

            reconnectPreview = null;

            const edge = machine.edges.find(e => e.id === finished.edgeId);

            if (
                !cancelled &&
                finished.moved &&
                edge &&
                preview &&
                preview.hover
            ) {

                const from = finished.end === "from" ? preview.hover.id : edge.from;
                const to = finished.end === "to" ? preview.hover.id : edge.to;

                tryReconnectEdge(edge, from, to);

            }

            render();

            refreshProperties();

            break;

        }

        case "marquee":

            selectionBox.style.display = "none";

            /* Clique no fundo (sem arrastar) limpa a seleção. */
            if (!finished.moved && !finished.additive) {
                clearSelection();
            }

            break;

    }

}


/* =========================================================
   PROPRIEDADES DO ESTADO
   ========================================================= */

function showNodeProperties() {

    const node =
        machine.nodes.find(
            n =>
                n.id ===
                machine.selectedNode
        );


    if (!node) {

        properties.innerHTML =
            `
            <p class="empty">
                Selecione uma operação ou conexão.
            </p>
            `;

        return;

    }


    let html = `

        <div class="property">

            <label>
                Instrução
            </label>

            <input
                value="${nodeNames[node.type]}"
                disabled>

        </div>

    `;


    if (
        node.type ===
        "marcador"
    ) {

        html += `

            <div class="property">

                <small>
                    Acrescenta o símbolo #
                    ao final da fila.
                </small>

            </div>

        `;

    }


    if (
        node.type ===
        "atribuicao"
    ) {

        html += `

            <div class="property">

                <label>
                    Símbolo acrescentado
                </label>

                <select
                    id="nodeSymbol">

                    <option value="#">
                        #
                    </option>

                    <option value="0">
                        0
                    </option>

                    <option value="1">
                        1
                    </option>

                    <option value="a">
                        a
                    </option>

                    <option value="b">
                        b
                    </option>

                </select>

            </div>

        `;

    }


    html += `

        <button
            id="deleteNodeButton"
            style="width:100%;">

            🗑 Excluir estado

        </button>

    `;


    properties.innerHTML =
        html;


    if (
        node.type ===
        "atribuicao"
    ) {

        const select =
            document.getElementById(
                "nodeSymbol"
            );


        select.value =
            node.symbol;


        let oldValue =
            node.symbol;


        select.addEventListener(
            "change",
            () => {

                if (
                    oldValue !==
                    select.value
                ) {

                    saveHistory();

                }


                node.symbol =
                    select.value;


                oldValue =
                    node.symbol;


                render();

            }
        );

    }


    const deleteButton =
        document.getElementById(
            "deleteNodeButton"
        );


    if (deleteButton) {

        deleteButton.addEventListener(
            "click",
            () => {

                deleteSelectedNode();

            }
        );

    }

}


/* =========================================================
   PROPRIEDADES DA CONEXÃO
   (agora dá para trocar origem, destino, símbolo e curva
   a qualquer momento)
   ========================================================= */

function nodeOptionLabel(node) {

    return `#${node.id} · ${getNodeLabel(node)}`;

}


function showEdgeProperties() {

    const edge = machine.edges.find(e => e.id === machine.selectedEdge);

    if (!edge) {
        properties.innerHTML = EMPTY_PROPERTIES_HTML;
        return;
    }

    const source = machine.nodes.find(n => n.id === edge.from);
    const target = machine.nodes.find(n => n.id === edge.to);

    if (!source || !target) {
        return;
    }

    const isTest = source.type === "teste";

    const options = machine.nodes
        .map(n => `<option value="${n.id}">${nodeOptionLabel(n)}</option>`)
        .join("");

    let html = `
        <div class="property">
            <label>Origem</label>
            <select id="edgeFrom">${options}</select>
        </div>

        <div class="property">
            <label>Destino</label>
            <select id="edgeTo">${options}</select>
        </div>
    `;

    if (isTest) {

        html += `
            <div class="property">
                <label>Símbolo da saída</label>
                <select id="edgeLabel">
                    <option value="">Selecione...</option>
                    <option value="0">0</option>
                    <option value="1">1</option>
                    <option value="#">#</option>
                    <option value="ε">ε</option>
                </select>
            </div>
        `;

    } else {

        html += `
            <div class="property">
                <small>Esta conexão não precisa de símbolo.</small>
            </div>
        `;

    }

    html += `
        <div class="property">
            <small>
                Arraste a seta para curvá-la. Arraste as bolinhas
                azuis das pontas para ligar a outro estado.
            </small>
        </div>

        <button id="reverseEdgeButton" style="width:100%;margin-bottom:6px;">
            ⇄ Inverter sentido
        </button>

        <button id="resetBendButton" style="width:100%;margin-bottom:6px;">
            ↺ Resetar curva
        </button>

        <button id="deleteEdgeButton" style="width:100%;">
            🗑 Excluir conexão
        </button>
    `;

    properties.innerHTML = html;


    /* ---------- ORIGEM / DESTINO ---------- */

    const fromSelect = document.getElementById("edgeFrom");
    const toSelect = document.getElementById("edgeTo");

    fromSelect.value = edge.from;
    toSelect.value = edge.to;

    function applyEndpoints(from, to) {

        if (!tryReconnectEdge(edge, from, to)) {

            fromSelect.value = edge.from;
            toSelect.value = edge.to;

            return;

        }

        render();

        showEdgeProperties();

    }

    fromSelect.addEventListener("change", () => {
        applyEndpoints(Number(fromSelect.value), edge.to);
    });

    toSelect.addEventListener("change", () => {
        applyEndpoints(edge.from, Number(toSelect.value));
    });


    /* ---------- SÍMBOLO (saída de teste) ---------- */

    const labelSelect = document.getElementById("edgeLabel");

    if (labelSelect) {

        labelSelect.value = edge.label;

        labelSelect.addEventListener("change", () => {

            const newValue = labelSelect.value;

            if (newValue === edge.label) {
                return;
            }

            const other =
                newValue === ""
                    ? null
                    : machine.edges.find(
                        o =>
                            o.id !== edge.id &&
                            o.from === edge.from &&
                            o.label === newValue
                    );

            if (other) {

                const ok = confirm(
                    `Já existe uma saída "${newValue}" neste teste.\n` +
                    `Trocar os símbolos entre as duas conexões?`
                );

                if (!ok) {
                    labelSelect.value = edge.label;
                    return;
                }

            }

            saveHistory();

            if (other) {
                other.label = edge.label;
            }

            edge.label = newValue;

            renderEdges();

            showEdgeProperties();

        });

    }


    /* ---------- BOTÕES ---------- */

    document
        .getElementById("reverseEdgeButton")
        .addEventListener("click", () => {

            if (tryReconnectEdge(edge, edge.to, edge.from)) {

                render();

                showEdgeProperties();

            }

        });

    document
        .getElementById("resetBendButton")
        .addEventListener("click", () => {

            saveHistory();

            const index = machine.edges.filter(
                o =>
                    o.id !== edge.id &&
                    o.from === edge.from &&
                    o.to === edge.to
            ).length;

            edge.bendOffsetX = 0;
            edge.bendOffsetY = [0, 30, -30, 45][index] ?? 0;

            renderEdges();

        });

    document
        .getElementById("deleteEdgeButton")
        .addEventListener("click", deleteSelected);

}


/* =========================================================
   EXCLUIR (estados e conexões de uma vez)
   ========================================================= */

function deleteSelected() {

    if (selectionCount() === 0) {
        return;
    }

    saveHistory();

    const nodeIds = new Set(selection.nodes);
    const edgeIds = new Set(selection.edges);

    machine.nodes = machine.nodes.filter(n => !nodeIds.has(n.id));

    machine.edges = machine.edges.filter(
        e =>
            !edgeIds.has(e.id) &&
            !nodeIds.has(e.from) &&
            !nodeIds.has(e.to)
    );

    if (machine.currentNode !== null && nodeIds.has(machine.currentNode)) {
        machine.currentNode = null;
    }

    selection.nodes.clear();
    selection.edges.clear();

    properties.innerHTML = EMPTY_PROPERTIES_HTML;

    render();

}


function deleteSelectedNode() {

    deleteSelected();

}


function deleteSelectedEdge() {

    deleteSelected();

}


/* =========================================================
   TECLADO
   ========================================================= */

document.addEventListener("keydown", event => {

    const active = document.activeElement;

    const tag = active ? active.tagName : "";

    const typing = tag === "INPUT" || tag === "TEXTAREA";

    const typingOrSelect = typing || tag === "SELECT";

    const key = event.key.toLowerCase();

    const mod = event.ctrlKey || event.metaKey;

    /* CTRL + Z */
    if (mod && key === "z") {

        if (typing) {
            return;
        }

        event.preventDefault();

        undo();

        return;

    }

    /* CTRL + A */
    if (mod && key === "a") {

        if (typingOrSelect) {
            return;
        }

        event.preventDefault();

        selectAll();

        return;

    }

    /* DELETE / BACKSPACE */
    if (event.key === "Delete" || event.key === "Backspace") {

        if (typingOrSelect) {
            return;
        }

        if (selectionCount() === 0) {
            return;
        }

        event.preventDefault();

        deleteSelected();

        return;

    }

    /* ESC */
    if (event.key === "Escape") {

        drag = null;

        reconnectPreview = null;

        selectionBox.style.display = "none";

        machine.connectionMode = false;
        machine.connectionStart = null;

        removeConnectionPreview();

        selection.nodes.clear();
        selection.edges.clear();

        modeText.textContent = "Modo: seleção";

        modeText.classList.remove("connection-mode");

        canvas.classList.remove("connection-active");

        properties.innerHTML = EMPTY_PROPERTIES_HTML;

        render();

    }

});


/* =========================================================
   PALAVRA DE ENTRADA
   ========================================================= */

function setInputWord() {

    const input =
        document.getElementById(
            "inputWord"
        );


    if (!input) {

        return;

    }


    machine.inputWord =
        input.value.trim();


    machine.queue =
        [
            ...machine.inputWord
        ];


    machine.currentNode =
        null;


    updateQueue();


    executionStatus.textContent =
        "Entrada definida.";

}


/* =========================================================
   FILA
   ========================================================= */

function updateQueue() {

    if (
        machine.queue.length ===
        0
    ) {

        queueElement.textContent =
            "ε";


        return;

    }


    queueElement.textContent =
        machine.queue.join("");

}


/* =========================================================
   VALIDAÇÃO
   ========================================================= */

function validateMachine() {

    const errors = [];

    const warnings = [];


    const starts =
        machine.nodes.filter(
            n =>
                n.type ===
                "partida"
        );


    if (
        starts.length ===
        0
    ) {

        errors.push(
            "A máquina precisa possuir uma instrução de partida."
        );

    }


    if (
        starts.length >
        1
    ) {

        errors.push(
            "A máquina deve possuir somente uma instrução de partida."
        );

    }


    const markers =
        machine.nodes.filter(
            n =>
                n.type ===
                "marcador"
        );


    if (
        markers.length ===
        0
    ) {

        warnings.push(
            "A máquina não possui a instrução X ← X#."
        );

    }


    const tests =
        machine.nodes.filter(
            n =>
                n.type ===
                "teste"
        );


    tests.forEach(
        test => {

            const outgoing =
                machine.edges.filter(
                    edge =>
                        edge.from ===
                        test.id
                );


            if (
                outgoing.length ===
                0
            ) {

                warnings.push(
                    "Um teste não possui nenhuma saída."
                );

            }


            const labels =
                outgoing
                    .map(
                        edge =>
                            edge.label
                    )
                    .filter(
                        label =>
                            label !== ""
                    );


            const unique =
                new Set(
                    labels
                );


            if (
                unique.size !==
                labels.length
            ) {

                errors.push(
                    "Um teste possui duas saídas com o mesmo símbolo."
                );

            }

        }
    );


    if (
        errors.length ===
        0
    ) {

        validationResult.innerHTML =
            `
            <div class="success">
                ✓ Estrutura básica válida.
            </div>
            `;

    } else {

        validationResult.innerHTML =
            `
            <div class="error">

                ${
                    errors
                        .map(
                            error =>
                                "✗ " +
                                error
                        )
                        .join(
                            "<br>"
                        )
                }

            </div>
            `;

    }


    if (
        warnings.length >
        0
    ) {

        validationResult.innerHTML +=
            `
            <div
                class="warning"
                style="margin-top:8px;">

                ${
                    warnings
                        .map(
                            warning =>
                                "⚠ " +
                                warning
                        )
                        .join(
                            "<br>"
                        )
                }

            </div>
            `;

    }

}


/* =========================================================
   PRÓXIMO ESTADO
   ========================================================= */

function getNextNode(
    currentNode,
    symbol
) {

    const outgoing =
        machine.edges.filter(
            edge =>
                edge.from ===
                currentNode.id
        );


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
            node =>
                node.id ===
                edge.to
        );

    }


    if (
        outgoing.length ===
        0
    ) {

        return null;

    }


    return machine.nodes.find(
        node =>
            node.id ===
            outgoing[0].to
    );

}


/* =========================================================
   EXECUTAR UM PASSO
   ========================================================= */

function stepMachine() {

    if (
        machine.currentNode ===
        null
    ) {

        const start =
            machine.nodes.find(
                node =>
                    node.type ===
                    "partida"
            );


        if (!start) {

            executionStatus.textContent =
                "Erro: não existe instrução de partida.";


            return false;

        }


        machine.currentNode =
            start.id;


        render();


        return true;

    }


    const current =
        machine.nodes.find(
            node =>
                node.id ===
                machine.currentNode
        );


    if (!current) {

        return false;

    }


    /*
     ========================================================
     ACEITA
     ========================================================
    */

    if (
        current.type ===
        "aceita"
    ) {

        executionStatus.textContent =
            "✓ Palavra aceita.";


        machine.running =
            false;


        return false;

    }


    /*
     ========================================================
     REJEITA
     ========================================================
    */

    if (
        current.type ===
        "rejeita"
    ) {

        executionStatus.textContent =
            "✗ Palavra rejeitada.";


        machine.running =
            false;


        return false;

    }


    /*
     ========================================================
     MARCADOR
     ========================================================
    */

    if (
        current.type ===
        "marcador"
    ) {

        machine.queue.push(
            "#"
        );


        updateQueue();

    }


    /*
     ========================================================
     ATRIBUIÇÃO
     ========================================================
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
     ========================================================
     TESTE
     ========================================================
    */

    if (
        current.type ===
        "teste"
    ) {

        let symbol =
            "ε";


        if (
            machine.queue.length >
            0
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


            machine.running =
                false;


            return false;

        }


        machine.currentNode =
            next.id;


        render();


        return true;

    }


    /*
     ========================================================
     INSTRUÇÃO NORMAL
     ========================================================
    */

    const next =
        getNextNode(
            current,
            ""
        );


    if (!next) {

        executionStatus.textContent =
            "A instrução não possui uma saída.";


        machine.running =
            false;


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

    if (
        machine.running
    ) {

        return;

    }


    machine.running =
        true;


    executionStatus.textContent =
        "Executando...";


    let steps =
        0;


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
                    steps >=
                    10000
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


    if (
        machine.timer
    ) {

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
   RESETAR EXECUÇÃO
   ========================================================= */

function resetExecution() {

    pauseMachine();


    machine.queue =
        [
            ...machine.inputWord
        ];


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


    if (
        machine.nodes.length >
            0 ||
        machine.edges.length >
            0
    ) {

        saveHistory();

    }


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


    removeConnectionPreview();


    const input =
        document.getElementById(
            "inputWord"
        );


    if (input) {

        input.value = "";

    }


    properties.innerHTML =
        `
        <p class="empty">
            Selecione uma operação ou conexão.
        </p>
        `;


    validationResult.innerHTML =
        "";


    modeText.textContent =
        "Modo: seleção";


    modeText.classList.remove(
        "connection-mode"
    );


    canvas.classList.remove(
        "connection-active"
    );


    updateQueue();


    render();

}


/* =========================================================
   EXEMPLO
   ========================================================= */

function loadExample() {

    if (
        machine.nodes.length > 0 ||
        machine.edges.length > 0
    ) {

        saveHistory();

    }


    pauseMachine();


    machine.nodes = [];

    machine.edges = [];

    machine.nextNodeId = 1;

    machine.nextEdgeId = 1;

    machine.selectedNode = null;

    machine.selectedEdge = null;

    machine.currentNode = null;

    machine.connectionMode = false;

    machine.connectionStart = null;


    removeConnectionPreview();


    /*
     ========================================================
     TAMANHO DA ÁREA
     ========================================================
    */

    const canvasWidth =
        canvas.clientWidth || 1200;


    const canvasHeight =
        canvas.clientHeight || 500;


    /*
     ========================================================
     POSIÇÃO CENTRAL
     ========================================================
    */

    const machineWidth =
        650;


    const startX =
        Math.max(
            30,
            (
                canvasWidth -
                machineWidth
            ) / 2
        );


    const centerY =
        Math.max(
            100,
            canvasHeight / 2
        );


    /*
     ========================================================
     PARTIDA
     ========================================================
    */

    const start = {

        id:
            machine.nextNodeId++,

        type:
            "partida",

        x:
            startX,

        y:
            centerY - 26

    };


    /*
     ========================================================
     X ← X#
     ========================================================
    */

    const marker = {

        id:
            machine.nextNodeId++,

        type:
            "marcador",

        x:
            startX + 115,

        y:
            centerY - 30

    };


    /*
     ========================================================
     X ← ler(X)
     ========================================================
    */

    const test = {

        id:
            machine.nextNodeId++,

        type:
            "teste",

        x:
            startX + 305,

        y:
            centerY - 30

    };


    /*
     ========================================================
     ACEITA
     ========================================================
    */

    const accept = {

        id:
            machine.nextNodeId++,

        type:
            "aceita",

        x:
            startX + 550,

        y:
            centerY - 145

    };


    /*
     ========================================================
     REJEITA
     ========================================================
    */

    const reject = {

        id:
            machine.nextNodeId++,

        type:
            "rejeita",

        x:
            startX + 550,

        y:
            centerY + 90

    };


    machine.nodes.push(
        start,
        marker,
        test,
        accept,
        reject
    );


    /*
     ========================================================
     PARTIDA → X ← X#
     ========================================================
    */

    machine.edges.push({

        id:
            machine.nextEdgeId++,

        from:
            start.id,

        to:
            marker.id,

        label:
            "",

        bendOffsetX:
            0,

        bendOffsetY:
            0

    });


    /*
     ========================================================
     X ← X# → X ← ler(X)
     ========================================================
    */

    machine.edges.push({

        id:
            machine.nextEdgeId++,

        from:
            marker.id,

        to:
            test.id,

        label:
            "",

        bendOffsetX:
            0,

        bendOffsetY:
            0

    });


    /*
     ========================================================
     TESTE → ACEITA : 0
     ========================================================
    */

    machine.edges.push({

        id:
            machine.nextEdgeId++,

        from:
            test.id,

        to:
            accept.id,

        label:
            "0",

        bendOffsetX:
            0,

        bendOffsetY:
            30

    });


    /*
     ========================================================
     TESTE → ACEITA : ε
     ========================================================
    */

    machine.edges.push({

        id:
            machine.nextEdgeId++,

        from:
            test.id,

        to:
            accept.id,

        label:
            "ε",

        bendOffsetX:
            0,

        bendOffsetY:
            -30

    });


    /*
     ========================================================
     TESTE → REJEITA : 1
     ========================================================
    */

    machine.edges.push({

        id:
            machine.nextEdgeId++,

        from:
            test.id,

        to:
            reject.id,

        label:
            "1",

        bendOffsetX:
            0,

        bendOffsetY:
            -30

    });


    /*
     ========================================================
     TESTE → REJEITA : #
     ========================================================
    */

    machine.edges.push({

        id:
            machine.nextEdgeId++,

        from:
            test.id,

        to:
            reject.id,

        label:
            "#",

        bendOffsetX:
            0,

        bendOffsetY:
            30

    });


    render();


    /*
     ========================================================
     ENTRADA DO EXEMPLO
     ========================================================
    */

    const input =
        document.getElementById(
            "inputWord"
        );


    if (input) {

        input.value =
            "0";

    }


    setInputWord();

}


/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */

render();
