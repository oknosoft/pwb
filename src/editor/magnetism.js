
/**
 * Варианты притягивания узлов
 * @module magnetism
 *
 * Created by Evgeniy Malyarov on 04.02.2018.
 */

class Magnetism {

  constructor(scheme) {
    this.scheme = scheme;
    this.on_impost_selected = this.on_impost_selected.bind(this);
  }

  /**
   * Возвращает единственный выделенный узел
   */
  get selected() {
    const {profiles} = this.scheme.activeLayer;
    const selected = {profiles};
    for(const {generatrix} of profiles) {
      if(generatrix.firstSegment.selected) {
        if(selected.profile) {
          selected.break = true;
          break;
        }
        selected.profile = generatrix.parent;
        selected.point = 'b';
      }
      if(generatrix.lastSegment.selected) {
        if(selected.profile) {
          selected.break = true;
          break;
        }
        selected.profile = generatrix.parent;
        selected.point = 'e';
      }
    }
    return selected;
  }

  /**
   * Возвращает массив узлов, примыкающих к текущему
   * @param selected
   * @return {*[]}
   */
  filter(selected) {
    const point = selected.profile[selected.point];
    const nodes = [selected];

    // рассмотрим вариант с углом...
    for(const profile of selected.profiles) {
      if(profile !== selected.profile) {
        let pushed;
        if(profile.b.is_nearest(point, true)) {
          nodes.push({profile, point: 'b'});
          pushed = true;
        }
        if(profile.e.is_nearest(point, true)) {
          nodes.push({profile, point: 'e'});
          pushed = true;
        }
        if(!pushed) {
          const px = (profile.nearest(true) ? profile.rays.outer : profile.generatrix).getNearestPoint(point);
          if(px.is_nearest(point, true)) {
            nodes.push({profile, point: 't'});
          }
        }
      }
    }
    return nodes;
  }

  /**
   * Ищет короткий сегмент заполнения в окрестности point
   * @param point
   * @return {{segm: *, prev: *, next: *, glass}}
   */
  short_glass(point) {
    const {_scope: {consts}, activeLayer}  = this.scheme;
    for(const glass of activeLayer.glasses(false, true)){
      const len = glass.outer_profiles.length - 1;
      for(let i = 0; i <= len; i++) {
        const segm = glass.outer_profiles[i];
        if((segm.b.is_nearest(point) || segm.e.is_nearest(point)) &&
          segm.sub_path && segm.sub_path.length < consts.sticking) {
          const prev = i === 0 ? glass.outer_profiles[len] : glass.outer_profiles[i - 1];
          const next = i === len ? glass.outer_profiles[0] : glass.outer_profiles[i + 1];
          return {segm, prev, next, glass};
        }
      }
    }
  }

