// inventory.module.js — sections + titres éditables + drag & drop + sync GH/multi-PC
(function(){
  const api = ()=> window.AAR || {};
  const byId = (id)=> document.getElementById(id);

  const LS_INVENTORY = 'aar_inventory_v1';

  // Defaults simples (tu peux les re-segmenter plus tard)
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

  // ---------- Chargement ----------
  let inventory = safeJsonParse(localStorage.getItem(LS_INVENTORY) || 'null', null);

  // ✅ Migration auto : ancien format [{text, ok}] -> nouveau format mixte
  // + si format "liste de strings" (rare), on convertit aussi
  function migrateIfNeeded(){
    if (!Array.isArray(inventory) || inventory.length === 0) {
      inventory = [
        { type:'section', title:'Général' },
        ...inventoryDefault.map(t=>({ type:'item', text:t, ok:false }))
      ];
      saveInventory("inventory init");
      return;
    }

    // cas 1: tableau de strings
    if (typeof inventory[0] === 'string') {
      inventory = [
        { type:'section', title:'Général' },
        ...inventory.map(t=>({ type:'item', text:String(t||''), ok:false }))
      ];
      saveInventory("inventory migrate strings");
      return;
    }

    // cas 2: ancien format d'objets sans "type"
    if (inventory[0] && typeof inventory[0] === 'object' && !inventory[0].type) {
      inventory = [
        { type:'section', title:'Général' },
        ...inventory.map(it => ({
          type:'item',
          text: String(it.text || ''),
          ok: !!it.ok
        }))
      ];
      saveInventory("inventory migrate legacy");
      return;
    }

    // cas 3: nouveau format déjà OK -> rien
  }

  function saveInventory(reason){
    localStorage.setItem(LS_INVENTORY, JSON.stringify(inventory));
    const A = api();
    if (A.scheduleSaveState) A.scheduleSaveState(reason || "inventory update");
  }

  // ---------- Drag helpers ----------
  let _dragIndex = null;
  function moveItem(from, to){
    if (from === to) return;
    if (from < 0 || to < 0 || from >= inventory.length || to >= inventory.length) return;
    const [it] = inventory.splice(from, 1);
    inventory.splice(to, 0, it);
  }

  // ---------- Toolbar ----------
  function ensureInventoryToolbar(){
    const resetBtn = byId('reset-inventory');
    if (!resetBtn) return;

    if (!byId('add-inventory-item')) {
      const addItemBtn = document.createElement('button');
      addItemBtn.id = 'add-inventory-item';
      addItemBtn.className = 'btn primary';
      addItemBtn.style.marginTop = '10px';
      addItemBtn.style.marginRight = '10px';
      addItemBtn.textContent = '➕ Ajouter un item';
      addItemBtn.onclick = ()=>{
        inventory.unshift({ type:'item', text:'Nouvel item', ok:false });
        saveInventory("inventory add item");
        renderInventory();
        api().toast && api().toast("➕ Item ajouté");
      };
      resetBtn.parentNode.insertBefore(addItemBtn, resetBtn);
    }

    // ✅ (bonus mais ultra utile) bouton section
    if (!byId('add-inventory-section')) {
      const addSectionBtn = document.createElement('button');
      addSectionBtn.id = 'add-inventory-section';
      addSectionBtn.className = 'btn';
      addSectionBtn.style.marginTop = '10px';
      addSectionBtn.style.marginRight = '10px';
      addSectionBtn.textContent = '➕ Ajouter une section';
      addSectionBtn.onclick = ()=>{
        inventory.unshift({ type:'section', title:'Nouvelle section' });
        saveInventory("inventory add section");
        renderInventory();
        api().toast && api().toast("➕ Section ajoutée");
      };
      resetBtn.parentNode.insertBefore(addSectionBtn, resetBtn);
    }
  }

  // ---------- Render ----------
  function renderInventory(){
    const el = byId('inventorylist');
    if(!el) return;

    el.innerHTML = '';

    inventory.forEach((entry, i)=>{
      // ===== SECTION =====
      if (entry.type === 'section') {
        const row = document.createElement('div');
        row.className = 'inv-section';
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
        row.addEventListener('dragleave', ()=> row.classList.remove('drag-over'));
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

        const title = document.createElement('input');
        title.type = 'text';
        title.value = entry.title || '';
        title.placeholder = 'Nom de section';
        title.oninput = ()=>{
          inventory[i].title = title.value;
          saveInventory("inventory section edit");
        };

        const del = document.createElement('button');
        del.type = 'button';
        del.className = 'inv-del inv-sec-del';
        del.textContent = '✕';
        del.title = 'Supprimer la section';
        del.onclick = ()=>{
          // supprime seulement la section (les items restent)
          inventory.splice(i,1);
          saveInventory("inventory delete section");
          renderInventory();
        };

        row.append(handle, title, del);
        el.appendChild(row);
        return;
      }

      // ===== ITEM =====
      if (entry.type !== 'item') {
        // fallback sécurité
        entry = inventory[i] = { type:'item', text:String(entry?.text||''), ok:!!entry?.ok };
      }

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

      row.addEventListener('dragleave', ()=> row.classList.remove('drag-over'));

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
      cb.checked = !!entry.ok;
      cb.onchange = ()=>{
        inventory[i].ok = cb.checked;
        saveInventory("inventory toggle");
      };

      const input = document.createElement('input');
      input.type = 'text';
      input.value = entry.text || '';
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
    migrateIfNeeded();
    ensureInventoryToolbar();
    renderInventory();

    byId('reset-inventory')?.addEventListener('click', ()=>{
      inventory = [
        { type:'section', title:'Général' },
        ...inventoryDefault.map(t=>({ type:'item', text:t, ok:false }))
      ];
      saveInventory("inventory reset");
      renderInventory();
      api().toast && api().toast("↺ Inventaire reset");
    });
  }

  window.addEventListener('DOMContentLoaded', boot);
})();
