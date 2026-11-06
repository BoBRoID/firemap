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
    const action = (card, name) => card.querySelector(`[data-action="${name}"]`).click();
    const clickMap = (x, y) => {
      const r = $('map').getBoundingClientRect();
      $('map').dispatchEvent(new MouseEvent('click', {
        bubbles: true, clientX: r.left + r.width * x, clientY: r.top + r.height * y
      }));
    };
    const frame = () => new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(Error('Browser did not render a frame')), 3000);
      requestAnimationFrame(() => requestAnimationFrame(() => {clearTimeout(timer); resolve();}));
    });
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
    const pointData = list => JSON.stringify(list.map(({name,lat,lng,settings,zones,landmarks,collapsed,visible})=>
      ({name,lat,lng,settings,zones,landmarks,collapsed,visible})));
    const load = async data => {
      await $('filePicker').onchange({
        target: {files: [{text: async () => JSON.stringify(data)}], value: 'check.json'}
      });
    };
    check(cards().length === 0 && !$('emptyPoints').hidden, 'Fresh list must be empty');
    check(!$('fit') && !document.querySelector('.float-tools'), 'Global fit button must be removed');
    check($('toggleSettings').querySelector('svg') && !$('toggleSettings').textContent.trim(), 'Menu toggle must be an arrow, not a text button');
    const tab = $('toggleSettings').getBoundingClientRect();
    const brand = document.querySelector('.brand').getBoundingClientRect();
    check(tab.left >= brand.left && tab.right <= brand.right && tab.bottom <= brand.bottom, 'Open-menu arrow must be inside its header');
    clickMap(.5, .5);
    check(cards().length === 1 && $('emptyPoints').hidden, 'Map click must append a point');
    const first = cards()[0];
    check(!first.querySelector('.point-body').hidden, 'New point settings must open immediately');
    const name = 'Альфа "А", <img src=x onerror=alert(1)>';
    input(field(first, 'name'), name);
    input(field(first, 'step'), 200);
    input(field(first, 'count'), 3);
    input(field(first, 'bearing'), 137);
    input(field(first, 'paddingX'), 9);
    input(field(first, 'paddingY'), 4);
    check(!first.querySelector('img'), 'Point names must not be interpreted as HTML');
    check(getComputedStyle(document.querySelector('.distance-label')).padding === '4px 9px', 'Point label padding must render');
    const dot = document.querySelector('.center-dot').getBoundingClientRect();
    const label = document.querySelector('.distance-label').getBoundingClientRect();
    check(label.left + label.width / 2 > dot.left + dot.width / 2 &&
      label.top + label.height / 2 > dot.top + dot.height / 2, '137-degree label must lie southeast of its center');
    clickMap(.9, .7);
    check(cards().length === 2, 'Click outside every radius must append another point');
    const second = cards()[1];
    check(field(second, 'step').value === '100' && field(second, 'count').value === '5', 'New point must have independent default settings');
    check(document.querySelectorAll('.distance-label').length === 8, 'Map must render each point with its own ring count');
    action(first, 'toggle-point');
    check(first.querySelector('.point-body').hidden, 'Collapse must hide the point body');
    clickMap(.5, .5);
    check(cards().length === 2 && !first.querySelector('.point-body').hidden && first.classList.contains('selected'), 'Click inside a point radius must select and expand it');
    action(first, 'add-zone');
    action(first, 'add-zone');
    const sectors = first.querySelectorAll('.zone-card');
    check(sectors.length === 2 && second.querySelectorAll('.zone-card').length === 0, 'Plus must append sectors only under its point');
    input(sectors[0].querySelector('[data-zone-field="start"]'), 15);
    input(sectors[0].querySelector('[data-zone-field="outer"]'), 800);
    input(sectors[1].querySelector('[data-zone-field="start"]'), 120);
    input(sectors[1].querySelector('[data-zone-field="end"]'), 190);
    input(sectors[1].querySelector('[data-zone-field="inner"]'), 900);
    check(sectors[1].querySelector('[data-zone-field="inner"]').value === '599', 'Sector inner radius must stay below outer radius');
    let snapshot = await project();
    check(snapshot.points[0].zones[0].start === 15 && snapshot.points[0].zones[1].start === 120, 'Sector editors must update separate items');
    check(snapshot.points[0].zones[0].outer === 800 && snapshot.points[0].settings.count === 3, 'Sector edits must preserve point settings');
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
      .slice(0, snapshot.points[0].settings.count + snapshot.points[0].zones.length)
      .map(path => path.getBoundingClientRect());
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
    action(second, 'add-zone');
    input(field(second, 'lat'), '');
    second.querySelector('form').dispatchEvent(new Event('submit', {bubbles: true, cancelable: true}));
    check((await project()).points[1].lat === snapshot.points[1].lat, 'Empty coordinates must not move a point');
    input(field(second, 'lat'), 50.46);
    input(field(second, 'lng'), 30.54);
    second.querySelector('form').requestSubmit();
    snapshot = await project();
    check(snapshot.points[1].lat === 50.46 && snapshot.points[1].lng === 30.54, 'Coordinate form must edit its own point');
    check(snapshot.points[0].name === name && snapshot.points[0].settings.step === 200 &&
      snapshot.points[1].settings.step === 100, 'Editing another point must preserve names and independent settings');
    action(second, 'draw-zone');
    clickMap(.7, .3);
    clickMap(.8, .5);
    check(cards().length === 2 && second.querySelectorAll('.zone-card').length === 2, 'Two-click drawing must append a sector, not a point');
    check($('modeBadge').classList.contains('hidden'), 'Drawing must finish in normal map mode');
    action(second, 'draw-zone');
    document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
    check($('modeBadge').classList.contains('hidden'), 'Escape must cancel sector drawing');
    input(field(second, 'name'), '=1+1');
    $('exportPoints').click();
    check((await downloaded.text()).includes(`"'=1+1"`), 'Spreadsheet export must not execute point names as formulas');
    input(field(second, 'name'), 'Браво');
    action(first, 'toggle-point');
    const saved = await project();
    check(saved.format === 'cartographic-zones-v3' && saved.points[0].collapsed, 'Project must store per-point data and collapse state');
    $('exportPoints').click();
    const csv = await downloaded.text();
    check(csv.trim().split('\r\n').length === 3 && csv.includes(name.replaceAll('"', '""')) &&
      csv.includes(',50.46,30.54'), 'CSV must contain quoted names and edited coordinates');
    $('exportGeoJSON').click();
    const geo = JSON.parse(await downloaded.text());
    check(geo.features.filter(f => f.geometry.type === 'Point').length === 2, 'GeoJSON must include every point');
    check(geo.features.filter(f => f.properties.type === 'distance_ring').length === 8, 'GeoJSON must use individual ring counts');
    check(geo.features.filter(f => f.geometry.type === 'Polygon').length === 3, 'GeoJSON must include every remaining sector');
    check(geo.features.find(f => f.geometry.type === 'Point').properties.name === name, 'GeoJSON must preserve point names');
    await load(saved);
    const restored = await project();
    check(pointData(restored.points) === pointData(saved.points), 'Project must round-trip names, collapse state, settings and sectors');
    check(cards()[0].querySelector('.point-body').hidden, 'Import must restore collapsed point UI');
    await load({...saved, points: [{...saved.points[0], settings: null}]});
    check(alerts.length === 1 && pointData((await project()).points) === pointData(saved.points), 'Invalid import must leave current points intact');
    await load({
      format: 'cartographic-zones-v1', title: 'Legacy', center: {lat: 51, lng: 31},
      settings: {step: 150, count: 4, bearing: 90}, zones: saved.points[0].zones
    });
    const legacy = await project();
    check(legacy.points.length === 1 && legacy.points[0].settings.step === 150 &&
      legacy.points[0].zones.length === 1, 'V1 project must retain its center, settings and sectors');
    await load({
      format: 'cartographic-zones-v2', settings: {step: 175, count: 2, paddingX: 8},
      points: saved.points.map(p => ({lat: p.lat, lng: p.lng, zones: p.zones}))
    });
    input(field(cards()[0], 'step'), 250);
    const migrated = await project();
    check(migrated.points[0].settings.step === 250 && migrated.points[1].settings.step === 175 &&
      migrated.points[1].settings.paddingX === 8, 'V2 shared settings must migrate to independent copies');
    await load({...saved, points: []});
    check(cards().length === 0 && !$('emptyPoints').hidden &&
      !document.querySelector('.distance-label'), 'Empty project must clear map geometry and restore empty state');
    await load(saved);
    const oldV3 = {...saved, points: saved.points.map(({landmarks,visible,...point}) => point)};
    await load(oldV3);
    const migratedV3 = await project();
    check(migratedV3.points.every(p => p.visible && p.landmarks.length === 0) &&
      document.querySelectorAll('.center-dot').length === 2, 'Old V3 projects without landmarks or visibility must remain usable');
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
    const landmarkInput = cards()[0].querySelector('[data-landmark-field="name"]');
    const referenceName = 'Дерево "<img src=x>"';
    input(landmarkInput, referenceName);
    check(document.querySelector('.landmark-caption strong').textContent === referenceName &&
      !document.querySelector('.landmark-caption img'), 'Landmark map labels must render names as text');
    $('exportGeoJSON').click();
    let geoLandmarks = JSON.parse(await downloaded.text()).features.filter(f => f.properties.type === 'landmark');
    check(geoLandmarks.length === 1 && geoLandmarks[0].properties.point === 1 &&
      Math.abs(geoLandmarks[0].properties.azimuth_deg - 90) < 2, 'Landmark GeoJSON must store ownership and correct eastward azimuth');
    const expectedDistance = Math.round(geoLandmarks[0].properties.distance_m).toLocaleString('uk-UA') + ' м';
    check(document.querySelector('.landmark-caption small').textContent.includes(expectedDistance) &&
      cards()[0].querySelector('.landmark-info').textContent.includes(expectedDistance), 'Map and list must show the computed landmark distance');
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
    check(document.querySelectorAll('.leaflet-marker-draggable').length === 1, 'Only the selected center may be dragged');
    const readoutBefore = cards()[1].querySelector('.landmark-info').textContent;
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
      cards()[1].querySelector('.landmark-info').textContent !== readoutBefore,
      'Landmark coordinates must stay fixed while distance and azimuth update');
    check(JSON.stringify(afterDrag.points[1].zones) === JSON.stringify(beforeDrag.points[1].zones) &&
      JSON.stringify(afterDrag.points[1].settings) === JSON.stringify(beforeDrag.points[1].settings),
      'Dragging must preserve sectors and ring settings');
    $('map').dispatchEvent(new MouseEvent('click', {bubbles: true, clientX: x + 60, clientY: y + 40}));
    check(cards().length === 2, 'Drag release must not create another point');
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
    const selectedName = (await project()).points[(await project()).selectedPoint].name;
    const grip = cards()[0].querySelector('[data-action="reorder-point"]');
    grip.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowDown', bubbles: true, cancelable: true}));
    let ordered = await project();
    check(ordered.points.map(p => p.name).join('|') === [...originalOrder].reverse().join('|') &&
      ordered.points[ordered.selectedPoint].name === selectedName, 'Keyboard reorder must update point order while preserving selection');
    cards().forEach(card => {if(!card.querySelector('.point-body').hidden)action(card, 'toggle-point');});
    document.querySelector('.scroll').scrollTop = 0;
    await frame();
    const dragGrip = cards()[0].querySelector('[data-action="reorder-point"]');
    const start = dragGrip.getBoundingClientRect(), target = cards()[1].querySelector('.point-head').getBoundingClientRect();
    const list = $('pointList'), capture = list.setPointerCapture;
    let capturedId;
    // Synthetic pointer events have no native pointer to capture.
    list.setPointerCapture = id => {capturedId = id;};
    dragGrip.dispatchEvent(new PointerEvent('pointerdown', {
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
    $('exportPoints').click();
    check((await downloaded.text()).split('\r\n')[1].includes(originalOrder[0].replaceAll('"', '""')),
      'CSV must follow the reordered point list');
    await load(ordered);
    check((await project()).points.map(p => p.name).join('|') === originalOrder.join('|'),
      'Projects must preserve reordered points');
    const ids = [...document.querySelectorAll('[id]')].map(e => e.id);
    check(new Set(ids).size === ids.length, 'Point and sector field IDs must be unique');
    check([...document.querySelectorAll('label[for]')].every(l => $(l.htmlFor)), 'Every editor label must reference a real input');
    const before = $('map').getBoundingClientRect();
    document.querySelector('.scroll').scrollTop = 10000;
    const after = $('map').getBoundingClientRect();
    check(before.top === after.top && before.height === after.height && window.scrollY === 0, 'Menu scroll must not move the map');
    check(Math.abs(before.height - innerHeight) < 1, 'Map must fill viewport height');
    const viewBefore = (await project()).view;
    $('toggleSettings').click();
    await frame();
    check($('toggleSettings').getAttribute('aria-expanded') === 'false' &&
      getComputedStyle($('settingsPanel')).display === 'none', 'Arrow must hide menu');
    const closedTab = $('toggleSettings').getBoundingClientRect();
    check(closedTab.left === 0 && closedTab.width <= 44, 'Closed arrow tab must peek from the left edge');
    check($('map').getBoundingClientRect().width === innerWidth, 'Hidden menu must release the whole map');
    const viewAfter = (await project()).view;
    const pixelTolerance = 360 / (256 * 2 ** viewBefore.zoom);
    check(Math.abs(viewBefore.lat - viewAfter.lat) <= pixelTolerance &&
      Math.abs(viewBefore.lng - viewAfter.lng) <= pixelTolerance, 'Menu arrow must preserve center within one rendered map pixel');
    $('toggleSettings').click();
    await frame();
    check($('toggleSettings').getAttribute('aria-expanded') === 'true' &&
      getComputedStyle($('settingsPanel')).display !== 'none', 'Arrow must reopen menu');
    check(document.documentElement.scrollWidth === innerWidth, 'Page must not overflow horizontally');
    check(errors.length === 0, 'Editor must not produce JavaScript errors');
    return {points: cards().length, checks, result: 'passed'};
  }.toString()})()`);
  assert.equal(result.result, 'passed');
  return result;
}
