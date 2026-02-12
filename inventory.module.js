// inventory.module.js
(function(){
  const api = ()=> window.AAR || {};
  const byId = (id)=> document.getElementById(id);

  const LS_INVENTORY = 'aar_inventory_v1';

  // ✅ Ton default actuel (version simple items)
  const inventoryDefault = [
    "Stylo","Blanc","Stabilo","Ciseau","Crayon","Marqueur","Carton clés","Post-it","Scotch",
    "Rouleau TPE","Agrafes","Carte Novotel","Ticket 30€ restau","Petit sac","Grand sac",
    "Grande Serviette","Petite Serviette","Dosette Café","Thé","Sucre","Gobelet",
    "Shampoing","Gel douche","Gel main","Conditionner"
  ];

  function safeJsonParse(raw, fallback){
    const A = api();
    if (A.safeJsonParse) return A.safeJsonParse(raw, fallback);
    try { return JSON.parse(raw); } catch { return fallback; }
  }

  let inventory = safeJsonParse(localStorage.getItem(LS_INVENTORY) || 'null', null)
    || inventoryDefault.map(t=>({ text:t, ok:false }));

  function saveInventory(reason){
    // ✅ Local only (plus de sync GitHub/Vercel)
    localStorage.setItem(LS_INVENTORY, JSON.stringify(inventory));
  }

  const inventoryEl = ()=> byId('inventorylist');

  let _dragIndex = null;

  function moveItem(from, to){
    if (from === to) return;
    if (from < 0 || to < 0 || from >= inventory.length || to >= inventory.length) return;
    const [it] = inventory.splice(from, 1);
    inventory.splice(to, 0, it);
  }

  function ensureInventoryToolbar(){
    if (byId('add-inventory')) return;
    const resetBtn = byId('reset-inventory');
    if (!resetBtn) return;

    const addBtn = document.createElement('button');
    addBtn.id = 'add-inventory';
    addBtn.className = 'btn primary';
    addBtn.style.marginTop = '10px';
    addBtn.style.marginRight = '10px';
    addBtn.textContent = '➕ Ajouter un item';
    addBtn.onclick = ()=>{
      inventory.unshift({ text:'Nouvel item', ok:false });
      saveInventory("inventory add");
      renderInventory();
      api().toast && api().toast("➕ Item ajouté");
    };

    resetBtn.parentNode.insertBefore(addBtn, resetBtn);
  }

  function renderInventory(){
    const el = inventoryEl();
    if(!el) return;

    el.innerHTML = '';

    inventory.forEach((item, i)=>{
      const row = document.createElement('div');
      row.className = 'inv-item';
      row.draggable = true;
      row.dataset.index = String(i);

      row.addEventListener('dragstart', (e)=>{
        _dragIndex = i;
        row.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        try { e.dataTransfer.setData('text/plain', String(i)); } catch(_) {}
      });

      row.addEventListener('dragend', ()=>{
        row.classList.remove('dragging');
        _dragIndex = null;
        el.querySelectorAll('.drag-over').forEach(x=>x.classList.remove('drag-over'));
      });

      row.addEventListener('dragover', (e)=>{
        e.preventDefault();
        row.classList.add('drag-over');
        e.dataTransfer.dropEffect = 'move';
      });

      row.addEventListener('dragleave', ()=>{
        row.classList.remove('drag-over');
      });

      row.addEventListener('drop', (e)=>{
        e.preventDefault();
        row.classList.remove('drag-over');

        let from = _dragIndex;
        const to = i;

        if (from == null) {
          const raw = (e.dataTransfer && e.dataTransfer.getData) ? e.dataTransfer.getData('text/plain') : '';
          from = raw ? parseInt(raw,10) : null;
        }
        if (from == null || Number.isNaN(from)) return;

        moveItem(from, to);
        saveInventory("inventory reorder");
        renderInventory();
      });

      const handle = document.createElement('span');
      handle.className = 'inv-handle';
      handle.textContent = '⋮⋮';

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = !!item.ok;
      cb.onchange = ()=>{
        inventory[i].ok = cb.checked;
        saveInventory("inventory toggle");
      };

      const input = document.createElement('input');
      input.type = 'text';
      input.value = item.text || '';
      input.className = 'inv-text';
      input.oninput = ()=>{
        inventory[i].text = input.value;
        saveInventory("inventory edit");
      };

      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'inv-del';
      del.textContent = '✕';
      del.title = 'Supprimer';
      del.onclick = ()=>{
        inventory.splice(i,1);
        saveInventory("inventory delete");
        renderInventory();
      };

      row.append(handle, cb, input, del);
      el.appendChild(row);
    });
  }

  function boot(){
    ensureInventoryToolbar();
    renderInventory();

    byId('reset-inventory')?.addEventListener('click', ()=>{
      inventory = inventoryDefault.map(t=>({ text:t, ok:false }));
      saveInventory("inventory reset");
      renderInventory();
      api().toast && api().toast("↺ Inventaire reset");
    });
  }

  window.addEventListener('DOMContentLoaded', boot);

  // mini API debug
  window.InventoryTest = ()=> { renderInventory(); };

})();
