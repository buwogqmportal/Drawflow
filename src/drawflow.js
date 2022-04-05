function getNodeID(str) {
  return parseInt(str.slice(5));
}

function getConnectionData(classList) {
  return {
    output_id: parseInt(classList[2].slice(14)),
    input_id: parseInt(classList[1].slice(13)),
    output_class: classList[3],
    input_class: classList[4],
  };
}

export default class Drawflow {
  constructor(container, render = null, parent = null) {
    this.events = {};
    this.container = container;
    this.precanvas = null;
    this.nodeId = 1;
    this.ele_selected = null;
    this.node_selected = null;
    this.drag = false;
    this.reroute = false;
    this.reroute_fix_curvature = false;
    this.curvature = 0.5;
    this.reroute_curvature_start_end = 0.5;
    this.reroute_curvature = 0.5;
    this.reroute_width = 6;
    this.drag_point = false;
    this.editor_selected = false;
    this.connection = false;
    this.connection_ele = null;
    this.connection_selected = null;
    this.canvas_x = 0;
    this.canvas_y = 0;
    this.pos_x = 0;
    this.pos_x_start = 0;
    this.pos_y = 0;
    this.pos_y_start = 0;
    this.mouse_x = 0;
    this.mouse_y = 0;
    this.line_path = 5;
    this.first_click = null;
    this.force_first_input = false;
    this.draggable_inputs = true;
    this.useuuid = false;
    this.parent = parent;

    this.noderegister = {};
    this.render = render;
    this.drawflow = { drawflow: { Home: { data: {} } } };
    // Configurable options
    this.module = "Home";
    this.editor_mode = "edit";
    this.zoom = 0;
    this.zoom_max = 1.6;
    this.zoom_min = 0.5;
    this.zoom_value = 0.1;
    this.zoom_last_value = 1;

    // Mobile
    this.evCache = new Array();
    this.prevDiff = -1;
  }

  getZoom() {
    return Math.exp(this.zoom / 100);
  }

  setZoom(value) {
    this.zoom = Math.log(value) * 100;
  }

  start() {
    // console.info("Start Drawflow!!");
    this.container.classList.add("parent-drawflow");
    this.container.tabIndex = 0;
    this.precanvas = document.createElement("div");
    this.precanvas.classList.add("drawflow");
    this.container.appendChild(this.precanvas);

    /* Mouse and Touch Actions */
    this.container.addEventListener("mouseup", this.dragEnd.bind(this));
    this.container.addEventListener("mousemove", this.position.bind(this));
    this.container.addEventListener("mousedown", this.click.bind(this));

    this.container.addEventListener("touchend", this.dragEnd.bind(this));
    this.container.addEventListener("touchmove", this.position.bind(this));
    this.container.addEventListener("touchstart", this.click.bind(this));

    /* Context Menu */
    this.container.addEventListener("contextmenu", this.contextmenu.bind(this));
    /* Delete */
    this.container.addEventListener("keydown", this.key.bind(this));

    /* Zoom Mouse */
    this.container.addEventListener("wheel", this.zoom_enter.bind(this));
    /* Update data Nodes */
    this.container.addEventListener("input", this.updateNodeValue.bind(this));

    this.container.addEventListener("dblclick", this.dblclick.bind(this));
    /* Mobile zoom */
    // this.container.onpointerdown = this.pointerdown_handler.bind(this);
    // this.container.onpointermove = this.pointermove_handler.bind(this);
    // this.container.onpointerup = this.pointerup_handler.bind(this);
    // this.container.onpointercancel = this.pointerup_handler.bind(this);
    // this.container.onpointerout = this.pointerup_handler.bind(this);
    // this.container.onpointerleave = this.pointerup_handler.bind(this);

    this.load();
  }

  /* Mobile zoom */
  pointerdown_handler(ev) {
    this.evCache.push(ev);
  }

  pointermove_handler(ev) {
    for (var i = 0; i < this.evCache.length; i++) {
      if (ev.pointerId == this.evCache[i].pointerId) {
        this.evCache[i] = ev;
        break;
      }
    }

    if (this.evCache.length == 2) {
      // Calculate the distance between the two pointers
      var curDiff = Math.abs(this.evCache[0].clientX - this.evCache[1].clientX);

      if (this.prevDiff > 100) {
        if (curDiff > this.prevDiff) {
          // The distance between the two pointers has increased

          this.zoom_in();
        }
        if (curDiff < this.prevDiff) {
          // The distance between the two pointers has decreased
          this.zoom_out();
        }
      }
      this.prevDiff = curDiff;
    }
  }

  pointerup_handler(ev) {
    this.remove_event(ev);
    if (this.evCache.length < 2) {
      this.prevDiff = -1;
    }
  }
  remove_event(ev) {
    // Remove this event from the target's cache
    for (var i = 0; i < this.evCache.length; i++) {
      if (this.evCache[i].pointerId == ev.pointerId) {
        this.evCache.splice(i, 1);
        break;
      }
    }
  }
  /* End Mobile Zoom */
  load() {
    for (const key in this.drawflow.drawflow[this.module].data) {
      this.addNodeImport(
        this.drawflow.drawflow[this.module].data[key],
        this.precanvas
      );
    }

    if (this.reroute) {
      for (const key in this.drawflow.drawflow[this.module].data) {
        this.addRerouteImport(this.drawflow.drawflow[this.module].data[key]);
      }
    }

    for (const key in this.drawflow.drawflow[this.module].data) {
      this.updateConnectionNodes("node-" + key);
    }

    const editor = this.drawflow.drawflow;
    let number = 1;

    for (const moduleName in editor) {
      if (Object.hasOwnProperty.call(editor, moduleName)) {
        const moduleData = editor[moduleName].data;
        for (const id in moduleData) {
          if (Object.hasOwnProperty.call(moduleData, id)) {
            number = Math.max(number, parseInt(id) + 1);
          }
        }
      }
    }

    this.nodeId = number;
  }

  removeReouteConnectionSelected() {
    this.dispatch("connectionUnselected", true);
    if (this.reroute_fix_curvature) {
      this.connection_selected.parentElement
        .querySelectorAll(".main-path")
        .forEach((item, i) => {
          item.classList.remove("selected");
        });
    }
  }

