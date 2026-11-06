import assert from 'node:assert/strict';

// Run against a fresh local page: await checkEditor(webView).
export async function checkEditor(view) {
  const result = await view.evaluate(`(${async function () {
    const $ = id => document.getElementById(id);
    let checks = 0;
    const check = (ok, message) => { if (!ok) throw Error(message); checks++; };
    const cards = () => [...document.querySelectorAll('.point-card')];
    const field = (card, key) => card.querySelector(`[data-field="${key}"],[data-setting="${key}"]`);
    const input = (element, value) => {
      element.value = String(value);
      element.dispatchEvent(new Event('input', {bubbles: true}));
    };
    const action = (card, name) => {
      if ($('settingsPanel').inert) $('toggleSettings').click();
      card.querySelector(`[data-action="${name}"]`).click();
    };
    const rename = (card, value, confirm = 'blur') => {
      const pencil = card.querySelector('[data-action="edit-name"]');
      const label = pencil.getAttribute('aria-label');
      action(card, 'edit-name');
      check(!field(card, 'name').hidden && card.querySelector('.point-name-text').hidden, 'Pencil must reveal the point name input');
      check(pencil.getAttribute('aria-label') === 'Підтвердити назву точки', 'Editing a name must turn its pencil into a confirm button');
      input(field(card, 'name'), value);
      if (confirm === 'click') pencil.click();
      else if (confirm === 'Enter') field(card, 'name').dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true, cancelable: true}));
      else field(card, 'name').blur();
      check(field(card, 'name').hidden && card.querySelector('.point-name-text').textContent === value, `${confirm} must confirm and restore the point name text`);
      check(pencil.getAttribute('aria-label') === label, 'Confirming a name must restore the pencil action');
      if (confirm === 'Enter') check(document.activeElement === pencil, 'Keyboard name confirmation must return focus to the pencil');
    };
    const setting = name => $('settingsForm').elements.namedItem(name);
    const openSettings = (card, name) => {
      if (card) action(card, name); else $('globalSettings').click();
      check($('settingsDialog') instanceof HTMLDialogElement && $('settingsDialog').open, 'Settings must open a native dialog');
      check($('settingsDialog').matches(':modal') === !card &&
        $('settingsDialog').classList.contains('settings-popover') === !!card,
        'Local settings must use a modeless settings-popover dialog; global settings must remain modal');
      if (card && setting('sectors.outer')) {
        check(setting('sectors.outer').readOnly &&
          Number(setting('sectors.outer').value) === Number(field(card.closest('.point-card'), 'maxDistance').value),
          'Point and item sector settings must show a read-only outer radius computed from maxDistance');
      }
      check([...$('settingsForm').querySelectorAll('input[type="color"]')].every(element => {
        const r = element.getBoundingClientRect();
        return r.width > 0 && r.width <= 56 && r.height > 0 && r.height <= 44;
      }), 'Settings color inputs must remain compact swatches');
    };
    const saveSettings = () => {
      $('settingsForm').requestSubmit();
      check(!$('settingsDialog').open, 'Valid settings submit must save and close');
    };
    const clickMap = (x, y) => {
      const r = $('map').getBoundingClientRect();
      const left = innerWidth <= 760 && !$('settingsPanel').inert
        ? $('settingsPanel').getBoundingClientRect().width : 0;
      $('map').dispatchEvent(new MouseEvent('click', {
        bubbles: true, clientX: r.left + left + (r.width - left) * x, clientY: r.top + r.height * y
      }));
    };
    const frame = () => new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(Error('Browser did not render a frame')), 3000);
      requestAnimationFrame(() => requestAnimationFrame(() => {clearTimeout(timer); resolve();}));
    });
    const toggleSidebar = async () => {
      await frame();
      await new Promise((resolve, reject) => {
        const button = $('toggleSettings');
        const cleanup = () => {clearTimeout(timer); button.removeEventListener('transitionend', done);};
        const done = event => {
          if (event.target === button && event.propertyName === 'transform') {cleanup(); resolve();}
        };
        const timer = setTimeout(() => {cleanup(); reject(Error('Sidebar transition did not finish'));}, 3000);
        button.addEventListener('transitionend', done);
        button.click();
      });
    };
    const alerts = [], errors = [];
    window.alert = message => alerts.push(message);
    window.addEventListener('error', event => errors.push(event.message));
    let downloaded;
    URL.createObjectURL = blob => { downloaded = blob; return 'blob:check'; };
    HTMLAnchorElement.prototype.click = function () {};
    const project = async () => {
      $('exportJSON').click();
      return JSON.parse(await downloaded.text());
    };
    const pointData = list => JSON.stringify(list.map(({name,lat,lng,settings,zoneSettings,landmarkSettings,zones,landmarks,collapsed,visible})=>
      ({name,lat,lng,settings,zoneSettings,landmarkSettings,zones,landmarks,collapsed,visible})));
    const load = async data => {
      await $('filePicker').onchange({
        target: {files: [{text: async () => JSON.stringify(data)}], value: 'check.json'}
      });
    };
    check(cards().length === 0 && !$('emptyPoints').hidden, 'Fresh list must be empty');
    check(!$('fit') && !document.querySelector('.float-tools'), 'Global fit button must be removed');
    check($('toggleSettings').querySelector('svg') && !$('toggleSettings').textContent.trim(), 'Menu toggle must be an arrow, not a text button');
    check(!$('settingsPanel').contains($('toggleSettings')), 'Sidebar toggle must remain outside the sidebar');
    check(document.querySelector('#app-script:not([src])') && document.querySelector('style#app-styles') &&
      !document.querySelector('script[src="./app.js"],script[src="app.js"],link[href="./styles.css"],link[href="styles.css"]'),
      'Application script and styles must be embedded for single-file publishing and local opening');
    check($('saveMenu').hidden && ['exportJSON','exportPoints','exportGeoJSON','print'].every(id => $('saveMenu').contains($(id))), 'Save dropdown must contain all four existing actions');
    $('saveToggle').click();
    check(!$('saveMenu').hidden && $('saveToggle').getAttribute('aria-expanded') === 'true', 'Save toggle must open its dropdown');
    $('saveMenu').dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
    check($('saveMenu').hidden && document.activeElement === $('saveToggle'), 'Escape must close save dropdown and restore focus');
    $('saveToggle').click();
    await project();
    check($('saveMenu').hidden, 'Choosing an export must close the dropdown');
    check($('cardTitle').hidden && !$('cardTitleText').hidden, 'Project title must initially be read-only text');
    $('editTitle').click();
    check(!$('cardTitle').hidden && $('cardTitleText').hidden, 'Title pencil must reveal the title input');
    input($('cardTitle'), 'Regression <img src=x>');
    $('cardTitle').blur();
    check($('cardTitle').hidden && $('cardTitleText').textContent === 'Regression <img src=x>' && !$('cardTitleText').querySelector('img'), 'Title must commit as safe text');
    clickMap(.5, .5);
    check(cards().length === 1 && $('emptyPoints').hidden, 'Map click must append a point');
    const first = cards()[0];
    check(!first.querySelector('.point-body').hidden, 'New point settings must open immediately');
    const name = 'Альфа "А", <img src=x onerror=alert(1)>';
    const coordinates = card => card.querySelector('form[data-action="coordinates"]');
    check(field(first, 'name').hidden && coordinates(first).popover === 'auto' &&
      !coordinates(first).matches(':popover-open'), 'Point name input must start hidden and the native coordinate popover closed');
    const head = first.querySelector('.point-head');
    check(head.children.length === 4 && head.children[0].dataset.action === 'toggle-point' &&
      head.children[1].matches('.point-title') &&
      head.children[1].contains(first.querySelector('.point-name-text')) &&
      head.children[1].contains(field(first, 'name')) &&
      head.children[1].contains(first.querySelector('[data-action="edit-name"]')) &&
      head.children[2].dataset.action === 'center-point' &&
      head.children[3].dataset.action === 'toggle-visibility' &&
      first.querySelector('.point-body').lastElementChild.dataset.action === 'delete-point',
      'Point header must order collapse, title with pencil, center and visibility; delete must remain last in the body');
    check(!field(first, 'count') && !first.querySelector('[data-action="reorder-point"]'), 'Count input and reorder grip must be removed');
    check(!document.querySelector('[data-action="add-zone"]'), 'Manual add-sector buttons must be removed entirely');
    rename(first, name, 'click');
    rename(first, name, 'Enter');
    input(field(first, 'maxDistance'), 200);
    input(field(first, 'step'), 75);
    check([...document.querySelectorAll('.distance-label')].map(e => e.textContent).join('|') === '75 м|150 м|200 м', 'A partial final ring must end exactly at maxDistance');
    $('exportGeoJSON').click();
    check(JSON.parse(await downloaded.text()).features.filter(f => f.properties.type === 'distance_ring').map(f => f.properties.radius_m).join() === '75,150,200', 'GeoJSON radii must match rendered partial rings');
    const bounded = await project();
    input(field(first, 'step'), 1);
    input(field(first, 'maxDistance'), 1000);
    check(field(first, 'maxDistance').checkValidity() && document.querySelectorAll('.distance-label').length === 1000, 'Exactly 1000 rings must remain valid');
    input(field(first, 'maxDistance'), 1001);
    check(!field(first, 'maxDistance').checkValidity() && (await project()).points[0].settings.maxDistance === 1000, 'More than 1000 rings must be rejected without changing saved state');
    input(field(first, 'maxDistance'), bounded.points[0].settings.maxDistance);
    input(field(first, 'step'), 75);
    openSettings(first, 'ring-settings');
    input(setting('rings.bearing'), 137);
    input(setting('rings.paddingX'), 9);
    input(setting('rings.paddingY'), 4);
    saveSettings();
    check(!first.querySelector('img'), 'Point names must not be interpreted as HTML');
    check(getComputedStyle(document.querySelector('.distance-label')).padding === '4px 9px', 'Point label padding must render');
    const dot = document.querySelector('.center-dot').getBoundingClientRect();
    const label = document.querySelector('.distance-label').getBoundingClientRect();
    check(label.left + label.width / 2 > dot.left + dot.width / 2 &&
      label.top + label.height / 2 > dot.top + dot.height / 2, '137-degree label must lie southeast of its center');
    clickMap(.9, .7);
    check(cards().length === 2, 'Click outside every radius must append another point');
    const second = cards()[1];
    check(field(second, 'step').value === '100' && field(second, 'maxDistance').value === '500', 'New point must have independent default distances');
    check(first.querySelector('.point-body').hidden && !second.querySelector('.point-body').hidden, 'Only one point may be expanded at a time');
    const centers = [...document.querySelectorAll('.center-dot')];
    check(getComputedStyle(centers[0].parentElement).opacity === '0.75' && getComputedStyle(centers[1].parentElement).opacity === '1', 'Nonselected centers must dim to .75 while the selected center stays opaque');
    check([...document.querySelectorAll('.distance-label')].slice(0,3).every(e => getComputedStyle(e.parentElement).opacity === '0.75'), 'Nonselected ring labels must dim with their owner');
    check(document.querySelectorAll('.distance-label').length === 8, 'Map must render each point with its own ring count');
    action(second, 'toggle-point');
    check(second.querySelector('.point-body').hidden, 'Collapse must hide the point body');
    clickMap(.5, .5);
    check(cards().length === 2 && !first.querySelector('.point-body').hidden && first.classList.contains('selected'), 'Click inside a point radius must select and expand it');
    action(first, 'draw-zone');
    clickMap(.7, .3);
    clickMap(.8, .5);
    action(first, 'draw-zone');
    clickMap(.6, .3);
    clickMap(.7, .5);
    const sectors = first.querySelectorAll('.zone-card');
    check(cards().length === 2 && sectors.length === 2 && second.querySelectorAll('.zone-card').length === 0, 'Two-click drawing must append sectors only under its point');
    input(sectors[0].querySelector('[data-zone-field="start"]'), 15);
    check([...sectors[0].querySelectorAll('input')].map(e => e.dataset.zoneField).join() === 'start,end', 'Sector rows must contain only start and end angle inputs');
    openSettings(sectors[0], 'zone-settings');
    check(setting('sectors.outer').readOnly && setting('sectors.outer').value === '200',
      'Local sector outer radius must be read-only and equal its point maxDistance');
    saveSettings();
    input(sectors[1].querySelector('[data-zone-field="start"]'), 120);
    input(sectors[1].querySelector('[data-zone-field="end"]'), 190);
    openSettings(sectors[1], 'zone-settings');
    input(setting('sectors.inner'), 200);
    $('settingsForm').requestSubmit();
    check($('settingsDialog').open && !setting('sectors.inner').checkValidity(), 'Sector dialog must reject an inner radius equal to computed outer');
    input(setting('sectors.inner'), 900);
    $('settingsForm').requestSubmit();
    check($('settingsDialog').open && !setting('sectors.inner').checkValidity(), 'Sector dialog must reject an inner radius beyond the outer radius');
    input(setting('sectors.inner'), 100);
    saveSettings();
    let snapshot = await project();
    check(snapshot.points[0].zones[0].start === 15 && snapshot.points[0].zones[1].start === 120, 'Sector editors must update separate items');
    check(!Object.hasOwn(snapshot.points[0].zones[0].settings, 'outer') && snapshot.points[0].settings.step === 75,
      'Saving a computed outer radius must not create an override or change ring settings');
    input(field(first, 'maxDistance'), 350);
    $('exportGeoJSON').click();
    const grownSectors = JSON.parse(await downloaded.text()).features.filter(f => f.properties.type === 'restricted_zone' && f.properties.point === 1);
    check(grownSectors.length === 2 && grownSectors.every(f => f.properties.outer_radius_m === 350),
      'Growing maxDistance must grow every sector GeoJSON outer radius');
    input(field(first, 'maxDistance'), 80);
    $('exportGeoJSON').click();
    const shrunkSectors = JSON.parse(await downloaded.text()).features.filter(f => f.properties.type === 'restricted_zone' && f.properties.point === 1);
    check(shrunkSectors.length === 2 && shrunkSectors.every(f => f.properties.outer_radius_m === 80 && f.properties.inner_radius_m < 80) &&
      shrunkSectors[1].properties.inner_radius_m === 79,
      'Shrinking maxDistance must shrink sector GeoJSON outer radii and clamp inner radius below outer');
    openSettings(sectors[1], 'zone-settings');
    check(setting('sectors.outer').readOnly && setting('sectors.outer').value === '80' && setting('sectors.inner').value === '79',
      'Local sector fields must reflect the shrunken computed outer and normalized inner');
    $('closeSettings').click();
    input(field(first, 'maxDistance'), 200);
    const geometryCount = document.querySelectorAll('.distance-label').length;
    action(first, 'toggle-point');
    check(first.querySelector('.point-body').hidden &&
      sectors[0].getBoundingClientRect().height === 0, 'Collapsing a point must hide every nested sector');
    check(document.querySelectorAll('.distance-label').length === geometryCount, 'Collapsing must preserve map geometry');
    action(first, 'center-point');
    await frame();
    snapshot = await project();
    check(first.querySelector('.point-body').hidden, 'Centering must preserve the collapsed state');
    const geometry = [...document.querySelectorAll('.leaflet-overlay-pane path')]
      .filter(path => ['0.95','0.9'].includes(path.getAttribute('stroke-opacity')))
      .map(path => path.getBoundingClientRect());
    check(geometry.length === 5, 'Fit bounds must include all selected rings and sectors, not another point');
    const fitMap = $('map').getBoundingClientRect();
    const fitBounds = {
      left: Math.min(...geometry.map(r => r.left)), right: Math.max(...geometry.map(r => r.right)),
      top: Math.min(...geometry.map(r => r.top)), bottom: Math.max(...geometry.map(r => r.bottom))
    };
    check(fitBounds.left - fitMap.left >= 48 && fitMap.right - fitBounds.right >= 48 &&
      fitBounds.top - fitMap.top >= 48 && fitMap.bottom - fitBounds.bottom >= 48, 'Crosshair must fit this point geometry with 50px padding');
    check(snapshot.view.zoom === 19 ||
      (fitBounds.right - fitBounds.left) * 2 ** .25 > fitMap.width - 102 ||
      (fitBounds.bottom - fitBounds.top) * 2 ** .25 > fitMap.height - 102, 'Fit must choose the maximum available quarter-step zoom');
    if(innerWidth <= 760)check($('toggleSettings').getAttribute('aria-expanded') === 'false', 'Narrow-screen fitting must reveal the whole map');
    if($('toggleSettings').getAttribute('aria-expanded') === 'false')$('toggleSettings').click();
    action(first, 'toggle-point');
    sectors[0].querySelector('[data-action="delete-zone"]').click();
    check(first.querySelectorAll('.zone-card').length === 1, 'Delete must remove only the requested sector');
    action(second, 'toggle-point');
    action(second, 'draw-zone');
    clickMap(.7, .3);
    clickMap(.8, .5);
    action(second, 'edit-coordinates');
    check(coordinates(second).matches(':popover-open') && !second.querySelector('[data-action="edit-coordinates"]').hidden,
      'Coordinate button must open its native popover and remain visible');
    input(field(second, 'lat'), '');
    coordinates(second).dispatchEvent(new Event('submit', {bubbles: true, cancelable: true}));
    check((await project()).points[1].lat === snapshot.points[1].lat, 'Empty coordinates must not move a point');
    input(field(second, 'lat'), 50.46);
    input(field(second, 'lng'), 30.54);
    coordinates(second).requestSubmit();
    snapshot = await project();
    check(snapshot.points[1].lat === 50.46 && snapshot.points[1].lng === 30.54, 'Coordinate form must edit its own point');
    check(!coordinates(second).matches(':popover-open') && !second.querySelector('[data-action="edit-coordinates"]').hidden,
      'Explicit coordinate apply must close the popover and keep its button visible');
    action(second, 'edit-coordinates');
    input(field(second, 'lat'), 50.4601);
    field(second, 'lat').dispatchEvent(new FocusEvent('focusout', {bubbles: true, relatedTarget: field(second, 'lng')}));
    check(coordinates(second).matches(':popover-open') && (await project()).points[1].lat === 50.46, 'Moving focus between coordinates must not submit early');
    field(second, 'lng').dispatchEvent(new FocusEvent('focusout', {bubbles: true, relatedTarget: null}));
    check(coordinates(second).matches(':popover-open') && (await project()).points[1].lat === 50.46,
      'Leaving coordinate inputs must not submit or close the popover');
    field(second, 'lng').dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true, cancelable: true}));
    check(!coordinates(second).matches(':popover-open') && (await project()).points[1].lat === 50.46 &&
      !second.querySelector('[data-action="edit-coordinates"]').hidden,
      'Escape must cancel coordinate edits without moving the point or hiding its button');
    action(second, 'edit-coordinates');
    check(field(second, 'lat').value === '50.460000' && field(second, 'lng').value === '30.540000',
      'Reopening coordinates must discard canceled input values');
    input(field(second, 'lat'), 50.4602);
    coordinates(second).hidePopover();
    check(!coordinates(second).matches(':popover-open') && (await project()).points[1].lat === 50.46,
      'Native popover dismissal must cancel coordinate edits without submitting');
    action(second, 'edit-coordinates');
    check(field(second, 'lat').value === '50.460000', 'Reopening after native dismissal must restore saved coordinates');
    coordinates(second).requestSubmit();
    check(snapshot.points[0].name === name && snapshot.points[0].settings.step === 75 &&
      snapshot.points[1].settings.step === 100, 'Editing another point must preserve names and independent settings');
    action(second, 'draw-zone');
    clickMap(.7, .3);
    clickMap(.8, .5);
    check(cards().length === 2 && second.querySelectorAll('.zone-card').length === 2, 'Two-click drawing must append a sector, not a point');
    check($('modeBadge').classList.contains('hidden'), 'Drawing must finish in normal map mode');
    action(second, 'draw-zone');
    document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
    check($('modeBadge').classList.contains('hidden'), 'Escape must cancel sector drawing');
    rename(second, '=1+1');
    $('exportPoints').click();
    check((await downloaded.text()).includes(`"'=1+1"`), 'Spreadsheet export must not execute point names as formulas');
    rename(second, 'Браво');
    const saved = await project();
    check(saved.format === 'cartographic-zones-v4' && saved.globalSettings.rings && saved.globalSettings.sectors && saved.globalSettings.landmarks && saved.points[0].collapsed, 'V4 project must store global defaults, per-point data and collapse state');
    $('exportPoints').click();
    const csv = await downloaded.text();
    check(csv.trim().split('\r\n').length === 3 && csv.includes(name.replaceAll('"', '""')) &&
      csv.includes(',50.46,30.54'), 'CSV must contain quoted names and edited coordinates');
    $('exportGeoJSON').click();
    const geo = JSON.parse(await downloaded.text());
    check(geo.features.filter(f => f.properties.type === 'center').length === 2, 'GeoJSON must include every center');
    check(geo.features.filter(f => f.properties.type === 'distance_ring').length === 8, 'GeoJSON must use individual ring counts');
    check(geo.features.filter(f => f.geometry.type === 'Polygon').length === 3, 'GeoJSON must include every remaining sector');
    check(geo.features.find(f => f.geometry.type === 'Point').properties.name === name, 'GeoJSON must preserve point names');
    await load(saved);
    const restored = await project();
    check(pointData(restored.points) === pointData(saved.points) && JSON.stringify(restored.globalSettings) === JSON.stringify(saved.globalSettings), 'Project must round-trip names, collapse state, sparse settings, defaults and sectors');
    check(cards()[0].querySelector('.point-body').hidden, 'Import must restore collapsed point UI');
    await load({...saved, points: [{...saved.points[0], settings: null}]});
    check(alerts.length === 1 && pointData((await project()).points) === pointData(saved.points), 'Invalid import must leave current points intact');
    await load({
      format: 'cartographic-zones-v1', title: 'Legacy', center: {lat: 51, lng: 31},
      settings: {step: 150, count: 4, bearing: 90}, zones: [{start: 15, end: 90, inner: 0, outer: 800, color: '#b94a56', opacity: .2}]
    });
    const legacy = await project();
    check(legacy.points.length === 1 && legacy.points[0].settings.step === 150 &&
      legacy.points[0].settings.maxDistance === 600 && legacy.points[0].settings.bearing === 90 &&
      legacy.points[0].lat === 51 && legacy.points[0].lng === 31 &&
      legacy.points[0].zones[0].settings.outer === 800, 'V1 project must migrate count to maxDistance while retaining its center and personal styles');
    await load({
      format: 'cartographic-zones-v2', settings: {step: 175, count: 2, paddingX: 8},
      points: saved.points.map(p => ({lat: p.lat, lng: p.lng, zones: []}))
    });
    input(field(cards()[0], 'step'), 250);
    const migrated = await project();
    check(migrated.points[0].settings.step === 250 && migrated.points[1].settings.step === 175 &&
      migrated.points[1].settings.paddingX === 8 && migrated.points[1].settings.maxDistance === 350, 'V2 shared settings must migrate to independent personal copies');
    await load({...saved, points: []});
    check(cards().length === 0 && !$('emptyPoints').hidden &&
      !document.querySelector('.distance-label'), 'Empty project must clear map geometry and restore empty state');
    await load(saved);
    const oldV3 = {format: 'cartographic-zones-v3', title: 'V3', points: saved.points.map(p => ({
      name:p.name,lat:p.lat,lng:p.lng,settings:{step:75,count:3,color:'#123456',paddingX:7},zones:[]
    }))};
    await load(oldV3);
    const migratedV3 = await project();
    check(migratedV3.points.every(p => p.visible && p.landmarks.length === 0) &&
      migratedV3.points.every(p => p.settings.maxDistance === 225 && p.settings.color === '#123456' && p.settings.paddingX === 7) &&
      document.querySelectorAll('.center-dot').length === 2, 'Old V3 projects must migrate full personal styles and default missing landmarks and visibility');
    await load({...saved,
      globalSettings:{...saved.globalSettings,sectors:{...saved.globalSettings.sectors,inner:0,outer:500}},
      points:[{...saved.points[0],zoneSettings:{outer:1000},zones:[{start:30,end:90,settings:{inner:800,outer:900}}]}],
      selectedPoint:0
    });
    const parentSector = await project();
    check(parentSector.globalSettings.sectors.outer === 500 &&
      JSON.stringify(parentSector.points[0].zoneSettings) === '{"outer":1000}' &&
      parentSector.points[0].zones[0].settings.inner === 800 && parentSector.points[0].zones[0].settings.outer === 900,
      'V4 must retain stored legacy radii without rewriting personal geometry on import');
    openSettings(cards()[0].querySelector('.zone-card'), 'zone-settings');
    check(setting('sectors.inner').value === '199' && setting('sectors.outer').value === '200' && setting('sectors.outer').readOnly,
      'Sector editor must ignore legacy explicit outer overrides and show point maxDistance');
    saveSettings();
    $('exportGeoJSON').click();
    const parentPolygon = JSON.parse(await downloaded.text()).features.find(f => f.properties.type === 'restricted_zone');
    check(parentPolygon.properties.inner_radius_m === 199 && parentPolygon.properties.outer_radius_m === 200,
      'GeoJSON must ignore legacy global, point and item outer overrides in favor of maxDistance');
    openSettings(null);
    check(!setting('sectors.outer') && !$('settingsFields').querySelector('[name="sectors.outer"]'),
      'Global settings form and field list must omit sector outer radius');
    saveSettings();
    const legacyOuterSaved = await project();
    check(pointData(legacyOuterSaved.points) === pointData(parentSector.points) &&
      legacyOuterSaved.globalSettings.sectors.outer === 500,
      'Saving local and global settings must preserve serialized legacy outer fields');
    await load(legacyOuterSaved);
    check(pointData((await project()).points) === pointData(legacyOuterSaved.points) &&
      (await project()).globalSettings.sectors.outer === 500,
      'Legacy outer fields and normalized inner radius must survive a second V4 round-trip');
    await load(saved);
    const landmarkClick = (dx, dy) => {
      const r = document.querySelector('.center-dot.selected').getBoundingClientRect();
      $('map').dispatchEvent(new MouseEvent('click', {
        bubbles: true, clientX: r.left + r.width / 2 + dx, clientY: r.top + r.height / 2 + dy
      }));
    };
    action(cards()[0], 'center-point');
    await frame();
    action(cards()[0], 'add-landmark');
    clickMap(.98, .98);
    check((await project()).points[0].landmarks.length === 0 && alerts.length === 2,
      'Landmark placement outside radius must be rejected without creating a point');
    landmarkClick(35, 0);
    check(cards().length === 2 && cards()[0].querySelectorAll('.landmark-item').length === 1,
      'Landmark placement must append an item only under its parent point');
    const referenceName = 'Дерево "<img src=x>"';
    check(cards()[0].querySelector('.landmark-name') && !cards()[0].querySelector('.landmark-item input,.landmark-info'), 'Landmark list must contain text and actions, not inline fields or readouts');
    openSettings(cards()[0].querySelector('.landmark-item'), 'edit-landmark');
    input(setting('name'), referenceName);
    saveSettings();
    check(document.querySelector('.landmark-caption strong').textContent === referenceName &&
      !document.querySelector('.landmark-caption img'), 'Landmark map labels must render names as text');
    $('exportGeoJSON').click();
    let geoLandmarks = JSON.parse(await downloaded.text()).features.filter(f => f.properties.type === 'landmark');
    check(geoLandmarks.length === 1 && geoLandmarks[0].properties.point === 1 &&
      Math.abs(geoLandmarks[0].properties.azimuth_deg - 90) < 2, 'Landmark GeoJSON must store ownership and correct eastward azimuth');
    const expectedDistance = Math.round(geoLandmarks[0].properties.distance_m).toLocaleString('uk-UA') + ' м';
    const caption = document.querySelector('.landmark-caption');
    check(caption.querySelectorAll('small').length === 2 && caption.querySelectorAll('small')[0].textContent === expectedDistance &&
      /^\d+°$/.test(caption.querySelectorAll('small')[1].textContent), 'Landmark caption must separate name, computed distance and integer angle');
    action(cards()[0], 'add-landmark');
    landmarkClick(-25, -10);
    cards()[0].querySelectorAll('[data-action="delete-landmark"]')[1].click();
    check(document.querySelectorAll('.landmark-caption').length === 1, 'Deleting a landmark must preserve its sibling');
    action(cards()[1], 'center-point');
    await frame();
    action(cards()[1], 'add-landmark');
    landmarkClick(20, 10);
    const beforeDrag = await project();
    check(beforeDrag.points[0].landmarks.length === 1 && beforeDrag.points[1].landmarks.length === 1,
      'Each point must own its own landmarks');
    check(document.querySelectorAll('.leaflet-marker-draggable').length === 2 &&
      [...document.querySelectorAll('.leaflet-marker-draggable')].every(e => e.querySelector('.center-dot.selected,.landmark-caption')), 'Only the selected center and its landmark may be dragged');
    check([...document.querySelectorAll('.landmark-caption')].map(e => getComputedStyle(e.closest('.leaflet-marker-icon')).opacity).join() === '0.75,1',
      'Landmark opacity must follow owner selection');
    const paths = [...document.querySelectorAll('.leaflet-overlay-pane path')];
    check(paths.filter(e => e.getAttribute('fill') === 'none').map(e => Number(e.getAttribute('stroke-opacity')))
      .every((opacity,i) => Math.abs(opacity - (i < 3 ? .95 * .75 : .95)) < 1e-8) &&
      paths.filter(e => e.getAttribute('fill') !== 'none').map(e => Number(e.getAttribute('fill-opacity'))).join() === '0.75,1,1',
      'Ring and sector opacity must dim only the nonselected owner');
    const readoutBefore = [...document.querySelectorAll('.landmark-caption')][1].textContent;
    const marker = document.querySelector('.center-dot.selected').parentElement;
    const markerRect = marker.getBoundingClientRect();
    const x = markerRect.left + markerRect.width / 2, y = markerRect.top + markerRect.height / 2;
    const mouse = (element, type, dx, dy, buttons) => element.dispatchEvent(new MouseEvent(type, {
      bubbles: true, cancelable: true, button: 0, buttons, clientX: x + dx, clientY: y + dy
    }));
    marker.dispatchEvent(new MouseEvent('mousedown', {
      bubbles: true, cancelable: true, button: 0, buttons: 1, clientX: x, clientY: y
    }));
    mouse($('map'), 'mousemove', 12, 8, 1);
    await frame();
    mouse($('map'), 'mousemove', 60, 40, 1);
    await frame();
    mouse($('map'), 'mouseup', 60, 40, 0);
    await frame();
    const afterDrag = await project();
    check(afterDrag.points[1].lat !== beforeDrag.points[1].lat &&
      afterDrag.points[1].lng !== beforeDrag.points[1].lng, 'Dragging must change the selected point coordinates');
    check(field(cards()[1], 'lat').value === afterDrag.points[1].lat.toFixed(6) &&
      field(cards()[1], 'lng').value === afterDrag.points[1].lng.toFixed(6), 'Dragging must synchronize the coordinate editor');
    check(JSON.stringify(afterDrag.points[0]) === JSON.stringify(beforeDrag.points[0]),
      'Dragging must not move or edit another point');
    check(JSON.stringify(afterDrag.points[1].landmarks) === JSON.stringify(beforeDrag.points[1].landmarks) &&
      [...document.querySelectorAll('.landmark-caption')][1].textContent !== readoutBefore,
      'Landmark coordinates must stay fixed while distance and azimuth update');
    check(JSON.stringify(afterDrag.points[1].zones) === JSON.stringify(beforeDrag.points[1].zones) &&
      JSON.stringify(afterDrag.points[1].settings) === JSON.stringify(beforeDrag.points[1].settings),
      'Dragging must preserve sectors and ring settings');
    $('map').dispatchEvent(new MouseEvent('click', {bubbles: true, clientX: x + 60, clientY: y + 40}));
    check(cards().length === 2, 'Drag release must not create another point');
    const landmarkMarker = [...document.querySelectorAll('.leaflet-marker-draggable')].find(e => e.querySelector('.landmark-caption'));
    const landmarkRect = landmarkMarker.getBoundingClientRect();
    const lx = landmarkRect.left + 4, ly = landmarkRect.top + 4;
    const dragLandmark = (element, type, dx, dy, buttons) => element.dispatchEvent(new MouseEvent(type, {
      bubbles:true,cancelable:true,button:0,buttons,clientX:lx+dx,clientY:ly+dy
    }));
    dragLandmark(landmarkMarker, 'mousedown', 0, 0, 1);
    dragLandmark($('map'), 'mousemove', 12, 8, 1);
    await frame();
    dragLandmark($('map'), 'mousemove', 2000, 1200, 1);
    await frame();
    dragLandmark($('map'), 'mouseup', 2000, 1200, 0);
    await frame();
    const movedLandmark = await project();
    check(movedLandmark.points[1].landmarks[0].lat !== afterDrag.points[1].landmarks[0].lat &&
      movedLandmark.points[1].landmarks[0].lng !== afterDrag.points[1].landmarks[0].lng, 'Dragging a selected landmark must update its coordinates');
    check(JSON.stringify(movedLandmark.points[0]) === JSON.stringify(afterDrag.points[0]) &&
      movedLandmark.points[1].lat === afterDrag.points[1].lat && movedLandmark.points[1].lng === afterDrag.points[1].lng &&
      JSON.stringify(movedLandmark.points[1].settings) === JSON.stringify(afterDrag.points[1].settings) &&
      JSON.stringify(movedLandmark.points[1].zones) === JSON.stringify(afterDrag.points[1].zones), 'Landmark dragging must preserve its center, settings, sectors and other owners');
    $('exportGeoJSON').click();
    const constrained = JSON.parse(await downloaded.text()).features.find(f => f.properties.type === 'landmark' && f.properties.point === 2);
    check(Math.abs(constrained.properties.distance_m - movedLandmark.points[1].settings.maxDistance) < 2,
      'Dragging a landmark beyond its radius must constrain it to maxDistance');
    const withLandmarks = await project();
    await load(withLandmarks);
    const landmarkRoundTrip = await project();
    check(pointData(landmarkRoundTrip.points) === pointData(withLandmarks.points) &&
      document.querySelectorAll('.landmark-caption').length === 2,
      'Projects must round-trip landmarks and their labels: ' + JSON.stringify({
        expected: withLandmarks.points, actual: landmarkRoundTrip.points,
        labels: document.querySelectorAll('.landmark-caption').length
      }));
    await load({...withLandmarks, points: [{...withLandmarks.points[0], landmarks: [{lat: 999, lng: 0}]}]});
    check(alerts.length === 3 && cards().length === 2, 'Invalid landmark import must preserve current points');
    check(pointData((await project()).points) === pointData(withLandmarks.points), 'Invalid landmark import must be atomic');
    $('toggleAllVisibility').click();
    const allHidden = await project();
    check(allHidden.points.every(p => !p.visible) && !document.querySelector('.center-dot,.distance-label,.landmark-caption,.leaflet-overlay-pane path'),
      'Global eye must hide every geometry layer');
    check(allHidden.points.every((p,i) => p.zones.length === withLandmarks.points[i].zones.length &&
      JSON.stringify(p.landmarks) === JSON.stringify(withLandmarks.points[i].landmarks)), 'Global hiding must preserve sector and landmark data');
    $('toggleAllVisibility').click();
    check((await project()).points.every(p => p.visible) && document.querySelectorAll('.center-dot').length === 2 &&
      document.querySelectorAll('.landmark-caption').length === 2, 'Global eye must restore all point geometry');
    action(cards()[0], 'toggle-visibility');
    const hiddenProject = await project();
    check(hiddenProject.points[0].visible === false && cards().length === 2 &&
      document.querySelectorAll('.center-dot').length === 1 &&
      document.querySelectorAll('.distance-label').length === 5 &&
      document.querySelectorAll('.landmark-caption').length === 1,
      'Eye must hide all geometry of only its point without deleting the list item');
    check(hiddenProject.points[0].zones.length === withLandmarks.points[0].zones.length &&
      hiddenProject.points[0].landmarks.length === 1, 'Hiding must retain sectors and landmarks');
    await load(hiddenProject);
    check(cards()[0].classList.contains('map-hidden') && document.querySelectorAll('.center-dot').length === 1,
      'Project import must preserve point visibility');
    action(cards()[0], 'toggle-visibility');
    check(document.querySelectorAll('.center-dot').length === 2 &&
      document.querySelectorAll('.landmark-caption').length === 2, 'Eye must restore the complete point geometry');
    action(cards()[0], 'toggle-visibility');
    action(cards()[0], 'center-point');
    await frame();
    check((await project()).points[0].visible && document.querySelectorAll('.center-dot').length === 2,
      'Fitting a hidden point must reveal it');
    await load(withLandmarks);
    action(cards()[1], 'add-landmark');
    action(cards()[1], 'delete-point');
    let remaining = await project();
    check(cards().length === 1 && remaining.points[0].name === withLandmarks.points[0].name &&
      remaining.points[0].landmarks.length === 1 && $('modeBadge').classList.contains('hidden'),
      'Deleting the selected point must remove its landmarks and cancel placement');
    check(document.querySelectorAll('.center-dot').length === 1 &&
      document.querySelectorAll('.landmark-caption').length === 1, 'Deleted point geometry must disappear');
    action(cards()[0], 'delete-point');
    check(cards().length === 0 && !$('emptyPoints').hidden &&
      !document.querySelector('.center-dot,.distance-label,.landmark-caption'),
      'Deleting the final point must clear every layer and restore empty state');
    await load(withLandmarks);
    action(cards()[0], 'delete-point');
    remaining = await project();
    check(remaining.points.length === 1 && remaining.points[0].name === withLandmarks.points[1].name,
      'Deleting a nonselected point must preserve the selected one');
    await load(withLandmarks);
    if($('toggleSettings').getAttribute('aria-expanded') === 'false')$('toggleSettings').click();
    const originalOrder = (await project()).points.map(p => p.name);
    if(cards()[0].querySelector('.point-body').hidden)action(cards()[0], 'toggle-point');
    const selectedName = (await project()).points[(await project()).selectedPoint].name;
    cards()[0].dispatchEvent(new KeyboardEvent('keydown', {key:'ArrowDown',bubbles:true,cancelable:true}));
    check((await project()).points.map(p => p.name).join('|') === originalOrder.join('|'), 'Expanded cards must ignore keyboard reorder');
    cards().forEach(card => {if(!card.querySelector('.point-body').hidden)action(card, 'toggle-point');});
    check(cards().every(card => getComputedStyle(card).touchAction === 'none'),
      'Collapsed cards must reserve touch gestures for reordering rather than browser scrolling');
    cards()[0].querySelector('[data-action="edit-name"]').dispatchEvent(new KeyboardEvent('keydown', {key:'ArrowDown',bubbles:true,cancelable:true}));
    check((await project()).points.map(p => p.name).join('|') === originalOrder.join('|'), 'Keyboard events on card buttons must not reorder');
    cards()[0].dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowDown', bubbles: true, cancelable: true}));
    let ordered = await project();
    check(ordered.points.map(p => p.name).join('|') === [...originalOrder].reverse().join('|') &&
      ordered.points[ordered.selectedPoint].name === selectedName, 'Keyboard reorder must update point order while preserving selection');
    cards()[1].dispatchEvent(new KeyboardEvent('keydown', {key:'ArrowUp',bubbles:true,cancelable:true}));
    check((await project()).points.map(p => p.name).join('|') === originalOrder.join('|'), 'ArrowUp must move a collapsed card upward');
    cards()[0].dispatchEvent(new KeyboardEvent('keydown', {key:'ArrowDown',bubbles:true,cancelable:true}));
    cards().forEach(card => {if(!card.querySelector('.point-body').hidden)action(card, 'toggle-point');});
    document.querySelector('.scroll').scrollTop = 0;
    await frame();
    const dragCard = cards()[0];
    const start = dragCard.getBoundingClientRect(), target = cards()[1].querySelector('.point-head').getBoundingClientRect();
    const list = $('pointList'), capture = list.setPointerCapture;
    let capturedId;
    // Synthetic pointer events have no native pointer to capture.
    list.setPointerCapture = id => {capturedId = id;};
    dragCard.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true, cancelable: true, pointerId: 71, button: 0, buttons: 1,
      clientX: start.left + start.width / 2, clientY: start.top + start.height / 2
    }));
    list.setPointerCapture = capture;
    document.dispatchEvent(new PointerEvent('pointermove', {
      bubbles: true, cancelable: true, pointerId: 71, clientY: target.bottom + 4
    }));
    await frame();
    document.dispatchEvent(new PointerEvent('pointerup', {bubbles: true, pointerId: 71}));
    await frame();
    ordered = await project();
    check(capturedId === 71 && ordered.points.map(p => p.name).join('|') === originalOrder.join('|') &&
      cards().map(card => field(card, 'name').value).join('|') === originalOrder.join('|'),
      'Pointer dragging must reorder both the stored points and visible list');
    check(ordered.points.find(p => p.name === referenceName) === undefined &&
      ordered.points[0].landmarks[0].name === referenceName, 'Reordering must preserve landmark ownership');
    check(ordered.points[ordered.selectedPoint].name === selectedName, 'Pointer reorder must preserve the selected owner');
    $('exportPoints').click();
    check((await downloaded.text()).split('\r\n')[1].includes(originalOrder[0].replaceAll('"', '""')),
      'CSV must follow the reordered point list');
    $('exportGeoJSON').click();
    const orderedGeo = JSON.parse(await downloaded.text()).features;
    check(orderedGeo.filter(f => f.properties.type === 'center').map(f => f.properties.name).join('|') === originalOrder.join('|') &&
      orderedGeo.filter(f => f.properties.type === 'landmark').every((f,i) => f.properties.point === i+1),
      'GeoJSON must follow reordered centers and retain landmark ownership numbers');
    await load(ordered);
    check((await project()).points.map(p => p.name).join('|') === originalOrder.join('|'),
      'Projects must preserve reordered points');
    // Pointer capture is native-only; substitute capture alone, not the reorder behavior.
    const pointerReorder = async (source, id, cancel = false) => {
      const r = source.getBoundingClientRect(), destination = cards()[1].getBoundingClientRect();
      let captured = false;
      const original = list.setPointerCapture;
      list.setPointerCapture = () => {captured = true;};
      try {
        source.dispatchEvent(new PointerEvent('pointerdown', {bubbles:true,cancelable:true,pointerId:id,button:0,buttons:1,clientX:r.left+8,clientY:r.top+8}));
      } finally {list.setPointerCapture = original;}
      document.dispatchEvent(new PointerEvent('pointermove', {bubbles:true,cancelable:true,pointerId:id,clientY:destination.bottom+8}));
      await frame();
      document.dispatchEvent(new PointerEvent(cancel?'pointercancel':'pointerup', {bubbles:true,pointerId:id}));
      await frame();
      return captured;
    };
    const beforeIgnored = (await project()).points.map(p => p.name).join('|');
    check(!await pointerReorder(cards()[0].querySelector('[data-action="edit-name"]'), 72) &&
      (await project()).points.map(p => p.name).join('|') === beforeIgnored, 'Pointer presses on buttons must not start reordering');
    action(cards()[0], 'toggle-point');
    check(!await pointerReorder(cards()[0], 73) && (await project()).points.map(p => p.name).join('|') === beforeIgnored,
      'Expanded cards must ignore pointer reorder');
    check(!await pointerReorder(field(cards()[0], 'step'), 74) &&
      (await project()).points.map(p => p.name).join('|') === beforeIgnored, 'Pointer presses on inputs must not start reordering');
    action(cards()[0], 'toggle-point');
    check(await pointerReorder(cards()[0], 75, true) &&
      (await project()).points.map(p => p.name).join('|') === beforeIgnored, 'Pointer cancellation must restore the original card order');

    // Exercise the global -> point -> item inheritance chain without rewriting fixtures.
    action(cards()[0], 'toggle-point');
    let inherited = await project();
    check(Object.keys(inherited.points[1].zoneSettings).length === 0 &&
      Object.keys(inherited.points[1].landmarkSettings).length === 0 &&
      Object.keys(inherited.points[1].landmarks[0].settings).length === 0, 'New point and item style overrides must start sparse');
    openSettings(null);
    check(['rings.color','sectors.inner','sectors.color','sectors.opacity',
      'landmarks.nameSize','landmarks.distanceSize','landmarks.angleSize','landmarks.paddingX','landmarks.paddingY',
      'landmarks.backgroundOpacity','landmarks.angle'].every(name => setting(name)), 'Global dialog must expose every redesigned style group');
    check(!setting('sectors.outer'), 'Global sector settings must not expose an outer radius field');
    check($('resetSettings').hidden, 'Global settings must not offer a personal override reset');
    input(setting('rings.color'), '#112233');
    $('closeSettings').click();
    check(JSON.stringify((await project()).globalSettings) === JSON.stringify(inherited.globalSettings), 'Closing settings must cancel unsaved edits');
    openSettings(null);
    input(setting('rings.color'), '#112233');
    input(setting('sectors.color'), '#334455');
    input(setting('landmarks.nameSize'), 18);
    input(setting('landmarks.distanceSize'), 16);
    input(setting('landmarks.angleSize'), 14);
    input(setting('landmarks.paddingX'), 12);
    input(setting('landmarks.paddingY'), 7);
    input(setting('landmarks.backgroundOpacity'), .5);
    input(setting('landmarks.angle'), 180);
    saveSettings();
    const globallyStyled = await project();
    check(globallyStyled.globalSettings.rings.color === '#112233' &&
      !Object.hasOwn(globallyStyled.points[1].settings, 'color') &&
      globallyStyled.globalSettings.sectors.color === '#334455', 'Saving global defaults must not materialize personal overrides');
    const globalRings = [...document.querySelectorAll('.leaflet-overlay-pane path')].filter(e => e.getAttribute('fill') === 'none');
    check(globalRings.length === 8 && globalRings.every(e => getComputedStyle(e).stroke === 'rgb(17, 34, 51)'),
      'Unchanged point ring colors must inherit global edits');
    const styledCaption = document.querySelector('.landmark-caption');
    check(styledCaption.querySelector('strong').style.fontSize === '18px' &&
      [...styledCaption.querySelectorAll('small')].map(e => e.style.fontSize).join() === '16px,14px' &&
      styledCaption.style.padding === '7px 12px' && styledCaption.style.backgroundColor === 'rgba(255, 255, 255, 0.5)' &&
      parseFloat(styledCaption.style.top) > 0, 'Inherited landmark styles must render font sizes, padding, background and angle');
    openSettings(cards()[0], 'ring-settings');
    input(setting('rings.color'), '#abcdef');
    saveSettings();
    openSettings(cards()[0], 'sector-settings');
    input(setting('sectors.color'), '#abcdef');
    saveSettings();
    openSettings(cards()[0], 'landmark-settings');
    input(setting('landmarks.nameSize'), 20);
    saveSettings();
    inherited = await project();
    check(inherited.points[0].settings.color === '#abcdef' &&
      JSON.stringify(inherited.points[0].zoneSettings) === '{"color":"#abcdef"}' &&
      JSON.stringify(inherited.points[0].landmarkSettings) === '{"nameSize":20}', 'Point dialogs must store only changed style fields');
    const item = cards()[0].querySelector('.landmark-item');
    openSettings(item, 'edit-landmark');
    check(setting('landmarks.nameSize').value === '20', 'Landmark item must inherit its point styles');
    input(setting('landmarks.nameSize'), 22);
    saveSettings();
    openSettings(cards()[0].querySelector('.zone-card'), 'zone-settings');
    check(setting('sectors.color').value === '#abcdef', 'Sector item must inherit its point color');
    input(setting('sectors.color'), '#fedcba');
    saveSettings();
    const personal = await project();
    check(personal.points[0].landmarks[0].settings.nameSize === 22 &&
      personal.points[0].zones[0].settings.color === '#fedcba' &&
      Object.keys(personal.points[1].landmarkSettings).length === 0, 'Item overrides must remain local to their item and owner');
    await load(personal);
    const restoredPersonal = await project();
    check(pointData(restoredPersonal.points) === pointData(personal.points) &&
      JSON.stringify(restoredPersonal.globalSettings) === JSON.stringify(personal.globalSettings), 'V4 round-trip must preserve every inheritance level');
    const beforeOverflow = await project(), alertsBeforeOverflow = alerts.length;
    await load({...personal, title:'Must not be applied', points:personal.points.map((point,i) =>
      i ? {...point,settings:{...point.settings,step:1,maxDistance:1001}} : point)});
    const afterOverflow = await project();
    check(alerts.length === alertsBeforeOverflow + 1 && pointData(afterOverflow.points) === pointData(beforeOverflow.points) &&
      afterOverflow.title === beforeOverflow.title && JSON.stringify(afterOverflow.globalSettings) === JSON.stringify(beforeOverflow.globalSettings),
      'Import exceeding 1000 rings must reject the whole project without applying its earlier valid point or title');
    openSettings(cards()[0].querySelector('.landmark-item'), 'edit-landmark');
    $('resetSettings').click();
    openSettings(cards()[0].querySelector('.zone-card'), 'zone-settings');
    $('resetSettings').click();
    openSettings(cards()[0], 'ring-settings');
    $('resetSettings').click();
    openSettings(cards()[0], 'sector-settings');
    $('resetSettings').click();
    openSettings(cards()[0], 'landmark-settings');
    $('resetSettings').click();
    const reset = await project();
    check(reset.points[0].settings.step === 75 && reset.points[0].settings.maxDistance === 200 &&
      !Object.hasOwn(reset.points[0].settings, 'color') && !Object.hasOwn(reset.points[0].settings, 'paddingX') &&
      Object.keys(reset.points[0].zoneSettings).length === 0 && Object.keys(reset.points[0].landmarkSettings).length === 0 &&
      Object.keys(reset.points[0].zones[0].settings).length === 0 &&
      Object.keys(reset.points[0].landmarks[0].settings).length === 0, 'Reset must clear personal styles at every level while preserving ring distances');
    openSettings(null);
    input(setting('rings.color'), '#223344');
    input(setting('landmarks.nameSize'), 19);
    saveSettings();
    openSettings(cards()[0], 'ring-settings');
    check(setting('rings.color').value === '#223344', 'Reset point must resume inheriting future global ring edits');
    $('closeSettings').click();
    openSettings(cards()[0].querySelector('.landmark-item'), 'edit-landmark');
    check(setting('landmarks.nameSize').value === '19' && setting('name').value === referenceName, 'Reset item must inherit future defaults without losing its name');
    $('closeSettings').click();
    const beforeSelection = await project();
    await load({...beforeSelection, view:{lat:0,lng:0,zoom:14}});
    if (!cards()[0].querySelector('.point-body').hidden) action(cards()[0], 'toggle-point');
    action(cards()[0], 'toggle-point');
    await frame();
    const selectedDot = document.querySelector('.center-dot.selected').getBoundingClientRect();
    const exposedLeft = innerWidth <= 760 ? $('settingsPanel').getBoundingClientRect().right
      : $('map').getBoundingClientRect().left;
    check(selectedDot.left >= exposedLeft && selectedDot.right <= innerWidth &&
      selectedDot.top >= 0 && selectedDot.bottom <= innerHeight,
      'Selecting an offscreen point must reveal it on the map outside the sidebar overlay');
    await load(beforeSelection);
    const ids = [...document.querySelectorAll('[id]')].map(e => e.id);
    check(new Set(ids).size === ids.length, 'Point and sector field IDs must be unique');
    check([...document.querySelectorAll('label[for]')].every(l => $(l.htmlFor)), 'Every editor label must reference a real input');
    const before = $('map').getBoundingClientRect();
    document.querySelector('.scroll').scrollTop = 10000;
    const after = $('map').getBoundingClientRect();
    check(before.top === after.top && before.height === after.height && window.scrollY === 0, 'Menu scroll must not move the map');
    check(Math.abs(before.height - innerHeight) < 1, 'Map must fill viewport height');
    const viewBefore = (await project()).view;
    await toggleSidebar();
    check($('toggleSettings').getAttribute('aria-expanded') === 'false' &&
      $('settingsPanel').inert, 'Arrow must hide and deactivate the sidebar');
    const closedTab = $('toggleSettings').getBoundingClientRect();
    check(closedTab.left === 0 && closedTab.width <= 44, 'Closed arrow tab must peek from the left edge');
    check($('map').getBoundingClientRect().width === innerWidth, 'Hidden menu must release the whole map');
    const viewAfter = (await project()).view;
    const pixelTolerance = 360 / (256 * 2 ** viewBefore.zoom);
    check(Math.abs(viewBefore.lat - viewAfter.lat) <= pixelTolerance &&
      Math.abs(viewBefore.lng - viewAfter.lng) <= pixelTolerance, 'Menu arrow must preserve center within one rendered map pixel');
    await toggleSidebar();
    check($('toggleSettings').getAttribute('aria-expanded') === 'true' &&
      getComputedStyle($('settingsPanel')).display !== 'none', 'Arrow must reopen menu');
    check(document.documentElement.scrollWidth === innerWidth, 'Page must not overflow horizontally');
    check(errors.length === 0, 'Editor must not produce JavaScript errors');
    return {points: cards().length, checks, result: 'passed'};
  }.toString()})()`);
  assert.equal(result.result, 'passed');
  return result;
}
