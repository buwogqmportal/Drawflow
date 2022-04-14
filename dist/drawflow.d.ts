import "./drawflow.css";
declare type EventListener = {
    on: (event: string, callback: Function) => void;
    dispatch: (event: string, details?: any) => void;
    removeListener: (event: string, callback: Function) => void;
};
export declare type RenderFunction = (options: {
    register: any;
    type: string | number;
    content: HTMLElement;
    editor: Drawflow;
    id: string;
    event: EventListener;
}) => void;
export declare type DrawflowData = {
    drawflow: Record<string, {
        data: Record<string, DrawflowNodeData>;
    }>;
};
export declare type DrawflowNodeData = {
    id: string;
    name: string;
    data: Record<string, any>;
    class: string;
    html: string;
    typenode: boolean | string | RenderFunction;
    inputs: Record<string, DrawflowNodeInput>;
    outputs: Record<string, DrawflowNodeOutput>;
    pos_x: number;
    pos_y: number;
};
export declare type DrawflowNodeInput = {
    connections: {
        node: string;
        input: string;
        points?: {
            pos_x: number;
            pos_y: number;
        }[];
    }[];
};
export declare type DrawflowNodeOutput = {
    connections: {
        node: string;
        output: string;
        points?: {
            pos_x: number;
            pos_y: number;
        }[];
    }[];
};
export declare type DrawflowPoint = {
    x: number;
    y: number;
};
export declare type DrawflowConnectionOut = {
    output_id: string;
    output_class: string;
};
export declare type DrawflowConnectionIn = {
    input_id: string;
    input_class: string;
};
export declare type DrawflowConnection = DrawflowConnectionIn & DrawflowConnectionOut;
declare type DrawflowOptions = {
    module?: string;
    editor_mode?: "edit" | "view" | "fixed";
    zoom?: number;
    zoom_max?: number;
    zoom_min?: number;
    zoom_value?: number;
    zoom_last_value?: number;
    curvature?: number;
    reroute?: boolean;
    reroute_fix_curvature?: boolean;
    reroute_curvature_start_end?: number;
    reroute_curvature?: number;
    reroute_width?: number;
    force_first_input?: boolean;
    draggable_inputs?: boolean;
    useuuid?: boolean;
    render?: RenderFunction;
};
export default class Drawflow {
    container: HTMLElement;
    events: Record<string, {
        listeners: Function[];
    }>;
    precanvas: HTMLElement;
    nodeId: number;
    ele_selected: HTMLElement;
    node_selected: HTMLElement;
    drag: boolean;
    drag_point: boolean;
    editor_selected: boolean;
    connection: boolean;
    connection_ele: SVGElement;
    connection_selected: HTMLElement;
    canvas_x: number;
    canvas_y: number;
    pos_x: number;
    pos_x_start: number;
    pos_y: number;
    pos_y_start: number;
    mouse_x: number;
    mouse_y: number;
    first_click: Element;
    noderegister: Record<string, any>;
    drawflow: DrawflowData;
    module: string;
    editor_mode: "edit" | "view" | "fixed";
    zoom: number;
    zoom_max: number;
    zoom_min: number;
    zoom_value: number;
    zoom_last_value: number;
    curvature: number;
    reroute: boolean;
    reroute_fix_curvature: boolean;
    reroute_curvature_start_end: number;
    reroute_curvature: number;
    reroute_width: number;
    force_first_input: boolean;
    draggable_inputs: boolean;
    useuuid: boolean;
    render: RenderFunction;
    evCache: PointerEvent[];
    prevDiff: number;
    constructor(container: HTMLElement, options?: DrawflowOptions);
    get zoomLevel(): number;
    set zoomLevel(value: number);
    start(): void;
    _handlePointerdown(ev: PointerEvent): void;
    _handlePointermove(ev: PointerEvent): void;
    _handlePointerup(ev: PointerEvent): void;
    _removeEvent(ev: PointerEvent): void;
    load(): void;
    unselectConnectionReroutes(): void;
    _click(e: MouseEvent | TouchEvent): boolean;
    _position(e: MouseEvent | TouchEvent): void;
    _dragEnd(e: MouseEvent | TouchEvent): void;
    _contextmenu(e: MouseEvent): boolean;
    _contextmenuDel(): void;
    _key(e: KeyboardEvent): boolean;
    _handleZoom(event: WheelEvent): void;
    refreshZoom(): void;
    zoomIn(value?: number): void;
    zoomOut(value?: number): void;
    resetZoom(): void;
    createCurvature(start_pos_x: number, start_pos_y: number, end_pos_x: number, end_pos_y: number, curvature: number): string;
    _createConnection(ele: HTMLElement): void;
    _drawConnectionTo(eX: number, eY: number): void;
    addConnection(id_output: string, id_input: string, output_class: string, input_class: string): void;
    updateConnection(connection: HTMLElement, nodeFromElem?: HTMLElement, nodeToElem?: HTMLElement): void;
    updateNodeConnections(id: string): void;
    _dblclick(e: MouseEvent): void;
    createReroutePoint(ele: HTMLElement): void;
    removeReroutePoint(ele: HTMLElement): void;
    registerNode(name: string | number, html: any): void;
    getNodeFromId(id: string): DrawflowNodeData;
    getNodesFromName(name: string): string[];
    addNode(name: string, num_in: number, num_out: number, ele_pos_x: number, ele_pos_y: number, classoverride: string, data: any, html: string, typenode?: boolean): string;
    _addNodeImport(dataNode: DrawflowNodeData, precanvas: HTMLElement): void;
    _addRerouteImport(dataNode: DrawflowNodeData): void;
    changeNodeID(oldId: string, newId: string): boolean;
    updateNodeValue(event: Event): void;
    updateNodeDataFromId(id: string, data: any): void;
    addNodeInput(id: string): void;
    addNodeOutput(id: string): void;
    removeNodeInput(id: string, input_class: string): void;
    removeNodeOutput(id: string, output_class: string): void;
    removeNodeId(id: string): void;
    removeSelectedConnection(): void;
    removeConnection(id_output: string, id_input: string, output_class: string, input_class: string): boolean;
    removeNodeConnectionsByNodeId(id: string): void;
    getModuleFromNodeId(id: number | string): string;
    addModule(name: string): void;
    changeModule(name: string): void;
    removeModule(name: string): void;
    clearSelectedModule(): void;
    clear(): void;
    export(): DrawflowData;
    import(data: DrawflowData, notify?: boolean): void;
    on(event: "addReroute", callback: (data: string) => void): boolean;
    on(event: "click", callback: (data: MouseEvent | TouchEvent) => void): boolean;
    on(event: "clickEnd", callback: (data: MouseEvent | TouchEvent) => void): boolean;
    on(event: "connectionCancel", callback: (data: true) => void): boolean;
    on(event: "connectionCreated", callback: (data: DrawflowConnection) => void): boolean;
    on(event: "connectionRemoved", callback: (data: DrawflowConnection) => void): boolean;
    on(event: "connectionSelected", callback: (data: DrawflowConnection) => void): boolean;
    on(event: "connectionStart", callback: (data: DrawflowConnectionOut) => void): boolean;
    on(event: "connectionUnselected", callback: (data: true) => void): boolean;
    on(event: "contextmenu", callback: (data: MouseEvent) => void): boolean;
    on(event: "export", callback: (data: DrawflowData) => void): boolean;
    on(event: "import", callback: (data: "import") => void): boolean;
    on(event: "keydown", callback: (data: KeyboardEvent) => void): boolean;
    on(event: "moduleChanged", callback: (data: string) => void): boolean;
    on(event: "moduleCreated", callback: (data: string) => void): boolean;
    on(event: "moduleRemoved", callback: (data: string) => void): boolean;
    on(event: "mouseMove", callback: (data: DrawflowPoint) => void): boolean;
    on(event: "mouseUp", callback: (data: MouseEvent | TouchEvent) => void): boolean;
    on(event: "nodeCreated", callback: (data: string) => void): boolean;
    on(event: "nodeDataChanged", callback: (data: string) => void): boolean;
    on(event: "nodeMoved", callback: (data: {
        id: string;
    } & DrawflowPoint) => void): boolean;
    on(event: "nodeRemoved", callback: (data: string) => void): boolean;
    on(event: "nodeSelected", callback: (data: string) => void): boolean;
    on(event: "nodeUnselected", callback: (data: true) => void): boolean;
    on(event: "removeReroute", callback: (data: string) => void): boolean;
    on(event: "rerouteMoved", callback: (data: string) => void): boolean;
    on(event: "translate", callback: (data: DrawflowPoint) => void): boolean;
    on(event: "updateNodes", callback: (data: {
        id: string;
        data: any;
    }) => void): boolean;
    on(event: "updateNodeId", callback: (data: {
        newId: string;
        oldId: string;
    }) => void): boolean;
    on(event: "zoom", callback: (data: number) => void): boolean;
    removeListener(event: "addReroute", callback: (data: string) => void): boolean;
    removeListener(event: "click", callback: (data: MouseEvent | TouchEvent) => void): boolean;
    removeListener(event: "clickEnd", callback: (data: MouseEvent | TouchEvent) => void): boolean;
    removeListener(event: "connectionCancel", callback: (data: true) => void): boolean;
    removeListener(event: "connectionCreated", callback: (data: DrawflowConnection) => void): boolean;
    removeListener(event: "connectionRemoved", callback: (data: DrawflowConnection) => void): boolean;
    removeListener(event: "connectionSelected", callback: (data: DrawflowConnection) => void): boolean;
    removeListener(event: "connectionStart", callback: (data: DrawflowConnectionOut) => void): boolean;
    removeListener(event: "connectionUnselected", callback: (data: true) => void): boolean;
    removeListener(event: "contextmenu", callback: (data: MouseEvent) => void): boolean;
    removeListener(event: "export", callback: (data: DrawflowData) => void): boolean;
    removeListener(event: "import", callback: (data: "import") => void): boolean;
    removeListener(event: "keydown", callback: (data: KeyboardEvent) => void): boolean;
    removeListener(event: "moduleChanged", callback: (data: string) => void): boolean;
    removeListener(event: "moduleCreated", callback: (data: string) => void): boolean;
    removeListener(event: "moduleRemoved", callback: (data: string) => void): boolean;
    removeListener(event: "mouseMove", callback: (data: DrawflowPoint) => void): boolean;
    removeListener(event: "mouseUp", callback: (data: MouseEvent | TouchEvent) => void): boolean;
    removeListener(event: "nodeCreated", callback: (data: string) => void): boolean;
    removeListener(event: "nodeDataChanged", callback: (data: string) => void): boolean;
    removeListener(event: "nodeMoved", callback: (data: {
        id: string;
    } & DrawflowPoint) => void): boolean;
    removeListener(event: "nodeRemoved", callback: (data: string) => void): boolean;
    removeListener(event: "nodeSelected", callback: (data: string) => void): boolean;
    removeListener(event: "nodeUnselected", callback: (data: true) => void): boolean;
    removeListener(event: "removeReroute", callback: (data: string) => void): boolean;
    removeListener(event: "rerouteMoved", callback: (data: string) => void): boolean;
    removeListener(event: "translate", callback: (data: DrawflowPoint) => void): boolean;
    removeListener(event: "updateNodes", callback: (data: {
        id: string;
        data: any;
    }) => void): boolean;
    removeListener(event: "updateNodeId", callback: (data: {
        newId: string;
        oldId: string;
    }) => void): boolean;
    removeListener(event: "zoom", callback: (data: number) => void): boolean;
    dispatch(event: "addReroute", details: string): boolean;
    dispatch(event: "click", details: MouseEvent | TouchEvent): boolean;
    dispatch(event: "clickEnd", details: MouseEvent | TouchEvent): boolean;
    dispatch(event: "connectionCancel", details: true): boolean;
    dispatch(event: "connectionCreated", details: DrawflowConnection): boolean;
    dispatch(event: "connectionRemoved", details: DrawflowConnection): boolean;
    dispatch(event: "connectionSelected", details: DrawflowConnection): boolean;
    dispatch(event: "connectionStart", details: DrawflowConnectionOut): boolean;
    dispatch(event: "connectionUnselected", details: true): boolean;
    dispatch(event: "contextmenu", details: MouseEvent): boolean;
    dispatch(event: "export", details: DrawflowData): boolean;
    dispatch(event: "import", details: "import"): boolean;
    dispatch(event: "keydown", details: KeyboardEvent): boolean;
    dispatch(event: "moduleChanged", details: string): boolean;
    dispatch(event: "moduleCreated", details: string): boolean;
    dispatch(event: "moduleRemoved", details: string): boolean;
    dispatch(event: "mouseMove", details: DrawflowPoint): boolean;
    dispatch(event: "mouseUp", details: MouseEvent | TouchEvent): boolean;
    dispatch(event: "nodeCreated", details: string): boolean;
    dispatch(event: "nodeDataChanged", details: string): boolean;
    dispatch(event: "nodeMoved", details: {
        id: string;
    } & DrawflowPoint): boolean;
    dispatch(event: "nodeRemoved", details: string): boolean;
    dispatch(event: "nodeSelected", details: string): boolean;
    dispatch(event: "nodeUnselected", details: true): boolean;
    dispatch(event: "removeReroute", details: string): boolean;
    dispatch(event: "rerouteMoved", details: string): boolean;
    dispatch(event: "translate", details: DrawflowPoint): boolean;
    dispatch(event: "updateNodes", details: {
        id: string;
        data: any;
    }): boolean;
    dispatch(event: "updateNodeId", details: {
        oldId: string;
        newId: string;
    }): boolean;
    dispatch(event: "zoom", details: number): boolean;
    getUuid(): string;
}
export {};
//# sourceMappingURL=drawflow.d.ts.map