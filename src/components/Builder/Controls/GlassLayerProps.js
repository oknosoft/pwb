/**
 * Свойства слоя составного пакета
 *
 * @module GlassLayerProps
 *
 * Created by Evgeniy Malyarov on 20.10.2021.
 */

import React from 'react';
import PropTypes from 'prop-types';
import PropField from 'metadata-react/DataField/PropField';
import LinkedProp from 'wb-forms/dist/Common/LinkedProp';

function GlassLayerProps ({elm, row, inset}) {
  if (!elm || !row) {
    return null;
  }

  const _obj = elm.region(row);
  const {fields} = _obj._metadata;
  const {clr} = fields;
  $p.cat.clrs.selection_exclude_service(clr, inset, elm.ox);
  const content = [<PropField fullWidth key={`clr-${inset.ref}-${row.row}`} _obj={_obj} _fld="clr" _meta={clr} empty_text="Авто"/>];
  for (const prm of inset.used_params()) {
    const {ref} = prm;
    content.push(<LinkedProp key={`${ref}-${row.row}`} param={prm} _obj={_obj} _fld={ref} fields={fields}/>);
  }
  return content;
}

export default GlassLayerProps;

GlassLayerProps.propTypes = {
  elm: PropTypes.object, // элемент рисовалки
  row: PropTypes.object, // строка состава заполнения
  inset: PropTypes.object, // вставка текущей строки
};
