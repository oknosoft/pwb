// Подключение редактора и форматтера к полю ввода табчасти параметров

import CompoundFormatter from './Formatter';
import CompoundEditor from './Editor';

const {cch: {properties}, cat: {formulas, scheme_settings}} = $p;
const prm = properties.predefined('compound');
const scheme = scheme_settings.find({obj: 'dp.buyers_order.production', name: 'Упаковка'});
const crow = prm && scheme?.fields?.find({field: prm?.ref});

if(crow) {
  crow.use = true;
  const base = prm.ref.substring(0, 34);

  crow.formatter = formulas.create({
    ref: `${base}01`,
    name: `formatter-compound`,
    parent: formulas.predefined('components'),
  }, false, true);
  crow.formatter._data._formula = () => CompoundFormatter;

  crow.editor = formulas.create({
    ref: `${base}02`,
    name: `editor-compound`,
    parent: formulas.predefined('components'),
  }, false, true);
  crow.editor._data._formula = () => CompoundEditor;
}
