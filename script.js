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
   RENDER GERAL
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
   ARRASTAR ESTADO / CRIAR CONEXÃO
   ========================================================= */

function setupNodeDragging(
    element,
    node
) {

    let dragging = false;

    let connecting = false;

    let offsetX = 0;

    let offsetY = 0;


    element.addEventListener(
        "mousedown",
        event => {

            if (
                event.button !== 0
            ) {

                return;

            }


            /*
             ================================================
             MODO DE CONEXÃO
             ================================================
            */

            if (
                machine.connectionMode
            ) {

                event.preventDefault();

                event.stopPropagation();


                connecting = true;

                machine.connectionStart =
                    node.id;


                createConnectionPreview(
                    node,
                    event
                );


                return;

            }


            /*
             ================================================
             MODO NORMAL
             ================================================
            */

            saveHistory();


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


            selectNode(
                node.id
            );


            event.preventDefault();

        }
    );


    /*
     ========================================================
     MOVIMENTO
     ========================================================
    */

    const moveHandler =
        event => {

            /*
             -----------------------------------------------
             CONECTANDO
             -----------------------------------------------
            */

            if (
                connecting
            ) {

                updateConnectionPreview(
                    event
                );

                return;

            }


            /*
             -----------------------------------------------
             MOVENDO ESTADO
             -----------------------------------------------
            */

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


    /*
     ========================================================
     SOLTAR
     ========================================================
    */

    const upHandler =
        event => {

            /*
             -----------------------------------------------
             FINALIZAR CONEXÃO
             -----------------------------------------------
            */

            if (
                connecting
            ) {

                connecting = false;


                const target =
                    getNodeUnderMouse(
                        event
                    );


                removeConnectionPreview();


                const sourceId =
                    machine.connectionStart;


                machine.connectionStart =
                    null;


                if (
                    target &&
                    target.id !==
                        sourceId
                ) {

                    createEdge(
                        sourceId,
                        target.id
                    );

                }


                return;

            }


            /*
             -----------------------------------------------
             FINALIZAR MOVIMENTO
             -----------------------------------------------
            */

            dragging = false;

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
   RENDER DAS CONEXÕES
   ========================================================= */

function renderEdges() {

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


            /*
             =================================================
             HITBOX DA SETA
             =================================================
            */

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


            /*
             =================================================
             LINHA VISÍVEL
             =================================================
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
                `
                M ${start.x} ${start.y}
                Q ${control.x} ${control.y}
                  ${end.x} ${end.y}
                `
            );


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


            /*
             =================================================
             RÓTULO
             =================================================
            */

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


            /*
             =================================================
             PONTO DE CONTROLE
             =================================================
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
   ARRASTAR A SETA
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


    /*
     ========================================================
     SAÍDA DE UM TESTE
     ========================================================
    */

    if (
        source.type ===
        "teste"
    ) {

        properties.innerHTML = `

            <div class="property">

                <label>
                    Conexão
                </label>

                <div
                    style="
                        background:#f5f5f5;
                        padding:8px;
                        border-radius:5px;
                        margin-top:5px;
                    "
                >

                    X ← ler(X)

                    →

                    ${getNodeLabel(target)}

                </div>

            </div>


            <div class="property">

                <label>
                    Símbolo da saída
                </label>

                <select
                    id="edgeLabel"
                    style="width:100%;">

                    <option value="">
                        Selecione...
                    </option>

                    <option value="0">
                        0
                    </option>

                    <option value="1">
                        1
                    </option>

                    <option value="#">
                        #
                    </option>

                    <option value="ε">
                        ε
                    </option>

                </select>

            </div>


            <button
                id="deleteEdgeButton"
                style="width:100%;">

                🗑 Excluir conexão

            </button>

        `;


        const select =
            document.getElementById(
                "edgeLabel"
            );


        select.value =
            edge.label;


        select.addEventListener(
            "change",
            () => {

                const newValue =
                    select.value;


                if (
                    newValue === ""
                ) {

                    return;

                }


                /*
                 Impede duas saídas iguais
                 saindo do mesmo teste.
                */

                const duplicate =
                    machine.edges.some(
                        other =>

                            other.id !==
                                edge.id &&

                            other.from ===
                                edge.from &&

                            other.label ===
                                newValue
                    );


                if (
                    duplicate
                ) {

                    alert(
                        `Já existe uma saída "${newValue}" para este teste.`
                    );


                    select.value =
                        edge.label;


                    return;

                }


                saveHistory();


                edge.label =
                    newValue;


                renderEdges();


                showEdgeProperties();

            }
        );

    } else {

        /*
         ====================================================
         CONEXÃO NORMAL
         ====================================================
        */

        properties.innerHTML = `

            <div class="property">

                <label>
                    Conexão
                </label>

                <div
                    style="
                        background:#f5f5f5;
                        padding:8px;
                        border-radius:5px;
                        margin-top:5px;
                    "
                >

                    ${getNodeLabel(source)}

                    →

                    ${getNodeLabel(target)}

                </div>

            </div>


            <div class="property">

                <small>
                    Esta conexão não precisa
                    de símbolo.
                </small>

            </div>


            <button
                id="deleteEdgeButton"
                style="width:100%;">

                🗑 Excluir conexão

            </button>

        `;

    }


    const deleteButton =
        document.getElementById(
            "deleteEdgeButton"
        );


    if (deleteButton) {

        deleteButton.addEventListener(
            "click",
            () => {

                deleteSelectedEdge();

            }
        );

    }

}


/* =========================================================
   EXCLUIR ESTADO
   ========================================================= */

function deleteSelectedNode() {

    if (
        machine.selectedNode ===
        null
    ) {

        return;

    }


    saveHistory();


    const id =
        machine.selectedNode;


    machine.nodes =
        machine.nodes.filter(
            node =>
                node.id !==
                id
        );


    machine.edges =
        machine.edges.filter(
            edge =>

                edge.from !==
                    id &&

                edge.to !==
                    id
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
            edge =>
                edge.id !==
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
   EXCLUIR SELECIONADO
   ========================================================= */

function deleteSelected() {

    if (
        machine.selectedNode !==
        null
    ) {

        deleteSelectedNode();

        return;

    }


    if (
        machine.selectedEdge !==
        null
    ) {

        deleteSelectedEdge();

    }

}


/* =========================================================
   TECLADO
   ========================================================= */

document.addEventListener(
    "keydown",
    event => {

        /*
         CTRL + Z
        */

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


        /*
         DELETE
        */

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


        /*
         ESC
        */

        if (
            event.key ===
            "Escape"
        ) {

            machine.connectionMode =
                false;


            machine.connectionStart =
                null;


            removeConnectionPreview();


            machine.selectedNode =
                null;


            machine.selectedEdge =
                null;


            modeText.textContent =
                "Modo: seleção";


            modeText.classList.remove(
                "connection-mode"
            );


            canvas.classList.remove(
                "connection-active"
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

            if (
                machine.connectionMode
            ) {

                return;

            }


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