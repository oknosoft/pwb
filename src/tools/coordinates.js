
/**
 * ### Инструмент "Таблица координат"
 *
 * Created 07.09.2018
 *
 * @module tools
 * @submodule tool_coordinates
 */



/**
 * ### Инструмент "Таблица координат"
 *
 * @class ToolCoordinates
 * @extends ToolElement
 * @constructor
 * @menuorder 56
 * @tooltip Координаты
 */
class ToolCoordinates extends ToolElement{

  constructor() {
    super();
    Object.assign(this, {
      options: {
        name: 'grid',
        wnd: {
          caption: "Таблица координат",
          width: 290,
          height: 340
        },
      },
      profile: null,
      hitItem: null,
      originalContent: null,
      changed: false,
    });

    this.dp_update = this.dp_update.bind(this);

    this.on({

      activate() {
        this.on_activate('cursor-text-select');
        if(!this.dp) {
          this.dp = $p.dp.builder_coordinates.create(ToolCoordinates.defaultProps);
        }
      },

      deactivate: this.detache_wnd,

      mousedown: this.mousedown,

      mouseup() {
        this._scope.canvas_cursor('cursor-text-select');
      },

      mousemove: this.hitTest

    });
  }

  hitTest(event) {

    const hitSize = 6;
    this.hitItem = null;

    if(event.point) {
      this.hitItem = this.project.hitTest(event.point, {fill: true, stroke: true, selected: true, tolerance: hitSize});
    }
    if(!this.hitItem) {
      this.hitItem = this.project.hitTest(event.point, {fill: true, tolerance: hitSize});
    }

    if(this.hitItem && this.hitItem.item.parent instanceof Editor.ProfileItem
      && (this.hitItem.type == 'fill' || this.hitItem.type == 'stroke')) {
      this._scope.canvas_cursor('cursor-arrow-lay');
    }
    else {
      this.hitItem = null;
      this._scope.canvas_cursor('cursor-text-select');
    }

    return true;
  }


  mousedown() {
    this.project.deselectAll();

    if(this.hitItem) {
      if(this.profile !== this.hitItem.item.parent) {
        this.profile = this.hitItem.item.parent;

        // включить диалог свойств текстового элемента
        if(!this.wnd || !this.wnd.elmnts) {
          this.create_wnd();
        }
        this.select_path();
      }
    }
    else {
      this.detache_wnd();
    }
  }

  refresh_coordinates() {
    const {coordinates} = this.dp;
    coordinates.clear();
    const points = this.grid.grid_points();
    points.forEach((point) => coordinates.add(point));
  }

  create_wnd() {

    $p.wsql.restore_options('editor', this.options);
    this.wnd = $p.iface.dat_blank(this._scope._dxw, this.options.wnd);
    this._layout = this.wnd.attachLayout({
      pattern: '2E',
      cells: [
        {id: 'a', text: 'Шапка', header: false, height: 120, fix_size: [null, true]},
        {id: 'b', text: 'Координаты', header: false},
      ],
      offsets: {top: 0, right: 0, bottom: 0, left: 0}
    });


    this._head = this._layout.cells('a').attachHeadFields({
      obj: this.dp
    });

    this._grid = this._layout.cells('b').attachTabular({
      obj: this.dp,
      ts: 'coordinates',
      reorder: false,
      disable_add_del: true,
    });
    this._grid.attachEvent("onRowSelect", (id) => {
      const row = this.dp.coordinates.get(id-1);
      this.grid && row && this.grid.grid_points(row.x);
    });
    this._layout.cells('b').detachToolbar();

    this._layout.cells('a').cell.firstChild.style.border = 'none';
    this._layout.cells('a').cell.lastChild.style.border = 'none';
    const {cell} = this._layout.cells('b');
    cell.firstChild.style.border = 'none';
    cell.lastChild.style.border = 'none';

    this._layout.setSizes();

    this.dp._manager.on({update: this.dp_update});

    if(this.grid){
      this.grid.visible = true;
    }
    else {
      this.grid = new Editor.GridCoordinates({
        parent: this.project.l_dimensions,
        step: this.dp.step,
        offset: this.dp.offset,
        angle: this.dp.step_angle,
        bind: this.dp.bind.valueOf(),
      });
    }
  }

  detache_wnd() {
    super.detache_wnd();
    this.dp._manager.off({update: this.dp_update});
    if(this.grid) {
      this.grid.remove();
      this.grid = null;
    }
  }