  /**
   * Двигает узел наклонного импоста для получения 0-штапика
   */
  m1() {
    const {dialogs} = $p.ui;
    const {tb_left} = this.scheme._scope;
    const previous = tb_left && tb_left.get_selected();

    Promise.resolve().then(() => {

      // получаем выделенные узлы
      const {selected} = this;

      if(selected.break) {
        dialogs.alert({text: `Выделено более одного узла`, title: 'Магнит 0-штапик'});
      }
      else if(!selected.profile) {
        dialogs.alert({text: `Не выделено ни одного узла профиля`, title: 'Магнит 0-штапик'});
      }
      else {
        const spoint = selected.profile[selected.point];
        const res = this.short_glass(spoint);
        if(res) {
          // находим штапик, связанный с этим ребром
          const {segm, prev, next, glass} = res;

          let cl;
          this.scheme.cnns.find_rows({elm1: glass.elm, elm2: segm.profile.elm}, (row) => {
            cl = row.aperture_len;
          });

          if(!cl) {
            return dialogs.alert({text: `Не найдена строка соединения короткого ребра заполнения с профилем`, title: 'Магнит 0-штапик'});
          }

          let pNext, pOur;
          if(prev.profile === selected.profile){
            pNext = next;
            pOur = prev;
          }
          else if(next.profile === selected.profile) {
            pNext = prev;
            pOur = next;
          }
          else {
            return dialogs.alert({text: `Выделен неподходящий сегмент профиля`, title: 'Магнит 0-штапик'});
          }

          if(!pNext.profile.nom.sizefaltz || !segm.profile.nom.sizefaltz || !pOur.profile.nom.sizefaltz) {
            return dialogs.alert({text: `Не задан размер фальца примыкающих профилей`, title: 'Магнит 0-штапик'});
          }

          // строим линии фальца примыкающих к импосту профилей
          const rSegm = (segm.outer ? segm.profile.rays.outer : segm.profile.rays.inner).equidistant(-segm.profile.nom.sizefaltz);
          const rNext = (pNext.outer ? pNext.profile.rays.outer : pNext.profile.rays.inner).equidistant(-pNext.profile.nom.sizefaltz);
          const rOur = (pOur.outer ? pOur.profile.rays.outer : pOur.profile.rays.inner).equidistant(-pOur.profile.nom.sizefaltz);

          const ps = rSegm.intersect_point(rOur, spoint);
          // если next является почти продолжением segm (арка), точку соединения ищем иначе
          const be = ps.getDistance(segm.profile.b) > ps.getDistance(segm.profile.e) ? 'e' : 'b';
          const da = rSegm.angle_to(rNext, segm.profile[be]);

          let p0 = rSegm.intersect_point(rNext, ps);
          if(!p0 || da < 4) {
            p0 = rNext.getNearestPoint(segm.profile[be]);
          }
          const delta = p0.subtract(ps);
          if(delta.length) {
            selected.profile.move_points(delta, true);
            for(const node of ['b', 'e']) {
              try {
                selected.profile.do_sub_bind(selected.profile.rays[node].profile, node);
              }
              catch (e) {}
            }
            selected.profile.insertBelow(prev.profile);
            selected.profile.insertBelow(next.profile);
          }
        }
        else {
          dialogs.alert({text: `Не найдено коротких сегментов заполнений<br />в окрестности выделенной точки`, title: 'Магнит 0-штапик'});
        }
      }
    });

    if(previous) {
      return this.scheme._scope.select_tool(previous.replace('left_', ''));
    }
  }

  /**
   * Используется для отложенного выравнивания
   */
  on_impost_selected() {
    const {scheme, on_impost_selected} = this;
    scheme.view.off('click', on_impost_selected);
    const profiles = scheme.selected_profiles();
    if(profiles.length === 1 && profiles[0].elm_type === $p.enm.elm_types.Импост) {
      this.m3();
    }
  }

