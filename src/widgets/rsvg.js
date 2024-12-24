/**
 * Ячейка грида для отображения картинки svg и компонент,
 * получающий и отображающий галерею эскизов объекта данных
 *
 * &copy; http://www.oknosoft.ru 2014-2018
 * @author	Evgeniy Malyarov
 *
 * @module  widgets
 * @submodule rsvg
 */

/**
 * Конструктор поля картинки svg
 */
function eXcell_rsvg(cell){ //the eXcell name is defined here
	if (cell){                // the default pattern, just copy it
		this.cell = cell;
		this.grid = this.cell.parentNode.grid;
	}
	this.edit = function(){};  //read-only cell doesn't have edit method
	this.isDisabled = function(){ return true; }; // the cell is read-only, so it's always in the disabled state
	this.setValue=function(val){
		this.cell.style.padding = "2px 4px";
		this.setCValue(val ? $p.iface.scale_svg(val, 120, 0) : "нет эскиза");
	}
}
eXcell_rsvg.prototype = new eXcell();
window.eXcell_rsvg = eXcell_rsvg;

/**
 * ### Визуальный компонент OSvgs
 * Получает и отображает галерею эскизов объекта данных
 *
 * @class OSvgs
 * @param layout {dhtmlXLayoutObject|dhtmlXWindowsCell}
 * @param area {HTMLElement}
 * @constructor
 */
class OSvgs {

  constructor (layout, area, handler) {

    Object.assign(this, {
      layout: layout,
      minmax: document.createElement('div'),
      pics_area: document.createElement('div'),
      stack: [],
      reload_id: 0,
      area_hidden: $p.wsql.get_user_param('svgs_area_hidden', 'boolean'),
      area_text: area.querySelector('.dhx_cell_statusbar_text'),
      onclick: this.onclick.bind(this),
      ondblclick: this.ondblclick.bind(this),
      handler: handler,
    });

    this.draw_svgs = this.draw_svgs.bind(this);

    const {pics_area} = this;
    pics_area.className = 'svgs-area';
    if(area.firstChild){
      area.insertBefore(pics_area, area.firstChild);
    }
    else{
      area.appendChild(pics_area);
    }

    area.appendChild(Object.assign(this.minmax, {
      className: 'svgs-minmax',
      title: 'Скрыть/показать панель эскизов',
      onclick: () => {
        this.area_hidden = !this.area_hidden;
        $p.wsql.set_user_param('svgs_area_hidden', this.area_hidden);
        this.apply_area_hidden();

        if(!this.area_hidden && this.stack.length) {
          this.reload();
        }
      }
    }));

    this.apply_area_hidden();

  }

  apply_area_hidden () {

    const {pics_area, area_hidden, area_text, layout, minmax} = this;

    pics_area.style.display = area_hidden ? 'none' : '';
    area_text.style.display = area_hidden ? '' : 'none';

    if (layout.setSizes){
      layout.setSizes();
    }
    else if (layout.layout && layout.layout.setSizes) {
      layout.layout.setSizes();
    }
    else if (layout.getDimension) {
      const dim = layout.getDimension();
      layout.setDimension(dim[0], dim[1]);
      if (!layout.do_not_maximize){
        layout.maximize();
      }
    }

    minmax.style.backgroundPositionX = area_hidden ? '-32px' : '0px';
  }

  draw_svgs(res){

    const {pics_area} = this;

    if(!pics_area){
      return;
    }

    while (pics_area.firstChild){
      pics_area.removeChild(pics_area.firstChild)
    }

    res.forEach(({ref, svg}) => {
      if(!svg || svg.substr(0, 1) != "<"){
        return;
      }
      const svg_elm = document.createElement("div");
      pics_area.appendChild(svg_elm);
      svg_elm.className = "rsvg_elm";
      svg_elm.innerHTML = $p.iface.scale_svg(svg, 88, 22);
      svg_elm.ref = ref;
      svg_elm.onclick = this.onclick;
      svg_elm.ondblclick = this.ondblclick;
    });

    if(!res.length){
      // возможно, стоит показать надпись, что нет эскизов
    }
    else if(res.length > 8) {
      this.apply_area_hidden();
    }
  }

  onclick(event, dbl) {
    if(event.currentTarget && event.currentTarget.ref){
      this.handler && this.handler(event.currentTarget.ref, dbl);
      this.pics_area && this.select(event.currentTarget.ref);
    }
  }

  ondblclick(event){
    this.onclick(event, true);
  }

  reload(ref) {

    const {stack, reload_id, area_hidden} = this;

    ref && stack.push(ref);
    reload_id && clearTimeout(reload_id);

    if(!area_hidden) {
      const {doc: {calc_order}, adapters: {pouch}, utils} = $p;
      this.reload_id = setTimeout(async () => {

        if(stack.length) {

          // Получаем идентификаторы продукций с вложениями
          let _obj = stack.pop();
          if(typeof _obj == 'string') {
            const doc = calc_order.get(_obj, true);
            _obj = doc || {ref: _obj};
          }
          const body = {};
          const keys = [];
          if(_obj.is_new && !_obj.is_new()) {
            const refs = [];
            for (const {characteristic} of _obj.production) {
              const {ref, svg} = characteristic;
              if(!characteristic.is_new() && svg) {
                keys.push({ref, svg});
                if(characteristic.leading_product.empty()) {
                  if($p.job_prm.builder.separate_frame_layers) {
                    const contours = characteristic.constructions.find_rows({parent: 0}).map(v => v._row);
                    if(contours.length > 1) {
                      let min = Infinity, root;
                      for(const layer of contours) {
                        if(layer.cnstr < min) {
                          min = layer.cnstr;
                          root = layer;
                        }
                      }
                      const {svg} = root.dop;
                      if(svg) {
                        keys.push({ref, svg});
                      }
                    }
                  }
                }
              }
              else if(!characteristic.empty()) {
                if(characteristic.is_new() || characteristic.coordinates.count()) {
                  refs.push(`cat.characteristics|${characteristic.ref}`);
                }
              }
            }
            body.refs = refs;
          }
          if(!body.refs || body.refs.length) {
            const db = pouch.db(calc_order)
            await pouch.fetch(`${db.name}/doc.calc_order|${_obj.ref}?svgs`, {
              method: 'post',
              body: JSON.stringify(body),
            })
              .then((res) => res.json())
              .then((res) => {
                if(res.ok) {
                  keys.length = 0;
                  for(const row of res.keys) {
                    keys.push(row);
                  }
                }
              })
              .catch((err) => err);
          }
          this.draw_svgs && this.draw_svgs(keys);
          stack.length = 0;
        }
      }, 300);
    }
  }

  select(ref) {
    if(!this.pics_area) {
      return;
    }
    const {children} = this.pics_area;
    for (let i = 0; i < children.length; i++) {
      const elm = children.item(i);
      if(elm.ref == ref) {
        elm.classList.add('rsvg_selected');
      }
      else {
        elm.classList.remove('rsvg_selected');
      }
    }
  }

  unload() {
    this.draw_svgs && this.draw_svgs([]);
    for(let fld in this){
      if(this[fld] instanceof HTMLElement && this[fld].parentNode){
        this[fld].parentNode.removeChild(this[fld]);
      }
      this[fld] = null;
    }
  }

}

$p.iface.OSvgs = OSvgs;