  click(e) {
    this.dispatch("click", e);
    if (this.editor_mode === "fixed") {
      if (
        e.target.classList[0] === "parent-drawflow" ||
        e.target.classList[0] === "drawflow"
      ) {
        this.ele_selected = e.target.closest(".parent-drawflow");
      } else {
        return false;
      }
    } else if (this.editor_mode === "view") {
      if (
        e.target.closest(".drawflow") != null ||
        e.target.matches(".parent-drawflow")
      ) {
        this.ele_selected = e.target.closest(".parent-drawflow");
        e.preventDefault();
      }
    } else {
      this.first_click = e.target;
      this.ele_selected = e.target;
      if (e.button === 0) {
        this.contextmenuDel();
      }

      if (e.target.closest(".drawflow_content_node") != null) {
        this.ele_selected = e.target.closest(
          ".drawflow_content_node"
        ).parentElement;
      }
    }
    switch (this.ele_selected.classList[0]) {
      case "drawflow-node":
        if (this.node_selected != null) {
          this.node_selected.classList.remove("selected");
          if (this.node_selected != this.ele_selected) {
            this.dispatch("nodeUnselected", true);
          }
        }
        if (this.connection_selected != null) {
          this.connection_selected.classList.remove("selected");
          this.removeReouteConnectionSelected();
          this.connection_selected = null;
        }
        if (this.node_selected != this.ele_selected) {
          this.dispatch("nodeSelected", getNodeID(this.ele_selected.id));
        }
        this.node_selected = this.ele_selected;
        this.node_selected.classList.add("selected");
        if (!this.draggable_inputs) {
          if (
            e.target.tagName !== "INPUT" &&
            e.target.tagName !== "TEXTAREA" &&
            e.target.tagName !== "SELECT" &&
            e.target.hasAttribute("contenteditable") !== true
          ) {
            this.drag = true;
          }
        } else {
          if (e.target.tagName !== "SELECT") {
            this.drag = true;
          }
        }
        break;
      case "output":
        this.connection = true;
        if (this.node_selected != null) {
          this.node_selected.classList.remove("selected");
          this.node_selected = null;
          this.dispatch("nodeUnselected", true);
        }
        if (this.connection_selected != null) {
          this.connection_selected.classList.remove("selected");
          this.removeReouteConnectionSelected();
          this.connection_selected = null;
        }
        this.drawConnection(e.target);
        break;
      case "parent-drawflow":
      case "drawflow":
        if (this.node_selected != null) {
          this.node_selected.classList.remove("selected");
          this.node_selected = null;
          this.dispatch("nodeUnselected", true);
        }
        if (this.connection_selected != null) {
          this.connection_selected.classList.remove("selected");
          this.removeReouteConnectionSelected();
          this.connection_selected = null;
        }
        this.editor_selected = e.type === "touchstart" || e.button === 1;
        break;
      case "main-path":
        if (this.node_selected != null) {
          this.node_selected.classList.remove("selected");
          this.node_selected = null;
          this.dispatch("nodeUnselected", true);
        }
        if (this.connection_selected != null) {
          this.connection_selected.classList.remove("selected");
          this.removeReouteConnectionSelected();
          this.connection_selected = null;
        }
        this.connection_selected = this.ele_selected;
        this.connection_selected.classList.add("selected");

        this.dispatch(
          "connectionSelected",
          getConnectionData(this.connection_selected.parentElement.classList)
        );

        if (this.reroute_fix_curvature) {
          this.connection_selected.parentElement
            .querySelectorAll(".main-path")
            .forEach((item) => {
              item.classList.add("selected");
            });
        }
        break;
      case "point":
        this.drag_point = true;
        this.ele_selected.classList.add("selected");
        break;
      case "drawflow-delete":
        if (this.node_selected) {
          this.removeNodeId(this.node_selected.id);
        }

        if (this.connection_selected) {
          this.removeConnection();
        }

        if (this.node_selected != null) {
          this.node_selected.classList.remove("selected");
          this.node_selected = null;
          this.dispatch("nodeUnselected", true);
        }
        if (this.connection_selected != null) {
          this.connection_selected.classList.remove("selected");
          this.removeReouteConnectionSelected();
          this.connection_selected = null;
        }

        break;
      default:
    }
    if (e.type === "touchstart") {
      this.pos_x = e.touches[0].clientX;
      this.pos_x_start = e.touches[0].clientX;
      this.pos_y = e.touches[0].clientY;
      this.pos_y_start = e.touches[0].clientY;
    } else {
      this.pos_x = e.clientX;
      this.pos_x_start = e.clientX;
      this.pos_y = e.clientY;
      this.pos_y_start = e.clientY;
    }
    this.dispatch("clickEnd", e);
  }

  position(e) {
    if (e.type === "touchmove") {
      var e_pos_x = e.touches[0].clientX;
      var e_pos_y = e.touches[0].clientY;
    } else {
      var e_pos_x = e.clientX;
      var e_pos_y = e.clientY;
    }

    if (this.connection) {
      this.drawConnectionTo(e_pos_x, e_pos_y);
    }
    if (this.editor_selected) {
      const x = this.canvas_x - this.pos_x + e_pos_x;
      const y = this.canvas_y - this.pos_y + e_pos_y;
      this.dispatch("translate", { x: x, y: y });
      this.precanvas.style.transform =
        "translate(" + x + "px, " + y + "px) scale(" + this.getZoom() + ")";
    }
    if (this.drag) {
      const moduleData = this.drawflow.drawflow[this.module].data;
      const selectedID = getNodeID(this.ele_selected.id);

      const x = (this.pos_x - e_pos_x) / this.getZoom();
      const y = (this.pos_y - e_pos_y) / this.getZoom();
      this.pos_x = e_pos_x;
      this.pos_y = e_pos_y;

      this.ele_selected.style.top = this.ele_selected.offsetTop - y + "px";
      this.ele_selected.style.left = this.ele_selected.offsetLeft - x + "px";

      moduleData[selectedID].pos_x = this.ele_selected.offsetLeft - x;
      moduleData[selectedID].pos_y = this.ele_selected.offsetTop - y;

      this.updateConnectionNodes(this.ele_selected.id);
    }

    if (this.drag_point) {
      const moduleData = this.drawflow.drawflow[this.module].data;

      this.pos_x = e_pos_x;
      this.pos_y = e_pos_y;

      var pos_x =
        (this.pos_x - this.precanvas.getBoundingClientRect().x) *
        this.getZoom();
      var pos_y =
        (this.pos_y - this.precanvas.getBoundingClientRect().y) *
        this.getZoom();

      this.ele_selected.setAttributeNS(null, "cx", pos_x);
      this.ele_selected.setAttributeNS(null, "cy", pos_y);

      const { output_id, input_id, output_class, input_class } =
        getConnectionData(this.ele_selected.parentElement.classList);

      let numberPointPosition =
        Array.from(this.ele_selected.parentElement.children).indexOf(
          this.ele_selected
        ) - 1;

      if (this.reroute_fix_curvature) {
        const numberMainPath =
          this.ele_selected.parentElement.querySelectorAll(".main-path")
            .length - 1;
        numberPointPosition -= numberMainPath;
        if (numberPointPosition < 0) {
          numberPointPosition = 0;
        }
      }

      const searchConnection = moduleData[output_id].outputs[
        output_class
      ].connections.findIndex(
        (item) => item.node === input_id && item.output === input_class
      );

      moduleData[output_id].outputs[output_class].connections[
        searchConnection
      ].points[numberPointPosition] = {
        pos_x: pos_x,
        pos_y: pos_y,
      };

      this.updateConnectionNodes(`node-${output_id}`);
    }

    if (e.type === "touchmove") {
      this.mouse_x = e_pos_x;
      this.mouse_y = e_pos_y;
    }
    this.dispatch("mouseMove", { x: e_pos_x, y: e_pos_y });
  }

