// общие модули

// строки интернационализации
import i18ru from './i18n.ru';
import scale_svg from './scale_svg';
import tools from '../tools';
import static_load from './static_load';
import {region_layer} from '../../components/Builder/ToolWnds/RegionLayer';
import templates_nested from 'wb-forms/dist/CalcOrder/TemplatesNested/dhtmlx';
import {event_src} from 'metadata-react/common/proxy';
import {event_src_ram} from './event_src_ram';
import reload from './reload';
import qs from 'qs';

export default function ($p) {
  i18ru($p);
  tools($p);
  static_load($p);
  region_layer($p);
  templates_nested($p);
  event_src($p);
  event_src_ram($p);
  reload($p);
  $p.iface.scale_svg = scale_svg;
  $p.utils.scale_svg = scale_svg;
  $p.utils.prm = () => qs.parse(location.search.replace('?',''));
}
