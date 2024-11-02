
export default function ({wsql, eve}) {
  const reload = wsql.get_user_param('reload', 'object') || {};
  reload.start = Date.now();
  function tick() {
    const now = Date.now();
    const curr = new Date(now);
    if(reload.prev) {
      const prev = new Date(reload.prev);
      if((prev.getHours() < 3 || prev.getHours() > 21) && curr.getHours() > 2 && curr.getHours() < 20) {
        reload.at = now;
        delete reload.prev;
        wsql.set_user_param('reload', reload);
        if(eve) {
          eve.redirect = true;
        }
        location.reload();
      }
    }
    reload.prev = now;
  }
  setInterval(tick, 200000);

}
