
/**
 * Элементы управления в аккордеоне редактора
 * Created 16.02.2016
 * @author Evgeniy Malyarov
 * @module editor
 * @submodule editor_accordion
 */


class SchemeLayers {

  constructor(cell, set_text, editor) {

    this._cell = cell;
    this._set_text = set_text;

    this.layout = cell.attachLayout({
      pattern: "2E",
      cells: [
        {id: "a", text: "tree", header: false, height: 310},
        {id: "b", text: "Доп. вставки в контур", header: true}
      ],
      offsets: {top: 0, right: 0, bottom: 0, left: 0},
    });

    this.tree = this.layout.cells("a").attachTreeView({
      checkboxes: true,
      multiselect: false
    });

    // гасим-включаем слой по чекбоксу
    this.tree.attachEvent('onCheck', (key, state) => {
      const {project} = editor;
      const contour = project.getItem({class: Editor.Contour, key});
      if(contour) {
        contour.hidden = !state;
      }
      else {
        project.ox.builder_props = {[key]: state};
        project.register_change(true);
        if(key === 'bw') {
          const {clr_by_clr} = Editor.BuilderElement;
          for(const profile of project.getItems({class: Editor.ProfileItem})) {
            profile.path.fillColor = clr_by_clr.call(profile, profile.clr);
          }
        }
      }
      project.register_update();
    });

    // делаем выделенный слой активным
    this.tree.attachEvent('onSelect', (key, mode) => {
      if(!mode){
        return;
      }
      const {project} = editor;
      const contour = project.getItem({class: Editor.Contour, key});
      if(contour){
        if(project.activeLayer != contour){
          contour.activate(true);
        }
        set_text(contour.presentation());
      }
    });

    // начинаем следить за изменениями размеров при перерисовке контуров
    this.listener = this.listener.bind(this);
    this.layer_activated = this.layer_activated.bind(this);
    this.contour_redrawed = this.contour_redrawed.bind(this);
    this.editor = editor;
    this.eve = editor.eve.on({
      layer_activated: this.layer_activated,
      contour_redrawed: this.contour_redrawed,
      rows: this.listener,
    });

    this.layout.cells("a").setMinHeight(220);
    this.layout.cells("b").setMinHeight(200);
    this.layout.cells("a").setHeight(310);

  }

  layer_activated(contour) {
    const {tree} = this;
    if(contour && contour.key && tree && tree.getSelectedId && contour.key != tree.getSelectedId()){
      // если выделено несколько створок, переносим выделение на раму
      const layers = [];
      const {project} = this.editor;
      for(const item of project.getSelectedItems()) {
        item.layer instanceof Editor.Contour && layers.indexOf(item.layer) === -1 && layers.push(item.layer);
      }
      if(layers.length > 1) {
        const parents = [];
        for(const item of layers) {
          let parent = item.parent;
          while (parent && parent.parent) {
            parent = parent.parent;
          }
          if(!parent) {
            parent = item;
          }
          contour = parent;
          break;
        }
      }

      if(tree.items[contour.key]){
        tree.selectItem(contour.key);
        this._set_text(contour.presentation());
      }
    }
  }

  contour_redrawed(contour, bounds) {
    if(contour instanceof Editor.ContourNestedContent) {
      return;
    }
    const {tree} = this;
    if(tree && tree.setItemText){
      const text = contour.presentation(bounds);
      tree.setItemText(contour.key, text);
      if(contour.project.activeLayer == contour){
        this._set_text(text);
      }
    }
  }

  load_layer(layer) {
    this.tree.addItem(layer.key, layer.presentation(), layer.layer?.key || 0);
    if(!layer.hidden) {
      this.tree.checkItem(layer.key);
    }
    layer.contours.concat(layer.tearings).forEach((l) => this.load_layer(l));
  }

