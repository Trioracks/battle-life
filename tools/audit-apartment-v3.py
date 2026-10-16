"""Audit pre-merge world geometry. CLI also accepts plain bounds fixtures."""
import json
import sys
from apartment_v3_layout import load_layout


def overlap(a, b, epsilon=.012):
    return all(min(a['max'][i], b['max'][i])-max(a['min'][i], b['min'][i]) > epsilon for i in range(3))


def audit_records(objects, layout):
    errors, warnings = [], []
    reserve = layout['furnitureReserve']
    walls = [o for o in objects if o['role'] == 'wall']
    desktops = [o for o in objects if o['role'] == 'desktop']
    sills = [o for o in objects if o['role'] == 'window-sill']
    cabinets = [o for o in objects if o['role'] == 'upper-cabinet']
    supports = [o for o in objects if o['role'] == 'cooker-support']
    for o in objects:
        if o['role'] == 'microphone':
            for sill in sills:
                expanded = dict(min=[v-.02 for v in sill['min']], max=[v+.02 for v in sill['max']])
                if overlap(o, expanded, 0):errors.append(o['name']+': microphone must clear window-sill by 0.02m')
        if o['role'] == 'hood':
            for cabinet in cabinets:
                expanded = dict(min=[v-.015 for v in cabinet['min']], max=[v+.015 for v in cabinet['max']])
                if overlap(o, expanded, 0):errors.append(o['name']+': hood must clear cabinet by 0.015m')
        if o['role'] == 'cooking-pot':
            if not any(-.00001 <= o['min'][1]-s['max'][1] <= .003 and all(min(o['max'][i],s['max'][i])>max(o['min'][i],s['min'][i]) for i in [0,2]) for s in supports):
                errors.append(o['name']+': saucepan must rest on cooker grate')
        if o['assembly']=='saucepan' or o['role']=='cooking-pot':
            if o['name']=='saucepan-handle':
                for vessel in objects:
                    if vessel['role']=='cooking-pot' and o['min'][0]<vessel['max'][0]-.012:
                        errors.append(o['name']+': handle intrudes into saucepan interior')
            for neighbour in objects:
                if neighbour['assembly']!=o['assembly'] and neighbour['role']!='cooker-support' and overlap(o,neighbour,.001):
                    errors.append(o['name']+': saucepan intersects neighbour '+neighbour['name'])
        if o['role'] == 'chair-leg' and abs(o['min'][1]) > .008:
            errors.append(o['name']+': chair-leg must contact the floor')
        if o['role'] == 'desk-prop':
            supported = any(o['min'][0] >= d['min'][0]-.01 and o['max'][0] <= d['max'][0]+.01
                            and o['min'][2] >= d['min'][2]-.015 and o['max'][2] <= d['max'][2]+.015
                            and abs(o['min'][1]-d['max'][1]) < .018 for d in desktops)
            if not supported:
                errors.append(o['name']+': desk-prop is not supported by desktop')
        if o['role'] in {'furniture', 'desktop', 'chair-leg', 'desk-prop'}:
            if overlap(o, reserve):
                errors.append(o['name']+': obstructs furniture reserve')
            for wall in walls:
                if overlap(o, wall):
                    errors.append(o['name']+': penetrates wall '+wall['name'])
    furniture = [o for o in objects if o['role'] in {'furniture', 'desktop', 'chair-leg', 'desk-prop', 'window-sill'}]
    for i, a in enumerate(furniture):
        for b in furniture[i+1:]:
            if a['assembly'] != b['assembly'] and overlap(a, b):
                warnings.append(a['name']+' / '+b['name']+': independent assembly AABB overlap')
    return dict(errors=errors, warnings=warnings, objects=objects)


def semantics(name):
    if name.startswith(('rear-', 'left-return', 'right-return', 'partition-', 'first-person-')):
        return 'shell', 'wall'
    if name.startswith('window-sill'):
        return name, 'window-sill'
    for prefix, assembly, role in [('microphone-', 'microphone', 'microphone'), ('hood-', 'hood', 'hood'), ('upper-cupboard', 'upper-cabinet', 'upper-cabinet'), ('burner-grate', 'stove', 'cooker-support')]:
        if name.startswith(prefix):return assembly, role
    if name == 'saucepan':return 'saucepan', 'cooking-pot'
    if name.startswith('saucepan-'):return 'saucepan', 'detail'
    if name == 'mouse':return 'desk', 'desk-prop'
    for prefix, assembly in [('dining-', 'dining'), ('chair-', 'chair'), ('desk-', 'desk'),
                              ('drawer-', 'desk'), ('crt-', 'desk'), ('keyboard', 'desk'),
                              ('kitchen-cabinet', 'counter'), ('sink-counter', 'counter'),
                              ('bed-', 'bed'), ('radiator-', 'radiator')]:
        if name.startswith(prefix):
            role = 'chair-leg' if 'chair-leg' in name else 'desktop' if name.startswith(('desk-top', 'dining-top')) else 'desk-prop' if name.startswith(('keyboard', 'crt-stand')) else 'furniture'
            return assembly, role
    return name.split('.')[0], 'detail'


def audit_scene(scene, layout):
    from mathutils import Vector
    import bpy
    bpy.context.view_layer.update()
    objects = []
    for obj in scene.objects:
        if obj.type not in {'MESH', 'CURVE', 'FONT'} or obj.name.startswith(('depth-', 'static-')):
            continue
        points = [obj.matrix_world @ Vector(p) for p in obj.bound_box]
        runtime = [(p.x, p.z, -p.y) for p in points]
        assembly, role = semantics(obj.name)
        obj['assembly'] = assembly
        objects.append(dict(name=obj.name, assembly=assembly, role=role,
                            min=[min(p[i] for p in runtime) for i in range(3)],
                            max=[max(p[i] for p in runtime) for i in range(3)],
                            materials=[m.name for m in obj.data.materials if m]))
    return audit_records(objects, layout)


if __name__ == '__main__':
    data = json.load(sys.stdin)
    print(json.dumps(audit_records(data['objects'], data.get('layout', load_layout()))))
