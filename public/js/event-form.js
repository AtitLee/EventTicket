(function init() {
  function ready(fn){ document.readyState==='loading' ? document.addEventListener('DOMContentLoaded', fn, {once:true}) : fn(); }
  ready(function(){
    var wrapper = document.getElementById('tickets');
    var addBtn = document.getElementById('addTicket');
    if(!wrapper || !addBtn) return;

    function rowHTML(){
      return (
        '<div class="ticket-row card">' +
          '<div class="grid-3">' +
            '<div class="input-group"><label>Ticket name</label><input name="ticketName" placeholder="e.g., Regular"/></div>' +
            '<div class="input-group" data-unit="THB"><label>Price</label><input name="ticketPrice" placeholder="0" type="number" step="1" value="0"/></div>' +
            '<div class="input-group" data-unit="tickets"><label>Qty total</label><input name="ticketQty" placeholder="0" type="number" step="1" value="0"/></div>' +
          '</div>' +
          '<button type="button" class="btn btn-outline removeTicket">Remove</button>' +
        '</div>'
      );
    }

    addBtn.addEventListener('click', function(e){
      e.preventDefault();
      wrapper.insertAdjacentHTML('beforeend', rowHTML());
    });

    wrapper.addEventListener('click', function(e){
      if(e.target && e.target.classList.contains('removeTicket')){
        e.preventDefault();
        var row = e.target.closest('.ticket-row');
        if(row) row.remove();
      }
    });
  });
})();