  listener(obj, fields) {
    const {tree, editor: {project}} = this;

    if(tree && tree.clearAll && fields.constructions) {

      // добавляем слои изделия
      tree.clearAll();
      project.contours.forEach((layer) => {
        this.load_layer(layer);
        tree.openItem(layer.key);
      });

      const {builder_props} = project.ox;

      /*
      // Вид эскиза
      tree.addItem('mode', '<div id="tree-mode" style="display: flex;">Режим эскиза </div>', 0);
      tree.disableCheckbox('mode');
      const divMode = tree.cont.querySelector('#tree-mode');
      const comboMode = new dhtmlXCombo(divMode, 'combo_mode', '200px');
      const mvalues = ['Основной', 'Скелетон', 'Ряд -1 (перед элементом)', 'Ряд 1 (внутри элемента)', 'Ряд 2 (за элементом)'];
      comboMode.addOption(mvalues.map((v, i) => [i, v]));
      comboMode.selectOption(builder_props.mode);
      comboMode.attachEvent("onChange", function(mode, text){
        project.ox.builder_props = {mode};
        project.register_change();
      });
      const cntMode = divMode.querySelector('.dhxcombo_dhx_terrace');
      cntMode.style.marginTop = '5px';
      cntMode.style.marginLeft = '6px';
      */

      const props = {
        auto_lines: 'Авторазмерные линии',
        custom_lines: 'Доп. размерные линии',
        cnns: 'Соединители',
        visualization: 'Визуализация доп. элементов',
        glass_regions: 'Ряды заполнений',
        //profile_regions: 'Ряды профилей',
        txts: 'Комментарии',
        glass_numbers: 'Номера заполнений',
        bw: 'Чёрно-белый режим',
      };
      for (const prop in props) {
        tree.addItem(prop, props[prop], 0);
      }
      for (const prop in builder_props) {
        props[prop] && builder_props[prop] && tree.checkItem(prop);
      }

      // Ряды раскладки
      const {lay_regions} = $p.enm;
      tree.addItem('onlay_regions', '<div id="tree-onlay-regions" style="display: flex;">Ряды раскладки </div>', 0);
      tree.disableCheckbox('onlay_regions');
      const divRegions = tree.cont.querySelector('#tree-onlay-regions');
      const comboRegions = new dhtmlXCombo(divRegions, 'combo_regions', '160px');
      const aregions = ['', 'inner', 'outer', 'all', 'r1', 'r2', 'r3'];
      comboRegions.addOption(aregions.map((v, i) => [i, lay_regions.get(v).synonym || 'Все']));
      comboRegions.selectOption(aregions.indexOf(builder_props.onlay_regions || ''));
      comboRegions.attachEvent("onChange", function(v, text){
        project.ox.builder_props = {onlay_regions: aregions[v]};
        project.register_change();
      });
      const cntRegions = divRegions.querySelector('.dhxcombo_dhx_terrace');
      cntRegions.style.marginTop = '5px';
      cntRegions.style.marginLeft = '6px';

      // Номера профилей
      tree.addItem('articles', '<div id="tree-articles" style="display: flex;">Номера профилей </div>', 0);
      tree.disableCheckbox('articles');
      const divArticles = tree.cont.querySelector('#tree-articles');
      const comboArticles = new dhtmlXCombo(divArticles, 'combo_articles', '160px');
      const avalues = ['Нет', 'Номер', 'Вставка', 'Номенклатура', 'Номер + Вставка', 'Номер + Номенклатура'];
      comboArticles.addOption(avalues.map((v, i) => [i, v]));
      comboArticles.selectOption(builder_props.articles);
      comboArticles.attachEvent("onChange", function(articles, text){
        project.ox.builder_props = {articles};
        project.register_change();
      });
      const cntArticles = divArticles.querySelector('.dhxcombo_dhx_terrace');
      cntArticles.style.marginTop = '5px';
      cntArticles.style.marginLeft = '6px';

    }

  }

