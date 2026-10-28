import * as THREE from 'three';

export function chunkMesh(mesh, size = 140) {
  const g = mesh.geometry, pos = g.attributes.position, src = g.index;
  const count = src ? src.count : pos.count;
  const cells = new Map();
  const at = (n) => (src ? src.getX(n) : n);
  for (let t = 0; t < count; t += 3) {
    const a = at(t), b = at(t + 1), c = at(t + 2);
    const x = (pos.getX(a) + pos.getX(b) + pos.getX(c)) / 3, y = (pos.getY(a) + pos.getY(b) + pos.getY(c)) / 3, z = (pos.getZ(a) + pos.getZ(b) + pos.getZ(c)) / 3;
    const key = `${Math.floor(x / size)},${Math.floor(y / 60)},${Math.floor(z / size)}`;
    let list = cells.get(key);
    if (!list) cells.set(key, (list = []));
    list.push(a, b, c);
  }
  const group = new THREE.Group();
  const box = new THREE.Box3(), p = new THREE.Vector3();
  for (const list of cells.values()) {
    const geo = new THREE.BufferGeometry();
    for (const name of Object.keys(g.attributes)) geo.setAttribute(name, g.attributes[name]);
    geo.setIndex(new THREE.BufferAttribute(pos.count > 65535 ? new Uint32Array(list) : new Uint16Array(list), 1));
    box.makeEmpty();
    for (const v of list) box.expandByPoint(p.fromBufferAttribute(pos, v));
    geo.boundingBox = box.clone();
    geo.boundingSphere = box.getBoundingSphere(new THREE.Sphere());
    const m = new THREE.Mesh(geo, mesh.material);
    m.castShadow = mesh.castShadow;
    m.receiveShadow = mesh.receiveShadow;
    m.renderOrder = mesh.renderOrder;
    group.add(m);
  }
  return group;
}