  dragEnd(e) {
    if (e.type === "touchend") {
      var e_pos_x = this.mouse_x;
      var e_pos_y = this.mouse_y;
      var ele_last = document.elementFromPoint(e_pos_x, e_pos_y);
    } else {
      var e_pos_x = e.clientX;
      var e_pos_y = e.clientY;
      var ele_last = e.target;
    }

    if (this.drag) {
      if (this.pos_x_start != e_pos_x || this.pos_y_start != e_pos_y) {
        this.dispatch("nodeMoved", getNodeID(this.ele_selected.id));
      }
    }

    if (this.drag_point) {
      this.ele_selected.classList.remove("selected");
      if (this.pos_x_start != e_pos_x || this.pos_y_start != e_pos_y) {
        this.dispatch(
          "rerouteMoved",
          getConnectionData(this.ele_selected.parentElement.classList).output_id
        );
      }
    }

    if (this.editor_selected) {
      this.canvas_x = this.canvas_x + -(this.pos_x - e_pos_x);
      this.canvas_y = this.canvas_y + -(this.pos_y - e_pos_y);
      this.editor_selected = false;
    }
    if (this.connection === true) {
      if (
        ele_last.classList[0] === "input" ||
        (this.force_first_input &&
          (ele_last.closest(".drawflow_content_node") != null ||
            ele_last.classList[0] === "drawflow-node"))
      ) {
        if (
          this.force_first_input &&
          (ele_last.closest(".drawflow_content_node") != null ||
            ele_last.classList[0] === "drawflow-node")
        ) {
          if (ele_last.closest(".drawflow_content_node") != null) {
            var input_id = ele_last.closest(".drawflow_content_node")
              .parentElement.id;
          } else {
            var input_id = ele_last.id;
          }
          if (
            Object.keys(this.getNodeFromId(getNodeID(input_id)).inputs)
              .length === 0
          ) {
            var input_class = false;
          } else {
            var input_class = "input_1";
          }
        } else {
          // Fix connection;
          var input_id = ele_last.parentElement.parentElement.id;
          var input_class = ele_last.classList[1];
        }
        var output_id = this.ele_selected.parentElement.parentElement.id;
        var output_class = this.ele_selected.classList[1];

        if (output_id !== input_id && input_class !== false) {
          if (
            this.container.querySelectorAll(
              ".connection.node_in_" +
                input_id +
                ".node_out_" +
                output_id +
                "." +
                output_class +
                "." +
                input_class
            ).length === 0
          ) {
            // Conection no exist save connection

            this.connection_ele.classList.add("node_in_" + input_id);
            this.connection_ele.classList.add("node_out_" + output_id);
            this.connection_ele.classList.add(output_class);
            this.connection_ele.classList.add(input_class);
            var id_input = getNodeID(input_id);
            var id_output = getNodeID(output_id);

            this.drawflow.drawflow[this.module].data[id_output].outputs[
              output_class
            ].connections.push({ node: id_input, output: input_class });
            this.drawflow.drawflow[this.module].data[id_input].inputs[
              input_class
            ].connections.push({ node: id_output, input: output_class });
            this.updateConnectionNodes("node-" + id_output);
            this.updateConnectionNodes("node-" + id_input);
            this.dispatch("connectionCreated", {
              output_id: id_output,
              input_id: id_input,
              output_class: output_class,
              input_class: input_class,
            });
          } else {
            this.dispatch("connectionCancel", true);
            this.connection_ele.remove();
          }

          this.connection_ele = null;
        } else {
          // Connection exists Remove Connection;
          this.dispatch("connectionCancel", true);
          this.connection_ele.remove();
          this.connection_ele = null;
        }
      } else {
        // Remove Connection;
        this.dispatch("connectionCancel", true);
        this.connection_ele.remove();
        this.connection_ele = null;
      }
    }

    this.drag = false;
    this.drag_point = false;
    this.connection = false;
    this.ele_selected = null;
    this.editor_selected = false;

    this.dispatch("mouseUp", e);
  }
  contextmenu(e) {
    this.dispatch("contextmenu", e);
    e.preventDefault();
    if (this.editor_mode === "fixed" || this.editor_mode === "view") {
      return false;
    }
    if (this.precanvas.getElementsByClassName("drawflow-delete").length) {
      this.precanvas.getElementsByClassName("drawflow-delete")[0].remove();
    }
    if (this.node_selected || this.connection_selected) {
      var deletebox = document.createElement("div");
      deletebox.classList.add("drawflow-delete");
      deletebox.innerHTML = "x";
      if (this.node_selected) {
        this.node_selected.appendChild(deletebox);
      }
      if (this.connection_selected) {
        deletebox.style.top =
          e.clientY * this.getZoom() -
          this.precanvas.getBoundingClientRect().y * this.getZoom() +
          "px";
        deletebox.style.left =
          e.clientX * this.getZoom() -
          this.precanvas.getBoundingClientRect().x * this.getZoom() +
          "px";

        this.precanvas.appendChild(deletebox);
      }
    }
  }
  contextmenuDel() {
    if (this.precanvas.getElementsByClassName("drawflow-delete").length) {
      this.precanvas.getElementsByClassName("drawflow-delete")[0].remove();
    }
  }

  key(e) {
    this.dispatch("keydown", e);
    if (this.editor_mode === "fixed" || this.editor_mode === "view") {
      return false;
    }
    if (e.key === "Delete" || (e.key === "Backspace" && e.metaKey)) {
      if (this.node_selected != null) {
        if (
          this.first_click.tagName !== "INPUT" &&
          this.first_click.tagName !== "TEXTAREA" &&
          this.first_click.hasAttribute("contenteditable") !== true
        ) {
          this.removeNodeId(this.node_selected.id);
        }
      }
      if (this.connection_selected != null) {
        this.removeConnection();
      }
    }
  }

  zoom_enter(event) {
    if (event.ctrlKey) {
      event.preventDefault();
      this.change_zoom(-event.deltaY);
    } else {
      this.canvas_x -= event.deltaX;
      this.canvas_y -= event.deltaY;
      this.dispatch("translate", { x: this.canvas_x, y: this.canvas_y });
      this.precanvas.style.transform =
        "translate(" +
        this.canvas_x +
        "px, " +
        this.canvas_y +
        "px) scale(" +
        this.getZoom() +
        ")";
    }
  }
  zoom_refresh() {
    this.zoom = Math.min(
      Math.max(Math.log(this.zoom_min) * 100, this.zoom),
      Math.log(this.zoom_max) * 100
    );

    var zoom_last_value = Math.exp(this.zoom_last_value / 100);
    var zoom = this.getZoom();

    this.dispatch("zoom", this.zoom);
    this.canvas_x = (this.canvas_x / zoom_last_value) * zoom;
    this.canvas_y = (this.canvas_y / zoom_last_value) * zoom;
    this.zoom_last_value = this.zoom;
    this.precanvas.style.transform =
      "translate(" +
      this.canvas_x +
      "px, " +
      this.canvas_y +
      "px) scale(" +
      zoom +
      ")";
  }
  change_zoom(value = this.zoom_value) {
    this.zoom += value;
    this.zoom_refresh();
  }
  zoom_in(value = this.zoom_value) {
    if (this.zoom < this.zoom_max) {
      this.zoom += value;
      this.zoom_refresh();
    }
  }
  zoom_out(value = this.zoom_value) {
    if (this.zoom > this.zoom_min) {
      this.zoom -= value;
      this.zoom_refresh();
    }
  }
  zoom_reset() {
    if (this.zoom != 1) {
      this.zoom = 1;
      this.zoom_refresh();
    }
  }

  createCurvature(
    start_pos_x,
    start_pos_y,
    end_pos_x,
    end_pos_y,
    curvature_value,
    type
  ) {
    var line_x = start_pos_x;
    var line_y = start_pos_y;
    var x = end_pos_x;
    var y = end_pos_y;
    var curvature = curvature_value;
    //type openclose open close other
    switch (type) {
      case "open":
        if (start_pos_x >= end_pos_x) {
          var hx1 = line_x + Math.abs(x - line_x) * curvature;
          var hx2 = x - Math.abs(x - line_x) * (curvature * -1);
        } else {
          var hx1 = line_x + Math.abs(x - line_x) * curvature;
          var hx2 = x - Math.abs(x - line_x) * curvature;
        }
        return (
          " M " +
          line_x +
          " " +
          line_y +
          " C " +
          hx1 +
          " " +
          line_y +
          " " +
          hx2 +
          " " +
          y +
          " " +
          x +
          "  " +
          y
        );

        break;
      case "close":
        if (start_pos_x >= end_pos_x) {
          var hx1 = line_x + Math.abs(x - line_x) * (curvature * -1);
          var hx2 = x - Math.abs(x - line_x) * curvature;
        } else {
          var hx1 = line_x + Math.abs(x - line_x) * curvature;
          var hx2 = x - Math.abs(x - line_x) * curvature;
        }
        return (
          " M " +
          line_x +
          " " +
          line_y +
          " C " +
          hx1 +
          " " +
          line_y +
          " " +
          hx2 +
          " " +
          y +
          " " +
          x +
          "  " +
          y
        );
        break;
      case "other":
        if (start_pos_x >= end_pos_x) {
          var hx1 = line_x + Math.abs(x - line_x) * (curvature * -1);
          var hx2 = x - Math.abs(x - line_x) * (curvature * -1);
        } else {
          var hx1 = line_x + Math.abs(x - line_x) * curvature;
          var hx2 = x - Math.abs(x - line_x) * curvature;
        }
        return (
          " M " +
          line_x +
          " " +
          line_y +
          " C " +
          hx1 +
          " " +
          line_y +
          " " +
          hx2 +
          " " +
          y +
          " " +
          x +
          "  " +
          y
        );
        break;
      default:
        var hx1 = line_x + Math.abs(x - line_x) * curvature;
        var hx2 = x - Math.abs(x - line_x) * curvature;

        return (
          " M " +
          line_x +
          " " +
          line_y +
          " C " +
          hx1 +
          " " +
          line_y +
          " " +
          hx2 +
          " " +
          y +
          " " +
          x +
          "  " +
          y
        );
    }
  }