  drop_layer() {
    const {tree, editor: {project}} = this;
    let key = tree.getSelectedId(), l;
    if(key){
      l = project.getItem({class: Editor.Contour, key});
    }
    else if(l = project.activeLayer){
      key = l.key;
    }
    if(key && l){
      tree.deleteItem(key);
      key = l.parent && l.parent.key;
      l.remove();
      setTimeout(() => {
        project.zoom_fit();
        if(key){
          tree.selectItem(key);
        }
      }, 100);
    }
  }

  attach() {

  }

  unload() {
    this.eve.off('layer_activated', this.layer_activated);
    this.eve.off('contour_redrawed', this.contour_redrawed);
    this.eve.off('rows', this.listener);
    this.layout.cells("a").detachObject(true);
    this._cell.detachObject(true);
    for(const fld in this){
      delete this[fld];
    }
  }

}

class EditorAccordion {

  constructor(_editor, cell_acc, pwnd, handlers) {

    this._cell = cell_acc;
    const tabs = [
      {
        id: 'lay',
        text: '<i class="fa fa-sitemap fa-fw"></i>',
        title: 'Слои изделия',
      },
      {
        id: 'elm',
        text: '<i class="fa fa-puzzle-piece fa-fw"></i>',
        title: 'Свойства элемента',
        active:  true,
      },
      {
        id: 'stv',
        text: '<i class="fa fa-object-ungroup fa-fw"></i>',
        title: 'Свойства створки',
      },
      {
        id: 'prod',
        text: '<i class="fa fa-picture-o fa-fw"></i>',
        title: 'Свойства изделия',
      },
      {
        id: 'tool',
        text: '<i class="fa fa-wrench fa-fw"></i>',
        title: 'Свойства инструмента',
      },
    ];
    this.tabbar = cell_acc.attachTabbar({arrows_mode: 'auto', tabs});

    const titles = this.tabbar.tabsArea.children[1].firstChild.children;
    tabs.forEach((tab, index) => {
      titles[index+1].title = tab.title;
    });

    const {iface, msg, ui} = $p;

    /**
     * ячейка для размещения свойств элемента
     */
    this.elm = this.tabbar.cells('elm');
    this.elm.attachObject(document.createElement('div'));

    /**
     * слои в аккордионе
     */
    this._layers = this.tabbar.cells('lay');
    this._layers._toolbar = this._layers.attachToolbar();
    this._layers._otoolbar = new iface.OTooolBar({
      wrapper: this._layers.cell,
      width: '100%',
      height: '28px',
      top: '6px',
      left: '4px',
      class_name: "",
      name: 'right',
      image_path: '/imgs/',
      buttons: [
        {name: 'new_layer', text: '<i class="fa fa-file-o fa-fw"></i>', tooltip: 'Добавить рамный контур', float: 'left'},
        {name: 'new_stv', text: '<i class="fa fa-file-code-o fa-fw"></i>', tooltip: msg.bld_new_stv, float: 'left'},
        //{name: 'nested_layer', text: '<i class="fa fa-file-image-o fa-fw"></i>', tooltip: 'Добавить вложенное изделие', float: 'left'},
        {name: 'virtual_layer', text: '<i class="fa fa-file-excel-o fa-fw"></i>', tooltip: 'Вставить виртуальный слой', float: 'left'},
        {name: 'region_layer', text: '<i class="fa fa-file-powerpoint-o fa-fw"></i>', tooltip: 'Добавить cлой ряда', float: 'left'},
        {name: 'sep_0', text: '', float: 'left'},
        {name: 'inserts_to_product', text: '<i class="fa fa-tags fa-fw"></i>', tooltip: msg.additional_inserts + ' ' + msg.to_product, float: 'left'},
        {name: 'additions', text: '<i class="fa fa-cart-plus fa-fw"></i>', tooltip: 'Аксессуары изделия', float: 'left'},

        {name: 'drop_layer', text: '<i class="fa fa-trash-o fa-fw"></i>', tooltip: 'Удалить слой', float: 'right', paddingRight: '20px'},

      ], onclick: (name) => {

        switch (name) {

        case 'new_stv':
        case 'nested_layer':
        case 'virtual_layer': {
          const fillings = _editor.project.getItems({class: Editor.Filling, selected: true});
          if(fillings.length) {
            if(name === 'nested_layer') {
              ui.dialogs.templates_nested()
                .then((selected) => {
                  if(selected === true) {
                    const {cat: {templates}, job_prm} = $p;
                    const _obj = templates._select_template;
                    const {templates_nested} = job_prm.builder;
                    if(templates_nested && templates_nested.includes(_obj.calc_order)) {
                      let {layer} = fillings[0];
                      // если текущий слой уже является вложенным - перезаполняем содержимое из шаблона
                      if(layer instanceof Editor.ContourNestedContent) {
                        while (layer) {
                          layer = layer.layer;
                          if(layer instanceof Editor.ContourNested) {
                            break;
                          }
                        }
                        layer.load_stamp();
                      }
                      else {
                        // создаём новое вложенное изделие
                        fillings[0].create_leaf(name);
                      }
                    }
                  }
                })
                .catch((err) => null);
            }
            else {
              fillings[0].create_leaf(name);
            }
          }
          else {
            msg.show_msg({
              type: 'alert-warning',
              text: msg.bld_new_stv_no_filling,
              title: msg.bld_new_stv
            });
          }
          break;
        }

        case 'drop_layer':
          this.tree_layers.drop_layer();
          break;

        case 'new_layer':
          // создаём пустой новый слой
          Editor.Contour.create({project: _editor.project});
          break;

        case 'region_layer': {
          // слой ряда в текущем слое
          ui.dialogs.region_layer(_editor.project);
          break;
        }


        case 'additions': {
          // аксессуары изделия
          const {ox} = _editor.project;
          const o = ox.calc_order;
          (o.is_new() ? o.save() : Promise.resolve())
            .then(() => {

              const tmp = {
                ref: ox.ref,
                _mgr: ox._manager,
                cmd: {calc_order: o, area: 'Builder'}
              };
              $p.dp.buyers_order.open_component(pwnd, tmp, handlers, 'Additions', tmp.cmd.area);
              //$p.dp.buyers_order.open_component(pwnd, tmp, handlers, 'ObjHistory', tmp.cmd.area);
            });
          break;
        }

        case 'inserts_to_product':
          // дополнительные вставки в изделие
          _editor.additional_inserts();
          break;

        case 'inserts_to_contour':
          // дополнительные вставки в контур
          _editor.additional_inserts('contour');
          break;

        default:
          msg.show_msg(name);
          break;
        }

        return false;
      }
    });

    this.tree_layers = new SchemeLayers(this._layers, (text) => {
      //this._stv._toolbar.setItemText("info", text);
      _editor.additional_inserts('contour', this.tree_layers.layout.cells('b'));
    }, _editor);

    /**
     * свойства створки
     */
    this._stv = this.tabbar.cells('stv');
    this._stv.attachObject(document.createElement('div'));

    /**
     * свойства изделия
     */
    this._prod = this.tabbar.cells('prod');
    this._prod.attachObject(document.createElement('div'));

    this._tool = this.tabbar.cells('tool');
    this._tool.attachObject(document.createElement('div'));
    _editor.eve.on('tool_activated', this.tool_activated.bind(this));

  }

  tool_activated(tool) {
    if(!(tool instanceof ToolSelectNode) && tool.constructor.ToolWnd) {
      this._tool.setActive();
    }
  }


  attach(obj) {
    this.tree_layers.attach();
    //this.props.attach(obj);
  }

  unload() {
    if(this.tree_layers) {
      //this.elm._otoolbar.unload();
      this._layers._otoolbar.unload();
      //this._prod._otoolbar.unload();
      this.tree_layers.unload();
      //this.props.unload();
      //this.stv.unload();
      this._cell.detachObject(true);
    }
    for(const fld in this){
      delete this[fld];
    }
  }

}

