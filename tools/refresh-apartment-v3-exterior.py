"""Rebuild only courtyard and masks in an existing staged apartment source."""
import bpy, sys, os
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from apartment_v3_exterior import add_exterior,export_geometry
from apartment_v3_layout import load_layout,output_paths
root=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out,source=output_paths(sys.argv,root)
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.open_mainfile(filepath=os.path.join(source,'apartment-cutaway-v3.blend'))
scene=bpy.context.scene
for obj in list(scene.objects):
    if obj.name.startswith(('block-west','block-east','exterior-','factory-stack')) and obj.type!='LIGHT':bpy.data.objects.remove(obj,do_unlink=True)
def material(name,color):
    m=bpy.data.materials.get(name)
    if not m:
        m=bpy.data.materials.new(name);m.use_nodes=True;m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(*color,1)
    return m
def cube(name,loc,size,mat,bevel=.01):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mat)
    if bevel:mod=o.modifiers.new('edge-wear','BEVEL');mod.width=bevel;mod.segments=1
    return o
def cylinder(name,loc,radius,depth,mat):
    bpy.ops.mesh.primitive_cylinder_add(vertices=24,radius=radius,depth=depth,location=loc);o=bpy.context.object;o.name=name;o.data.materials.append(mat);return o
exterior=add_exterior(scene,dict(cube=cube,cylinder=cylinder,material=material),load_layout());objects=exterior.pop('roots')
export_geometry(scene,objects,os.path.join(out,exterior['geometry']),'outside-')
occlusion=[o for o in scene.objects if o.name.startswith(('rear-','left-return','right-return','partition-','window-','foundation','kitchen-floor-substrate','living-floor-substrate','cutaway-surround'))]
occlusion += [o for o in objects if '-body' in o.name or '-roof' in o.name or o.name in ['exterior-courtyard-ground','exterior-factory-hall']]
export_geometry(scene,occlusion,os.path.join(out,exterior['occluders']),'outside-mask-',False)
for o in objects:
    if o.name.startswith('exterior-lit-'):o.hide_render=True
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(source,'apartment-cutaway-v3.blend'))
print('EXTERIOR_REFRESH_READY')
