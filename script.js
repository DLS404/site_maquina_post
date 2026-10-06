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
   TAMANHO PADRÃO DOS ESTADOS
   ========================================================= */

const NODE_WIDTH = 130;
const NODE_HEIGHT = 60;


/* =========================================================
   TAMANHOS DOS ESTADOS CIRCULARES
   =========================================================

   Esses valores precisam acompanhar o CSS.

   PARTIDA é menor que ACEITA/REJEITA.
   ========================================================= */

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
   PONTO EXATO DA BORDA
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


    /* =====================================================
       ESTADOS OVAIS
       ===================================================== */

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
                dx / denominator,

            y:
                cy +
                dy / denominator

        };

    }


    /* =====================================================
       ESTADOS RETANGULARES
       ===================================================== */

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
   GEOMETRIA DAS CONEXÕES
   ========================================================= */

function getEdgeGeometry(edge) {

    const source =
        machine.nodes.find(
            n =>
                n.id ===
                edge.from
        );


    const target =
        machine.nodes.find(
            n =>
                n.id ===
                edge.to
        );


    if (
        !source ||
        !target
    ) {

        return null;

    }


    const sourceCenter =
        nodeCenter(source);


    const targetCenter =
        nodeCenter(target);


    /*
       Borda real do estado de origem.
    */

    const start =
        getConnectionPoint(
            source,
            targetCenter.x,
            targetCenter.y
        );


    /*
       Borda real do estado de destino.
    */

    const end =
        getConnectionPoint(
            target,
            sourceCenter.x,
            sourceCenter.y
        );


    /*
       Centro da conexão.
    */

    const middleX =
        (
            start.x +
            end.x
        ) / 2;


    const middleY =
        (
            start.y +
            end.y
        ) / 2;


    /*
       Compatibilidade com conexões antigas.
    */

    if (
        edge.bendOffsetX ===
        undefined
    ) {

        edge.bendOffsetX = 0;

    }


    if (
        edge.bendOffsetY ===
        undefined
    ) {

        edge.bendOffsetY = 0;

    }


    const control = {

        x:
            middleX +
            edge.bendOffsetX,

        y:
            middleY +
            edge.bendOffsetY

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
   RENDER
   ========================================================= */

function render() {

    renderNodes();

    renderEdges();

}


/* =========================================================
   RENDER DOS ESTADOS
   ========================================================= */

function renderNodes() {

    nodesContainer.innerHTML =
        "";


    machine.nodes.forEach(
        node => {

            const element =
                document.createElement(
                    "div"
                );


            element.className =
                `node ${node.type}`;


            if (
                machine.selectedNode ===
                node.id
            ) {

                element.classList.add(
                    "selected"
                );

            }


            if (
                machine.currentNode ===
                node.id
            ) {

                element.classList.add(
                    "current"
                );

            }


            element.dataset.id =
                node.id;


            element.style.left =
                node.x + "px";


            element.style.top =
                node.y + "px";


            element.textContent =
                getNodeLabel(
                    node
                );


            nodesContainer.appendChild(
                element
            );


            setupNodeDragging(
                element,
                node
            );

        }
    );

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
   ARRASTAR ESTADOS
   ========================================================= */

function setupNodeDragging(
    element,
    node
) {

    let dragging =
        false;


    let offsetX =
        0;


    let offsetY =
        0;


    element.addEventListener(
        "mousedown",
        event => {

            if (
                machine.connectionMode
            ) {

                event.stopPropagation();


                handleConnectionClick(
                    node
                );


                return;

            }


            if (
                event.button !== 0
            ) {

                return;

            }


            saveHistory();


            dragging =
                true;


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


            selectNode(
                node.id
            );


            event.preventDefault();

        }
    );


    const moveHandler =
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


            const size =
                getNodeSize(node);


            node.x =
                Math.max(
                    5,

                    Math.min(
                        canvas.clientWidth -
                        size.width -
                        5,

                        node.x
                    )
                );


            node.y =
                Math.max(
                    5,

                    Math.min(
                        canvas.clientHeight -
                        size.height -
                        5,

                        node.y
                    )
                );


            render();

        };


    const upHandler =
        () => {

            dragging =
                false;

        };


    document.addEventListener(
        "mousemove",
        moveHandler
    );


    document.addEventListener(
        "mouseup",
        upHandler
    );

}


/* =========================================================
   SELECIONAR ESTADO
   ========================================================= */

function selectNode(id) {

    machine.selectedNode =
        id;


    machine.selectedEdge =
        null;


    showNodeProperties();


    render();

}


/* =========================================================
   SELECIONAR CONEXÃO
   ========================================================= */

function selectEdge(id) {

    machine.selectedEdge =
        id;


    machine.selectedNode =
        null;


    showEdgeProperties();


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


    if (
        machine.connectionMode
    ) {

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
   CRIAR CONEXÃO
   ========================================================= */

function handleConnectionClick(
    node
) {

    if (
        !machine.connectionStart
    ) {

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

        machine.connectionStart =
            null;


        modeText.textContent =
            "Escolha outro nó.";


        return;

    }


    createEdge(
        machine.connectionStart,
        node.id
    );


    machine.connectionStart =
        null;


    modeText.textContent =
        "Conexão criada.";

}


/* =========================================================
   CRIAR CONEXÃO
   ========================================================= */

function createEdge(
    from,
    to
) {

    saveHistory();


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


    let label =
        "";


    if (
        source.type ===
        "teste"
    ) {

        label =
            "ε";

    }


    const parallelEdges =
        machine.edges.filter(
            e =>
                e.from === from &&
                e.to === to
        );


    const index =
        parallelEdges.length;


    /*
       Curvas pequenas.
    */

    let bendOffsetY =
        0;


    if (
        index === 1
    ) {

        bendOffsetY =
            12;

    }


    if (
        index === 2
    ) {

        bendOffsetY =
            -22;

    }


    if (
        index === 3
    ) {

        bendOffsetY =
            22;

    }


    const edge = {

        id:
            machine.nextEdgeId++,

        from,

        to,

        label,

        bendOffsetX:
            0,

        bendOffsetY

    };


    machine.edges.push(
        edge
    );


    selectEdge(
        edge.id
    );

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
   RENDER DAS CONEXÕES
   ========================================================= */

function renderEdges() {

    /*
       Remove apenas elementos das conexões.
       O <defs> e o marcador continuam intactos.
    */

    svg.querySelectorAll(
        ".edge-element"
    ).forEach(
        element =>
            element.remove()
    );


    createArrowMarker();


    machine.edges.forEach(
        edge => {

            const geometry =
                getEdgeGeometry(
                    edge
                );


            if (!geometry) {

                return;

            }


            const {
                start,
                end,
                control
            } = geometry;


            /* =================================================
               HITBOX INVISÍVEL
               ================================================= */

            const hitPath =
                document.createElementNS(
                    "http://www.w3.org/2000/svg",
                    "path"
                );


            hitPath.classList.add(
                "edge-element",
                "edge-hit"
            );


            hitPath.setAttribute(
                "d",
                `
                M ${start.x} ${start.y}
                Q ${control.x} ${control.y}
                  ${end.x} ${end.y}
                `
            );


            hitPath.setAttribute(
                "fill",
                "none"
            );


            hitPath.setAttribute(
                "stroke",
                "transparent"
            );


            hitPath.setAttribute(
                "stroke-width",
                "20"
            );


            hitPath.setAttribute(
                "pointer-events",
                "stroke"
            );


            hitPath.style.cursor =
                "grab";


            setupEdgeDragging(
                hitPath,
                edge
            );


            svg.appendChild(
                hitPath
            );


            /* =================================================
               LINHA VISÍVEL
               ================================================= */

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
                `
                M ${start.x} ${start.y}
                Q ${control.x} ${control.y}
                  ${end.x} ${end.y}
                `
            );


            /*
               A SETA.
            */

            path.setAttribute(
                "marker-end",
                "url(#post-arrowhead)"
            );


            path.setAttribute(
                "pointer-events",
                "none"
            );


            path.setAttribute(
                "fill",
                "none"
            );


            path.setAttribute(
                "stroke",
                "#555"
            );


            path.setAttribute(
                "stroke-width",
                "2"
            );


            svg.appendChild(
                path
            );


            /* =================================================
               RÓTULO
               ================================================= */

            if (
                edge.label
            ) {

                const labelX =
                    0.20 * start.x +
                    0.60 * control.x +
                    0.20 * end.x;


                const labelY =
                    0.20 * start.y +
                    0.60 * control.y +
                    0.20 * end.y;


                const group =
                    document.createElementNS(
                        "http://www.w3.org/2000/svg",
                        "g"
                    );


                group.classList.add(
                    "edge-element"
                );


                const background =
                    document.createElementNS(
                        "http://www.w3.org/2000/svg",
                        "rect"
                    );


                background.setAttribute(
                    "x",
                    labelX - 13
                );


                background.setAttribute(
                    "y",
                    labelY - 14
                );


                background.setAttribute(
                    "width",
                    26
                );


                background.setAttribute(
                    "height",
                    21
                );


                background.setAttribute(
                    "rx",
                    4
                );


                background.setAttribute(
                    "fill",
                    "#ffffff"
                );


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
                    labelY + 4
                );


                label.setAttribute(
                    "text-anchor",
                    "middle"
                );


                label.textContent =
                    edge.label;


                group.setAttribute(
                    "pointer-events",
                    "none"
                );


                group.appendChild(
                    background
                );


                group.appendChild(
                    label
                );


                svg.appendChild(
                    group
                );

            }


            /* =================================================
               PONTO DE CONTROLE
               ================================================= */

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
                    control.x
                );


                handle.setAttribute(
                    "cy",
                    control.y
                );


                handle.setAttribute(
                    "r",
                    7
                );


                handle.setAttribute(
                    "fill",
                    "#ffffff"
                );


                handle.setAttribute(
                    "stroke",
                    "#1677ff"
                );


                handle.setAttribute(
                    "stroke-width",
                    "2"
                );


                handle.style.cursor =
                    "grab";


                setupEdgeHandle(
                    handle,
                    edge
                );


                svg.appendChild(
                    handle
                );

            }

        }
    );

}


/* =========================================================
   ARRASTAR SETA
   ========================================================= */

function setupEdgeDragging(
    element,
    edge
) {

    let dragging =
        false;


    element.addEventListener(
        "pointerdown",
        event => {

            if (
                event.button !== 0
            ) {

                return;

            }


            saveHistory();


            dragging =
                true;


            selectEdge(
                edge.id
            );


            try {

                element.setPointerCapture(
                    event.pointerId
                );

            } catch (_) {}


            element.style.cursor =
                "grabbing";


            event.preventDefault();

            event.stopPropagation();

        }
    );


    element.addEventListener(
        "pointermove",
        event => {

            if (!dragging) {

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


            const source =
                machine.nodes.find(
                    n =>
                        n.id ===
                        edge.from
                );


            const target =
                machine.nodes.find(
                    n =>
                        n.id ===
                        edge.to
                );


            if (
                !source ||
                !target
            ) {

                return;

            }


            const sourceCenter =
                nodeCenter(
                    source
                );


            const targetCenter =
                nodeCenter(
                    target
                );


            const start =
                getConnectionPoint(
                    source,
                    targetCenter.x,
                    targetCenter.y
                );


            const end =
                getConnectionPoint(
                    target,
                    sourceCenter.x,
                    sourceCenter.y
                );


            const middleX =
                (
                    start.x +
                    end.x
                ) / 2;


            const middleY =
                (
                    start.y +
                    end.y
                ) / 2;


            edge.bendOffsetX =
                mouseX -
                middleX;


            edge.bendOffsetY =
                mouseY -
                middleY;


            renderEdges();

        }
    );


    element.addEventListener(
        "pointerup",
        event => {

            dragging =
                false;


            try {

                element.releasePointerCapture(
                    event.pointerId
                );

            } catch (_) {}


            element.style.cursor =
                "grab";

        }
    );


    element.addEventListener(
        "pointercancel",
        () => {

            dragging =
                false;


            element.style.cursor =
                "grab";

        }
    );

}


/* =========================================================
   ARRASTAR PONTO DE CONTROLE
   ========================================================= */

function setupEdgeHandle(
    handle,
    edge
) {

    let dragging =
        false;


    handle.addEventListener(
        "pointerdown",
        event => {

            if (
                event.button !== 0
            ) {

                return;

            }


            saveHistory();


            dragging =
                true;


            try {

                handle.setPointerCapture(
                    event.pointerId
                );

            } catch (_) {}


            handle.style.cursor =
                "grabbing";


            event.preventDefault();

            event.stopPropagation();

        }
    );


    handle.addEventListener(
        "pointermove",
        event => {

            if (!dragging) {

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


            const source =
                machine.nodes.find(
                    n =>
                        n.id ===
                        edge.from
                );


            const target =
                machine.nodes.find(
                    n =>
                        n.id ===
                        edge.to
                );


            if (
                !source ||
                !target
            ) {

                return;

            }


            const sourceCenter =
                nodeCenter(
                    source
                );


            const targetCenter =
                nodeCenter(
                    target
                );


            const start =
                getConnectionPoint(
                    source,
                    targetCenter.x,
                    targetCenter.y
                );


            const end =
                getConnectionPoint(
                    target,
                    sourceCenter.x,
                    sourceCenter.y
                );


            const middleX =
                (
                    start.x +
                    end.x
                ) / 2;


            const middleY =
                (
                    start.y +
                    end.y
                ) / 2;


            edge.bendOffsetX =
                mouseX -
                middleX;


            edge.bendOffsetY =
                mouseY -
                middleY;


            renderEdges();

        }
    );


    handle.addEventListener(
        "pointerup",
        event => {

            dragging =
                false;


            try {

                handle.releasePointerCapture(
                    event.pointerId
                );

            } catch (_) {}


            handle.style.cursor =
                "grab";

        }
    );


    handle.addEventListener(
        "pointercancel",
        () => {

            dragging =
                false;


            handle.style.cursor =
                "grab";

        }
    );

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

}


/* =========================================================
   PROPRIEDADES DA CONEXÃO
   ========================================================= */

function showEdgeProperties() {

    const edge =
        machine.edges.find(
            e =>
                e.id ===
                machine.selectedEdge
        );


    if (!edge) {

        properties.innerHTML =
            `
            <p class="empty">
                Selecione uma operação ou conexão.
            </p>
            `;

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
            id="deleteEdgeButton"
            style="width:100%;">

            Excluir conexão

        </button>

    `;


    const input =
        document.getElementById(
            "edgeLabel"
        );


    let originalLabel =
        edge.label;


    input.addEventListener(
        "change",
        () => {

            if (
                originalLabel !==
                input.value
            ) {

                saveHistory();

            }


            edge.label =
                input.value;


            originalLabel =
                edge.label;


            renderEdges();

        }
    );


    const deleteButton =
        document.getElementById(
            "deleteEdgeButton"
        );


    deleteButton.addEventListener(
        "click",
        () => {

            deleteSelectedEdge();

        }
    );

}


/* =========================================================
   EXCLUIR SELECIONADO
   ========================================================= */

function deleteSelected() {

    if (
        machine.selectedNode !==
            null ||
        machine.selectedEdge !==
            null
    ) {

        saveHistory();

    }


    if (
        machine.selectedNode !==
        null
    ) {

        const id =
            machine.selectedNode;


        machine.nodes =
            machine.nodes.filter(
                n =>
                    n.id !==
                    id
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
            `
            <p class="empty">
                Selecione uma operação ou conexão.
            </p>
            `;


        render();


        return;

    }


    if (
        machine.selectedEdge !==
        null
    ) {

        const id =
            machine.selectedEdge;


        machine.edges =
            machine.edges.filter(
                e =>
                    e.id !==
                    id
            );


        machine.selectedEdge =
            null;


        properties.innerHTML =
            `
            <p class="empty">
                Selecione uma operação ou conexão.
            </p>
            `;


        render();

    }

}


/* =========================================================
   EXCLUIR CONEXÃO
   ========================================================= */

function deleteSelectedEdge() {

    if (
        machine.selectedEdge ===
        null
    ) {

        return;

    }


    saveHistory();


    machine.edges =
        machine.edges.filter(
            e =>
                e.id !==
                machine.selectedEdge
        );


    machine.selectedEdge =
        null;


    properties.innerHTML =
        `
        <p class="empty">
            Selecione uma operação ou conexão.
        </p>
        `;


    render();

}


/* =========================================================
   TECLADO
   ========================================================= */

document.addEventListener(
    "keydown",
    event => {

        /* CTRL + Z */

        if (
            event.ctrlKey &&
            event.key.toLowerCase() ===
                "z"
        ) {

            const active =
                document.activeElement;


            if (
                active &&
                (
                    active.tagName ===
                        "INPUT" ||

                    active.tagName ===
                        "TEXTAREA"
                )
            ) {

                return;

            }


            event.preventDefault();


            undo();


            return;

        }


        /* DELETE */

        if (
            event.key ===
                "Delete" ||

            event.key ===
                "Backspace"
        ) {

            const active =
                document.activeElement;


            if (
                active &&
                (
                    active.tagName ===
                        "INPUT" ||

                    active.tagName ===
                        "SELECT" ||

                    active.tagName ===
                        "TEXTAREA"
                )
            ) {

                return;

            }


            deleteSelected();

        }


        /* ESC */

        if (
            event.key ===
            "Escape"
        ) {

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


            properties.innerHTML =
                `
                <p class="empty">
                    Selecione uma operação ou conexão.
                </p>
                `;


            render();

        }

    }
);


/* =========================================================
   PALAVRA DE ENTRADA
   ========================================================= */

function setInputWord() {

    const input =
        document.getElementById(
            "inputWord"
        );


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

    const errors =
        [];


    const warnings =
        [];


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
                    e =>
                        e.from ===
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
                            e =>
                                "✗ " + e
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
                            w =>
                                "⚠ " + w
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
            e =>
                e.from ===
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
            n =>
                n.id ===
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
        n =>
            n.id ===
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
                n =>
                    n.type ===
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
            n =>
                n.id ===
                machine.currentNode
        );


    if (!current) {

        return false;

    }


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


    if (
        current.type ===
        "marcador"
    ) {

        machine.queue.push(
            "#"
        );


        updateQueue();

    }


    if (
        current.type ===
        "atribuicao"
    ) {

        machine.queue.push(
            current.symbol
        );


        updateQueue();

    }


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


    machine.nodes =
        [];


    machine.edges =
        [];


    machine.nextNodeId =
        1;


    machine.nextEdgeId =
        1;


    machine.selectedNode =
        null;


    machine.selectedEdge =
        null;


    machine.connectionMode =
        false;


    machine.connectionStart =
        null;


    machine.currentNode =
        null;


    machine.inputWord =
        "";


    machine.queue =
        [];


    const input =
        document.getElementById(
            "inputWord"
        );


    if (input) {

        input.value =
            "";

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


    updateQueue();


    render();

}


/* =========================================================
   EXEMPLO
   ========================================================= */

function loadExample() {

    if (
        machine.nodes.length >
            0 ||
        machine.edges.length >
            0
    ) {

        saveHistory();

    }


    pauseMachine();


    machine.nodes =
        [];


    machine.edges =
        [];


    machine.nextNodeId =
        1;


    machine.nextEdgeId =
        1;


    machine.selectedNode =
        null;


    machine.selectedEdge =
        null;


    machine.currentNode =
        null;


    /*
       =====================================================
       PARTIDA
       =====================================================

       Agora ela fica mais próxima do X ← X#.
    */

    const start = {

        id:
            machine.nextNodeId++,

        type:
            "partida",

        x:
            30,

        y:
            174

    };


    /*
       =====================================================
       X ← X#
       =====================================================
    */

    const marker = {

        id:
            machine.nextNodeId++,

        type:
            "marcador",

        x:
            140,

        y:
            170

    };


    /*
       =====================================================
       X ← ler(X)
       =====================================================
    */

    const test = {

        id:
            machine.nextNodeId++,

        type:
            "teste",

        x:
            330,

        y:
            170

    };


    /*
       =====================================================
       ACEITA
       =====================================================
    */

    const accept = {

        id:
            machine.nextNodeId++,

        type:
            "aceita",

        x:
            570,

        y:
            60

    };


    /*
       =====================================================
       REJEITA
       =====================================================
    */

    const reject = {

        id:
            machine.nextNodeId++,

        type:
            "rejeita",

        x:
            570,

        y:
            280

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
       X ← X# → X ← ler(X)
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
       0 → ACEITA
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
            12

    });


    /*
       ε → ACEITA
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
            -12

    });


    /*
       1 → REJEITA
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
            12

    });


    /*
       # → REJEITA
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
            -12

    });


    render();


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
   CLIQUE NO FUNDO
   ========================================================= */

canvas.addEventListener(
    "mousedown",
    event => {

        if (
            event.target ===
                canvas ||
            event.target ===
                nodesContainer
        ) {

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

        }

    }
);


/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */

render();