  // получает путь, с точками которого будем работать
  select_path() {
    const {path_kind} = $p.enm;
    this.profile.selected = false;

    // заготовка пути
    let path = (this.dp.path === path_kind.generatrix ? this.profile.generatrix : this.profile.rays[this.dp.path.valueOf()])
      .clone({insert: false});
    // находим проекции точек профиля на путь, ищем наиболее удаленные
    const pts = [];
    for(let i = 1; i < 5; i++) {
      const pt = path.getNearestPoint(this.profile.corns(i));
      pts.push(path.getOffsetOf(pt));
    }
    pts.sort((a, b) => a - b);
    if(pts[3] < path.length){
      path.split(pts[3]);
    }
    if(pts[0]){
      path = path.split(pts[0]);
    }

    this.grid.path = path;
    this.dp.step_angle = 0;
    this.refresh_coordinates();
  }

  // смещает (добавляет) точки пути
  move_points(id) {

    const {profile, grid, dp, project} = this;
    const {generatrix} = profile;

    // строим таблицу новых точек образующей через дельты от текущего пути
    const {bind, path, line, step} = grid._attr;
    const segments = [];
    let reverce = path.firstSegment.point.getDistance(generatrix.firstSegment.point) >
      path.firstSegment.point.getDistance(generatrix.lastSegment.point);
    if(bind === 'e') {
      reverce = !reverce;
    }

    function add(tpath, x, y, tpoint, point) {
      const d1 = tpath.getOffsetOf(tpoint);
      const p1 = tpath.getPointAt(d1 + y);
      const delta = p1.subtract(point);

      if(x < step / 2) {
        segments.push((reverce ? generatrix.lastSegment.point : generatrix.firstSegment.point).add(delta));
      }
      else if(x > line.length - step / 2) {
        segments.push((reverce ? generatrix.firstSegment.point : generatrix.lastSegment.point).add(delta));
      }
      else {
        const intersections = generatrix.getIntersections(tpath);
        if(intersections.length) {
          segments.push(intersections[0].point.add(delta));
        }
      }
    }

    // движемся массиву координат и создаём точки
    const n0 = line.getNormalAt(0).multiply(10000);
    dp.coordinates.forEach(({x, y}) => {
      const tpoint = x < line.length ? line.getPointAt(x) : line.lastSegment.point;
      const tpath = new paper.Path({
        segments: [tpoint.subtract(n0), tpoint.add(n0)],
        insert: false
      });
      const intersections = path.getIntersections(tpath);
      if(intersections.length) {
        add(tpath, x, y, tpoint, intersections[0].point);
      }
      else if(x < step / 2) {
        add(tpath, x, y, tpoint, bind === 'e' ? path.lastSegment.point : path.firstSegment.point);
      }
      else if(x > line.length - step / 2) {
        add(tpath, x, y, tpoint, bind === 'e' ? path.firstSegment.point : path.lastSegment.point);
      }
    });

    // начальную и конечную точки двигаем особо
    if(id === 0) {
      const segment = reverce ? generatrix.lastSegment : generatrix.firstSegment;
      const delta = segments[0].subtract(segment.point);
      segment.selected = true;
      profile.move_points(delta);
    }
    else if(id === segments.length - 1) {
      const segment = reverce ? path.firstSegment : path.lastSegment;
      const delta = segments[id].subtract(segment.point);
      segment.selected = true;
      profile.move_points(delta);
    }
    else {
      const pth = new paper.Path({
        insert: false,
        guide: true,
        strokeColor: 'red',
        strokeScaling: false,
        strokeWidth: 2,
        segments
      });

      pth.smooth({ type: 'catmull-rom',  factor: 0.5 });
      pth.simplify(0.8);
      reverce && pth.reverse();

      profile.generatrix = pth;
      project.register_change(true);
    }

    this.select_path();
    setTimeout(() => this._grid.selectCell(id, 2), 200);
  }

  // обработчик события при изменении полей обработки
  dp_update(dp, fields) {
    //if(this.dp !== dp) return;

    if('path' in fields) {
      this.select_path();
    }
    if('bind' in fields) {
      this.grid.bind = dp.bind.valueOf();
      this.refresh_coordinates();
    }
    if('offset' in fields) {
      this.grid.offset = dp.offset;
      this.refresh_coordinates();
    }
    if('step' in fields) {
      if(dp.step <= 0) {
        dp.step = 100;
      }
      else {
        this.grid.step = dp.step;
        this.refresh_coordinates();
      }
    }
    if('step_angle' in fields) {
      this.grid.angle = dp.step_angle;
      this.refresh_coordinates();
    }
    if('y' in fields) {
      const id = this._grid.getSelectedRowId();
      if(id) {
        this.move_points(parseInt(id, 10) - 1);
      }
    }
    if('x' in fields) {
      // отменяем редактирование
      const id = this._grid.getSelectedRowId();
      if(id) {
        this.refresh_coordinates();
        setTimeout(() => this._grid.selectCell(parseInt(id, 10) - 1, 2), 200);
      }
    }
  }

}

ToolCoordinates.defaultProps = {
  bind: 'b',
  path: 'generatrix',
  step: 200,
  offset: 200,
};

Editor.ToolCoordinates = ToolCoordinates;
