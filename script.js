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

    atribuicao: "X ← Xs",

    teste: "X ← ler(X)",

    aceita: "ACEITA",

    rejeita: "REJEITA"

};


/* =========================================================
   CONFIGURAÇÃO DAS CONEXÕES
   ========================================================= */

const NODE_WIDTH = 130;
const NODE_HEIGHT = 60;


/* =========================================================
   UTILITÁRIOS
   ========================================================= */

function nodeCenter(node) {

    return {

        x: node.x + NODE_WIDTH / 2,

        y: node.y + NODE_HEIGHT / 2

    };

}


/* =========================================================
   PONTO DE ENTRADA/SAÍDA DA CONEXÃO
   =========================================================

   Faz a linha começar na borda do estado em vez de
   começar exatamente no centro.

   Isso deixa a seta visualmente correta.
   ========================================================= */

function getConnectionPoint(
    node,
    targetX,
    targetY
) {

    const cx =
        node.x +
        NODE_WIDTH / 2;

    const cy =
        node.y +
        NODE_HEIGHT / 2;


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
       Nós circulares:
       PARTIDA, ACEITA e REJEITA.
    */

    if (
        node.type === "partida" ||
        node.type === "aceita" ||
        node.type === "rejeita"
    ) {

        const rx =
            NODE_WIDTH / 2;

        const ry =
            NODE_HEIGHT / 2;


        const denominator =
            Math.sqrt(
                (dx * dx) / (rx * rx) +
                (dy * dy) / (ry * ry)
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


    /*
       Nós retangulares.
    */

    const halfW =
        NODE_WIDTH / 2;

    const halfH =
        NODE_HEIGHT / 2;


    const scaleX =
        Math.abs(dx) / halfW;

    const scaleY =
        Math.abs(dy) / halfH;


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
   PONTO CENTRAL DA CONEXÃO
   ========================================================= */

function getEdgeGeometry(edge) {

    const source =
        machine.nodes.find(
            n => n.id === edge.from
        );

    const target =
        machine.nodes.find(
            n => n.id === edge.to
        );


    if (!source || !target) {
        return null;
    }


    /*
       Primeiro usamos o centro dos estados
       para descobrir a direção.
    */

    const sourceCenter =
        nodeCenter(source);

    const targetCenter =
        nodeCenter(target);


    /*
       Ponto de entrada/saída.
    */

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


    /*
       Centro geométrico.
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
       Compatibilidade com versões antigas.
       Se algum edge antigo ainda tiver bendX/bendY,
       convertemos para bendOffset.
    */

    if (
        edge.bendOffsetX === undefined
    ) {

        if (
            edge.bendX !== undefined
        ) {

            edge.bendOffsetX =
                edge.bendX -
                middleX;

        } else {

            edge.bendOffsetX = 0;

        }

    }


    if (
        edge.bendOffsetY === undefined
    ) {

        if (
            edge.bendY !== undefined
        ) {

            edge.bendOffsetY =
                edge.bendY -
                middleY;

        } else {

            edge.bendOffsetY = 0;

        }

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
   ADICIONAR NÓ
   ========================================================= */

function addNode(
    type,
    x = 100,
    y = 100
) {

    const node = {

        id:
            machine.nextNodeId++,

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
   RENDER GERAL
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
                getNodeLabel(node);


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

function setupNodeDragging(
    element,
    node
) {

    let dragging = false;

    let offsetX = 0;
    let offsetY = 0;


    element.addEventListener(
        "mousedown",
        event => {

            /*
               Se estiver no modo conexão,
               o clique serve para conectar.
            */

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


            node.x =
                Math.max(
                    5,
                    Math.min(
                        canvas.clientWidth -
                        NODE_WIDTH -
                        5,
                        node.x
                    )
                );


            node.y =
                Math.max(
                    5,
                    Math.min(
                        canvas.clientHeight -
                        NODE_HEIGHT -
                        5,
                        node.y
                    )
                );


            /*
               Renderiza tudo.
               As conexões acompanham automaticamente.
            */

            render();

        };


    const upHandler =
        () => {

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
   SELECIONAR NÓ
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
   CLICAR EM NÓ NO MODO CONEXÃO
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

    const source =
        machine.nodes.find(
            n => n.id === from
        );

    const target =
        machine.nodes.find(
            n => n.id === to
        );


    if (!source || !target) {
        return;
    }


    let label = "";


    /*
       Teste recebe ε inicialmente.
    */

    if (
        source.type === "teste"
    ) {

        label = "ε";

    }


    /*
       Descobre quantas conexões paralelas
       já existem entre os mesmos estados.
    */

    const parallelEdges =
        machine.edges.filter(
            e =>
                e.from === from &&
                e.to === to
        );


    const index =
        parallelEdges.length;


    /*
       Se houver duas conexões para o mesmo
       destino, uma fica para cima e outra
       para baixo.
    */

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

        id:
            machine.nextEdgeId++,

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
   CRIAR ARROW MARKER
   ========================================================= */

function createArrowMarker() {

    let defs =
        svg.querySelector("defs");


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
        "#555"
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
   RENDERIZAR CONEXÕES
   ========================================================= */

function renderEdges() {

    /*
       Remove elementos antigos.
    */

    svg.querySelectorAll(
        ".edge-element"
    ).forEach(
        element =>
            element.remove()
    );


    /*
       Cria a ponta da seta.
    */

    createArrowMarker();


    /*
       Cada conexão.
    */

    machine.edges.forEach(
        edge => {

            const geometry =
                getEdgeGeometry(edge);


            if (!geometry) {
                return;
            }


            const {
                start,
                end,
                control
            } = geometry;


            /*
               ==================================================
               ÁREA INVISÍVEL DE CLIQUE
               ==================================================

               Essa é a parte que permite ARRastar a conexão.

               Ela é desenhada antes da linha visível.
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
                `M ${start.x} ${start.y}
                 Q ${control.x} ${control.y}
                   ${end.x} ${end.y}`
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
               ==================================================
               LINHA VISÍVEL
               ==================================================
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
                `M ${start.x} ${start.y}
                 Q ${control.x} ${control.y}
                   ${end.x} ${end.y}`
            );


            /*
               AQUI ESTÁ A SETA.
            */

            path.setAttribute(
                "marker-end",
                "url(#post-arrowhead)"
            );


            /*
               A linha visual não captura
               o mouse. Quem captura é
               hitPath.
            */

            path.setAttribute(
                "pointer-events",
                "none"
            );


            svg.appendChild(
                path
            );


            /*
               ==================================================
               RÓTULO
               ==================================================
            */

            if (edge.label) {

                /*
                   Posição exata no meio da curva.
                */

                const labelX =
                    0.25 * start.x +
                    0.50 * control.x +
                    0.25 * end.x;


                const labelY =
                    0.25 * start.y +
                    0.50 * control.y +
                    0.25 * end.y;


                const group =
                    document.createElementNS(
                        "http://www.w3.org/2000/svg",
                        "g"
                    );


                group.classList.add(
                    "edge-element"
                );


                /*
                   Fundo branco.
                */

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


                /*
                   Símbolo.
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
                    labelY + 4
                );


                label.setAttribute(
                    "text-anchor",
                    "middle"
                );


                label.textContent =
                    edge.label;


                /*
                   O texto não bloqueia o
                   arrasto da conexão.
                */

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
               ==================================================
               PONTO DE CONTROLE
               ==================================================
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
   ARRASTAR A PRÓPRIA CONEXÃO
   ========================================================= */

function setupEdgeDragging(
    element,
    edge
) {

    let dragging = false;


    element.addEventListener(
        "pointerdown",
        event => {

            if (
                event.button !== 0
            ) {

                return;

            }


            dragging = true;


            /*
               Seleciona a conexão.
            */

            selectEdge(
                edge.id
            );


            /*
               Captura o mouse.
               Isso é importante para poder
               continuar arrastando mesmo se o
               cursor passar por cima de um estado.
            */

            element.setPointerCapture(
                event.pointerId
            );


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


            /*
               A curva segue o mouse.
            */

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

            dragging = false;


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

            dragging = false;

            element.style.cursor =
                "grab";

        }
    );

}


/* =========================================================
   ARRASTAR O PONTO DE CONTROLE
   ========================================================= */

function setupEdgeHandle(
    handle,
    edge
) {

    let dragging = false;


    handle.addEventListener(
        "pointerdown",
        event => {

            if (
                event.button !== 0
            ) {

                return;

            }


            dragging = true;


            handle.setPointerCapture(
                event.pointerId
            );


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

            dragging = false;


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

            dragging = false;

            handle.style.cursor =
                "grab";

        }
    );

}


/* =========================================================
   PROPRIEDADES DO NÓ
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
       X ← X#
       É uma operação fixa.
    */

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


    /*
       X ← Xs
    */

    if (
        node.type ===
        "atribuicao"
    ) {

        html += `

            <div class="property">

                <label>
                    Símbolo acrescentado
                </label>

                <select id="nodeSymbol">

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
            e =>
                e.id ===
                machine.selectedEdge
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


    const input =
        document.getElementById(
            "edgeLabel"
        );


    input.addEventListener(
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

    /*
       Excluir nó.
    */

    if (
        machine.selectedNode !==
        null
    ) {

        const id =
            machine.selectedNode;


        machine.nodes =
            machine.nodes.filter(
                n =>
                    n.id !== id
            );


        /*
           Remove todas as conexões
           ligadas ao nó.
        */

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


    /*
       Excluir conexão.
    */

    if (
        machine.selectedEdge !==
        null
    ) {

        deleteSelectedEdge();

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


    machine.edges =
        machine.edges.filter(
            e =>
                e.id !==
                machine.selectedEdge
        );


    machine.selectedEdge =
        null;


    properties.innerHTML =
        `<p class="empty">
            Selecione uma operação ou conexão.
         </p>`;


    render();

}


/* =========================================================
   TECLADO
   ========================================================= */

document.addEventListener(
    "keydown",
    event => {

        /*
           Delete.
        */

        if (
            event.key ===
            "Delete" ||
            event.key ===
            "Backspace"
        ) {

            const active =
                document.activeElement;


            /*
               Não apagar enquanto
               estiver digitando em input.
            */

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
           Escape.
        */

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
                `<p class="empty">
                    Selecione uma operação ou conexão.
                 </p>`;


            render();

        }

    }
);


/* =========================================================
   DEFINIR PALAVRA DE ENTRADA
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

       A entrada começa sem #.

       Exemplo:

       1010

       Depois X ← X#:

       1010#
    */

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
   ATUALIZAR FILA
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
   VALIDAR MÁQUINA
   ========================================================= */

function validateMachine() {

    const errors = [];
    const warnings = [];


    /*
       PARTIDA.
    */

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


    /*
       MARCADOR #.
    */

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


    /*
       TESTES.
    */

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


    /*
       Resultado.
    */

    if (
        errors.length ===
        0
    ) {

        validationResult.innerHTML =
            `<div class="success">
                ✓ Estrutura básica válida.
             </div>`;

    } else {

        validationResult.innerHTML =
            `<div class="error">
                ${
                    errors
                        .map(
                            e =>
                                "✗ " +
                                e
                        )
                        .join(
                            "<br>"
                        )
                }
             </div>`;

    }


    if (
        warnings.length >
        0
    ) {

        validationResult.innerHTML +=
            `<div
                class="warning"
                style="margin-top:8px;">

                ${
                    warnings
                        .map(
                            w =>
                                "⚠ " +
                                w
                        )
                        .join(
                            "<br>"
                        )
                }

             </div>`;

    }

}


/* =========================================================
   ENCONTRAR PRÓXIMO NÓ
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
       TESTE:

       X ← ler(X)

       Escolhe a saída de acordo
       com o símbolo lido.
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
                n.id ===
                edge.to
        );

    }


    /*
       Outros nós devem possuir
       uma única saída.
    */

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

    /*
       Primeiro passo:
       entra na PARTIDA.
    */

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


    /*
       ACEITA.
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
       REJEITA.
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
       X ← X#

       Acrescenta # no FINAL.
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
       X ← Xs

       Acrescenta símbolo no final.
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

       Remove o primeiro símbolo.
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
       Partida, marcador e atribuição
       seguem a única saída.
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


                /*
                   Proteção contra loop infinito.
                */

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


    machine.nodes = [];

    machine.edges = [];


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
   EXEMPLO
   =========================================================

   PARTIDA
       ↓
   X ← X#
       ↓
   X ← ler(X)

   Saídas:

       0 ──→ ACEITA
       ε ──→ ACEITA

       1 ──→ REJEITA
       # ──→ REJEITA

   ========================================================= */

function loadExample() {

    newMachine();


    const start = {

        id:
            machine.nextNodeId++,

        type:
            "partida",

        x:
            80,

        y:
            270

    };


    const marker = {

        id:
            machine.nextNodeId++,

        type:
            "marcador",

        x:
            260,

        y:
            270

    };


    const test = {

        id:
            machine.nextNodeId++,

        type:
            "teste",

        x:
            470,

        y:
            270

    };


    const accept = {

        id:
            machine.nextNodeId++,

        type:
            "aceita",

        x:
            720,

        y:
            150

    };


    const reject = {

        id:
            machine.nextNodeId++,

        type:
            "rejeita",

        x:
            720,

        y:
            390

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
       TESTE → 0 → ACEITA
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
            -45

    });


    /*
       TESTE → ε → ACEITA
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
            45

    });


    /*
       TESTE → 1 → REJEITA
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
            -45

    });


    /*
       TESTE → # → REJEITA
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
            45

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