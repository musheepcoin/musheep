// inventory.module.js
(function(){
  const api = ()=> window.AAR || {};
  const byId = (id)=> document.getElementById(id);

  const LS_INVENTORY = 'aar_inventory_v3_compact';

  const DEFAULT_SECTIONS = [
    { title:'Papeterie', items:['Blanc','Stylo','Stabilo','Ciseau','Crayon','Marqueur','Post-it','Scotch','Agrafes'] },
    { title:'Clés / accueil', items:['Carton clés','Rouleau TPE','Carte Novotel','Ticket 30€ restau'] },
    { title:'Sacs', items:['Petit sac','Grand sac'] },
    { title:'Consommables', items:['Sucre','Dosette Café','Thé','Gobelet'] },
    { title:'Salle de bain', items:['Grande Serviette','Petite Serviette','Gel main','Conditionner','Shampoing','Gel douche'] }
  ];

  function safeJsonParse(raw, fallback){
    const A = api();
    if (A.safeJsonParse) return A.safeJsonParse(raw, fallback);
    try { return JSON.parse(raw); } catch { return fallback; }
  }

  function uid(prefix){
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
  }

  function normalizeItem(item){
    if (typeof item === 'string') return { id: uid('it'), text: item, ok: false };
    return {
      id: String(item?.id || uid('it')),
      text: String(item?.text || ''),
      ok: !!item?.ok
    };
  }

  function buildDefaultSections(){
    return DEFAULT_SECTIONS.map(section => ({
      id: uid('sec'),
      title: section.title,
      items: section.items.map(name => ({ id: uid('it'), text: name, ok: false }))
    }));
  }

  function categorizeName(name){
    const t = String(name || '').toLowerCase();
    if (['stylo','blanc','stabilo','ciseau','crayon','marqueur','post-it','scotch','agrafes'].some(x => t.includes(x))) return 'Papeterie';
    if (['carton clés','carte novotel','rouleau tpe','ticket 30€ restau'].some(x => t.includes(x))) return 'Clés / accueil';
    if (['petit sac','grand sac'].some(x => t.includes(x))) return 'Sacs';
    if (['sucre','dosette café','thé','gobelet'].some(x => t.includes(x))) return 'Consommables';
    if (['grande serviette','petite serviette','gel main','conditionner','shampoing','gel douche'].some(x => t.includes(x))) return 'Salle de bain';
    return 'Divers';
  }

  function migrateIfNeeded(){
    const current = safeJsonParse(localStorage.getItem(LS_INVENTORY) || 'null', null);
    if (Array.isArray(current)) return current;

    const legacySections = safeJsonParse(localStorage.getItem('aar_inventory_v2_sections') || 'null', null);
    if (Array.isArray(legacySections)) {
      return legacySections.map(sec => ({
        id: String(sec?.id || uid('sec')),
        title: String(sec?.title || 'Section'),
        items: Array.isArray(sec?.items) ? sec.items.map(normalizeItem) : []
      }));
    }

    const legacyList = safeJsonParse(localStorage.getItem('aar_inventory_v1') || 'null', null);
    if (Array.isArray(legacyList)) {
      const grouped = new Map();
      legacyList.map(normalizeItem).forEach(item => {
        const title = categorizeName(item.text);
        if (!grouped.has(title)) grouped.set(title, []);
        grouped.get(title).push(item);
      });

      const order = ['Papeterie','Clés / accueil','Sacs','Consommables','Salle de bain','Divers'];
      const out = [];
      order.forEach(title => {
        const items = grouped.get(title);
        if (items && items.length) out.push({ id: uid('sec'), title, items });
      });
      if (out.length) return out;
    }

    return buildDefaultSections();
  }

  let sections = migrateIfNeeded();
  let dragState = null;

  function saveInventory(){
    localStorage.setItem(LS_INVENTORY, JSON.stringify(sections));
  }

  function ensureToolbar(){
    const resetBtn = byId('reset-inventory');
    if (!resetBtn) return;

    resetBtn.textContent = '↺ Reset inventaire';

    if (!byId('add-inventory-section')) {
      const addSectionBtn = document.createElement('button');
      addSectionBtn.id = 'add-inventory-section';
      addSectionBtn.className = 'btn primary';
      addSectionBtn.type = 'button';
      addSectionBtn.textContent = '+ Section';
      addSectionBtn.onclick = ()=>{
        sections.push({ id: uid('sec'), title: 'Nouvelle section', items: [] });
        saveInventory();
        renderInventory();
        api().toast && api().toast('Section ajoutée');
      };
      resetBtn.parentNode.insertBefore(addSectionBtn, resetBtn);
    }
  }

  function clearDragUI(){
    document.querySelectorAll('#view-inventory .drag-over, #view-inventory .dragging').forEach(el=>{
      el.classList.remove('drag-over','dragging');
    });
  }

  function moveItem(fromSectionId, fromItemId, toSectionId, toIndex){
    const fromSection = sections.find(s => s.id === fromSectionId);
    const toSection = sections.find(s => s.id === toSectionId);
    if (!fromSection || !toSection) return;

    const fromIdx = fromSection.items.findIndex(it => it.id === fromItemId);
    if (fromIdx < 0) return;

    const [item] = fromSection.items.splice(fromIdx, 1);

    let insertAt = Number.isFinite(toIndex) ? toIndex : toSection.items.length;
    if (fromSectionId === toSectionId && fromIdx < insertAt) insertAt -= 1;
    insertAt = Math.max(0, Math.min(insertAt, toSection.items.length));

    toSection.items.splice(insertAt, 0, item);
    saveInventory();
    renderInventory();
  }

  function buildRow(section, sectionIndex, item, itemIndex){
    const row = document.createElement('div');
    row.className = 'inv-item-list-row' + (item.ok ? ' is-ok' : '');
    row.draggable = true;

    row.addEventListener('dragstart', (e)=>{
      dragState = { sectionId: section.id, itemId: item.id };
      row.classList.add('dragging');
      try { e.dataTransfer.setData('text/plain', item.id); } catch(_) {}
      e.dataTransfer.effectAllowed = 'move';
    });

    row.addEventListener('dragend', ()=>{
      dragState = null;
      clearDragUI();
    });

    row.addEventListener('dragover', (e)=>{
      if (!dragState) return;
      e.preventDefault();
      row.classList.add('drag-over');
    });

    row.addEventListener('dragleave', ()=>{
      row.classList.remove('drag-over');
    });

    row.addEventListener('drop', (e)=>{
      if (!dragState) return;
      e.preventDefault();
      row.classList.remove('drag-over');
      moveItem(dragState.sectionId, dragState.itemId, section.id, itemIndex);
      dragState = null;
      clearDragUI();
    });

    const handle = document.createElement('span');
    handle.className = 'inv-drag-handle';
    handle.textContent = '⋮⋮';
    handle.title = 'Déplacer';

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = !!item.ok;
    cb.onchange = ()=>{
      sections[sectionIndex].items[itemIndex].ok = cb.checked;
      saveInventory();
      row.classList.toggle('is-ok', cb.checked);
    };

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'inv-item-text';
    input.value = item.text || '';
    input.placeholder = 'Nom de l’item';
    input.oninput = ()=>{
      sections[sectionIndex].items[itemIndex].text = input.value;
      saveInventory();
    };

    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'inv-item-del';
    del.textContent = '✕';
    del.title = 'Supprimer';
    del.onclick = ()=>{
      sections[sectionIndex].items.splice(itemIndex, 1);
      saveInventory();
      renderInventory();
    };

    row.append(handle, cb, input, del);
    return row;
  }

  function buildSection(section, sectionIndex){
    const card = document.createElement('div');
    card.className = 'inv-section-card';

    const head = document.createElement('div');
    head.className = 'inv-section-head';

    const title = document.createElement('input');
    title.type = 'text';
    title.className = 'inv-section-title';
    title.value = section.title || '';
    title.placeholder = 'Nom de section';
    title.oninput = ()=>{
      sections[sectionIndex].title = title.value;
      saveInventory();
    };

    const headActions = document.createElement('div');
    headActions.className = 'inv-section-actions';

    const addItemBtn = document.createElement('button');
    addItemBtn.type = 'button';
    addItemBtn.className = 'btn';
    addItemBtn.textContent = '+';
    addItemBtn.title = 'Ajouter un item';
    addItemBtn.onclick = ()=>{
      sections[sectionIndex].items.push({ id: uid('it'), text: 'Nouvel item', ok: false });
      saveInventory();
      renderInventory();
      const last = card.querySelector('.inv-item-list-row:last-child .inv-item-text');
      last?.focus();
      last?.select?.();
    };

    headActions.append(addItemBtn);
    head.append(title, headActions);

    const list = document.createElement('div');
    list.className = 'inv-item-list';

    list.addEventListener('dragover', (e)=>{
      if (!dragState) return;
      e.preventDefault();
      list.classList.add('drag-over');
    });

    list.addEventListener('dragleave', (e)=>{
      if (e.target === list) list.classList.remove('drag-over');
    });

    list.addEventListener('drop', (e)=>{
      if (!dragState) return;
      e.preventDefault();
      list.classList.remove('drag-over');
      moveItem(dragState.sectionId, dragState.itemId, section.id, section.items.length);
      dragState = null;
      clearDragUI();
    });

    if (!section.items.length){
      const empty = document.createElement('div');
      empty.className = 'inv-section-empty';
      empty.textContent = 'Aucun item dans cette section.';
      list.appendChild(empty);
    } else {
      section.items.forEach((item, itemIndex)=>{
        list.appendChild(buildRow(section, sectionIndex, item, itemIndex));
      });
    }

    card.append(head, list);
    return card;
  }

  function renderInventory(){
    const host = byId('inventorylist');
    if (!host) return;
    host.innerHTML = '';
    host.className = 'inventory-sections';
    sections.forEach((section, idx)=> host.appendChild(buildSection(section, idx)));
  }

  function boot(){
    ensureToolbar();
    renderInventory();

    byId('reset-inventory')?.addEventListener('click', ()=>{
      sections.forEach(section => section.items.forEach(item => item.ok = false));
      saveInventory();
      renderInventory();
      api().toast && api().toast('Inventaire reset');
    });
  }

  window.addEventListener('DOMContentLoaded', boot);
})();