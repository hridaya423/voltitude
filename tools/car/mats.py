import bpy

SPEC = {
    'paint': dict(color=(0.6, 0.6, 0.6), metal=0.4, rough=0.32, coat=1.0),
    'black': dict(color=(0.022, 0.022, 0.024), rough=0.6),
    'gloss': dict(color=(0.006, 0.006, 0.007), rough=0.08, coat=1.0),
    'carbon': dict(color=(0.03, 0.03, 0.033), rough=0.35, coat=0.6),
    'glass': dict(color=(0.045, 0.028, 0.016), metal=0.6, rough=0.03),
    'trim': dict(color=(0.07, 0.072, 0.078), rough=0.3, coat=0.6),
    'brass': dict(color=(0.78, 0.56, 0.3), metal=1.0, rough=0.22),
    'gap': dict(color=(0.004, 0.004, 0.004), rough=0.9),
    'tire': dict(color=(0.03, 0.03, 0.032), rough=0.85),
    'tire_text': dict(color=(0.13, 0.13, 0.135), rough=0.7),
    'rim': dict(color=(0.74, 0.745, 0.75), rough=0.4, coat=0.5),
    'spoke': dict(color=(0.01, 0.01, 0.012), metal=0.3, rough=0.15, coat=1.0),
    'gunmetal': dict(color=(0.16, 0.165, 0.17), metal=1.0, rough=0.32),
    'chrome': dict(color=(0.9, 0.9, 0.9), metal=1.0, rough=0.08),
    'brake': dict(color=(0.35, 0.35, 0.36), metal=1.0, rough=0.45),
    'caliper': dict(color=(0.55, 0.36, 0.2), metal=1.0, rough=0.3),
    'liner': dict(color=(0.012, 0.012, 0.014), rough=0.95),
    'light_front': dict(color=(0.9, 0.92, 1.0), rough=0.2, emit=(0.9, 0.93, 1.0), strength=8.0),
    'light_tail': dict(color=(0.6, 0.0, 0.01), rough=0.2, emit=(1.0, 0.02, 0.04), strength=10.0),
    'amber': dict(color=(0.6, 0.3, 0.02), rough=0.15, emit=(1.0, 0.45, 0.05), strength=1.5),
    'reflector': dict(color=(0.45, 0.02, 0.02), rough=0.12, coat=1.0),
    'plate': dict(color=(0.82, 0.83, 0.84), rough=0.45),
}


def get(name):
    m = bpy.data.materials.get(name)
    if m:
        return m
    d = SPEC[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes['Principled BSDF']
    p.inputs['Base Color'].default_value = (*d['color'], 1)
    p.inputs['Metallic'].default_value = d.get('metal', 0.0)
    p.inputs['Roughness'].default_value = d['rough']
    if 'coat' in d:
        p.inputs['Coat Weight'].default_value = d['coat']
        p.inputs['Coat Roughness'].default_value = 0.03
    if 'alpha' in d:
        p.inputs['Alpha'].default_value = d['alpha']
        m.surface_render_method = 'BLENDED'
    if 'emit' in d:
        p.inputs['Emission Color'].default_value = (*d['emit'], 1)
        p.inputs['Emission Strength'].default_value = d['strength']
    m.diffuse_color = (*d['color'], 1)
    return m


def index(ob, name):
    mats = ob.data.materials
    for i, m in enumerate(mats):
        if m and m.name == name:
            return i
    mats.append(get(name))
    return len(mats) - 1
