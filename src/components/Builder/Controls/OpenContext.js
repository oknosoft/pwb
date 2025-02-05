import React from 'react';
import ControlsFrame from './ControlsFrame';

const {wsql} = $p;
const prefix = 'builder_controls_';
const defaultOpen = {
  composite: wsql.get_user_param(`${prefix}composite`, 'boolean'),
  coordinates: wsql.get_user_param(`${prefix}coordinates`, 'boolean'),
  insets: wsql.get_user_param(`${prefix}insets`, 'boolean'),
  set(state) {
    const key = Object.keys(state)[0];
    wsql.set_user_param(`${prefix}${key}`, state[key]);
    this[key] = state[key];
  }
};
const OpenContext = React.createContext(defaultOpen);
export const useOpenContext = () => React.useContext(OpenContext);

export default function OpenContextProvider({key, ...props}) {
  const [open, setOpen] = React.useState(defaultOpen);
  const openChange = React.useMemo(() => (newState) => {
    setOpen(prevState => ({...prevState, ...newState}));
    defaultOpen.set(newState);
  }, []);

  return <OpenContext.Provider value={{ open, openChange }}>
    <ControlsFrame key={key} {...props}/>
  </OpenContext.Provider>;
}
