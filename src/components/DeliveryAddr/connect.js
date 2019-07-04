/**
 * ### Адрес доставки
 * обработчики событий и модификаторы данных
 *
 * Created by Evgeniy Malyarov on 13.11.2017.
 */

import {connect} from 'react-redux';
import withStyles from './styles';
import {compose} from 'redux';

class DeliveryManager {

  constructor() {
    const {keys, rest_path} = $p.job_prm;

    this.geonames = {
      postalCodeLookup(postalcode) {
        return fetch(`https://light.oknosoft.ru/geonames/postalCodeLookupJSON?postalcode=${postalcode}&country=RU&username=${keys.geonames}`)
          .then(res => res.json());
      },
      geoLookup({lat, lng}) {
        return fetch(`https://light.oknosoft.ru/geonames/addressJSON?lat=${lat}&lng=${lng}&username=${keys.geonames}`)
          .then(res => res.json());
      }
    };

    this.dadata = {

      get token() {
        return keys.dadata;
      },

      suggestions(query, kind = 'address') {
        return fetch(`https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/${kind}?5`, {
          method: 'post',
          body: JSON.stringify({query, count: 1}),
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Token ${this.token}`
          }
        })
          .then(res => res.json());
      },

      geolocate([lat, lon]) {
        return fetch(`https://suggestions.dadata.ru/suggestions/api/4_1/rs/geolocate/address`, {
          method: 'post',
          body: JSON.stringify({lat, lon, count: 1}),
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Token ${this.token}`
          }
        })
          .then(res => res.json());
      },

      components(v, c) {
        v.region = c.region_with_type;
        v.locality = c.area_with_type;
        v.city = c.city;
        v.city_long = c.city_with_type || c.city;
        v.house = c.house_type_full && c.house ? c.house_type_full + ' ' + c.house : '';
        v.postal_code = c.postal_code || '';
        v.street = c.street_with_type || c.street || '';
      },

      address(raw) {
        return fetch(`${rest_path}proxy/dadata`, {
          method: 'post',
          body: JSON.stringify({body: raw}),
        })
          .then(res => res.json());
      }
    };

    this.yandex = {
      geolocate([lat, lon]) {
        return fetch(`https://geocode-maps.yandex.ru/1.x/?apikey=${keys.yandex}&geocode=${lon},${lat}&format=json`)
          .then(res => res.json())
          .then(({response}) => {
            const {featureMember} = response.GeoObjectCollection;
            if(featureMember && featureMember.length) {
              const {Address, AddressDetails: {Country}} = featureMember[0].GeoObject.metaDataProperty.GeocoderMetaData;
              const res = {
                data: {
                  postal_code: Address.postal_code || '',
                  house_type_full: 'дом',
                  region_with_type: '',
                  area_with_type: '',
                  city: '',
                  house: '',
                  street_with_type: '',
                },
                value: Address.formatted.replace(`${Country.CountryName}, `, ''),
              };
              for(const {kind, name} of Address.Components) {
                switch (kind) {
                case 'province':
                  res.data.region_with_type = name;
                  break;
                case 'area':
                  res.data.area_with_type = name;
                  break;
                case 'locality':
                  res.data.city = name;
                  break;
                case 'street':
                  res.data.street_with_type = name;
                  break;
                case 'house':
                  res.data.house = name;
                  break;
                }
              }

              return {suggestions: [res]};
            }
            return {suggestions: []};
          });

        // return ymaps.geocode([lat, lon], {results: 1})
        //   .then();
      }
    };

  }

  distance(p1, p2) {
    const dlat = p1.lat - p2.lat;
    const dlng = p1.lng - p2.lng;
    return Math.sqrt(dlat * dlat + dlng * dlng);
  }

  // ищет ближайший по координатам
  nearest(point) {
    let tmp, distance = Infinity;
    $p.cat.delivery_areas.forEach((doc) => {
      const td = this.distance(point, {lat: doc.latitude, lng: doc.longitude});
      if(!tmp || td < distance) {
        distance = td;
        tmp = doc;
      }
    });
    return [tmp, point];
  }

  coord_presentation() {

  }
}

const delivery = new DeliveryManager();

const {doc: {calc_order}, cat: {delivery_areas}, classes: {BaseDataObj}} = $p;

class FakeAddrObj extends BaseDataObj{

  constructor({_obj: {delivery_area, coordinates, shipping_address, address_fields}}) {
    super({delivery_area, coordinates, shipping_address, address_fields}, calc_order, false, true);
    this._data._is_new = false;
  }


  get delivery_area() {
    return this._getter('delivery_area');
  }
  set delivery_area(v) {
    this._setter('delivery_area', v);
  }

  get coordinates() {
    return this._getter('coordinates');
  }
  set coordinates(v) {
    this._setter('coordinates', v);
  }

  get shipping_address() {
    return this._getter('shipping_address');
  }
  set shipping_address(v) {
    this._setter('shipping_address', v);
  }

  get address_fields() {
    return this._getter('shipping_address');
  }
  set address_fields(v) {
    this._setter('address_fields', v);
  }


};

function mapStateToProps(state, props) {
  return {
    handleCalck() {
      const {props:{dialog: {ref, _mgr}}, obj} = this;
      if(!obj.shipping_address) {
        return Promise.reject({msg: {text: 'Уточните адрес доставки выбором из выпадающего списка', title: 'Пустой адрес'}});
      }
      if(!obj.coordinates) {
        return Promise.reject({msg: {text: 'Укажите координаты адреса', title: 'Пустые координаты'}});
      }
      return Promise.resolve(Object.assign(_mgr.by_ref[ref], obj._obj));
    },

    handleCancel() {
      props.handlers.handleIfaceState({
        component: 'DataObjPage',
        name: 'dialog',
        value: null,
      });
    },

    delivery,

    FakeAddrObj,
  };
}

// function mapDispatchToProps(dispatch) {
//   return {};
// }

export default compose(
  withStyles,
  connect(mapStateToProps /*, mapDispatchToProps */),
);
