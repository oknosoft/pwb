import React from 'react';
import PropTypes from 'prop-types';
import PropField from 'metadata-react/DataField/PropField';

function RegionLayer({project, layer, region}) {
  return <div>
    {`layer.info #${region}`}
    </div>;
}

RegionLayer.propTypes = {
  editor: PropTypes.object.isRequired,
};

export function region_layer({Editor, ui: {dialogs}}) {
  dialogs.region_layer = function (project) {
    const layer = project.getActiveLayer();
    if(!layer || ![0, 4].includes(layer.kind)) {
      return dialogs.alert({
        title: 'Слой ряда',
        text: 'Текущий слой не выбран либо не может иметь рядов',
        timeout: 10000,
      });
    }
    const insets = new Set;
    const regions = new Set;
    const {profiles, info, children, sys} = layer;
    const irows = sys.inserts('region', 'rows', profiles.length ? profiles[0] : project);

    for(const {nom} of irows) {
      if(nom.region) {
        insets.add(nom);
        regions.add(nom.region);
      }
    }
    if(!insets.size) {
      return dialogs.alert({
        title: `Ряд для ${info}`,
        text: `В системе '${sys.name}' не описаны вставки рядов`,
        timeout: 10000,
      });
    }
    const values = Array.from(regions).map(v => v.toFixed());
    const initialValue = values[0];
    let pre = Promise.resolve(initialValue);
    if(regions.size > 1) {
      pre = dialogs.input_value({
        title: `Ряд для ${info}`,
        text: 'Уточните номер ряда',
        list: values,
        timeout: 10000,
      });
    }

    return pre
      .then((region) => {
        region = parseInt(region);
        const parent = region > 0 ? children.bottomLayers : children.topLayers;
        for(const rl of parent.children) {
          if(rl.dop.region === region) {
            return dialogs.alert({
              title: `Ряд для ${info}`,
              text: `Слой ряда №${region} уже существует`,
              timeout: 10000,
            });
          }
        }
        // создаём слой ряда
        const rl = Editor.Contour.create({kind: 5, region, project, layer, parent});
        // уточним цвет
        const {ox, _dp} = project;
        const clr_row = _dp.sys.clr_conformity.find({region});
        const clr = clr_row && $p.cat.clrs.by_predefined(clr_row.clr, ox.clr, ox.clr);
        // создаём профили ряда
        for(const elm of profiles) {
          const {generatrix, inset: {inserts}, width} = elm;
          // if(width < 2) {
          //   continue;
          // }
          let inset = project.default_inset({elm_type: 'region', pos: elm.pos, elm});
          if(!inset || !inserts.find({inset})) {
            for(const curr of insets) {
              const crow = inserts.find({inset: curr});
              if(curr.region == region && (!inset || crow)) {
                inset = curr;
                if(crow?.by_default) {
                  break;
                }
              }
            }
          }
          if(inset) {
            new Editor.ProfileRegion({
              layer: rl,
              parent: rl.children.profiles,
              generatrix: generatrix.clone({insert: false}),
              proto: {inset, ...(clr ? {clr} : null)},
            });
          }
        }
      })
      .catch(() => null);
  };
}
export default RegionLayer;