  /**
   * Уравнивает профиль в балконном блоке
   */
  m3() {
    const {enm: {elm_types, orientations}, ui: {dialogs}} = $p;
    const {scheme, on_impost_selected} = this;
    const profiles = scheme.selected_profiles();
    const {contours} = scheme;
    const title = 'Импост в балконном блоке';
    if(profiles.length !== 1 || profiles[0].elm_type !== elm_types.Импост) {
      scheme.view.on('click', on_impost_selected);
      return dialogs.alert({text: 'Укажите один импост на эскизе', title});
    }
    const profile = profiles[0];
    const {layer, orientation} = profile;
    if(orientation !== orientations.hor) {
      return dialogs.alert({text: 'Укажите горизонтальный импост', title});
    }
    if(contours.length < 2) {
      return dialogs.alert({text: 'В изделии только один контур - нечего уравнивать', title});
    }
    // центр профиля
    const {_corns} = profile._attr;
    const corns = _corns[3].y > _corns[2].y ? [_corns[1], _corns[2]] : [_corns[3], _corns[3]];
    // рамный слой
    let root = layer;
    while (root.layer) {
      root = layer.layer;
    }
    // ишем профиль, по которому будем уравнивать
    let nearest;
    let distance = Infinity;
    function check(cnt) {
      const candidat = cnt.profiles_by_side('bottom');
      const {_corns} = candidat._attr;
      const d03 = Math.abs(corns[0].x - _corns[3].x);
      const d04 = Math.abs(corns[0].x - _corns[4].x);
      const d13 = Math.abs(corns[1].x - _corns[3].x);
      const d14 = Math.abs(corns[1].x - _corns[4].x);
      const delta = Math.min(d03, d04, d13, d14);
      if(!nearest || (delta < distance && nearest.elm_type === elm_types.Рама)|| (delta < 300 && candidat.elm_type === elm_types.Створка)) {
        distance = delta;
        nearest = candidat;
        if(delta === d03) {
          corns.d = [0, 3];
        }
        else if(delta === d04) {
          corns.d = [0, 4];
        }
        else if(delta === d13) {
          corns.d = [1, 3];
        }
        else if(delta === d14) {
          corns.d = [1, 4];
        }
      }
    }
    for(const contour of contours) {
      if(contour === root) {
        continue;
      }
      check(contour);
      for(const cnt of contour.contours) {
        check(cnt);
      }
    }
    if(!nearest) {
      return dialogs.alert({text: 'Не найден подходящий профиль для уравнивания', title});
    }

    // узнаем, насколько двигать и в какую сторону
    const delta = nearest._attr._corns[corns.d[1]].y - corns[corns.d[0]].y;
    if(delta) {
      scheme.move_points(new paper.Point(0, delta));
    }
  }

  /**
   * Групповое выделение элементов
   */
  m4() {
    const {dialogs} = $p.ui;
    const list = [
      {value: 'all', text: 'Во всём изделии'},
      {value: 'contour', text: 'В текущем слое'},
    ];
    dialogs.input_value({
      text: 'Выделить элементы',
      title: 'Область выделения',
      list,
      initialValue: list[0],
    })
      .then((mode) => {
        list.length = 0;
        list.push(
          {value: 'rm', text: 'Рамы'},
          {value: 'stv', text: 'Створки'},
          {value: 'imp', text: 'Импосты'},
          {value: 'profiles', text: 'Все профили'},
          {value: 'gl', text: 'Заполнения'},
          {value: 'lay', text: 'Раскладки'},
          );
        return dialogs.input_value({
          text: 'Выделить элементы',
          title: 'Типы элементов',
          list,
          initialValue: list[5],
        })
          .then((type) => {
            const contours = mode === 'all' ? this.scheme.contours : [this.scheme.activeLayer];
            this.scheme.deselectAll();
            this.attached = false;
            for(const contour of contours) {
              this.select_elmnts(contour, type);
            }
          });
      })
      .catch((err) => err);
  }

  select_attache(elm) {
    elm.selected = true;
    if(!this.attached) {
      elm.attache_wnd(this.scheme._scope._acc.elm);
      this.attached = true;
    }
  }

  select_elmnts(contour, type) {
    for(const cnt of contour.contours) {
      this.select_elmnts(cnt, type);
    }
    if(type === 'gl' || type === 'lay') {
      for(const glass of contour.glasses(false, true)) {
        if(type === 'gl') {
          this.select_attache(glass);
        }
        else {
          for(const onlay of glass.imposts) {
            this.select_attache(onlay);
          }
        }
      }
    }
    else {
      const {elm_types} = $p.enm;
      for(const profile of contour.profiles) {
        if(type === 'profiles') {
          this.select_attache(profile);
        }
        else if(type === 'imp' && profile.elm_type === elm_types.Импост) {
          this.select_attache(profile);
        }
        else if(type === 'stv' && profile.elm_type === elm_types.Створка) {
          this.select_attache(profile);
        }
        else if(type === 'rm' && profile.elm_type === elm_types.Рама) {
          this.select_attache(profile);
        }
      }
    }

  }
}

$p.EditorInvisible.Magnetism = Magnetism;
