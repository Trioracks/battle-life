"""Additional views from the authored scene; dynamic meshes remain shared."""
import bpy, math, os, json
from mathutils import Vector
from apartment_v3_roles import is_interior_static

def camera_views(scene, camera, out, render_states):
    views={}
    for mode,yaw,prefix in [('2D',0,'')]:
        distance=12
        camera.location=(1.5,-distance,1.35+distance*math.tan(math.radians(8)))
        camera.rotation_euler=(Vector((1.5,0,1.35))-camera.location).to_track_quat('-Z','Y').to_euler()
        camera.data.ortho_scale=20.8
        states={s:{p:prefix+f for p,f in files.items()} for s,files in render_states.__globals__['LIGHTING_STATES'].items()}
        views[mode]=dict(position=[camera.location.x,camera.location.z,-camera.location.y],target=[1.5,1.35,0],width=20.8,height=8.32,lightingStates=states,yaw=yaw,pitch=8)
        old=render_states.__globals__['LIGHTING_STATES'];render_states.__globals__['LIGHTING_STATES']=states
        render_states();render_states.__globals__['LIGHTING_STATES']=old
    return views

def add_first_person_shell(cube,materials,layout):
    shell=[]
    for room,mat in [('kitchen',materials['plaster']),('living',materials['wall'])]:
        l,r=layout['rooms'][room]['x'];cx=(l+r)/2
        shell.append(cube('first-person-front-'+room,(cx,-1.82,1.5),(r-l,.14,3.15),mat))
        shell.append(cube('first-person-ceiling-'+room,(cx,0,3.08),(r-l,3.7,.14),materials['plaster']))
        shell.append(cube('first-person-front-skirting-'+room,(cx,-1.72,.065),(r-l,.06,.13),materials['wood']))
        if room=='living':
            for i in range(29):shell.append(cube('first-person-wallpaper-stripe',(.17+i*.29,-1.743,1.5),(.028,.006,2.92),materials['chip'],0))
    return shell

def export_static(scene,static,cube,materials,out):
    shell=[o for o in static if o.name.startswith('first-person-')]
    # Bake connected procedural colour at material-group scope into UV atlases.
    groups={}
    for obj in list(static):
        if not is_interior_static(obj,set()):continue
        key='outside-window-lights' if obj.name.startswith('distant-window') else obj.data.materials[0].name
        if obj.name.startswith('first-person-'):key='cutaway-shell-'+key
        groups.setdefault(key,[]).append(obj)
    exports=[]
    for name,objects in groups.items():
        bpy.ops.object.select_all(action='DESELECT')
        copies=[]
        for obj in objects:
            copy=obj.copy();copy.data=obj.data.copy();scene.collection.objects.link(copy);copy.hide_render=False;copy.hide_set(False);copy.select_set(True);copies.append(copy)
        bpy.context.view_layer.objects.active=copies[0];bpy.ops.object.convert(target='MESH');bpy.ops.object.join();obj=bpy.context.object;obj.name='static-'+name
        bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(island_margin=.008);bpy.ops.object.mode_set(mode='OBJECT')
        image=bpy.data.images.new('static-'+name+'-atlas',width=2048,height=2048,alpha=False)
        for slot in obj.material_slots:
            mat=slot.material.copy();slot.material=mat;tex=mat.node_tree.nodes.new('ShaderNodeTexImage');tex.image=image;mat.node_tree.nodes.active=tex
        bpy.ops.object.bake(type='DIFFUSE',pass_filter={'COLOR'},margin=4);image.pack()
        for slot in obj.material_slots:
            mat=slot.material;bs=mat.node_tree.nodes.get('Principled BSDF')
            for socket in ['Base Color','Normal']:
                for link in list(bs.inputs[socket].links):mat.node_tree.links.remove(link)
            mat.node_tree.links.new(mat.node_tree.nodes.active.outputs['Color'],bs.inputs['Base Color'])
        obj.hide_render=True;exports.append(obj)
    bpy.ops.object.select_all(action='DESELECT')
    for obj in exports:obj.select_set(True)
    bpy.ops.export_scene.gltf(filepath=os.path.join(out,'static.glb'),export_format='GLB',use_selection=True,export_apply=True,export_animations=False,export_cameras=False,export_lights=False)
    for obj in exports:bpy.data.objects.remove(obj,do_unlink=True)
    for obj in shell:obj.hide_render=True
    return shell