  drawConnection(ele) {
    var connection = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg"
    );
    this.connection_ele = connection;
    var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.classList.add("main-path");
    path.setAttributeNS(null, "d", "");
    // path.innerHTML = 'a';
    connection.classList.add("connection");
    connection.appendChild(path);
    this.precanvas.appendChild(connection);

    var id_output = getNodeID(ele.parentElement.parentElement.id);
    var output_class = ele.classList[1];

    this.dispatch("connectionStart", {
      output_id: id_output,
      output_class: output_class,
    });
  }

  drawConnectionTo(eX, eY) {
    const precanvas = this.precanvas;
    const zoom = this.getZoom();

    const precanvasRect = precanvas.getBoundingClientRect();
    var path = this.connection_ele.children[0];

    function getCenter(node) {
      const rect = node.getBoundingClientRect();
      return [
        (rect.x - precanvasRect.x + rect.width / 2) / zoom,
        (rect.y - precanvasRect.y + rect.width / 2) / zoom,
      ];
    }

    const [fromX, fromY] = getCenter(this.ele_selected);

    var toX = (eX - this.precanvas.getBoundingClientRect().x) * zoom;
    var toY = (eY - this.precanvas.getBoundingClientRect().y) * zoom;

    var curvature = this.curvature;
    var lineCurve = this.createCurvature(
      fromX,
      fromY,
      toX,
      toY,
      curvature,
      "openclose"
    );
    path.setAttributeNS(null, "d", lineCurve);
  }

  addConnection(id_output, id_input, output_class, input_class) {
    const nodeOneModule = this.getModuleFromNodeId(id_output);
    const nodeTwoModule = this.getModuleFromNodeId(id_input);

    if (nodeOneModule !== nodeTwoModule) {
      return;
    }

    const dataNode = this.getNodeFromId(id_output);
    let exist = false;

    for (const output of dataNode.outputs[output_class].connections) {
      if (output.node == id_input && output.output == input_class) {
        exist = true;
      }
    }

    // Check connection exist
    if (!exist) {
      const moduleData = this.drawflow.drawflow[nodeOneModule].data;
      //Create Connection
      moduleData[id_output].outputs[output_class].connections.push({
        node: id_input.toString(),
        output: input_class,
      });
      moduleData[id_input].inputs[input_class].connections.push({
        node: id_output.toString(),
        input: output_class,
      });

      if (this.module === nodeOneModule) {
        //Draw connection
        var connection = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "svg"
        );
        var path = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "path"
        );
        path.classList.add("main-path");
        path.setAttributeNS(null, "d", "");
        // path.innerHTML = 'a';
        connection.classList.add("connection");
        connection.classList.add("node_in_node-" + id_input);
        connection.classList.add("node_out_node-" + id_output);
        connection.classList.add(output_class);
        connection.classList.add(input_class);
        connection.appendChild(path);
        this.precanvas.appendChild(connection);
        this.updateConnectionNodes("node-" + id_output);
        this.updateConnectionNodes("node-" + id_input);
      }

      this.dispatch("connectionCreated", {
        output_id: id_output,
        input_id: id_input,
        output_class: output_class,
        input_class: input_class,
      });
    }
  }

  updateConnection(connection, nodeFromElem, nodeToElem) {
    const container = this.container;
    const precanvas = this.precanvas;
    const curvature = this.curvature;
    const createCurvature = this.createCurvature;
    const reroute_curvature = this.reroute_curvature;
    const reroute_curvature_start_end = this.reroute_curvature_start_end;
    const reroute_fix_curvature = this.reroute_fix_curvature;
    const rerouteWidth = this.reroute_width;
    const zoom = this.getZoom();

    if (!nodeFromElem) {
      const nodeFromID = connection.classList[2].replace("node_out_", "");
      nodeFromElem = container.querySelector(`#${nodeFromID}`);
    }

    if (!nodeToElem) {
      const nodeToID = connection.classList[1].replace("node_in_", "");
      nodeToElem = container.querySelector(`#${nodeToID}`);
    }

    if (!nodeFromElem || !nodeToElem) {
      return;
    }

    const precanvasRect = precanvas.getBoundingClientRect();

    function getCenter(node) {
      const rect = node.getBoundingClientRect();
      return [
        (rect.x - precanvasRect.x + rect.width / 2) / zoom,
        (rect.y - precanvasRect.y + rect.width / 2) / zoom,
      ];
    }

    function getRerouteCenter(node) {
      const rect = node.getBoundingClientRect();
      return [
        (rect.x - precanvasRect.x) / zoom + rerouteWidth,
        (rect.y - precanvasRect.y) / zoom + rerouteWidth,
      ];
    }

    const outputElem = nodeFromElem.querySelector(
      "." + connection.classList[3]
    );

    const [fromX, fromY] = getCenter(outputElem);

    const inputElem = nodeToElem.querySelector("." + connection.classList[4]);

    const [toX, toY] = getCenter(inputElem);

    const points = connection.querySelectorAll(".point");

    if (points.length === 0) {
      const lineCurve = createCurvature(
        fromX,
        fromY,
        toX,
        toY,
        curvature,
        "openclose"
      );
      connection.children[0].setAttributeNS(null, "d", lineCurve);
    } else {
      let linecurve = "";
      const reroute_fix = [];

      let lastX = fromX;
      let lastY = fromY;
      let type = "open";
      let curvature = reroute_curvature_start_end;

      for (let i = 0; i < points.length; i++) {
        const pointElem = points[i];

        const [pointX, pointY] = getRerouteCenter(pointElem);

        const leftCurveSegment = createCurvature(
          lastX,
          lastY,
          pointX,
          pointY,
          curvature,
          type
        );
        linecurve += leftCurveSegment;
        reroute_fix.push(leftCurveSegment);

        lastX = pointX;
        lastY = pointY;
        type = "other";
        curvature = reroute_curvature;
      }

      type = "close";
      curvature = reroute_curvature_start_end;

      const leftCurveSegment = createCurvature(
        lastX,
        lastY,
        toX,
        toY,
        curvature,
        type
      );
      linecurve += leftCurveSegment;
      reroute_fix.push(leftCurveSegment);

      if (reroute_fix_curvature) {
        reroute_fix.forEach((itempath, i) => {
          connection.children[i].setAttributeNS(null, "d", itempath);
        });
      } else {
        connection.children[0].setAttributeNS(null, "d", linecurve);
      }
    }
  }

  updateConnectionNodes(id) {
    const connectionInTag = "node_in_" + id;
    const connectionOutTag = "node_out_" + id;
    const container = this.container;

    const nodeElem = container.querySelector(`#${id}`);

    const connectionsOut = container.querySelectorAll(`.${connectionOutTag}`);

    for (const connection of connectionsOut) {
      this.updateConnection(connection, nodeElem, null);
    }

    const connectionsIn = container.querySelectorAll(`.${connectionInTag}`);

    for (const connection of connectionsIn) {
      this.updateConnection(connection, null, nodeElem);
    }
  }

  dblclick(e) {
    if (this.connection_selected != null && this.reroute) {
      this.createReroutePoint(this.connection_selected);
    }

    if (e.target.classList[0] === "point") {
      this.removeReroutePoint(e.target);
    }
  }

  createReroutePoint(ele) {
    this.connection_selected.classList.remove("selected");
    const { output_id, input_id, output_class, input_class } =
      getConnectionData(this.connection_selected.parentElement.classList);
    this.connection_selected = null;

    const point = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "circle"
    );
    point.classList.add("point");
    const pos_x =
      (this.pos_x - this.precanvas.getBoundingClientRect().x) * this.getZoom();
    const pos_y =
      (this.pos_y - this.precanvas.getBoundingClientRect().y) * this.getZoom();

    point.setAttributeNS(null, "cx", pos_x);
    point.setAttributeNS(null, "cy", pos_y);
    point.setAttributeNS(null, "r", this.reroute_width);

    let position_add_array_point = 0;
    if (this.reroute_fix_curvature) {
      const numberPoints =
        ele.parentElement.querySelectorAll(".main-path").length;
      var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.classList.add("main-path");
      path.setAttributeNS(null, "d", "");

      ele.parentElement.insertBefore(
        path,
        ele.parentElement.children[numberPoints]
      );
      if (numberPoints === 1) {
        ele.parentElement.appendChild(point);
      } else {
        const search_point = Array.from(ele.parentElement.children).indexOf(
          ele
        );
        position_add_array_point = search_point;
        ele.parentElement.insertBefore(
          point,
          ele.parentElement.children[search_point + numberPoints + 1]
        );
      }
    } else {
      ele.parentElement.appendChild(point);
    }

    const searchConnection = this.drawflow.drawflow[this.module].data[
      output_id
    ].outputs[output_class].connections.findIndex(function (item, i) {
      return item.node === input_id && item.output === input_class;
    });

    if (
      this.drawflow.drawflow[this.module].data[output_id].outputs[output_class]
        .connections[searchConnection].points === undefined
    ) {
      this.drawflow.drawflow[this.module].data[output_id].outputs[
        output_class
      ].connections[searchConnection].points = [];
    }

    if (this.reroute_fix_curvature) {
      //console.log(position_add_array_point)
      if (position_add_array_point > 0) {
        this.drawflow.drawflow[this.module].data[output_id].outputs[
          output_class
        ].connections[searchConnection].points.splice(
          position_add_array_point,
          0,
          { pos_x: pos_x, pos_y: pos_y }
        );
      } else {
        this.drawflow.drawflow[this.module].data[output_id].outputs[
          output_class
        ].connections[searchConnection].points.push({
          pos_x: pos_x,
          pos_y: pos_y,
        });
      }

      ele.parentElement.querySelectorAll(".main-path").forEach((item, i) => {
        item.classList.remove("selected");
      });
    } else {
      this.drawflow.drawflow[this.module].data[output_id].outputs[
        output_class
      ].connections[searchConnection].points.push({
        pos_x: pos_x,
        pos_y: pos_y,
      });
    }

    this.dispatch("addReroute", output_id);
    this.updateConnectionNodes(output_id);
  }

  removeReroutePoint(ele) {
    const { output_id, input_id, output_class, input_class } =
      getConnectionData(ele.parentElement.classList);

    let numberPointPosition =
      Array.from(ele.parentElement.children).indexOf(ele) - 1;

    const searchConnection = this.drawflow.drawflow[this.module].data[
      output_id
    ].outputs[output_class].connections.findIndex(function (item, i) {
      return item.node === input_id && item.output === input_class;
    });

    if (this.reroute_fix_curvature) {
      const numberMainPath =
        ele.parentElement.querySelectorAll(".main-path").length;
      ele.parentElement.children[numberMainPath - 1].remove();
      numberPointPosition -= numberMainPath;
      if (numberPointPosition < 0) {
        numberPointPosition = 0;
      }
    }
    this.drawflow.drawflow[this.module].data[output_id].outputs[
      output_class
    ].connections[searchConnection].points.splice(numberPointPosition, 1);

    ele.remove();
    this.dispatch("removeReroute", output_id);
    this.updateConnectionNodes(`node-${output_id}`);
  }

  registerNode(name, html, props = null, options = null) {
    this.noderegister[name] = { html: html, props: props, options: options };
  }

  getNodeFromId(id) {
    var moduleName = this.getModuleFromNodeId(id);
    return JSON.parse(
      JSON.stringify(this.drawflow.drawflow[moduleName].data[id])
    );
  }
  getNodesFromName(name) {
    var nodes = [];
    const editor = this.drawflow.drawflow;
    Object.keys(editor).map(function (moduleName, index) {
      for (var node in editor[moduleName].data) {
        if (editor[moduleName].data[node].name == name) {
          nodes.push(editor[moduleName].data[node].id);
        }
      }
    });
    return nodes;
  }

  addNode(
    name,
    num_in,
    num_out,
    ele_pos_x,
    ele_pos_y,
    classoverride,
    data,
    html,
    typenode = false
  ) {
    if (this.useuuid) {
      var newNodeId = this.getUuid();
    } else {
      var newNodeId = this.nodeId;
    }
    const parent = document.createElement("div");
    parent.classList.add("parent-node");

    const node = document.createElement("div");
    node.innerHTML = "";
    node.setAttribute("id", "node-" + newNodeId);
    node.classList.add("drawflow-node");
    if (classoverride != "") {
      node.classList.add(...classoverride.split(" "));
    }

    const inputs = document.createElement("div");
    inputs.classList.add("inputs");

    const outputs = document.createElement("div");
    outputs.classList.add("outputs");

    const json_inputs = {};
    for (var x = 0; x < num_in; x++) {
      const input = document.createElement("div");
      input.classList.add("input");
      input.classList.add("input_" + (x + 1));
      json_inputs["input_" + (x + 1)] = { connections: [] };
      inputs.appendChild(input);
    }

    const json_outputs = {};
    for (var x = 0; x < num_out; x++) {
      const output = document.createElement("div");
      output.classList.add("output");
      output.classList.add("output_" + (x + 1));
      json_outputs["output_" + (x + 1)] = { connections: [] };
      outputs.appendChild(output);
    }

    const content = document.createElement("div");
    content.classList.add("drawflow_content_node");
    if (typenode === false && typeof typenode === "string") {
      content.innerHTML = html;
    } else if (typenode === false) {
      html(content);
    } else if (typenode === true) {
      content.appendChild(this.noderegister[html].html.cloneNode(true));
    } else {
      if (parseInt(this.render.version) === 3) {
        //Vue 3
        let wrapper = this.render.h(
          this.noderegister[html].html,
          this.noderegister[html].props,
          this.noderegister[html].options
        );
        wrapper.appContext = this.parent;
        this.render.render(wrapper, content);
      } else {
        // Vue 2
        let wrapper = new this.render({
          parent: this.parent,
          render: (h) =>
            h(this.noderegister[html].html, {
              props: this.noderegister[html].props,
            }),
          ...this.noderegister[html].options,
        }).$mount();
        //
        content.appendChild(wrapper.$el);
      }
    }

    function insertObjectkeys(obj, keys = []) {
      if (obj === null) return;

      for (const key in obj) {
        if (Object.hasOwnProperty.call(obj, key)) {
          const value = obj[key];
          if (typeof value === "object" && value !== null) {
            insertObjectkeys(value, [key]);
          } else {
            const completeKey = keys.concat(key).join("-");
            var elems = content.querySelectorAll("[df-" + completeKey + "]");
            for (const elem of elems) {
              elem.value = value;
              if (elem.isContentEditable) {
                elem.innerText = value;
              }
            }
          }
        }
      }
    }

    insertObjectkeys(data);

    node.style.top = ele_pos_y + "px";
    node.style.left = ele_pos_x + "px";

    node.appendChild(inputs);
    node.appendChild(content);
    node.appendChild(outputs);

    parent.appendChild(node);

    this.precanvas.appendChild(parent);

    var json = {
      id: newNodeId,
      name: name,
      data: data,
      class: classoverride,
      html: html,
      typenode: typenode,
      inputs: json_inputs,
      outputs: json_outputs,
      pos_x: ele_pos_x,
      pos_y: ele_pos_y,
    };

    this.drawflow.drawflow[this.module].data[newNodeId] = json;
    this.dispatch("nodeCreated", newNodeId);
    if (!this.useuuid) {
      this.nodeId++;
    }

    return newNodeId;
  }

  addNodeImport(dataNode, precanvas) {
    const parent = document.createElement("div");
    parent.classList.add("parent-node");

    const node = document.createElement("div");
    node.innerHTML = "";
    node.setAttribute("id", "node-" + dataNode.id);
    node.classList.add("drawflow-node");
    if (dataNode.class != "") {
      node.classList.add(...dataNode.class.split(" "));
    }

    const inputs = document.createElement("div");
    inputs.classList.add("inputs");

    const outputs = document.createElement("div");
    outputs.classList.add("outputs");

    Object.keys(dataNode.inputs).map(function (input_item, index) {
      const input = document.createElement("div");
      input.classList.add("input");
      input.classList.add(input_item);
      inputs.appendChild(input);
      Object.keys(dataNode.inputs[input_item].connections).map(function (
        output_item,
        index
      ) {
        var connection = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "svg"
        );
        var path = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "path"
        );
        path.classList.add("main-path");
        path.setAttributeNS(null, "d", "");
        // path.innerHTML = 'a';
        connection.classList.add("connection");
        connection.classList.add("node_in_node-" + dataNode.id);
        connection.classList.add(
          "node_out_node-" +
            dataNode.inputs[input_item].connections[output_item].node
        );
        connection.classList.add(
          dataNode.inputs[input_item].connections[output_item].input
        );
        connection.classList.add(input_item);

        connection.appendChild(path);
        precanvas.appendChild(connection);
      });
    });

    for (var x = 0; x < Object.keys(dataNode.outputs).length; x++) {
      const output = document.createElement("div");
      output.classList.add("output");
      output.classList.add("output_" + (x + 1));
      outputs.appendChild(output);
    }

    const content = document.createElement("div");
    content.classList.add("drawflow_content_node");

    if (dataNode.typenode === false) {
      content.innerHTML = dataNode.html;
    } else if (dataNode.typenode === true) {
      content.appendChild(
        this.noderegister[dataNode.html].html.cloneNode(true)
      );
    } else {
      if (parseInt(this.render.version) === 3) {
        //Vue 3
        let wrapper = this.render.h(
          this.noderegister[dataNode.html].html,
          this.noderegister[dataNode.html].props,
          this.noderegister[dataNode.html].options
        );
        wrapper.appContext = this.parent;
        this.render.render(wrapper, content);
      } else {
        //Vue 2
        let wrapper = new this.render({
          parent: this.parent,
          render: (h) =>
            h(this.noderegister[dataNode.html].html, {
              props: this.noderegister[dataNode.html].props,
            }),
          ...this.noderegister[dataNode.html].options,
        }).$mount();
        content.appendChild(wrapper.$el);
      }
    }

    Object.entries(dataNode.data).forEach(function (key, value) {
      if (typeof key[1] === "object") {
        insertObjectkeys(null, key[0], key[0]);
      } else {
        var elems = content.querySelectorAll("[df-" + key[0] + "]");
        for (var i = 0; i < elems.length; i++) {
          elems[i].value = key[1];
          if (elems[i].isContentEditable) {
            elems[i].innerText = key[1];
          }
        }
      }
    });

    function insertObjectkeys(object, name, completname) {
      if (object === null) {
        var object = dataNode.data[name];
      } else {
        var object = object[name];
      }
      if (object !== null) {
        Object.entries(object).forEach(function (key, value) {
          if (typeof key[1] === "object") {
            insertObjectkeys(object, key[0], completname + "-" + key[0]);
          } else {
            var elems = content.querySelectorAll(
              "[df-" + completname + "-" + key[0] + "]"
            );
            for (var i = 0; i < elems.length; i++) {
              elems[i].value = key[1];
              if (elems[i].isContentEditable) {
                elems[i].innerText = key[1];
              }
            }
          }
        });
      }
    }
    node.appendChild(inputs);
    node.appendChild(content);
    node.appendChild(outputs);
    node.style.top = dataNode.pos_y + "px";
    node.style.left = dataNode.pos_x + "px";
    parent.appendChild(node);
    this.precanvas.appendChild(parent);
  }

  addRerouteImport(dataNode) {
    const reroute_width = this.reroute_width;
    const reroute_fix_curvature = this.reroute_fix_curvature;
    const container = this.container;
    Object.keys(dataNode.outputs).map(function (output_item, index) {
      Object.keys(dataNode.outputs[output_item].connections).map(function (
        input_item,
        index
      ) {
        const points =
          dataNode.outputs[output_item].connections[input_item].points;
        if (points !== undefined) {
          points.forEach((item, i) => {
            const input_id =
              dataNode.outputs[output_item].connections[input_item].node;
            const input_class =
              dataNode.outputs[output_item].connections[input_item].output;
            const ele = container.querySelector(
              ".connection.node_in_node-" +
                input_id +
                ".node_out_node-" +
                dataNode.id +
                "." +
                output_item +
                "." +
                input_class
            );

            if (reroute_fix_curvature) {
              if (i === 0) {
                for (var z = 0; z < points.length; z++) {
                  var path = document.createElementNS(
                    "http://www.w3.org/2000/svg",
                    "path"
                  );
                  path.classList.add("main-path");
                  path.setAttributeNS(null, "d", "");
                  ele.appendChild(path);
                }
              }
            }

            const point = document.createElementNS(
              "http://www.w3.org/2000/svg",
              "circle"
            );
            point.classList.add("point");
            var pos_x = item.pos_x;
            var pos_y = item.pos_y;

            point.setAttributeNS(null, "cx", pos_x);
            point.setAttributeNS(null, "cy", pos_y);
            point.setAttributeNS(null, "r", reroute_width);

            ele.appendChild(point);
          });
        }
      });
    });
  }

  updateNodeValue(event) {
    var attr = event.target.attributes;
    for (var i = 0; i < attr.length; i++) {
      if (attr[i].nodeName.startsWith("df-")) {
        var keys = attr[i].nodeName.slice(3).split("-");
        var target =
          this.drawflow.drawflow[this.module].data[
            getNodeID(
              event.target.closest(".drawflow_content_node").parentElement.id
            )
          ].data;
        for (var index = 0; index < keys.length - 1; index += 1) {
          if (target[keys[index]] == null) {
            target[keys[index]] = {};
          }
          target = target[keys[index]];
        }
        target[keys[keys.length - 1]] = event.target.value;
        if (event.target.isContentEditable) {
          target[keys[keys.length - 1]] = event.target.innerText;
        }
        this.dispatch(
          "nodeDataChanged",
          getNodeID(
            event.target.closest(".drawflow_content_node").parentElement.id
          )
        );
      }
    }
  }

  updateNodeDataFromId(id, data) {
    var moduleName = this.getModuleFromNodeId(id);
    this.drawflow.drawflow[moduleName].data[id].data = data;
    if (this.module === moduleName) {
      const content = this.container.querySelector("#node-" + id);

      Object.entries(data).forEach(function (key, value) {
        if (typeof key[1] === "object") {
          insertObjectkeys(null, key[0], key[0]);
        } else {
          var elems = content.querySelectorAll("[df-" + key[0] + "]");
          for (var i = 0; i < elems.length; i++) {
            elems[i].value = key[1];
            if (elems[i].isContentEditable) {
              elems[i].innerText = key[1];
            }
          }
        }
      });

      function insertObjectkeys(object, name, completname) {
        if (object === null) {
          var object = data[name];
        } else {
          var object = object[name];
        }
        if (object !== null) {
          Object.entries(object).forEach(function (key, value) {
            if (typeof key[1] === "object") {
              insertObjectkeys(object, key[0], completname + "-" + key[0]);
            } else {
              var elems = content.querySelectorAll(
                "[df-" + completname + "-" + key[0] + "]"
              );
              for (var i = 0; i < elems.length; i++) {
                elems[i].value = key[1];
                if (elems[i].isContentEditable) {
                  elems[i].innerText = key[1];
                }
              }
            }
          });
        }
      }
    }
  }

  addNodeInput(id) {
    var moduleName = this.getModuleFromNodeId(id);
    const infoNode = this.getNodeFromId(id);
    const numInputs = Object.keys(infoNode.inputs).length;
    if (this.module === moduleName) {
      //Draw input
      const input = document.createElement("div");
      input.classList.add("input");
      input.classList.add("input_" + (numInputs + 1));
      const parent = this.container.querySelector("#node-" + id + " .inputs");
      parent.appendChild(input);
      this.updateConnectionNodes("node-" + id);
    }
    this.drawflow.drawflow[moduleName].data[id].inputs[
      "input_" + (numInputs + 1)
    ] = { connections: [] };
  }

  addNodeOutput(id) {
    var moduleName = this.getModuleFromNodeId(id);
    const infoNode = this.getNodeFromId(id);
    const numOutputs = Object.keys(infoNode.outputs).length;
    if (this.module === moduleName) {
      //Draw output
      const output = document.createElement("div");
      output.classList.add("output");
      output.classList.add("output_" + (numOutputs + 1));
      const parent = this.container.querySelector("#node-" + id + " .outputs");
      parent.appendChild(output);
      this.updateConnectionNodes("node-" + id);
    }
    this.drawflow.drawflow[moduleName].data[id].outputs[
      "output_" + (numOutputs + 1)
    ] = { connections: [] };
  }

  removeNodeInput(id, input_class) {
    var moduleName = this.getModuleFromNodeId(id);
    const infoNode = this.getNodeFromId(id);
    if (this.module === moduleName) {
      this.container
        .querySelector("#node-" + id + " .inputs .input." + input_class)
        .remove();
    }
    const removeInputs = [];
    Object.keys(infoNode.inputs[input_class].connections).map(function (
      key,
      index
    ) {
      const id_output = infoNode.inputs[input_class].connections[index].node;
      const output_class =
        infoNode.inputs[input_class].connections[index].input;
      removeInputs.push({ id_output, id, output_class, input_class });
    });
    // Remove connections
    removeInputs.forEach((item, i) => {
      this.removeSingleConnection(
        item.id_output,
        item.id,
        item.output_class,
        item.input_class
      );
    });

    delete this.drawflow.drawflow[moduleName].data[id].inputs[input_class];

    // Update connection
    const connections = [];
    const connectionsInputs =
      this.drawflow.drawflow[moduleName].data[id].inputs;
    Object.keys(connectionsInputs).map(function (key, index) {
      connections.push(connectionsInputs[key]);
    });
    this.drawflow.drawflow[moduleName].data[id].inputs = {};
    const input_class_id = input_class.slice(6);
    let nodeUpdates = [];
    connections.forEach((item, i) => {
      item.connections.forEach((itemx, f) => {
        nodeUpdates.push(itemx);
      });
      this.drawflow.drawflow[moduleName].data[id].inputs["input_" + (i + 1)] =
        item;
    });
    nodeUpdates = new Set(nodeUpdates.map((e) => JSON.stringify(e)));
    nodeUpdates = Array.from(nodeUpdates).map((e) => JSON.parse(e));

    if (this.module === moduleName) {
      const eles = this.container.querySelectorAll(
        "#node-" + id + " .inputs .input"
      );
      eles.forEach((item, i) => {
        const id_class = item.classList[1].slice(6);
        if (parseInt(input_class_id) < parseInt(id_class)) {
          item.classList.remove("input_" + id_class);
          item.classList.add("input_" + (id_class - 1));
        }
      });
    }

    nodeUpdates.forEach((itemx, i) => {
      this.drawflow.drawflow[moduleName].data[itemx.node].outputs[
        itemx.input
      ].connections.forEach((itemz, g) => {
        if (itemz.node == id) {
          const output_id = itemz.output.slice(6);
          if (parseInt(input_class_id) < parseInt(output_id)) {
            if (this.module === moduleName) {
              const ele = this.container.querySelector(
                ".connection.node_in_node-" +
                  id +
                  ".node_out_node-" +
                  itemx.node +
                  "." +
                  itemx.input +
                  ".input_" +
                  output_id
              );
              ele.classList.remove("input_" + output_id);
              ele.classList.add("input_" + (output_id - 1));
            }
            if (itemz.points) {
              this.drawflow.drawflow[moduleName].data[itemx.node].outputs[
                itemx.input
              ].connections[g] = {
                node: itemz.node,
                output: "input_" + (output_id - 1),
                points: itemz.points,
              };
            } else {
              this.drawflow.drawflow[moduleName].data[itemx.node].outputs[
                itemx.input
              ].connections[g] = {
                node: itemz.node,
                output: "input_" + (output_id - 1),
              };
            }
          }
        }
      });
    });
    this.updateConnectionNodes("node-" + id);
  }

  removeNodeOutput(id, output_class) {
    var moduleName = this.getModuleFromNodeId(id);
    const infoNode = this.getNodeFromId(id);
    if (this.module === moduleName) {
      this.container
        .querySelector("#node-" + id + " .outputs .output." + output_class)
        .remove();
    }
    const removeOutputs = [];
    Object.keys(infoNode.outputs[output_class].connections).map(function (
      key,
      index
    ) {
      const id_input = infoNode.outputs[output_class].connections[index].node;
      const input_class =
        infoNode.outputs[output_class].connections[index].output;
      removeOutputs.push({ id, id_input, output_class, input_class });
    });
    // Remove connections
    removeOutputs.forEach((item, i) => {
      this.removeSingleConnection(
        item.id,
        item.id_input,
        item.output_class,
        item.input_class
      );
    });

    delete this.drawflow.drawflow[moduleName].data[id].outputs[output_class];

    // Update connection
    const connections = [];
    const connectionsOuputs =
      this.drawflow.drawflow[moduleName].data[id].outputs;
    Object.keys(connectionsOuputs).map(function (key, index) {
      connections.push(connectionsOuputs[key]);
    });
    this.drawflow.drawflow[moduleName].data[id].outputs = {};
    const output_class_id = output_class.slice(7);
    let nodeUpdates = [];
    connections.forEach((item, i) => {
      item.connections.forEach((itemx, f) => {
        nodeUpdates.push({ node: itemx.node, output: itemx.output });
      });
      this.drawflow.drawflow[moduleName].data[id].outputs["output_" + (i + 1)] =
        item;
    });
    nodeUpdates = new Set(nodeUpdates.map((e) => JSON.stringify(e)));
    nodeUpdates = Array.from(nodeUpdates).map((e) => JSON.parse(e));

    if (this.module === moduleName) {
      const eles = this.container.querySelectorAll(
        "#node-" + id + " .outputs .output"
      );
      eles.forEach((item, i) => {
        const id_class = item.classList[1].slice(7);
        if (parseInt(output_class_id) < parseInt(id_class)) {
          item.classList.remove("output_" + id_class);
          item.classList.add("output_" + (id_class - 1));
        }
      });
    }

    nodeUpdates.forEach((itemx, i) => {
      this.drawflow.drawflow[moduleName].data[itemx.node].inputs[
        itemx.output
      ].connections.forEach((itemz, g) => {
        if (itemz.node == id) {
          const input_id = itemz.input.slice(7);
          if (parseInt(output_class_id) < parseInt(input_id)) {
            if (this.module === moduleName) {
              const ele = this.container.querySelector(
                ".connection.node_in_node-" +
                  itemx.node +
                  ".node_out_node-" +
                  id +
                  ".output_" +
                  input_id +
                  "." +
                  itemx.output
              );
              ele.classList.remove("output_" + input_id);
              ele.classList.remove(itemx.output);
              ele.classList.add("output_" + (input_id - 1));
              ele.classList.add(itemx.output);
            }
            if (itemz.points) {
              this.drawflow.drawflow[moduleName].data[itemx.node].inputs[
                itemx.output
              ].connections[g] = {
                node: itemz.node,
                input: "output_" + (input_id - 1),
                points: itemz.points,
              };
            } else {
              this.drawflow.drawflow[moduleName].data[itemx.node].inputs[
                itemx.output
              ].connections[g] = {
                node: itemz.node,
                input: "output_" + (input_id - 1),
              };
            }
          }
        }
      });
    });

    this.updateConnectionNodes("node-" + id);
  }

  removeNodeId(id) {
    this.removeConnectionNodeId(id);
    var moduleName = this.getModuleFromNodeId(getNodeID(id));
    if (this.module === moduleName) {
      this.container.querySelector(`#${id}`).remove();
    }
    delete this.drawflow.drawflow[moduleName].data[getNodeID(id)];
    this.dispatch("nodeRemoved", getNodeID(id));
  }

  removeConnection() {
    if (this.connection_selected != null) {
      const elem = this.connection_selected.parentElement;

      const { output_id, input_id, output_class, input_class } =
        getConnectionData(elem.classList);

      elem.remove();

      const moduleData = this.drawflow.drawflow[this.module].data;

      var index_out = moduleData[output_id].outputs[
        output_class
      ].connections.findIndex(
        (item) => item.node === input_id && item.output === input_class
      );
      moduleData[output_id].outputs[output_class].connections.splice(
        index_out,
        1
      );

      var index_in = moduleData[input_id].inputs[
        input_class
      ].connections.findIndex(
        (item) => item.node === output_id && item.input === output_class
      );
      moduleData[input_id].inputs[input_class].connections.splice(index_in, 1);

      this.dispatch("connectionRemoved", {
        output_id: output_id,
        input_id: input_id,
        output_class: output_class,
        input_class: input_class,
      });
      this.connection_selected = null;
    }
  }

  removeSingleConnection(id_output, id_input, output_class, input_class) {
    var nodeOneModule = this.getModuleFromNodeId(id_output);
    var nodeTwoModule = this.getModuleFromNodeId(id_input);
    if (nodeOneModule === nodeTwoModule) {
      // Check nodes in same module.

      // Check connection exist
      var exists = this.drawflow.drawflow[nodeOneModule].data[
        id_output
      ].outputs[output_class].connections.findIndex(function (item, i) {
        return item.node == id_input && item.output === input_class;
      });
      if (exists > -1) {
        if (this.module === nodeOneModule) {
          // In same module with view.
          this.container
            .querySelector(
              ".connection.node_in_node-" +
                id_input +
                ".node_out_node-" +
                id_output +
                "." +
                output_class +
                "." +
                input_class
            )
            .remove();
        }

        var index_out = this.drawflow.drawflow[nodeOneModule].data[
          id_output
        ].outputs[output_class].connections.findIndex(function (item, i) {
          return item.node == id_input && item.output === input_class;
        });
        this.drawflow.drawflow[nodeOneModule].data[id_output].outputs[
          output_class
        ].connections.splice(index_out, 1);

        var index_in = this.drawflow.drawflow[nodeOneModule].data[
          id_input
        ].inputs[input_class].connections.findIndex(function (item, i) {
          return item.node == id_output && item.input === output_class;
        });
        this.drawflow.drawflow[nodeOneModule].data[id_input].inputs[
          input_class
        ].connections.splice(index_in, 1);

        this.dispatch("connectionRemoved", {
          output_id: id_output,
          input_id: id_input,
          output_class: output_class,
          input_class: input_class,
        });
        return true;
      } else {
        return false;
      }
    } else {
      return false;
    }
  }

  removeConnectionNodeId(id) {
    const connectionInTag = "node_in_" + id;
    const connectionOutTag = "node_out_" + id;

    const moduleData = this.drawflow.drawflow[this.module].data;

    const connectionsOut = this.container.querySelectorAll(
      `.${connectionOutTag}`
    );

    for (var i = connectionsOut.length - 1; i >= 0; i--) {
      const { output_id, input_id, output_class, input_class } =
        getConnectionData(connectionsOut[i].classList);

      const index_in = moduleData[input_id].inputs[
        input_class
      ].connections.findIndex(
        (item) => item.node === output_id && item.input === output_class
      );
      moduleData[input_id].inputs[input_class].connections.splice(index_in, 1);

      const index_out = moduleData[output_id].outputs[
        output_class
      ].connections.findIndex(
        (item) => item.node === input_id && item.output === input_class
      );
      moduleData[output_id].outputs[output_class].connections.splice(
        index_out,
        1
      );

      connectionsOut[i].remove();

      this.dispatch("connectionRemoved", {
        output_id,
        input_id,
        output_class,
        input_class,
      });
    }

    const connectionsIn = this.container.querySelectorAll(
      `.${connectionInTag}`
    );

    for (var i = connectionsIn.length - 1; i >= 0; i--) {
      const { output_id, input_id, output_class, input_class } =
        getConnectionData(connectionsIn[i].classList);

      var index_out = moduleData[output_id].outputs[
        output_class
      ].connections.findIndex(
        (item) => item.node === input_id && item.output === input_class
      );
      moduleData[output_id].outputs[output_class].connections.splice(
        index_out,
        1
      );

      var index_in = moduleData[input_id].inputs[
        input_class
      ].connections.findIndex(
        (item) => item.node === output_id && item.input === output_class
      );
      moduleData[input_id].inputs[input_class].connections.splice(index_in, 1);

      connectionsIn[i].remove();

      this.dispatch("connectionRemoved", {
        output_id,
        input_id,
        output_class,
        input_class,
      });
    }
  }

  getModuleFromNodeId(id) {
    var nameModule;
    const editor = this.drawflow.drawflow;
    Object.keys(editor).map(function (moduleName, index) {
      Object.keys(editor[moduleName].data).map(function (node, index2) {
        if (node == id) {
          nameModule = moduleName;
        }
      });
    });
    return nameModule;
  }

  addModule(name) {
    this.drawflow.drawflow[name] = { data: {} };
    this.dispatch("moduleCreated", name);
  }
  changeModule(name) {
    this.dispatch("moduleChanged", name);
    this.module = name;
    this.precanvas.innerHTML = "";
    this.canvas_x = 0;
    this.canvas_y = 0;
    this.pos_x = 0;
    this.pos_y = 0;
    this.mouse_x = 0;
    this.mouse_y = 0;
    this.zoom = 1;
    this.zoom_last_value = 1;
    this.precanvas.style.transform = "";
    this.import(this.drawflow, false);
  }

  removeModule(name) {
    if (this.module === name) {
      this.changeModule("Home");
    }
    delete this.drawflow.drawflow[name];
    this.dispatch("moduleRemoved", name);
  }

  clearModuleSelected() {
    this.precanvas.innerHTML = "";
    this.drawflow.drawflow[this.module] = { data: {} };
  }

  clear() {
    this.precanvas.innerHTML = "";
    this.drawflow = { drawflow: { Home: { data: {} } } };
  }
  export() {
    const dataExport = JSON.parse(JSON.stringify(this.drawflow));
    this.dispatch("export", dataExport);
    return dataExport;
  }

  import(data, notify = true) {
    this.clear();
    this.drawflow = JSON.parse(JSON.stringify(data));
    this.load();
    if (notify) {
      this.dispatch("import", "import");
    }
  }

  /* Events */
  on(event, callback) {
    // Check if the callback is not a function
    if (typeof callback !== "function") {
      console.error(
        `The listener callback must be a function, the given type is ${typeof callback}`
      );
      return false;
    }
    // Check if the event is not a string
    if (typeof event !== "string") {
      console.error(
        `The event name must be a string, the given type is ${typeof event}`
      );
      return false;
    }
    // Check if this event not exists
    if (this.events[event] === undefined) {
      this.events[event] = {
        listeners: [],
      };
    }
    this.events[event].listeners.push(callback);
  }

  removeListener(event, callback) {
    // Check if this event not exists

    if (!this.events[event]) return false;

    const listeners = this.events[event].listeners;
    const listenerIndex = listeners.indexOf(callback);
    const hasListener = listenerIndex > -1;
    if (hasListener) listeners.splice(listenerIndex, 1);
  }

  dispatch(event, details) {
    // Check if this event not exists
    if (this.events[event] === undefined) {
      // console.error(`This event: ${event} does not exist`);
      return false;
    }
    this.events[event].listeners.forEach((listener) => {
      listener(details);
    });
  }

  getUuid() {
    // http://www.ietf.org/rfc/rfc4122.txt
    var s = [];
    var hexDigits = "0123456789abcdef";
    for (var i = 0; i < 36; i++) {
      s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
    }
    s[14] = "4"; // bits 12-15 of the time_hi_and_version field to 0010
    s[19] = hexDigits.substr((s[19] & 0x3) | 0x8, 1); // bits 6-7 of the clock_seq_hi_and_reserved to 01
    s[8] = s[13] = s[18] = s[23] = "-";

    var uuid = s.join("");
    return uuid;
  }
}
